"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  User as UserIcon, 
  Settings, 
  Shield, 
  CreditCard,
  Bell, 
  Globe, 
  Smartphone, 
  Mail,
  Phone,
  MapPin,
  Calendar,
  Edit3,
  Save,
  X,
  Check,
  AlertTriangle,
  Key,
  Eye,
  EyeOff,
  Download,
  Upload,
  Trash2,
  Plus,
  Link2,
  Github,
  Twitter,
  Linkedin,
  Monitor,
  Moon,
  Sun,
  Palette,
  Volume2,
  VolumeX,
  Zap,
  Activity,
  Clock,
  TrendingUp,
  Award,
  Star,
  Target
} from "lucide-react";
import Image from "next/image";

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

interface ProfileData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  username: string;
  profileImageUrl: string;
  createdAt: string;
  lastSignInAt: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  bio: string;
  title: string;
  company: string;
  location: string;
  website: string;
  timezone: string;
  phoneNumber: string;
  socialLinks: {
    github: string;
    twitter: string;
    linkedin: string;
  };
  preferences: {
    theme: 'dark' | 'light' | 'system';
    notifications: {
      email: boolean;
      push: boolean;
      sms: boolean;
      workflow: boolean;
      security: boolean;
      marketing: boolean;
    };
    privacy: {
      profileVisibility: 'public' | 'private' | 'team';
      activityVisibility: boolean;
      allowIndexing: boolean;
    };
    language: string;
    timezone: string;
  };
  subscription: {
    plan: 'Free' | 'Pro' | 'Enterprise';
    status: 'active' | 'cancelled' | 'past_due';
    renewsAt: string;
    usage: {
      workflowExecutions: number;
      apiCalls: number;
      storageUsed: number;
      teamMembers: number;
    };
    limits: {
      workflowExecutions: number;
      apiCalls: number;
      storageLimit: number;
      teamMembers: number;
    };
  };
  security: {
    twoFactorEnabled: boolean;
    lastPasswordChange: string;
    activeSessions: number;
    securityScore: number;
  };
  stats: {
    workflowsCreated: number;
    totalExecutions: number;
    successRate: number;
    avgResponseTime: number;
    joinedDays: number;
  };
  joinedDays: number;
}

interface ProfileViewProps {
  user: SerializableUser;
}

export default function ProfileView({ user }: ProfileViewProps) {
  const [toasts, setToasts] = useState<Array<{id: string, message: string, type: 'success' | 'error' | 'info'}>>([]);
  
  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 3000);
  };
  
  // Enhanced mock profile data
  const [profile] = useState<ProfileData>({
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    username: user.username,
    profileImageUrl: user.profileImageUrl,
    createdAt: new Date(user.createdAt).toISOString(),
    lastSignInAt: new Date(user.lastSignInAt).toISOString(),
    emailVerified: user.emailVerified,
    phoneVerified: user.phoneVerified,
    bio: "AI Workflow Engineer passionate about automation and intelligent systems. Building the future of work with NexAgent.",
    title: "Senior AI Engineer",
    company: "TechCorp Inc.",
    location: "San Francisco, CA",
    website: "https://example.com",
    timezone: "America/Los_Angeles",
    phoneNumber: "+1 (555) 123-4567",
    socialLinks: {
      github: "https://github.com/username",
      twitter: "https://twitter.com/username",
      linkedin: "https://linkedin.com/in/username"
    },
    preferences: {
      theme: 'dark',
      notifications: {
        email: true,
        push: true,
        sms: false,
        workflow: true,
        security: true,
        marketing: false
      },
      privacy: {
        profileVisibility: 'public',
        activityVisibility: true,
        allowIndexing: true
      },
      language: 'en-US',
      timezone: 'America/Los_Angeles'
    },
    subscription: {
      plan: 'Pro',
      status: 'active',
      renewsAt: '2024-02-15T00:00:00Z',
      usage: {
        workflowExecutions: 8450,
        apiCalls: 125000,
        storageUsed: 2.8,
        teamMembers: 5
      },
      limits: {
        workflowExecutions: 50000,
        apiCalls: 500000,
        storageLimit: 10,
        teamMembers: 10
      }
    },
    security: {
      twoFactorEnabled: true,
      lastPasswordChange: '2023-12-15T00:00:00Z',
      activeSessions: 3,
      securityScore: 85
    },
    stats: {
      workflowsCreated: 47,
      totalExecutions: 8450,
      successRate: 97.3,
      avgResponseTime: 245,
      joinedDays: 127
    },
    joinedDays: Math.floor((Date.now() - (user.createdAt || Date.now())) / (1000 * 60 * 60 * 24))
  });

  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'billing' | 'preferences'>('profile');
  const [editingProfile, setEditingProfile] = useState(false);
  const [editedData, setEditedData] = useState(profile);

  const tabs = [
    { id: 'profile', label: 'Profile', icon: UserIcon },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'billing', label: 'Billing', icon: CreditCard },
    { id: 'preferences', label: 'Preferences', icon: Settings }
  ] as const;

  const handleSaveProfile = () => {
    // Here you would save the profile data
    console.log('Saving profile:', editedData);
    setEditingProfile(false);
    addToast('Profile updated successfully!', 'success');
  };

  const handleCancelEdit = () => {
    setEditedData(profile);
    setEditingProfile(false);
    addToast('Changes cancelled', 'info');
  };
  
  const handleAvatarEdit = () => {
    console.log('Opening avatar upload modal...');
    // Here you would open a file picker or avatar upload modal
    addToast('Avatar upload feature coming soon!', 'info');
  };
  
  const handleExportData = () => {
    try {
      console.log('Exporting user data...');
      // Here you would generate and download user data
      const dataStr = JSON.stringify(profile, null, 2);
      const dataBlob = new Blob([dataStr], {type: 'application/json'});
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'nexagent-profile-data.json';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      addToast('Profile data exported successfully!', 'success');
    } catch (error) {
      addToast('Failed to export data', 'error');
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl lg:text-4xl font-bold text-white">Profile</h1>
          <p className="text-white/70 text-lg mt-1">Manage your account, preferences, and security settings</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            className="text-white/80 hover:text-white"
            onClick={handleExportData}
          >
            <Download className="w-4 h-4 mr-2" />
            Export Data
          </Button>
        </div>
      </div>

      {/* Profile Overview Card */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-8">
          {/* Avatar & Basic Info */}
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[#FF6900] to-[#FF8555] flex items-center justify-center text-white text-3xl font-bold">
                {profile.firstName[0]}{profile.lastName[0]}
              </div>
              <button 
                className="absolute -bottom-2 -right-2 w-8 h-8 bg-[#FF6900] hover:bg-[#E55D00] rounded-full flex items-center justify-center text-white transition-colors"
                onClick={handleAvatarEdit}
                title="Change avatar"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-white">{profile.firstName} {profile.lastName}</h2>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  profile.subscription.plan === 'Enterprise' ? 'bg-purple-400/10 text-purple-400 border border-purple-400/20' :
                  profile.subscription.plan === 'Pro' ? 'bg-[#FF6900]/10 text-[#FF6900] border border-[#FF6900]/20' :
                  'bg-gray-400/10 text-gray-400 border border-gray-400/20'
                }`}>
                  {profile.subscription.plan} Plan
                </span>
              </div>
              <p className="text-white/80 font-medium">{profile.title} at {profile.company}</p>
              <p className="text-white/60 text-sm max-w-md">{profile.bio}</p>
              <div className="flex items-center gap-4 text-sm text-white/60">
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {profile.location}
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Joined {profile.joinedDays} days ago
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="flex-1 lg:ml-auto">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                label="Workflows"
                value={profile.stats.workflowsCreated}
                icon={<Zap className="w-4 h-4" />}
              />
              <StatCard
                label="Executions"
                value={profile.stats.totalExecutions.toLocaleString()}
                icon={<Activity className="w-4 h-4" />}
              />
              <StatCard
                label="Success Rate"
                value={`${profile.stats.successRate}%`}
                icon={<Target className="w-4 h-4" />}
              />
              <StatCard
                label="Avg Response"
                value={`${profile.stats.avgResponseTime}ms`}
                icon={<Clock className="w-4 h-4" />}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-2">
        <div className="flex space-x-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-[#FF6900] text-white'
                    : 'text-white/70 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="space-y-8">
        {activeTab === 'profile' && (
          <ProfileTab 
            profile={editedData}
            isEditing={editingProfile}
            onEdit={() => setEditingProfile(true)}
            onSave={handleSaveProfile}
            onCancel={handleCancelEdit}
            onChange={setEditedData}
          />
        )}
        
        {activeTab === 'security' && <SecurityTab profile={profile} addToast={addToast} />}
        
        {activeTab === 'billing' && <BillingTab profile={profile} addToast={addToast} />}
        
        {activeTab === 'preferences' && <PreferencesTab profile={profile} addToast={addToast} />}
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

function StatCard({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
  return (
    <div className="text-center">
      <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center text-[#FF6900] mx-auto mb-2">
        {icon}
      </div>
      <p className="text-xl font-bold text-white">{value}</p>
      <p className="text-white/60 text-sm">{label}</p>
    </div>
  );
}

function ProfileTab({ 
  profile, 
  isEditing, 
  onEdit, 
  onSave, 
  onCancel, 
  onChange 
}: {
  profile: ProfileData;
  isEditing: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onChange: (data: ProfileData) => void;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Personal Information */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-white">Personal Information</h3>
          {!isEditing && (
            <Button onClick={onEdit} variant="ghost" size="sm" className="text-white/80">
              <Edit3 className="w-4 h-4 mr-2" />
              Edit
            </Button>
          )}
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">First Name</label>
              {isEditing ? (
                <input
                  type="text"
                  value={profile.firstName}
                  onChange={(e) => onChange({ ...profile, firstName: e.target.value })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/15 rounded-lg text-white focus:border-[#FF6900] focus:outline-none"
                />
              ) : (
                <p className="text-white py-2">{profile.firstName}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">Last Name</label>
              {isEditing ? (
                <input
                  type="text"
                  value={profile.lastName}
                  onChange={(e) => onChange({ ...profile, lastName: e.target.value })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/15 rounded-lg text-white focus:border-[#FF6900] focus:outline-none"
                />
              ) : (
                <p className="text-white py-2">{profile.lastName}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Email Address</label>
            <div className="flex items-center gap-2">
              <p className="text-white py-2 flex-1">{profile.email}</p>
              {profile.emailVerified && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-400/10 text-green-400">
                  <Check className="w-3 h-3 mr-1" />
                  Verified
                </span>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Bio</label>
            {isEditing ? (
              <textarea
                value={profile.bio}
                onChange={(e) => onChange({ ...profile, bio: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 bg-white/5 border border-white/15 rounded-lg text-white focus:border-[#FF6900] focus:outline-none resize-none"
                placeholder="Tell us about yourself..."
              />
            ) : (
              <p className="text-white py-2">{profile.bio}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">Job Title</label>
              {isEditing ? (
                <input
                  type="text"
                  value={profile.title}
                  onChange={(e) => onChange({ ...profile, title: e.target.value })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/15 rounded-lg text-white focus:border-[#FF6900] focus:outline-none"
                />
              ) : (
                <p className="text-white py-2">{profile.title}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">Company</label>
              {isEditing ? (
                <input
                  type="text"
                  value={profile.company}
                  onChange={(e) => onChange({ ...profile, company: e.target.value })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/15 rounded-lg text-white focus:border-[#FF6900] focus:outline-none"
                />
              ) : (
                <p className="text-white py-2">{profile.company}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Location</label>
            {isEditing ? (
              <input
                type="text"
                value={profile.location}
                onChange={(e) => onChange({ ...profile, location: e.target.value })}
                className="w-full px-3 py-2 bg-white/5 border border-white/15 rounded-lg text-white focus:border-[#FF6900] focus:outline-none"
              />
            ) : (
              <p className="text-white py-2">{profile.location}</p>
            )}
          </div>
        </div>

        {isEditing && (
          <div className="flex gap-3 mt-6 pt-4 border-t border-white/10">
            <Button onClick={onSave} className="bg-[#FF6900] hover:bg-[#E55D00] text-white">
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
            <Button onClick={onCancel} variant="ghost" className="text-white/80">
              Cancel
            </Button>
          </div>
        )}
      </div>

      {/* Contact & Social */}
      <div className="space-y-8">
        {/* Contact Information */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h3 className="text-xl font-semibold text-white mb-6">Contact Information</h3>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-white/60" />
              <span className="text-white">{profile.email}</span>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-white/60" />
              <span className="text-white">{profile.phoneNumber}</span>
            </div>
            <div className="flex items-center gap-3">
              <Globe className="w-5 h-5 text-white/60" />
              <a href={profile.website} className="text-[#FF6900] hover:text-[#E55D00]">
                {profile.website}
              </a>
            </div>
          </div>
        </div>

        {/* Social Links */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h3 className="text-xl font-semibold text-white mb-6">Social Links</h3>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Github className="w-5 h-5 text-white/60" />
              <a href={profile.socialLinks.github} className="text-[#FF6900] hover:text-[#E55D00] flex-1">
                GitHub Profile
              </a>
            </div>
            <div className="flex items-center gap-3">
              <Twitter className="w-5 h-5 text-white/60" />
              <a href={profile.socialLinks.twitter} className="text-[#FF6900] hover:text-[#E55D00] flex-1">
                Twitter Profile
              </a>
            </div>
            <div className="flex items-center gap-3">
              <Linkedin className="w-5 h-5 text-white/60" />
              <a href={profile.socialLinks.linkedin} className="text-[#FF6900] hover:text-[#E55D00] flex-1">
                LinkedIn Profile
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SecurityTab({ profile, addToast }: { profile: ProfileData, addToast: (message: string, type?: 'success' | 'error' | 'info') => void }) {
  const [localProfile, setLocalProfile] = useState(profile);
  
  const handleSecurityAction = (action: string, title: string) => {
    console.log(`Executing ${action} for ${title}`);
    if (title === "Two-Factor Authentication") {
      const wasEnabled = localProfile.security.twoFactorEnabled;
      setLocalProfile(prev => ({
        ...prev,
        security: {
          ...prev.security,
          twoFactorEnabled: !prev.security.twoFactorEnabled,
          securityScore: prev.security.twoFactorEnabled ? prev.security.securityScore - 15 : prev.security.securityScore + 15
        }
      }));
      addToast(`Two-Factor Authentication ${wasEnabled ? 'disabled' : 'enabled'} successfully!`, 'success');
    } else {
      addToast(`${action} ${title} feature coming soon!`, 'info');
    }
  };

  const securityItems = [
    {
      title: "Two-Factor Authentication",
      description: "Add an extra layer of security to your account",
      status: localProfile.security.twoFactorEnabled ? "enabled" : "disabled",
      action: localProfile.security.twoFactorEnabled ? "Disable" : "Enable"
    },
    {
      title: "Password",
      description: `Last changed ${new Date(localProfile.security.lastPasswordChange).toLocaleDateString()}`,
      status: "active",
      action: "Change"
    },
    {
      title: "Active Sessions",
      description: `${localProfile.security.activeSessions} active sessions across devices`,
      status: "active",
      action: "Manage"
    }
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Security Score */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h3 className="text-xl font-semibold text-white mb-6">Security Score</h3>
        <div className="text-center">
          <div className="relative w-32 h-32 mx-auto mb-4">
            <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
              <circle
                cx="60"
                cy="60"
                r="54"
                fill="none"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="12"
              />
              <circle
                cx="60"
                cy="60"
                r="54"
                fill="none"
                stroke="#FF6900"
                strokeWidth="12"
                strokeDasharray={`${2 * Math.PI * 54 * (localProfile.security.securityScore / 100)} ${2 * Math.PI * 54}`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-3xl font-bold text-white">{localProfile.security.securityScore}</div>
                <div className="text-sm text-white/60">Score</div>
              </div>
            </div>
          </div>
          <p className="text-white/70">
            {localProfile.security.securityScore >= 80 ? "Excellent security!" : 
             localProfile.security.securityScore >= 60 ? "Good security" : "Improve security"}
          </p>
        </div>
      </div>

      {/* Security Settings */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h3 className="text-xl font-semibold text-white mb-6">Security Settings</h3>
        <div className="space-y-6">
          {securityItems.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
              <div>
                <h4 className="text-white font-medium">{item.title}</h4>
                <p className="text-white/60 text-sm">{item.description}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-2 py-1 text-xs rounded-full ${
                  item.status === 'enabled' ? 'bg-green-400/10 text-green-400' :
                  item.status === 'disabled' ? 'bg-red-400/10 text-red-400' :
                  'bg-blue-400/10 text-blue-400'
                }`}>
                  {item.status}
                </span>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="text-[#FF6900] hover:text-[#E55D00]"
                  onClick={() => handleSecurityAction(item.action, item.title)}
                >
                  {item.action}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BillingTab({ profile, addToast }: { profile: ProfileData, addToast: (message: string, type?: 'success' | 'error' | 'info') => void }) {
  const handleUpgradePlan = () => {
    console.log('Opening upgrade plan modal...');
    // Here you would open a modal or navigate to upgrade page
    addToast('Upgrade plan feature coming soon!', 'info');
  };
  const usageData = [
    {
      label: "Workflow Executions",
      current: profile.subscription.usage.workflowExecutions,
      limit: profile.subscription.limits.workflowExecutions,
      unit: "executions"
    },
    {
      label: "API Calls",
      current: profile.subscription.usage.apiCalls,
      limit: profile.subscription.limits.apiCalls,
      unit: "calls"
    },
    {
      label: "Storage Used",
      current: profile.subscription.usage.storageUsed,
      limit: profile.subscription.limits.storageLimit,
      unit: "GB"
    },
    {
      label: "Team Members",
      current: profile.subscription.usage.teamMembers,
      limit: profile.subscription.limits.teamMembers,
      unit: "members"
    }
  ];

  return (
    <div className="space-y-8">
      {/* Current Plan */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-white">Current Plan</h3>
          <Button 
            className="bg-[#FF6900] hover:bg-[#E55D00] text-white"
            onClick={handleUpgradePlan}
          >
            Upgrade Plan
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-6 bg-white/5 rounded-xl">
            <h4 className="text-2xl font-bold text-white mb-2">{profile.subscription.plan}</h4>
            <p className="text-white/60 text-sm">Current Plan</p>
          </div>
          <div className="text-center p-6 bg-white/5 rounded-xl">
            <h4 className="text-2xl font-bold text-white mb-2 capitalize">{profile.subscription.status}</h4>
            <p className="text-white/60 text-sm">Status</p>
          </div>
          <div className="text-center p-6 bg-white/5 rounded-xl">
            <h4 className="text-2xl font-bold text-white mb-2">
              {new Date(profile.subscription.renewsAt).toLocaleDateString()}
            </h4>
            <p className="text-white/60 text-sm">Renews On</p>
          </div>
        </div>
      </div>

      {/* Usage Overview */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h3 className="text-xl font-semibold text-white mb-6">Usage Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {usageData.map((item, idx) => (
            <div key={idx} className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-white font-medium">{item.label}</span>
                <span className="text-white/60 text-sm">
                  {item.current.toLocaleString()} / {item.limit.toLocaleString()} {item.unit}
                </span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2">
                <div 
                  className="bg-[#FF6900] h-2 rounded-full" 
                  style={{ width: `${Math.min((item.current / item.limit) * 100, 100)}%` }}
                />
              </div>
              <p className="text-white/60 text-xs">
                {((item.current / item.limit) * 100).toFixed(1)}% used
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PreferencesTab({ profile, addToast }: { profile: ProfileData, addToast: (message: string, type?: 'success' | 'error' | 'info') => void }) {
  const [localProfile, setLocalProfile] = useState(profile);
  
  const handleThemeChange = (theme: 'dark' | 'light' | 'system') => {
    setLocalProfile(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        theme
      }
    }));
    console.log('Theme changed to:', theme);
    addToast(`Theme changed to ${theme}`, 'success');
  };
  
  const handleNotificationToggle = (key: string) => {
    const wasEnabled = localProfile.preferences.notifications[key as keyof typeof localProfile.preferences.notifications];
    setLocalProfile(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        notifications: {
          ...prev.preferences.notifications,
          [key]: !prev.preferences.notifications[key as keyof typeof prev.preferences.notifications]
        }
      }
    }));
    console.log('Notification toggled:', key);
    addToast(`${key.replace(/([A-Z])/g, ' $1').trim()} notifications ${wasEnabled ? 'disabled' : 'enabled'}`, 'success');
  };
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Appearance */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h3 className="text-xl font-semibold text-white mb-6">Appearance</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-3">Theme</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { key: 'dark', label: 'Dark', icon: Moon },
                { key: 'light', label: 'Light', icon: Sun },
                { key: 'system', label: 'System', icon: Monitor }
              ].map((theme) => {
                const Icon = theme.icon;
                return (
                  <button
                    key={theme.key}
                    onClick={() => handleThemeChange(theme.key as 'dark' | 'light' | 'system')}
                    className={`flex flex-col items-center gap-2 p-4 rounded-lg border transition-all ${
                      localProfile.preferences.theme === theme.key
                        ? 'border-[#FF6900] bg-[#FF6900]/10'
                        : 'border-white/15 bg-white/5 hover:border-white/30'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-sm">{theme.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h3 className="text-xl font-semibold text-white mb-6">Notifications</h3>
        <div className="space-y-4">
          {Object.entries(localProfile.preferences.notifications).map(([key, enabled]) => (
            <div key={key} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
              <div>
                <h4 className="text-white font-medium capitalize">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </h4>
              </div>
              <button
                onClick={() => handleNotificationToggle(key)}
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
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}