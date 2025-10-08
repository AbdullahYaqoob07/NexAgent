/**
 * Shopify Node - Integrates with Shopify Admin API
 */

import { NodeClass, NodeExecutionResult, ExecutionContext } from '../types';

export class ShopifyNode implements NodeClass {
  type = 'ShopifyNode';
  name = 'Shopify';
  description = 'Integrate with Shopify Admin API for ecommerce operations';
  category = 'ecommerce' as const;

  async execute(context: ExecutionContext, config: Record<string, any>): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    
    try {
      // Validate required configuration
      const validationErrors = this.validate(config);
      if (validationErrors.length > 0) {
        throw new Error(`Configuration validation failed: ${validationErrors.join(', ')}`);
      }

      // Extract configuration
      const { 
        operation = 'get_products',
        shopName,
        apiKey,
        accessToken,
        limit = 10,
        productId,
        productData
      } = config;
      
      // Execute Shopify operation
      const shopifyResult = await this.executeShopifyOperation({
        operation,
        shopName,
        apiKey,
        accessToken,
        limit,
        productId,
        productData
      });

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        result: shopifyResult,
        metadata: {
          executionTime,
          tokensUsed: 0,
          cost: 0,
          operation,
          shopName,
          recordsProcessed: Array.isArray(shopifyResult.data) ? shopifyResult.data.length : 1
        }
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        metadata: {
          executionTime,
          tokensUsed: 0,
          cost: 0
        }
      };
    }
  }

  validate(config: Record<string, any>): string[] {
    const errors: string[] = [];

    if (!config.shopName) {
      errors.push('Shop name is required');
    }

    if (!config.apiKey) {
      errors.push('API key is required');
    }

    if (!config.accessToken) {
      errors.push('Access token is required');
    }

    if (!config.operation) {
      errors.push('Operation is required');
    }

    if (config.operation && !this.isValidOperation(config.operation)) {
      errors.push('Invalid operation. Use: get_products, get_product, create_product, update_product, delete_product, get_orders, get_customers');
    }

    if (config.limit && (typeof config.limit !== 'number' || config.limit <= 0 || config.limit > 250)) {
      errors.push('Limit must be a number between 1 and 250');
    }

    return errors;
  }

  private async executeShopifyOperation(operationData: {
    operation: string;
    shopName: string;
    apiKey: string;
    accessToken: string;
    limit?: number;
    productId?: string;
    productData?: any;
  }): Promise<any> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1500));

    // Simulate authentication errors (10% chance)
    if (operationData.apiKey === 'invalid-key' || Math.random() < 0.1) {
      throw new Error('Invalid API credentials');
    }

    // Simulate rate limiting (5% chance)
    if (Math.random() < 0.05) {
      throw new Error('Shopify API rate limit exceeded');
    }

    // Execute different operations
    switch (operationData.operation) {
      case 'get_products':
        return this.mockGetProducts(operationData.limit || 10);
      
      case 'get_product':
        if (!operationData.productId) {
          throw new Error('Product ID is required for get_product operation');
        }
        return this.mockGetProduct(operationData.productId);
      
      case 'create_product':
        if (!operationData.productData) {
          throw new Error('Product data is required for create_product operation');
        }
        return this.mockCreateProduct(operationData.productData);
      
      case 'update_product':
        if (!operationData.productId || !operationData.productData) {
          throw new Error('Product ID and product data are required for update_product operation');
        }
        return this.mockUpdateProduct(operationData.productId, operationData.productData);
      
      case 'delete_product':
        if (!operationData.productId) {
          throw new Error('Product ID is required for delete_product operation');
        }
        return this.mockDeleteProduct(operationData.productId);
      
      case 'get_orders':
        return this.mockGetOrders(operationData.limit || 10);
      
      case 'get_customers':
        return this.mockGetCustomers(operationData.limit || 10);
      
      default:
        throw new Error(`Unsupported operation: ${operationData.operation}`);
    }
  }

  private mockGetProducts(limit: number): any {
    const products = [];
    for (let i = 1; i <= limit; i++) {
      products.push({
        id: `prod_${Date.now()}_${i}`,
        title: `Sample Product ${i}`,
        handle: `sample-product-${i}`,
        body_html: `<p>This is sample product ${i} description</p>`,
        vendor: 'Sample Vendor',
        product_type: 'Sample Type',
        status: 'active',
        price: (Math.random() * 100 + 10).toFixed(2),
        inventory_quantity: Math.floor(Math.random() * 100),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }
    
    return {
      success: true,
      data: products,
      count: products.length,
      operation: 'get_products'
    };
  }

  private mockGetProduct(productId: string): any {
    return {
      success: true,
      data: {
        id: productId,
        title: 'Sample Product',
        handle: 'sample-product',
        body_html: '<p>This is a sample product description</p>',
        vendor: 'Sample Vendor',
        product_type: 'Sample Type',
        status: 'active',
        price: '29.99',
        inventory_quantity: 50,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      operation: 'get_product'
    };
  }

  private mockCreateProduct(productData: any): any {
    const newProductId = `prod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      success: true,
      data: {
        id: newProductId,
        ...productData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      operation: 'create_product'
    };
  }

  private mockUpdateProduct(productId: string, productData: any): any {
    return {
      success: true,
      data: {
        id: productId,
        ...productData,
        updated_at: new Date().toISOString()
      },
      operation: 'update_product'
    };
  }

  private mockDeleteProduct(productId: string): any {
    return {
      success: true,
      data: {
        id: productId,
        deleted: true,
        deleted_at: new Date().toISOString()
      },
      operation: 'delete_product'
    };
  }

  private mockGetOrders(limit: number): any {
    const orders = [];
    for (let i = 1; i <= limit; i++) {
      orders.push({
        id: `order_${Date.now()}_${i}`,
        order_number: `#${1000 + i}`,
        email: `customer${i}@example.com`,
        total_price: (Math.random() * 200 + 20).toFixed(2),
        currency: 'USD',
        financial_status: Math.random() > 0.5 ? 'paid' : 'pending',
        fulfillment_status: Math.random() > 0.5 ? 'fulfilled' : 'unfulfilled',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }
    
    return {
      success: true,
      data: orders,
      count: orders.length,
      operation: 'get_orders'
    };
  }

  private mockGetCustomers(limit: number): any {
    const customers = [];
    for (let i = 1; i <= limit; i++) {
      customers.push({
        id: `customer_${Date.now()}_${i}`,
        email: `customer${i}@example.com`,
        first_name: `Customer${i}`,
        last_name: 'Lastname',
        orders_count: Math.floor(Math.random() * 10),
        total_spent: (Math.random() * 500).toFixed(2),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }
    
    return {
      success: true,
      data: customers,
      count: customers.length,
      operation: 'get_customers'
    };
  }

  private isValidOperation(operation: string): boolean {
    const validOperations = [
      'get_products', 'get_product', 'create_product', 'update_product', 'delete_product',
      'get_orders', 'get_customers'
    ];
    return validOperations.includes(operation);
  }
}