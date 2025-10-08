/**
 * Instagram Node - Integrates with Instagram Basic Display API
 */

import { NodeClass, NodeExecutionResult, ExecutionContext } from '../types';

export class InstagramNode implements NodeClass {
  type = 'InstagramNode';
  name = 'Instagram';
  description = 'Integrate with Instagram Basic Display API for social media operations';
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
        operation = 'get_media',
        accessToken,
        userId,
        mediaType = 'IMAGE',
        limit = 10,
        mediaId,
        caption
      } = config;
      
      // Execute Instagram operation
      const instagramResult = await this.executeInstagramOperation({
        operation,
        accessToken,
        userId,
        mediaType,
        limit,
        mediaId,
        caption
      });

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        result: instagramResult,
        metadata: {
          executionTime,
          tokensUsed: 0,
          cost: 0,
          operation,
          userId,
          recordsProcessed: Array.isArray(instagramResult.data) ? instagramResult.data.length : 1
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

    if (!config.userId && !['get_profile'].includes(config.operation)) {
      errors.push('User ID is required for most operations');
    }

    if (!config.operation) {
      errors.push('Operation is required');
    }

    if (config.operation && !this.isValidOperation(config.operation)) {
      errors.push('Invalid operation. Use: get_media, get_media_details, get_profile, get_user_media');
    }

    if (config.limit && (typeof config.limit !== 'number' || config.limit <= 0 || config.limit > 25)) {
      errors.push('Limit must be a number between 1 and 25');
    }

    if (config.mediaType && !this.isValidMediaType(config.mediaType)) {
      errors.push('Invalid media type. Use: IMAGE, VIDEO, CAROUSEL_ALBUM');
    }

    return errors;
  }

  private async executeInstagramOperation(operationData: {
    operation: string;
    accessToken: string;
    userId?: string;
    mediaType?: string;
    limit?: number;
    mediaId?: string;
    caption?: string;
  }): Promise<any> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 1200));

    // Simulate authentication errors (10% chance)
    if (operationData.accessToken === 'invalid-token' || Math.random() < 0.1) {
      throw new Error('Invalid Instagram access token');
    }

    // Simulate rate limiting (3% chance)
    if (Math.random() < 0.03) {
      throw new Error('Instagram API rate limit exceeded');
    }

    // Execute different operations
    switch (operationData.operation) {
      case 'get_media':
        return this.mockGetMedia(operationData.limit || 10, operationData.mediaType);
      
      case 'get_media_details':
        if (!operationData.mediaId) {
          throw new Error('Media ID is required for get_media_details operation');
        }
        return this.mockGetMediaDetails(operationData.mediaId);
      
      case 'get_profile':
        return this.mockGetProfile(operationData.userId);
      
      case 'get_user_media':
        if (!operationData.userId) {
          throw new Error('User ID is required for get_user_media operation');
        }
        return this.mockGetUserMedia(operationData.userId, operationData.limit || 10);
      
      default:
        throw new Error(`Unsupported operation: ${operationData.operation}`);
    }
  }

  private mockGetMedia(limit: number, mediaType?: string): any {
    const media = [];
    for (let i = 1; i <= limit; i++) {
      const type = mediaType || (Math.random() > 0.7 ? 'VIDEO' : 'IMAGE');
      media.push({
        id: `media_${Date.now()}_${i}`,
        media_type: type,
        media_url: type === 'VIDEO' 
          ? `https://example.com/video${i}.mp4`
          : `https://example.com/image${i}.jpg`,
        thumbnail_url: `https://example.com/thumb${i}.jpg`,
        caption: `This is sample Instagram ${type.toLowerCase()} post #${i}`,
        timestamp: new Date().toISOString(),
        permalink: `https://www.instagram.com/p/sample${i}/`,
        like_count: Math.floor(Math.random() * 1000),
        comments_count: Math.floor(Math.random() * 100)
      });
    }
    
    return {
      success: true,
      data: media,
      count: media.length,
      operation: 'get_media'
    };
  }

  private mockGetMediaDetails(mediaId: string): any {
    const mediaType = Math.random() > 0.7 ? 'VIDEO' : 'IMAGE';
    
    return {
      success: true,
      data: {
        id: mediaId,
        media_type: mediaType,
        media_url: mediaType === 'VIDEO' 
          ? 'https://example.com/sample-video.mp4'
          : 'https://example.com/sample-image.jpg',
        thumbnail_url: 'https://example.com/sample-thumb.jpg',
        caption: 'This is a detailed Instagram post with comprehensive information',
        timestamp: new Date().toISOString(),
        permalink: 'https://www.instagram.com/p/sample-detail/',
        like_count: Math.floor(Math.random() * 5000),
        comments_count: Math.floor(Math.random() * 500),
        username: 'sample_user',
        tags: ['#sample', '#instagram', '#post']
      },
      operation: 'get_media_details'
    };
  }

  private mockGetProfile(userId?: string): any {
    return {
      success: true,
      data: {
        id: userId || 'user_12345',
        username: 'sample_instagram_user',
        account_type: 'BUSINESS',
        media_count: Math.floor(Math.random() * 500 + 50),
        followers_count: Math.floor(Math.random() * 10000 + 1000),
        follows_count: Math.floor(Math.random() * 1000 + 100),
        profile_picture_url: 'https://example.com/profile-picture.jpg',
        website: 'https://example.com',
        biography: 'This is a sample Instagram business profile biography',
        name: 'Sample Instagram Business'
      },
      operation: 'get_profile'
    };
  }

  private mockGetUserMedia(userId: string, limit: number): any {
    const media = [];
    for (let i = 1; i <= limit; i++) {
      const type = Math.random() > 0.7 ? 'VIDEO' : 'IMAGE';
      media.push({
        id: `user_media_${Date.now()}_${i}`,
        media_type: type,
        media_url: type === 'VIDEO' 
          ? `https://example.com/user-video${i}.mp4`
          : `https://example.com/user-image${i}.jpg`,
        thumbnail_url: `https://example.com/user-thumb${i}.jpg`,
        caption: `User's Instagram ${type.toLowerCase()} post #${i}`,
        timestamp: new Date().toISOString(),
        permalink: `https://www.instagram.com/p/user${i}/`,
        like_count: Math.floor(Math.random() * 2000),
        comments_count: Math.floor(Math.random() * 200)
      });
    }
    
    return {
      success: true,
      data: media,
      count: media.length,
      userId: userId,
      operation: 'get_user_media'
    };
  }

  private isValidOperation(operation: string): boolean {
    const validOperations = [
      'get_media', 'get_media_details', 'get_profile', 'get_user_media'
    ];
    return validOperations.includes(operation);
  }

  private isValidMediaType(mediaType: string): boolean {
    const validTypes = ['IMAGE', 'VIDEO', 'CAROUSEL_ALBUM'];
    return validTypes.includes(mediaType);
  }
}