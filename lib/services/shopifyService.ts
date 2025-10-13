import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { credentialService } from './credentialService';
import { ShopifyCredential, SHOPIFY_EVENTS } from '@/lib/schemas/credential';

// Shopify OAuth configuration
const SHOPIFY_CONFIG = {
  clientId: process.env.SHOPIFY_CLIENT_ID!,
  clientSecret: process.env.SHOPIFY_CLIENT_SECRET!,
  scopes: ['read_orders', 'write_orders', 'read_products', 'read_customers', 'write_webhooks'],
  redirectUri: process.env.NEXTAUTH_URL + '/api/integrations/shopify/callback',
  apiVersion: '2023-10',
};

// Webhook topics we want to subscribe to
const WEBHOOK_TOPICS = [
  'orders/create',
  'orders/updated', 
  'orders/paid',
  'orders/cancelled',
  'customers/create',
  'products/create',
];

export interface ShopifyOAuthParams {
  shop: string;
  code?: string;
  state?: string;
  hmac?: string;
  timestamp?: string;
}

export const shopifyService = {
  // Generate OAuth authorization URL
  generateAuthUrl(shopDomain: string, userId: string): string {
    const shop = shopDomain.includes('.myshopify.com') 
      ? shopDomain 
      : `${shopDomain}.myshopify.com`;
    
    const state = crypto.randomBytes(32).toString('hex');
    const scopes = SHOPIFY_CONFIG.scopes.join(',');
    
    // Store state temporarily (in production, use Redis or database)
    // For now, we'll encode userId in the state
    const stateWithUser = Buffer.from(JSON.stringify({ state, userId })).toString('base64');
    
    const params = new URLSearchParams({
      client_id: SHOPIFY_CONFIG.clientId,
      scope: scopes,
      redirect_uri: SHOPIFY_CONFIG.redirectUri,
      state: stateWithUser,
    });

    return `https://${shop}/admin/oauth/authorize?${params.toString()}`;
  },

  // Validate OAuth callback and exchange code for access token
  async handleOAuthCallback(params: ShopifyOAuthParams): Promise<{
    success: boolean;
    credential?: ShopifyCredential;
    error?: string;
  }> {
    try {
      const { shop, code, state, hmac } = params;
      
      if (!shop || !code || !state) {
        return { success: false, error: 'Missing required OAuth parameters' };
      }

      // Decode state to get userId
      let userId: string;
      try {
        const decodedState = JSON.parse(Buffer.from(state, 'base64').toString());
        userId = decodedState.userId;
      } catch {
        return { success: false, error: 'Invalid state parameter' };
      }

      // Validate the request is from Shopify
      if (!this.validateHmac(params)) {
        return { success: false, error: 'Invalid request signature' };
      }

      // Exchange authorization code for access token
      const tokenResponse = await fetch(`https://${shop}/admin/oauth/access_token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: SHOPIFY_CONFIG.clientId,
          client_secret: SHOPIFY_CONFIG.clientSecret,
          code,
        }),
      });

      if (!tokenResponse.ok) {
        return { success: false, error: 'Failed to exchange OAuth code' };
      }

      const tokenData = await tokenResponse.json();
      const { access_token, scope } = tokenData;

      // Get shop information
      const shopInfo = await this.getShopInfo(shop, access_token);
      if (!shopInfo.success) {
        return { success: false, error: 'Failed to get shop information' };
      }

      // Create credential
      const credentialData = {
        userId,
        name: `${shopInfo.data.name} Store`,
        description: `Shopify store: ${shop}`,
        platform: 'shopify' as const,
        type: 'oauth2' as const,
        status: 'active' as const,
        data: {
          shopDomain: shop.replace('.myshopify.com', ''),
          accessToken: access_token,
          scope: scope.split(','),
          installedAt: new Date(),
          apiVersion: SHOPIFY_CONFIG.apiVersion,
        },
        metadata: {
          shopName: shopInfo.data.name,
          shopOwner: shopInfo.data.shop_owner,
          shopEmail: shopInfo.data.email,
          planName: shopInfo.data.plan_name,
          country: shopInfo.data.country_name,
          timezone: shopInfo.data.timezone,
        },
        isActive: true,
      };

      const result = await credentialService.create(userId, credentialData);
      if (!result.success) {
        return { success: false, error: result.error };
      }

      // Set up webhooks for the newly connected store
      await this.setupWebhooks(result.data as ShopifyCredential);

      return { success: true, credential: result.data as ShopifyCredential };
    } catch (error) {
      console.error('Shopify OAuth callback error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'OAuth callback failed' 
      };
    }
  },

  // Validate HMAC signature from Shopify
  validateHmac(params: ShopifyOAuthParams): boolean {
    try {
      const { hmac, ...otherParams } = params;
      if (!hmac) return false;

      // Create query string from parameters (excluding hmac)
      const queryString = Object.keys(otherParams)
        .sort()
        .map(key => `${key}=${otherParams[key as keyof typeof otherParams]}`)
        .join('&');

      // Calculate expected HMAC
      const expectedHmac = crypto
        .createHmac('sha256', SHOPIFY_CONFIG.clientSecret)
        .update(queryString)
        .digest('hex');

      // Compare with provided HMAC
      return crypto.timingSafeEqual(
        Buffer.from(hmac, 'hex'),
        Buffer.from(expectedHmac, 'hex')
      );
    } catch {
      return false;
    }
  },

  // Get shop information
  async getShopInfo(shopDomain: string, accessToken: string): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      const response = await fetch(
        `https://${shopDomain}/admin/api/${SHOPIFY_CONFIG.apiVersion}/shop.json`,
        {
          headers: {
            'X-Shopify-Access-Token': accessToken,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        return { success: false, error: `Shop API error: ${response.status}` };
      }

      const data = await response.json();
      return { success: true, data: data.shop };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get shop info' 
      };
    }
  },

  // Set up webhooks for a Shopify store
  async setupWebhooks(credential: ShopifyCredential): Promise<{
    success: boolean;
    webhookIds?: string[];
    error?: string;
  }> {
    try {
      const webhookEndpoint = `${process.env.NEXTAUTH_URL}/api/webhooks/shopify/${credential.id}`;
      const webhookIds: string[] = [];

      for (const topic of WEBHOOK_TOPICS) {
        const response = await fetch(
          `https://${credential.data.shopDomain}.myshopify.com/admin/api/${credential.data.apiVersion}/webhooks.json`,
          {
            method: 'POST',
            headers: {
              'X-Shopify-Access-Token': credential.data.accessToken,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              webhook: {
                topic,
                address: webhookEndpoint,
                format: 'json',
              },
            }),
          }
        );

        if (response.ok) {
          const webhookData = await response.json();
          webhookIds.push(webhookData.webhook.id.toString());
        } else {
          console.warn(`Failed to create webhook for ${topic}:`, response.statusText);
        }
      }

      // Update credential with webhook information
      await credentialService.update(credential.userId, credential.id, {
        data: {
          ...credential.data,
          webhookEndpoint,
          webhookId: webhookIds.join(','), // Store multiple webhook IDs
        },
      } as any);

      return { success: true, webhookIds };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to setup webhooks' 
      };
    }
  },

  // Handle incoming webhook from Shopify
  async handleWebhook(
    credentialId: string,
    request: NextRequest
  ): Promise<{
    success: boolean;
    event?: {
      platform: 'shopify';
      event: string;
      data: any;
      credentialId: string;
    };
    error?: string;
  }> {
    try {
      // Verify webhook signature
      const hmacHeader = request.headers.get('X-Shopify-Hmac-Sha256');
      const topic = request.headers.get('X-Shopify-Topic');
      
      if (!hmacHeader || !topic) {
        return { success: false, error: 'Missing webhook headers' };
      }

      const body = await request.text();
      
      // Get credential to verify webhook
      const credential = await credentialService.getById('system', credentialId);
      if (!credential.success) {
        return { success: false, error: 'Invalid credential' };
      }

      // Verify webhook signature
      const expectedHmac = crypto
        .createHmac('sha256', SHOPIFY_CONFIG.clientSecret)
        .update(body)
        .digest('base64');

      if (!crypto.timingSafeEqual(
        Buffer.from(hmacHeader, 'base64'),
        Buffer.from(expectedHmac, 'base64')
      )) {
        return { success: false, error: 'Invalid webhook signature' };
      }

      // Parse webhook data
      const data = JSON.parse(body);

      // Update credential last used
      await credentialService.updateLastUsed(credential.data!.userId, credentialId);

      return {
        success: true,
        event: {
          platform: 'shopify',
          event: topic,
          data,
          credentialId,
        },
      };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Webhook handling failed' 
      };
    }
  },

  // Remove webhooks when credential is deleted
  async removeWebhooks(credential: ShopifyCredential): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      if (!credential.data.webhookId) {
        return { success: true }; // No webhooks to remove
      }

      const webhookIds = credential.data.webhookId.split(',');

      for (const webhookId of webhookIds) {
        await fetch(
          `https://${credential.data.shopDomain}.myshopify.com/admin/api/${credential.data.apiVersion}/webhooks/${webhookId}.json`,
          {
            method: 'DELETE',
            headers: {
              'X-Shopify-Access-Token': credential.data.accessToken,
              'Content-Type': 'application/json',
            },
          }
        );
      }

      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to remove webhooks' 
      };
    }
  },

  // Get available events for Shopify
  getAvailableEvents() {
    return SHOPIFY_EVENTS;
  },

  // Test Shopify API connection
  async testConnection(accessToken: string, shopDomain: string): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    return await this.getShopInfo(shopDomain + '.myshopify.com', accessToken);
  },
};