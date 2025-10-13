import { NextRequest, NextResponse } from 'next/server';
import { PLATFORM_EVENTS } from '@/lib/schemas/node';
import { auth } from '@/lib/auth-server';
import { nodeDefinitionsService } from '@/lib/firestore';

// GET /api/admin/nodes/metadata - Get platform events, categories, and other metadata
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const type = url.searchParams.get('type');

    // Get existing categories from database
    const categories = await nodeDefinitionsService.getCategories();
    const subcategories = {}; // TODO: Implement subcategories if needed

    const metadata = {
      // Platform events for triggers
      platformEvents: PLATFORM_EVENTS,
      
      // Existing categories
      categories: categories.length > 0 ? categories : [
        'Triggers',
        'Actions', 
        'Data',
        'Communication',
        'Logic',
        'Utilities',
        'Integrations',
        'AI/ML',
        'Storage',
        'Notifications'
      ],
      
      // Subcategories by category
      subcategories,
      
      // Popular integrations
      integrations: [
        { id: 'shopify', name: 'Shopify', category: 'E-commerce' },
        { id: 'stripe', name: 'Stripe', category: 'Payments' },
        { id: 'mailchimp', name: 'Mailchimp', category: 'Email Marketing' },
        { id: 'slack', name: 'Slack', category: 'Communication' },
        { id: 'discord', name: 'Discord', category: 'Communication' },
        { id: 'gmail', name: 'Gmail', category: 'Email' },
        { id: 'hubspot', name: 'HubSpot', category: 'CRM' },
        { id: 'woocommerce', name: 'WooCommerce', category: 'E-commerce' },
        { id: 'openai', name: 'OpenAI', category: 'AI/ML' },
        { id: 'anthropic', name: 'Anthropic', category: 'AI/ML' }
      ],
      
      // Field types for form building
      fieldTypes: [
        { type: 'text', label: 'Text Input', icon: '📝' },
        { type: 'textarea', label: 'Textarea', icon: '📄' },
        { type: 'number', label: 'Number', icon: '🔢' },
        { type: 'boolean', label: 'Toggle/Checkbox', icon: '☑️' },
        { type: 'select', label: 'Dropdown', icon: '⬇️' },
        { type: 'multiselect', label: 'Multi-select', icon: '☑️' },
        { type: 'json', label: 'JSON Editor', icon: '{}' },
        { type: 'code', label: 'Code Editor', icon: '</>' },
        { type: 'url', label: 'URL Input', icon: '🔗' },
        { type: 'email', label: 'Email Input', icon: '✉️' },
        { type: 'password', label: 'Password Input', icon: '🔐' },
        { type: 'date', label: 'Date Picker', icon: '📅' },
        { type: 'datetime', label: 'DateTime Picker', icon: '📅' },
        { type: 'file', label: 'File Upload', icon: '📎' },
        { type: 'color', label: 'Color Picker', icon: '🎨' },
        { type: 'range', label: 'Range Slider', icon: '🎛️' }
      ],
      
      // Trigger types
      triggerTypes: [
        { type: 'manual', label: 'Manual Trigger', description: 'User initiated action' },
        { type: 'webhook', label: 'Webhook', description: 'HTTP webhook endpoint' },
        { type: 'schedule', label: 'Scheduled', description: 'Time-based trigger (cron)' },
        { type: 'event', label: 'Platform Event', description: 'Listen to platform events (Shopify orders, etc.)' },
        { type: 'file_watch', label: 'File Watcher', description: 'Monitor file system changes' },
        { type: 'database', label: 'Database Event', description: 'Database change triggers' },
        { type: 'api_poll', label: 'API Polling', description: 'Regular API polling' }
      ],

      // Implementation types
      implementationTypes: [
        { type: 'javascript', label: 'JavaScript', description: 'Custom JavaScript code' },
        { type: 'python', label: 'Python', description: 'Custom Python script' },
        { type: 'api', label: 'API Call', description: 'HTTP API endpoint' },
        { type: 'builtin', label: 'Built-in Handler', description: 'Pre-built system handler' }
      ],

      // Common validation patterns
      validationPatterns: {
        email: '^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$',
        url: 'https?:\\/\\/(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b([-a-zA-Z0-9()@:%_\\+.~#?&//=]*)',
        phone: '^[\\+]?[1-9][\\d]{0,15}$',
        uuid: '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$',
        alphanumeric: '^[a-zA-Z0-9]+$',
        slug: '^[a-z0-9]+(?:-[a-z0-9]+)*$'
      }
    };

    // Filter by type if specified
    if (type) {
      const filteredData: any = {};
      if (type === 'events') filteredData.platformEvents = metadata.platformEvents;
      if (type === 'categories') filteredData.categories = metadata.categories;
      if (type === 'integrations') filteredData.integrations = metadata.integrations;
      if (type === 'fieldTypes') filteredData.fieldTypes = metadata.fieldTypes;
      if (type === 'triggerTypes') filteredData.triggerTypes = metadata.triggerTypes;
      
      return NextResponse.json({
        success: true,
        data: filteredData
      });
    }

    return NextResponse.json({
      success: true,
      data: metadata
    });
    
  } catch (error) {
    console.error('Error fetching node metadata:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch metadata' },
      { status: 500 }
    );
  }
}