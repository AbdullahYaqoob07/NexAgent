/**
 * Facebook Node - Integrates with Facebook Graph API
 */

import { NodeClass, NodeExecutionResult, ExecutionContext } from '../types';

export class FacebookNode implements NodeClass {
  type = 'FacebookNode';
  name = 'Facebook';
  description = 'Integrate with Facebook Graph API for social media marketing';
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
        operation = 'post_to_page',
        pageId,
        accessToken,
        message,
        link,
        imageUrl,
        limit = 10,
        postId
      } = config;
      
      // Execute Facebook operation
      const facebookResult = await this.executeFacebookOperation({
        operation,
        pageId,
        accessToken,
        message,
        link,
        imageUrl,
        limit,
        postId
      });

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        result: facebookResult,
        metadata: {
          executionTime,
          tokensUsed: 0,
          cost: 0,
          operation,
          pageId,
          recordsProcessed: Array.isArray(facebookResult.data) ? facebookResult.data.length : 1
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

    if (!config.accessToken) {
      errors.push('Access token is required');
    }

    if (!config.operation) {
      errors.push('Operation is required');
    }

    if (config.operation && !this.isValidOperation(config.operation)) {
      errors.push('Invalid operation. Use: post_to_page, get_posts, get_page_info, get_insights, delete_post');
    }

    // Operation-specific validation
    if (['post_to_page', 'get_posts', 'get_page_info', 'get_insights'].includes(config.operation) && !config.pageId) {
      errors.push('Page ID is required for page operations');
    }

    if (config.operation === 'post_to_page' && !config.message) {
      errors.push('Message is required for posting');
    }

    if (config.operation === 'delete_post' && !config.postId) {
      errors.push('Post ID is required for delete operation');
    }

    if (config.limit && (typeof config.limit !== 'number' || config.limit <= 0 || config.limit > 100)) {
      errors.push('Limit must be a number between 1 and 100');
    }

    return errors;
  }

  private async executeFacebookOperation(operationData: {
    operation: string;
    pageId?: string;
    accessToken: string;
    message?: string;
    link?: string;
    imageUrl?: string;
    limit?: number;
    postId?: string;
  }): Promise<any> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 400 + Math.random() * 1600));

    // Simulate authentication errors (8% chance)
    if (operationData.accessToken === 'invalid-token' || Math.random() < 0.08) {
      throw new Error('Invalid Facebook access token');
    }

    // Simulate rate limiting (4% chance)
    if (Math.random() < 0.04) {
      throw new Error('Facebook API rate limit exceeded');
    }

    // Execute different operations
    switch (operationData.operation) {
      case 'post_to_page':
        return this.mockPostToPage(operationData.pageId!, operationData.message!, operationData.link, operationData.imageUrl);
      
      case 'get_posts':
        return this.mockGetPosts(operationData.pageId!, operationData.limit || 10);
      
      case 'get_page_info':
        return this.mockGetPageInfo(operationData.pageId!);
      
      case 'get_insights':
        return this.mockGetInsights(operationData.pageId!);
      
      case 'delete_post':
        if (!operationData.postId) {
          throw new Error('Post ID is required for delete_post operation');
        }
        return this.mockDeletePost(operationData.postId);
      
      default:
        throw new Error(`Unsupported operation: ${operationData.operation}`);
    }
  }

  private mockPostToPage(pageId: string, message: string, link?: string, imageUrl?: string): any {
    const postId = `${pageId}_${Date.now()}`;
    
    return {
      success: true,
      data: {
        id: postId,
        message: message,
        link: link || null,
        picture: imageUrl || null,
        created_time: new Date().toISOString(),
        permalink_url: `https://www.facebook.com/${pageId}/posts/${postId}`,
        status_type: link ? 'shared_story' : 'mobile_status_update',
        reactions: {
          like: Math.floor(Math.random() * 50),
          love: Math.floor(Math.random() * 20),
          haha: Math.floor(Math.random() * 10),
          wow: Math.floor(Math.random() * 5),
          sad: Math.floor(Math.random() * 3),
          angry: Math.floor(Math.random() * 2)
        },
        comments_count: Math.floor(Math.random() * 25),
        shares_count: Math.floor(Math.random() * 15)
      },
      operation: 'post_to_page'
    };
  }

  private mockGetPosts(pageId: string, limit: number): any {
    const posts = [];
    for (let i = 1; i <= limit; i++) {
      const postId = `${pageId}_${Date.now() - (i * 3600000)}`; // Each post 1 hour apart
      const hasLink = Math.random() > 0.6;
      const hasImage = Math.random() > 0.5;
      
      posts.push({
        id: postId,
        message: `Sample Facebook post #${i} - ${this.generateSampleMessage()}`,
        link: hasLink ? `https://example.com/article${i}` : null,
        picture: hasImage ? `https://example.com/image${i}.jpg` : null,
        created_time: new Date(Date.now() - (i * 3600000)).toISOString(),
        permalink_url: `https://www.facebook.com/${pageId}/posts/${postId}`,
        status_type: hasLink ? 'shared_story' : 'mobile_status_update',
        reactions: {
          like: Math.floor(Math.random() * 200),
          love: Math.floor(Math.random() * 50),
          haha: Math.floor(Math.random() * 30),
          wow: Math.floor(Math.random() * 20),
          sad: Math.floor(Math.random() * 10),
          angry: Math.floor(Math.random() * 5)
        },
        comments_count: Math.floor(Math.random() * 100),
        shares_count: Math.floor(Math.random() * 50)
      });
    }
    
    return {
      success: true,
      data: posts,
      count: posts.length,
      operation: 'get_posts'
    };
  }

  private mockGetPageInfo(pageId: string): any {
    return {
      success: true,
      data: {
        id: pageId,
        name: 'Sample Business Page',
        username: 'samplebusiness',
        category: 'Business & Economy',
        description: 'This is a sample Facebook business page for demonstration purposes',
        about: 'We provide excellent products and services to our customers',
        website: 'https://example.com',
        phone: '+1-555-0123',
        email: 'contact@samplebusiness.com',
        fan_count: Math.floor(Math.random() * 50000 + 10000),
        followers_count: Math.floor(Math.random() * 55000 + 10000),
        posts_count: Math.floor(Math.random() * 500 + 100),
        verification_status: 'blue_verified',
        picture: {
          data: {
            url: 'https://example.com/page-profile-picture.jpg'
          }
        },
        cover: {
          source: 'https://example.com/page-cover-photo.jpg'
        },
        created_time: '2020-01-01T00:00:00Z'
      },
      operation: 'get_page_info'
    };
  }

  private mockGetInsights(pageId: string): any {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - (30 * 24 * 60 * 60 * 1000)); // 30 days ago
    
    return {
      success: true,
      data: {
        page_id: pageId,
        period: {
          start: startDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0]
        },
        insights: {
          page_impressions: Math.floor(Math.random() * 100000 + 50000),
          page_reach: Math.floor(Math.random() * 50000 + 25000),
          page_views: Math.floor(Math.random() * 10000 + 5000),
          page_likes: Math.floor(Math.random() * 1000 + 500),
          page_unlikes: Math.floor(Math.random() * 50 + 10),
          post_engagements: Math.floor(Math.random() * 5000 + 2000),
          page_fan_adds: Math.floor(Math.random() * 200 + 50),
          page_fan_removes: Math.floor(Math.random() * 30 + 5),
          page_video_views: Math.floor(Math.random() * 20000 + 5000)
        },
        demographics: {
          age_gender: {
            '18-24_male': Math.floor(Math.random() * 20 + 5),
            '18-24_female': Math.floor(Math.random() * 25 + 5),
            '25-34_male': Math.floor(Math.random() * 30 + 10),
            '25-34_female': Math.floor(Math.random() * 35 + 10),
            '35-44_male': Math.floor(Math.random() * 25 + 8),
            '35-44_female': Math.floor(Math.random() * 30 + 8),
            '45+_male': Math.floor(Math.random() * 15 + 3),
            '45+_female': Math.floor(Math.random() * 20 + 3)
          },
          countries: {
            'US': Math.floor(Math.random() * 40 + 30),
            'CA': Math.floor(Math.random() * 15 + 5),
            'GB': Math.floor(Math.random() * 12 + 3),
            'AU': Math.floor(Math.random() * 10 + 3),
            'Other': Math.floor(Math.random() * 23 + 7)
          }
        }
      },
      operation: 'get_insights'
    };
  }

  private mockDeletePost(postId: string): any {
    return {
      success: true,
      data: {
        id: postId,
        deleted: true,
        deleted_at: new Date().toISOString()
      },
      operation: 'delete_post'
    };
  }

  private generateSampleMessage(): string {
    const messages = [
      "Check out our latest product launch! We're excited to share this innovation with you.",
      "Thank you to all our customers for your continued support. Your feedback drives our innovation.",
      "Behind the scenes look at our team working hard to bring you the best experience.",
      "Don't miss our special promotion this week. Limited time offer!",
      "We're thrilled to announce our partnership with amazing organizations in our community.",
      "Customer spotlight: See how our products are making a difference in people's lives.",
      "Industry insights and trends that we think you'll find valuable.",
      "Join us at our upcoming event. We can't wait to meet you in person!"
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }

  private isValidOperation(operation: string): boolean {
    const validOperations = [
      'post_to_page', 'get_posts', 'get_page_info', 'get_insights', 'delete_post'
    ];
    return validOperations.includes(operation);
  }
}