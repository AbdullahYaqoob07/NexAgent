"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  Settings,
  Building2,
  Plug2,
  Key,
  Users,
  Shield,
  Bell,
  Globe,
  Database,
  Code,
  Zap,
  Monitor,
  Server,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Edit3,
  Save,
  X,
  Check,
  AlertTriangle,
  RefreshCw,
  Download,
  Upload,
  Copy,
  ExternalLink,
  Mail,
  Smartphone,
  Clock,
  Calendar,
  Target,
  Activity,
  BarChart3,
  Sliders,
  Palette,
  Volume2,
  VolumeX,
  Moon,
  Sun,
  Cpu,
  HardDrive,
  Wifi,
  WifiOff,
  Power,
  PowerOff
} from "lucide-react";

// Types
interface SerializableUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  username: string;
  profileImageUrl: string;
  createdAt: number;
  lastSignInAt: number;
  emailVerified: boolean;
  phoneVerified: boolean;
}

interface WorkspaceSettings {
  name: string;
  description: string;
  timezone: string;
  language: string;
  region: string;
  autoSave: boolean;
  collaborationMode: 'open' | 'restricted' | 'private';
  defaultExecutionTimeout: number;
  maxWorkflowNodes: number;
  enableAnalytics: boolean;
}

interface IntegrationSettings {
  id: string;
  name: string;
  type: 'oauth' | 'api_key' | 'webhook';
  status: 'connected' | 'disconnected' | 'error' | 'pending';
  lastUsed: string | null;
  config: Record<string, any>;
  enabled: boolean;
}

interface APIKeySettings {
  id: string;
  name: string;
  key: string;
  scopes: string[];
  environment: 'production' | 'development' | 'staging';
  status: 'active' | 'inactive' | 'expired';
  lastUsed: string | null;
  expiresAt: string | null;
  rateLimit: number;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  status: 'active' | 'pending' | 'suspended';
  joinedAt: string;
  lastActive: string;
  permissions: string[];
}

interface SettingsData {
  workspace: WorkspaceSettings;
  integrations: IntegrationSettings[];
  apiKeys: APIKeySettings[];
  team: TeamMember[];
  security: {
    twoFactorRequired: boolean;
    sessionTimeout: number;
    ipWhitelist: string[];
    auditLogging: boolean;
    dataRetention: number;
    encryptionEnabled: boolean;
  };
  notifications: {
    email: {
      workflowFailures: boolean;
      teamInvites: boolean;
      systemUpdates: boolean;
      securityAlerts: boolean;
      usageAlerts: boolean;
    };
    slack: {
      enabled: boolean;
      webhookUrl: string;
      channels: string[];
    };
    webhooks: Array<{
      id: string;
      url: string;
      events: string[];
      enabled: boolean;
    }>;
  };
  advanced: {
    debugMode: boolean;
    experimentalFeatures: boolean;
    customDomain: string;
    ssoEnabled: boolean;
    apiRateLimit: number;
    storageQuota: number;
    backupEnabled: boolean;
    backupFrequency: 'daily' | 'weekly' | 'monthly';
  };
}

interface SettingsViewProps {
  user: SerializableUser;
}

export default function SettingsView({ user }: SettingsViewProps) {
  const [toasts, setToasts] = useState<Array<{id: string, message: string, type: 'success' | 'error' | 'info'}>>([]);
  
  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 3000);
  };

  // Mock settings data
  const [settings, setSettings] = useState<SettingsData>({
    workspace: {
      name: 'NexAgent Workspace',
      description: 'AI-powered workflow automation workspace for enterprise operations',
      timezone: 'America/New_York',
      language: 'en-US',
      region: 'us-east-1',
      autoSave: true,
      collaborationMode: 'restricted',
      defaultExecutionTimeout: 300,
      maxWorkflowNodes: 100,
      enableAnalytics: true
    },
    integrations: [
      {
        id: 'slack-1',
        name: 'Slack',
        type: 'oauth',
        status: 'connected',
        lastUsed: '2024-01-20T14:22:00Z',
        config: { workspace: 'nexagent-team', channels: ['#workflows', '#alerts'] },
        enabled: true
      },
      {
        id: 'github-1',
        name: 'GitHub',
        type: 'oauth',
        status: 'connected',
        lastUsed: '2024-01-19T10:15:00Z',
        config: { organization: 'nexagent-org', repositories: ['workflow-templates'] },
        enabled: true
      },
      {
        id: 'google-1',
        name: 'Google Workspace',
        type: 'oauth',
        status: 'disconnected',
        lastUsed: null,
        config: {},
        enabled: false
      },
      {
        id: 'aws-1',
        name: 'AWS',
        type: 'api_key',
        status: 'connected',
        lastUsed: '2024-01-20T16:30:00Z',
        config: { region: 'us-east-1', services: ['s3', 'lambda', 'ses'] },
        enabled: true
      }
    ],
    apiKeys: [
      {
        id: 'key-1',
        name: 'Production API Key',
        key: 'nx_prod_abc123def456ghi789',
        scopes: ['workflows.execute', 'analytics.read'],
        environment: 'production',
        status: 'active',
        lastUsed: '2024-01-20T14:22:00Z',
        expiresAt: '2024-12-31T23:59:59Z',
        rateLimit: 10000
      },
      {
        id: 'key-2',
        name: 'Development Key',
        key: 'nx_dev_xyz789abc012def345',
        scopes: ['workflows.execute', 'workflows.write'],
        environment: 'development',
        status: 'active',
        lastUsed: '2024-01-19T16:45:00Z',
        expiresAt: null,
        rateLimit: 1000
      }
    ],
    team: [
      {
        id: 'user-1',
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        role: 'owner',
        status: 'active',
        joinedAt: new Date(user.createdAt).toISOString(),
        lastActive: new Date(user.lastSignInAt).toISOString(),
        permissions: ['all']
      },
      {
        id: 'user-2',
        name: 'Sarah Johnson',
        email: 'sarah.johnson@company.com',
        role: 'admin',
        status: 'active',
        joinedAt: '2024-01-10T08:00:00Z',
        lastActive: '2024-01-20T15:30:00Z',
        permissions: ['workflows.manage', 'team.manage']
      },
      {
        id: 'user-3',
        name: 'Mike Chen',
        email: 'mike.chen@company.com',
        role: 'editor',
        status: 'active',
        joinedAt: '2024-01-12T10:00:00Z',
        lastActive: '2024-01-19T14:20:00Z',
        permissions: ['workflows.create', 'workflows.edit']
      }
    ],
    security: {
      twoFactorRequired: true,
      sessionTimeout: 8,
      ipWhitelist: ['192.168.1.0/24', '10.0.0.0/16'],
      auditLogging: true,
      dataRetention: 90,
      encryptionEnabled: true
    },
    notifications: {
      email: {
        workflowFailures: true,
        teamInvites: true,
        systemUpdates: false,
        securityAlerts: true,
        usageAlerts: true
      },
      slack: {
        enabled: true,
        webhookUrl: 'https://hooks.slack.com/services/...',
        channels: ['#workflows', '#alerts']
      },
      webhooks: [
        {
          id: 'webhook-1',
          url: 'https://api.company.com/nexagent/webhook',
          events: ['workflow.completed', 'workflow.failed'],
          enabled: true
        }
      ]
    },
    advanced: {
      debugMode: false,
      experimentalFeatures: true,
      customDomain: 'workflows.company.com',
      ssoEnabled: true,
      apiRateLimit: 10000,
      storageQuota: 100,
      backupEnabled: true,
      backupFrequency: 'daily'
    }
  });

  const [activeTab, setActiveTab] = useState<'workspace' | 'integrations' | 'team' | 'security' | 'notifications' | 'advanced'>('workspace');
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());

  const tabs = [
    { id: 'workspace', label: 'Workspace', icon: Building2 },
    { id: 'integrations', label: 'Integrations', icon: Plug2 },
    { id: 'team', label: 'Team', icon: Users },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'advanced', label: 'Advanced', icon: Settings }
  ] as const;

  const toggleKeyVisibility = (keyId: string) => {
    const newRevealed = new Set(revealedKeys);
    if (newRevealed.has(keyId)) {
      newRevealed.delete(keyId);
    } else {
      newRevealed.add(keyId);
    }
    setRevealedKeys(newRevealed);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      addToast('Copied to clipboard!', 'success');
    } catch (err) {
      addToast('Failed to copy', 'error');
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl lg:text-4xl font-bold text-white">Settings</h1>
          <p className="text-white/70 text-lg mt-1">Configure your workspace, integrations, and preferences</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" className="text-white/80 hover:text-white">
            <Download className="w-4 h-4 mr-2" />
            Export Config
          </Button>
          <Button variant="ghost" className="text-white/80 hover:text-white">
            <Upload className="w-4 h-4 mr-2" />
            Import Config
          </Button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-2">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-[#FF6900] text-white'
                    : 'text-white/70 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:block">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="space-y-8">
        {activeTab === 'workspace' && (
          <WorkspaceTab 
            settings={settings.workspace} 
            onUpdate={(updates) => setSettings(prev => ({ ...prev, workspace: { ...prev.workspace, ...updates } }))}
            addToast={addToast}
          />
        )}
        
        {activeTab === 'integrations' && (
          <IntegrationsTab 
            integrations={settings.integrations}
            apiKeys={settings.apiKeys}
            revealedKeys={revealedKeys}
            onToggleKeyVisibility={toggleKeyVisibility}
            onCopy={copyToClipboard}
            addToast={addToast}
          />
        )}
        
        {activeTab === 'team' && (
          <TeamTab 
            team={settings.team} 
            addToast={addToast}
          />
        )}
        
        {activeTab === 'security' && (
          <SecurityTab 
            settings={settings.security}
            onUpdate={(updates) => setSettings(prev => ({ ...prev, security: { ...prev.security, ...updates } }))}
            addToast={addToast}
          />
        )}
        
        {activeTab === 'notifications' && (
          <NotificationsTab 
            settings={settings.notifications}
            onUpdate={(updates) => setSettings(prev => ({ ...prev, notifications: { ...prev.notifications, ...updates } }))}
            addToast={addToast}
          />
        )}
        
        {activeTab === 'advanced' && (
          <AdvancedTab 
            settings={settings.advanced}
            onUpdate={(updates) => setSettings(prev => ({ ...prev, advanced: { ...prev.advanced, ...updates } }))}
            addToast={addToast}
          />
        )}
      </div>

      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`px-4 py-3 rounded-lg shadow-lg backdrop-blur-sm border animate-in slide-in-from-right duration-300 ${
              toast.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-400' :
              toast.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
              'bg-blue-500/10 border-blue-500/20 text-blue-400'
            }`}
          >
            <div className="flex items-center gap-2">
              {toast.type === 'success' && <Check className="w-4 h-4" />}
              {toast.type === 'error' && <AlertTriangle className="w-4 h-4" />}
              {toast.type === 'info' && <Clock className="w-4 h-4" />}
              <span className="text-sm font-medium">{toast.message}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function WorkspaceTab({ 
  settings, 
  onUpdate, 
  addToast 
}: { 
  settings: WorkspaceSettings; 
  onUpdate: (updates: Partial<WorkspaceSettings>) => void;
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedSettings, setEditedSettings] = useState(settings);

  const handleSave = () => {
    onUpdate(editedSettings);
    setIsEditing(false);
    addToast('Workspace settings updated successfully!', 'success');
  };

  const handleCancel = () => {
    setEditedSettings(settings);
    setIsEditing(false);
    addToast('Changes cancelled', 'info');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Basic Settings */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-white">Workspace Configuration</h3>
          {!isEditing && (
            <Button onClick={() => setIsEditing(true)} variant="ghost" size="sm" className="text-white/80">
              <Edit3 className="w-4 h-4 mr-2" />
              Edit
            </Button>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Workspace Name</label>
            {isEditing ? (
              <input
                type="text"
                value={editedSettings.name}
                onChange={(e) => setEditedSettings(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 bg-white/5 border border-white/15 rounded-lg text-white focus:border-[#FF6900] focus:outline-none"
              />
            ) : (
              <p className="text-white py-2">{settings.name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Description</label>
            {isEditing ? (
              <textarea
                value={editedSettings.description}
                onChange={(e) => setEditedSettings(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 bg-white/5 border border-white/15 rounded-lg text-white focus:border-[#FF6900] focus:outline-none resize-none"
              />
            ) : (
              <p className="text-white py-2">{settings.description}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">Timezone</label>
              {isEditing ? (
                <select
                  value={editedSettings.timezone}
                  onChange={(e) => setEditedSettings(prev => ({ ...prev, timezone: e.target.value }))}
                  className="w-full px-3 py-2 bg-white/5 border border-white/15 rounded-lg text-white focus:border-[#FF6900] focus:outline-none"
                >
                  <option value="America/New_York" className="bg-zinc-900">Eastern Time</option>
                  <option value="America/Chicago" className="bg-zinc-900">Central Time</option>
                  <option value="America/Denver" className="bg-zinc-900">Mountain Time</option>
                  <option value="America/Los_Angeles" className="bg-zinc-900">Pacific Time</option>
                  <option value="UTC" className="bg-zinc-900">UTC</option>
                </select>
              ) : (
                <p className="text-white py-2">{settings.timezone}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">Language</label>
              {isEditing ? (
                <select
                  value={editedSettings.language}
                  onChange={(e) => setEditedSettings(prev => ({ ...prev, language: e.target.value }))}
                  className="w-full px-3 py-2 bg-white/5 border border-white/15 rounded-lg text-white focus:border-[#FF6900] focus:outline-none"
                >
                  <option value="en-US" className="bg-zinc-900">English (US)</option>
                  <option value="en-GB" className="bg-zinc-900">English (UK)</option>
                  <option value="es-ES" className="bg-zinc-900">Spanish</option>
                  <option value="fr-FR" className="bg-zinc-900">French</option>
                  <option value="de-DE" className="bg-zinc-900">German</option>
                </select>
              ) : (
                <p className="text-white py-2">{settings.language}</p>
              )}
            </div>
          </div>
        </div>

        {isEditing && (
          <div className="flex gap-3 mt-6 pt-4 border-t border-white/10">
            <Button onClick={handleSave} className="bg-[#FF6900] hover:bg-[#E55D00] text-white">
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
            <Button onClick={handleCancel} variant="ghost" className="text-white/80">
              Cancel
            </Button>
          </div>
        )}
      </div>

      {/* Execution Settings */}
      <div className="space-y-8">
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h3 className="text-xl font-semibold text-white mb-6">Execution Settings</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
              <div>
                <h4 className="text-white font-medium">Auto-save workflows</h4>
                <p className="text-white/60 text-sm">Automatically save changes as you work</p>
              </div>
              <ToggleSwitch
                enabled={settings.autoSave}
                onToggle={(enabled) => {
                  onUpdate({ autoSave: enabled });
                  addToast(`Auto-save ${enabled ? 'enabled' : 'disabled'}`, 'success');
                }}
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
              <div>
                <h4 className="text-white font-medium">Analytics tracking</h4>
                <p className="text-white/60 text-sm">Collect usage analytics for insights</p>
              </div>
              <ToggleSwitch
                enabled={settings.enableAnalytics}
                onToggle={(enabled) => {
                  onUpdate({ enableAnalytics: enabled });
                  addToast(`Analytics ${enabled ? 'enabled' : 'disabled'}`, 'success');
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">Default Timeout (seconds)</label>
              <input
                type="number"
                value={settings.defaultExecutionTimeout}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  if (!isNaN(value)) {
                    onUpdate({ defaultExecutionTimeout: value });
                  }
                }}
                className="w-full px-3 py-2 bg-white/5 border border-white/15 rounded-lg text-white focus:border-[#FF6900] focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h3 className="text-xl font-semibold text-white mb-6">Collaboration</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white/80 mb-3">Access Mode</label>
              <div className="space-y-2">
                {[
                  { key: 'open', label: 'Open', desc: 'Anyone can view and edit workflows' },
                  { key: 'restricted', label: 'Restricted', desc: 'Only team members can access' },
                  { key: 'private', label: 'Private', desc: 'Only you can access' }
                ].map((mode) => (
                  <label key={mode.key} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-colors">
                    <input
                      type="radio"
                      name="collaborationMode"
                      value={mode.key}
                      checked={settings.collaborationMode === mode.key}
                      onChange={(e) => {
                        onUpdate({ collaborationMode: e.target.value as any });
                        addToast(`Collaboration mode set to ${mode.label}`, 'success');
                      }}
                      className="text-[#FF6900] bg-white/5 border-white/20 focus:ring-[#FF6900]"
                    />
                    <div>
                      <div className="text-white font-medium">{mode.label}</div>
                      <div className="text-white/60 text-sm">{mode.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function IntegrationsTab({
  integrations,
  apiKeys,
  revealedKeys,
  onToggleKeyVisibility,
  onCopy,
  addToast
}: {
  integrations: IntegrationSettings[];
  apiKeys: APIKeySettings[];
  revealedKeys: Set<string>;
  onToggleKeyVisibility: (keyId: string) => void;
  onCopy: (text: string) => void;
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
      case 'active':
        return 'text-green-400 bg-green-400/10 border-green-400/20';
      case 'disconnected':
      case 'inactive':
        return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
      case 'error':
      case 'expired':
        return 'text-red-400 bg-red-400/10 border-red-400/20';
      case 'pending':
        return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
      default:
        return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
    }
  };

  const formatApiKey = (key: string, isRevealed: boolean) => {
    if (isRevealed) return key;
    return key.substring(0, 8) + '•'.repeat(12) + key.substring(key.length - 4);
  };

  return (
    <div className="space-y-8">
      {/* Connected Services */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-white">Connected Services</h3>
          <Button className="bg-[#FF6900] hover:bg-[#E55D00] text-white">
            <Plus className="w-4 h-4 mr-2" />
            Add Integration
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {integrations.map((integration) => (
            <div key={integration.id} className="p-4 bg-white/5 rounded-lg border border-white/10 hover:border-white/20 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                    <Plug2 className="w-5 h-5 text-[#FF6900]" />
                  </div>
                  <div>
                    <h4 className="text-white font-medium">{integration.name}</h4>
                    <p className="text-white/60 text-sm capitalize">{integration.type.replace('_', ' ')}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full border ${getStatusColor(integration.status)}`}>
                  {integration.status}
                </span>
              </div>

              <div className="space-y-2 text-sm text-white/60 mb-4">
                {integration.lastUsed && (
                  <div>Last used: {new Date(integration.lastUsed).toLocaleDateString()}</div>
                )}
                {integration.config && Object.keys(integration.config).length > 0 && (
                  <div>Configured: {Object.keys(integration.config).join(', ')}</div>
                )}
              </div>

              <div className="flex gap-2">
                <Button size="sm" variant="ghost" className="text-white/80 hover:text-white flex-1">
                  <Settings className="w-4 h-4 mr-2" />
                  Configure
                </Button>
                <Button size="sm" variant="ghost" className="text-white/80 hover:text-white">
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* API Keys */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-white">API Keys</h3>
          <Button className="bg-[#FF6900] hover:bg-[#E55D00] text-white">
            <Plus className="w-4 h-4 mr-2" />
            Generate Key
          </Button>
        </div>

        <div className="space-y-4">
          {apiKeys.map((apiKey) => (
            <div key={apiKey.id} className="p-4 bg-white/5 rounded-lg border border-white/10">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="text-white font-medium">{apiKey.name}</h4>
                  <div className="flex items-center gap-3 mt-1">
                    <span className={`px-2 py-1 text-xs rounded-full border ${getStatusColor(apiKey.status)}`}>
                      {apiKey.status}
                    </span>
                    <span className={`px-2 py-1 text-xs rounded-full border ${
                      apiKey.environment === 'production' ? 'text-red-400 bg-red-400/10 border-red-400/20' :
                      apiKey.environment === 'development' ? 'text-blue-400 bg-blue-400/10 border-blue-400/20' :
                      'text-orange-400 bg-orange-400/10 border-orange-400/20'
                    }`}>
                      {apiKey.environment}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onToggleKeyVisibility(apiKey.id)}
                    className="text-white/60 hover:text-white"
                  >
                    {revealedKeys.has(apiKey.id) ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onCopy(apiKey.key)}
                    className="text-white/60 hover:text-white"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-lg p-3 mb-3">
                <code className="text-sm font-mono text-white/90">
                  {formatApiKey(apiKey.key, revealedKeys.has(apiKey.id))}
                </code>
              </div>

              <div className="flex flex-wrap gap-2 mb-3">
                {apiKey.scopes.map((scope, idx) => (
                  <span key={idx} className="px-2 py-1 text-xs bg-white/10 text-white/80 rounded">
                    {scope}
                  </span>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-4 text-sm text-white/60">
                <div>
                  <div>Last Used</div>
                  <div className="text-white">{apiKey.lastUsed ? new Date(apiKey.lastUsed).toLocaleDateString() : 'Never'}</div>
                </div>
                <div>
                  <div>Rate Limit</div>
                  <div className="text-white">{apiKey.rateLimit.toLocaleString()}/hour</div>
                </div>
                <div>
                  <div>Expires</div>
                  <div className="text-white">{apiKey.expiresAt ? new Date(apiKey.expiresAt).toLocaleDateString() : 'Never'}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TeamTab({ 
  team, 
  addToast 
}: { 
  team: TeamMember[]; 
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}) {
  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner': return 'text-purple-400 bg-purple-400/10 border-purple-400/20';
      case 'admin': return 'text-red-400 bg-red-400/10 border-red-400/20';
      case 'editor': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
      case 'viewer': return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
      default: return 'text-white/60 bg-white/10 border-white/20';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-400 bg-green-400/10 border-green-400/20';
      case 'pending': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
      case 'suspended': return 'text-red-400 bg-red-400/10 border-red-400/20';
      default: return 'text-white/60 bg-white/10 border-white/20';
    }
  };

  return (
    <div className="space-y-8">
      {/* Team Overview */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-white">Team Members</h3>
          <Button 
            className="bg-[#FF6900] hover:bg-[#E55D00] text-white"
            onClick={() => addToast('Invite feature coming soon!', 'info')}
          >
            <Plus className="w-4 h-4 mr-2" />
            Invite Member
          </Button>
        </div>

        <div className="space-y-4">
          {team.map((member) => (
            <div key={member.id} className="p-4 bg-white/5 rounded-lg border border-white/10 hover:border-white/20 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#FF6900] to-[#FF8555] flex items-center justify-center text-white font-bold">
                    {member.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <h4 className="text-white font-medium">{member.name}</h4>
                    <p className="text-white/60 text-sm">{member.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-1 text-xs rounded-full border ${getRoleColor(member.role)}`}>
                        {member.role}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded-full border ${getStatusColor(member.status)}`}>
                        {member.status}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 text-sm text-white/60">
                  <div className="text-right">
                    <div>Joined {new Date(member.joinedAt).toLocaleDateString()}</div>
                    <div>Active {new Date(member.lastActive).toLocaleDateString()}</div>
                  </div>
                  {member.role !== 'owner' && (
                    <div className="flex gap-2 ml-4">
                      <Button size="sm" variant="ghost" className="text-white/60 hover:text-white">
                        <Edit3 className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              
              {member.permissions.length > 0 && member.permissions[0] !== 'all' && (
                <div className="mt-3 pt-3 border-t border-white/10">
                  <div className="flex flex-wrap gap-2">
                    {member.permissions.map((permission, idx) => (
                      <span key={idx} className="px-2 py-1 text-xs bg-white/10 text-white/70 rounded">
                        {permission}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SecurityTab({ 
  settings, 
  onUpdate, 
  addToast 
}: { 
  settings: SettingsData['security'];
  onUpdate: (updates: Partial<SettingsData['security']>) => void;
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Authentication */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h3 className="text-xl font-semibold text-white mb-6">Authentication & Access</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
            <div>
              <h4 className="text-white font-medium">Require 2FA for all users</h4>
              <p className="text-white/60 text-sm">Enforce two-factor authentication</p>
            </div>
            <ToggleSwitch
              enabled={settings.twoFactorRequired}
              onToggle={(enabled) => {
                onUpdate({ twoFactorRequired: enabled });
                addToast(`2FA requirement ${enabled ? 'enabled' : 'disabled'}`, 'success');
              }}
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
            <div>
              <h4 className="text-white font-medium">Audit logging</h4>
              <p className="text-white/60 text-sm">Track all user actions and changes</p>
            </div>
            <ToggleSwitch
              enabled={settings.auditLogging}
              onToggle={(enabled) => {
                onUpdate({ auditLogging: enabled });
                addToast(`Audit logging ${enabled ? 'enabled' : 'disabled'}`, 'success');
              }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Session Timeout (hours)</label>
            <input
              type="number"
              value={settings.sessionTimeout}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                if (!isNaN(value)) {
                  onUpdate({ sessionTimeout: value });
                  addToast('Session timeout updated', 'success');
                }
              }}
              min="1"
              max="24"
              className="w-full px-3 py-2 bg-white/5 border border-white/15 rounded-lg text-white focus:border-[#FF6900] focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Data Protection */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h3 className="text-xl font-semibold text-white mb-6">Data Protection</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
            <div>
              <h4 className="text-white font-medium">End-to-end encryption</h4>
              <p className="text-white/60 text-sm">Encrypt sensitive workflow data</p>
            </div>
            <ToggleSwitch
              enabled={settings.encryptionEnabled}
              onToggle={(enabled) => {
                onUpdate({ encryptionEnabled: enabled });
                addToast(`Encryption ${enabled ? 'enabled' : 'disabled'}`, 'success');
              }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Data Retention (days)</label>
            <input
              type="number"
              value={settings.dataRetention}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                if (!isNaN(value)) {
                  onUpdate({ dataRetention: value });
                  addToast('Data retention updated', 'success');
                }
              }}
              min="30"
              max="365"
              className="w-full px-3 py-2 bg-white/5 border border-white/15 rounded-lg text-white focus:border-[#FF6900] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">IP Whitelist</label>
            <div className="space-y-2">
              {settings.ipWhitelist.map((ip, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={ip}
                    onChange={(e) => {
                      const newWhitelist = [...settings.ipWhitelist];
                      newWhitelist[index] = e.target.value;
                      onUpdate({ ipWhitelist: newWhitelist });
                    }}
                    className="flex-1 px-3 py-2 bg-white/5 border border-white/15 rounded-lg text-white focus:border-[#FF6900] focus:outline-none"
                    placeholder="192.168.1.0/24"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-400 hover:text-red-300"
                    onClick={() => {
                      const newWhitelist = settings.ipWhitelist.filter((_, i) => i !== index);
                      onUpdate({ ipWhitelist: newWhitelist });
                      addToast('IP address removed', 'success');
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <Button
                size="sm"
                variant="ghost"
                className="text-[#FF6900] hover:text-[#E55D00]"
                onClick={() => {
                  const newWhitelist = [...settings.ipWhitelist, ''];
                  onUpdate({ ipWhitelist: newWhitelist });
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add IP Range
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function NotificationsTab({
  settings,
  onUpdate,
  addToast
}: {
  settings: SettingsData['notifications'];
  onUpdate: (updates: Partial<SettingsData['notifications']>) => void;
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}) {
  const handleEmailToggle = (key: keyof typeof settings.email) => {
    onUpdate({
      email: {
        ...settings.email,
        [key]: !settings.email[key]
      }
    });
    addToast(`${key.replace(/([A-Z])/g, ' $1').trim()} email notifications ${settings.email[key] ? 'disabled' : 'enabled'}`, 'success');
  };

  return (
    <div className="space-y-8">
      {/* Email Notifications */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h3 className="text-xl font-semibold text-white mb-6">Email Notifications</h3>
        <div className="space-y-4">
          {Object.entries(settings.email).map(([key, enabled]) => (
            <div key={key} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
              <div>
                <h4 className="text-white font-medium capitalize">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </h4>
                <p className="text-white/60 text-sm">
                  {key === 'workflowFailures' && 'Get notified when workflows fail to execute'}
                  {key === 'teamInvites' && 'Notifications about team member invitations'}
                  {key === 'systemUpdates' && 'Platform updates and maintenance notifications'}
                  {key === 'securityAlerts' && 'Important security-related notifications'}
                  {key === 'usageAlerts' && 'Usage limits and quota notifications'}
                </p>
              </div>
              <ToggleSwitch
                enabled={enabled}
                onToggle={() => handleEmailToggle(key as keyof typeof settings.email)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Slack Integration */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h3 className="text-xl font-semibold text-white mb-6">Slack Integration</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
            <div>
              <h4 className="text-white font-medium">Enable Slack notifications</h4>
              <p className="text-white/60 text-sm">Send notifications to your Slack workspace</p>
            </div>
            <ToggleSwitch
              enabled={settings.slack.enabled}
              onToggle={(enabled) => {
                onUpdate({
                  slack: {
                    ...settings.slack,
                    enabled
                  }
                });
                addToast(`Slack notifications ${enabled ? 'enabled' : 'disabled'}`, 'success');
              }}
            />
          </div>

          {settings.slack.enabled && (
            <>
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Webhook URL</label>
                <input
                  type="url"
                  value={settings.slack.webhookUrl}
                  onChange={(e) => onUpdate({
                    slack: {
                      ...settings.slack,
                      webhookUrl: e.target.value
                    }
                  })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/15 rounded-lg text-white focus:border-[#FF6900] focus:outline-none"
                  placeholder="https://hooks.slack.com/services/..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Channels</label>
                <div className="flex flex-wrap gap-2">
                  {settings.slack.channels.map((channel, index) => (
                    <span key={index} className="px-2 py-1 text-sm bg-white/10 text-white/80 rounded">
                      {channel}
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Webhooks */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-white">Webhooks</h3>
          <Button 
            className="bg-[#FF6900] hover:bg-[#E55D00] text-white"
            onClick={() => addToast('Webhook creation feature coming soon!', 'info')}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Webhook
          </Button>
        </div>

        <div className="space-y-4">
          {settings.webhooks.map((webhook) => (
            <div key={webhook.id} className="p-4 bg-white/5 rounded-lg border border-white/10">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="text-white font-medium">{webhook.url}</h4>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {webhook.events.map((event, idx) => (
                      <span key={idx} className="px-2 py-1 text-xs bg-white/10 text-white/70 rounded">
                        {event}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <ToggleSwitch
                    enabled={webhook.enabled}
                    onToggle={(enabled) => {
                      const updatedWebhooks = settings.webhooks.map(w =>
                        w.id === webhook.id ? { ...w, enabled } : w
                      );
                      onUpdate({ webhooks: updatedWebhooks });
                      addToast(`Webhook ${enabled ? 'enabled' : 'disabled'}`, 'success');
                    }}
                  />
                  <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AdvancedTab({
  settings,
  onUpdate,
  addToast
}: {
  settings: SettingsData['advanced'];
  onUpdate: (updates: Partial<SettingsData['advanced']>) => void;
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Developer Settings */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h3 className="text-xl font-semibold text-white mb-6">Developer Settings</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
            <div>
              <h4 className="text-white font-medium">Debug mode</h4>
              <p className="text-white/60 text-sm">Enable detailed logging and debugging</p>
            </div>
            <ToggleSwitch
              enabled={settings.debugMode}
              onToggle={(enabled) => {
                onUpdate({ debugMode: enabled });
                addToast(`Debug mode ${enabled ? 'enabled' : 'disabled'}`, 'success');
              }}
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
            <div>
              <h4 className="text-white font-medium">Experimental features</h4>
              <p className="text-white/60 text-sm">Access beta features and new capabilities</p>
            </div>
            <ToggleSwitch
              enabled={settings.experimentalFeatures}
              onToggle={(enabled) => {
                onUpdate({ experimentalFeatures: enabled });
                addToast(`Experimental features ${enabled ? 'enabled' : 'disabled'}`, 'success');
              }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">API Rate Limit (requests/hour)</label>
            <input
              type="number"
              value={settings.apiRateLimit}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                if (!isNaN(value)) {
                  onUpdate({ apiRateLimit: value });
                }
              }}
              className="w-full px-3 py-2 bg-white/5 border border-white/15 rounded-lg text-white focus:border-[#FF6900] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Custom Domain</label>
            <input
              type="text"
              value={settings.customDomain}
              onChange={(e) => onUpdate({ customDomain: e.target.value })}
              className="w-full px-3 py-2 bg-white/5 border border-white/15 rounded-lg text-white focus:border-[#FF6900] focus:outline-none"
              placeholder="workflows.company.com"
            />
          </div>
        </div>
      </div>

      {/* System Settings */}
      <div className="space-y-8">
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h3 className="text-xl font-semibold text-white mb-6">System & Storage</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
              <div>
                <h4 className="text-white font-medium">Single Sign-On (SSO)</h4>
                <p className="text-white/60 text-sm">Enable SAML/OIDC authentication</p>
              </div>
              <ToggleSwitch
                enabled={settings.ssoEnabled}
                onToggle={(enabled) => {
                  onUpdate({ ssoEnabled: enabled });
                  addToast(`SSO ${enabled ? 'enabled' : 'disabled'}`, 'success');
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">Storage Quota (GB)</label>
              <input
                type="number"
                value={settings.storageQuota}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  if (!isNaN(value)) {
                    onUpdate({ storageQuota: value });
                  }
                }}
                className="w-full px-3 py-2 bg-white/5 border border-white/15 rounded-lg text-white focus:border-[#FF6900] focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h3 className="text-xl font-semibold text-white mb-6">Backup & Recovery</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
              <div>
                <h4 className="text-white font-medium">Automated backups</h4>
                <p className="text-white/60 text-sm">Regularly backup workflow data</p>
              </div>
              <ToggleSwitch
                enabled={settings.backupEnabled}
                onToggle={(enabled) => {
                  onUpdate({ backupEnabled: enabled });
                  addToast(`Automated backups ${enabled ? 'enabled' : 'disabled'}`, 'success');
                }}
              />
            </div>

            {settings.backupEnabled && (
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Backup Frequency</label>
                <select
                  value={settings.backupFrequency}
                  onChange={(e) => onUpdate({ backupFrequency: e.target.value as any })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/15 rounded-lg text-white focus:border-[#FF6900] focus:outline-none"
                >
                  <option value="daily" className="bg-zinc-900">Daily</option>
                  <option value="weekly" className="bg-zinc-900">Weekly</option>
                  <option value="monthly" className="bg-zinc-900">Monthly</option>
                </select>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ToggleSwitch({ 
  enabled, 
  onToggle 
}: { 
  enabled: boolean; 
  onToggle: (enabled: boolean) => void; 
}) {
  return (
    <button
      onClick={() => onToggle(!enabled)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#FF6900]/50 ${
        enabled ? 'bg-[#FF6900]' : 'bg-white/20'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}