import { credentialService } from './credentialService';

const META_CONFIG = {
  appId: process.env.META_APP_ID!,
  appSecret: process.env.META_APP_SECRET!,
  graphVersion: 'v20.0',
};

const scopes: Record<'facebook' | 'instagram', string[]> = {
  facebook: [
    'pages_show_list',
    'pages_read_engagement',
    'pages_manage_metadata',
    'pages_messaging',
    'instagram_basic',
    'instagram_manage_comments',
    'instagram_manage_messages',
    'instagram_manage_insights',
  ],
  instagram: [
    'instagram_basic',
    'instagram_manage_comments',
    'instagram_manage_messages',
    'instagram_manage_insights',
  ],
};

export const metaService = {
  generateAuthUrl(platform: 'facebook' | 'instagram', userId: string): string {
    const state = Buffer.from(JSON.stringify({ userId, platform })).toString('base64');
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/integrations/${platform}/callback`;
    const scope = scopes[platform].join(',');
    const params = new URLSearchParams({
      client_id: META_CONFIG.appId,
      redirect_uri: redirectUri,
      state,
      scope,
      response_type: 'code',
    });
    return `https://www.facebook.com/${META_CONFIG.graphVersion}/dialog/oauth?${params.toString()}`;
  },

  async handleOAuthCallback(platform: 'facebook' | 'instagram', params: {
    code?: string;
    state?: string;
  }): Promise<{ success: boolean; credentialId?: string; error?: string; }> {
    try {
      const { code, state } = params;
      if (!code || !state) return { success: false, error: 'Missing code or state' };

      const decoded = JSON.parse(Buffer.from(state, 'base64').toString());
      const userId = decoded.userId as string;
      const redirectUri = `${process.env.NEXTAUTH_URL}/api/integrations/${platform}/callback`;

      // Exchange code for user access token
      const tokenRes = await fetch(`https://graph.facebook.com/${META_CONFIG.graphVersion}/oauth/access_token?` +
        new URLSearchParams({
          client_id: META_CONFIG.appId,
          redirect_uri: redirectUri,
          client_secret: META_CONFIG.appSecret,
          code,
        }),
      );
      const tokenData = await tokenRes.json();
      if (!tokenRes.ok) {
        return { success: false, error: tokenData.error?.message || 'OAuth exchange failed' };
      }

      const accessToken = tokenData.access_token as string;
      const scopeStr = tokenData.scope || '';
      const scopeList = scopeStr ? (scopeStr as string).split(',') : scopes[platform];

      // Save OAuth credential
      const createPayload = {
        userId,
        name: `${platform.toUpperCase()} Account`,
        description: `${platform} OAuth credential`,
        platform: platform as any,
        type: 'oauth2' as const,
        status: 'active' as const,
        data: {
          accessToken,
          tokenType: 'Bearer',
          scope: scopeList,
          clientId: META_CONFIG.appId,
        },
        isActive: true,
      };

      const res = await credentialService.create(userId, createPayload as any);
      if (!res.success || !res.data) {
        return { success: false, error: res.error || 'Failed to save credential' };
      }

      return { success: true, credentialId: (res.data as any).id };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'OAuth callback failed' };
    }
  },
};
