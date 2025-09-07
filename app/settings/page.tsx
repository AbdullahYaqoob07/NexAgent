"use client";

import { motion } from "framer-motion";
import { 
  Settings as SettingsIcon,
  Bell,
  Shield,
  Palette,
  Globe,
  Moon,
  Sun,
  Monitor,
  Volume2,
  VolumeX,
  Mail,
  Smartphone,
  Lock,
  Eye,
  Database,
  Download,
  Trash2,
  Save
} from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useState } from "react";

interface SettingOption {
  id: string;
  title: string;
  description: string;
  value: boolean | string;
  type: 'toggle' | 'select' | 'input';
  options?: { value: string; label: string }[];
}

interface SettingSection {
  title: string;
  icon: any;
  settings: SettingOption[];
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, any>>({
    // Notifications
    emailNotifications: true,
    pushNotifications: true,
    workflowAlerts: true,
    marketingEmails: false,
    soundNotifications: true,
    
    // Privacy & Security
    twoFactorAuth: true,
    sessionTimeout: '30',
    dataEncryption: true,
    analyticsTracking: false,
    
    // Appearance
    theme: 'dark',
    language: 'en',
    timezone: 'UTC-8',
    dateFormat: 'MM/DD/YYYY',
    
    // Performance
    autoSave: true,
    cacheEnabled: true,
    compressionEnabled: true,
    
    // API & Integrations
    apiVersion: 'v2',
    webhookTimeout: '30',
    rateLimitBurst: '100'
  });

  const updateSetting = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const settingSections: SettingSection[] = [
    {
      title: "Notifications",
      icon: Bell,
      settings: [
        {
          id: 'emailNotifications',
          title: 'Email Notifications',
          description: 'Receive notifications via email',
          value: settings.emailNotifications,
          type: 'toggle'
        },
        {
          id: 'pushNotifications',
          title: 'Push Notifications',
          description: 'Receive push notifications in your browser',
          value: settings.pushNotifications,
          type: 'toggle'
        },
        {
          id: 'workflowAlerts',
          title: 'Workflow Alerts',
          description: 'Get notified when workflows complete or fail',
          value: settings.workflowAlerts,
          type: 'toggle'
        },
        {
          id: 'marketingEmails',
          title: 'Marketing Emails',
          description: 'Receive updates about new features and products',
          value: settings.marketingEmails,
          type: 'toggle'
        },
        {
          id: 'soundNotifications',
          title: 'Sound Notifications',
          description: 'Play sounds for important notifications',
          value: settings.soundNotifications,
          type: 'toggle'
        }
      ]
    },
    {
      title: "Privacy & Security",
      icon: Shield,
      settings: [
        {
          id: 'twoFactorAuth',
          title: 'Two-Factor Authentication',
          description: 'Add an extra layer of security to your account',
          value: settings.twoFactorAuth,
          type: 'toggle'
        },
        {
          id: 'sessionTimeout',
          title: 'Session Timeout',
          description: 'Automatically log out after inactivity',
          value: settings.sessionTimeout,
          type: 'select',
          options: [
            { value: '15', label: '15 minutes' },
            { value: '30', label: '30 minutes' },
            { value: '60', label: '1 hour' },
            { value: '120', label: '2 hours' },
            { value: 'never', label: 'Never' }
          ]
        },
        {
          id: 'dataEncryption',
          title: 'Data Encryption',
          description: 'Encrypt sensitive data at rest',
          value: settings.dataEncryption,
          type: 'toggle'
        },
        {
          id: 'analyticsTracking',
          title: 'Analytics Tracking',
          description: 'Allow us to collect anonymized usage data',
          value: settings.analyticsTracking,
          type: 'toggle'
        }
      ]
    },
    {
      title: "Appearance",
      icon: Palette,
      settings: [
        {
          id: 'theme',
          title: 'Theme',
          description: 'Choose your preferred color scheme',
          value: settings.theme,
          type: 'select',
          options: [
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
            { value: 'auto', label: 'System' }
          ]
        },
        {
          id: 'language',
          title: 'Language',
          description: 'Select your preferred language',
          value: settings.language,
          type: 'select',
          options: [
            { value: 'en', label: 'English' },
            { value: 'es', label: 'Spanish' },
            { value: 'fr', label: 'French' },
            { value: 'de', label: 'German' },
            { value: 'ja', label: 'Japanese' }
          ]
        },
        {
          id: 'timezone',
          title: 'Timezone',
          description: 'Set your local timezone',
          value: settings.timezone,
          type: 'select',
          options: [
            { value: 'UTC-8', label: 'Pacific (UTC-8)' },
            { value: 'UTC-5', label: 'Eastern (UTC-5)' },
            { value: 'UTC', label: 'UTC' },
            { value: 'UTC+1', label: 'Central Europe (UTC+1)' },
            { value: 'UTC+9', label: 'Japan (UTC+9)' }
          ]
        },
        {
          id: 'dateFormat',
          title: 'Date Format',
          description: 'Choose how dates are displayed',
          value: settings.dateFormat,
          type: 'select',
          options: [
            { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
            { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
            { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' }
          ]
        }
      ]
    },
    {
      title: "Performance",
      icon: Database,
      settings: [
        {
          id: 'autoSave',
          title: 'Auto Save',
          description: 'Automatically save your work',
          value: settings.autoSave,
          type: 'toggle'
        },
        {
          id: 'cacheEnabled',
          title: 'Cache Optimization',
          description: 'Enable caching for better performance',
          value: settings.cacheEnabled,
          type: 'toggle'
        },
        {
          id: 'compressionEnabled',
          title: 'Data Compression',
          description: 'Compress data to save bandwidth',
          value: settings.compressionEnabled,
          type: 'toggle'
        }
      ]
    }
  ];

  const handleSaveSettings = () => {
    console.log('Saving settings:', settings);
    // Here you would typically save the settings to your backend
  };

  const handleResetSettings = () => {
    // Reset to default values
    setSettings({
      emailNotifications: true,
      pushNotifications: true,
      workflowAlerts: true,
      marketingEmails: false,
      soundNotifications: true,
      twoFactorAuth: true,
      sessionTimeout: '30',
      dataEncryption: true,
      analyticsTracking: false,
      theme: 'dark',
      language: 'en',
      timezone: 'UTC-8',
      dateFormat: 'MM/DD/YYYY',
      autoSave: true,
      cacheEnabled: true,
      compressionEnabled: true,
      apiVersion: 'v2',
      webhookTimeout: '30',
      rateLimitBurst: '100'
    });
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex justify-between items-start"
        >
          <div className="space-y-2">
            <h1 className="text-3xl lg:text-4xl font-bold text-white">
              <span className="text-[#FF6900]">Settings</span>
            </h1>
            <p className="text-white/70 text-lg">
              Customize your NexAgent experience
            </p>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={handleResetSettings}
              className="bg-white/5 border border-white/20 text-white hover:bg-white/10 font-semibold px-6 py-3 rounded-xl transition-all duration-300"
            >
              Reset to Default
            </button>
            <button
              onClick={handleSaveSettings}
              className="bg-gradient-to-r from-[#FF6900] to-[#FF8555] hover:from-[#E55D00] hover:to-[#E66A33] text-white font-semibold px-6 py-3 rounded-xl flex items-center gap-2 transition-all duration-300"
            >
              <Save className="w-4 h-4" />
              Save Changes
            </button>
          </div>
        </motion.div>

        {/* Settings Sections */}
        <div className="space-y-6">
          {settingSections.map((section, sectionIndex) => {
            const SectionIcon = section.icon;
            return (
              <motion.div
                key={section.title}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: sectionIndex * 0.1 }}
                className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-[#FF6900] to-[#FF8555]">
                    <SectionIcon className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-2xl font-semibold text-white">{section.title}</h2>
                </div>

                <div className="space-y-6">
                  {section.settings.map((setting, settingIndex) => (
                    <motion.div
                      key={setting.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.6, delay: sectionIndex * 0.1 + settingIndex * 0.05 }}
                      className="flex items-center justify-between py-4 border-b border-white/10 last:border-b-0"
                    >
                      <div className="flex-1">
                        <h3 className="text-white font-medium mb-1">{setting.title}</h3>
                        <p className="text-white/60 text-sm">{setting.description}</p>
                      </div>

                      <div className="ml-6">
                        {setting.type === 'toggle' && (
                          <button
                            onClick={() => updateSetting(setting.id, !setting.value)}
                            className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${
                              setting.value ? 'bg-[#FF6900]' : 'bg-white/20'
                            }`}
                          >
                            <div
                              className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform duration-300 ${
                                setting.value ? 'translate-x-7' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        )}

                        {setting.type === 'select' && (
                          <select
                            value={setting.value as string}
                            onChange={(e) => updateSetting(setting.id, e.target.value)}
                            className="bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#FF6900] transition-colors duration-300 min-w-[150px]"
                          >
                            {setting.options?.map((option) => (
                              <option key={option.value} value={option.value} className="bg-black text-white">
                                {option.label}
                              </option>
                            ))}
                          </select>
                        )}

                        {setting.type === 'input' && (
                          <input
                            type="text"
                            value={setting.value as string}
                            onChange={(e) => updateSetting(setting.id, e.target.value)}
                            className="bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#FF6900] transition-colors duration-300 min-w-[150px]"
                          />
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Data Export & Backup */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600">
              <Download className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-2xl font-semibold text-white">Data & Backup</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-white">Export Your Data</h3>
              <p className="text-white/70 text-sm">
                Download a copy of all your data including workflows, settings, and usage statistics.
              </p>
              <button className="bg-blue-500/20 border border-blue-500/30 text-blue-400 hover:bg-blue-500/30 font-semibold px-6 py-3 rounded-xl transition-all duration-300">
                Export Data
              </button>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium text-white">Backup Settings</h3>
              <p className="text-white/70 text-sm">
                Create a backup of your current settings that you can restore later.
              </p>
              <div className="flex gap-3">
                <button className="bg-green-500/20 border border-green-500/30 text-green-400 hover:bg-green-500/30 font-semibold px-4 py-2 rounded-lg transition-all duration-300">
                  Backup
                </button>
                <button className="bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/30 font-semibold px-4 py-2 rounded-lg transition-all duration-300">
                  Restore
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
