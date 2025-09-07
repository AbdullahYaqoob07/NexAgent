"use client";

import { motion } from "framer-motion";
import { 
  User,
  Mail,
  Calendar,
  MapPin,
  Phone,
  Edit,
  Camera,
  Shield,
  Bell,
  Globe,
  Key,
  Trash2,
  Save,
  X
} from "lucide-react";
import DashboardLayout from "./DashboardLayout";
import { useState } from "react";

interface SerializedUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  emailAddresses: Array<{
    emailAddress: string;
    verification?: {
      status?: string;
    };
  }>;
  phoneNumbers: Array<{
    phoneNumber: string;
  }>;
  createdAt: Date;
  lastSignInAt: Date | null;
  imageUrl: string;
}

interface ProfilePageProps {
  user: SerializedUser | null;
}

export default function ProfilePage({ user }: ProfilePageProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.emailAddresses[0]?.emailAddress || '',
    phone: user?.phoneNumbers[0]?.phoneNumber || '',
    bio: 'AI Engineer passionate about building the future of intelligent automation.',
    location: 'San Francisco, CA',
    website: 'https://nexagent.ai',
    timezone: 'Pacific Standard Time (UTC-8)'
  });

  const handleSave = () => {
    // Here you would typically update the user profile via Clerk or your API
    setIsEditing(false);
    console.log('Saving profile:', formData);
  };

  const handleCancel = () => {
    // Reset form data to original values
    setFormData({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.emailAddresses[0]?.emailAddress || '',
      phone: user?.phoneNumbers[0]?.phoneNumber || '',
      bio: 'AI Engineer passionate about building the future of intelligent automation.',
      location: 'San Francisco, CA',
      website: 'https://nexagent.ai',
      timezone: 'Pacific Standard Time (UTC-8)'
    });
    setIsEditing(false);
  };

  const profileSections = [
    {
      title: "Personal Information",
      icon: User,
      fields: [
        { label: "First Name", key: "firstName", type: "text", icon: User },
        { label: "Last Name", key: "lastName", type: "text", icon: User },
        { label: "Email", key: "email", type: "email", icon: Mail, readonly: true },
        { label: "Phone", key: "phone", type: "tel", icon: Phone }
      ]
    },
    {
      title: "Additional Details",
      icon: Globe,
      fields: [
        { label: "Bio", key: "bio", type: "textarea", icon: User },
        { label: "Location", key: "location", type: "text", icon: MapPin },
        { label: "Website", key: "website", type: "url", icon: Globe },
        { label: "Timezone", key: "timezone", type: "text", icon: Calendar }
      ]
    }
  ];

  const accountStats = [
    {
      title: "Member Since",
      value: new Date(user?.createdAt || Date.now()).toLocaleDateString(),
      icon: Calendar,
      color: "from-[#FF6900] to-[#FF8555]"
    },
    {
      title: "Last Sign In",
      value: new Date(user?.lastSignInAt || Date.now()).toLocaleDateString(),
      icon: Shield,
      color: "from-blue-500 to-blue-600"
    },
    {
      title: "Email Verified",
      value: user?.emailAddresses[0]?.verification?.status === "verified" ? "Yes" : "No",
      icon: Mail,
      color: "from-green-500 to-green-600"
    },
    {
      title: "Two-Factor Auth",
      value: "Enabled",
      icon: Key,
      color: "from-purple-500 to-purple-600"
    }
  ];

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
              My <span className="text-[#FF6900]">Profile</span>
            </h1>
            <p className="text-white/70 text-lg">
              Manage your account settings and preferences
            </p>
          </div>
          
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="bg-gradient-to-r from-[#FF6900] to-[#FF8555] hover:from-[#E55D00] hover:to-[#E66A33] text-white font-semibold px-6 py-3 rounded-xl flex items-center gap-2 transition-all duration-300"
            >
              <Edit className="w-4 h-4" />
              Edit Profile
            </button>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={handleCancel}
                className="bg-white/5 border border-white/20 text-white hover:bg-white/10 font-semibold px-6 py-3 rounded-xl flex items-center gap-2 transition-all duration-300"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="bg-gradient-to-r from-[#FF6900] to-[#FF8555] hover:from-[#E55D00] hover:to-[#E66A33] text-white font-semibold px-6 py-3 rounded-xl flex items-center gap-2 transition-all duration-300"
              >
                <Save className="w-4 h-4" />
                Save Changes
              </button>
            </div>
          )}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Card */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="lg:col-span-1"
          >
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 space-y-6">
              {/* Avatar Section */}
              <div className="text-center">
                <div className="relative inline-block">
                  <div className="w-24 h-24 bg-gradient-to-br from-[#FF6900] to-[#FF8555] rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto">
                    {user?.firstName?.[0] || user?.emailAddresses[0]?.emailAddress?.[0]?.toUpperCase() || 'U'}
                  </div>
                  {isEditing && (
                    <button className="absolute bottom-0 right-0 bg-[#FF6900] text-white p-2 rounded-full hover:bg-[#E55D00] transition-colors duration-300">
                      <Camera className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <h2 className="text-xl font-bold text-white mt-4">
                  {user?.firstName} {user?.lastName}
                </h2>
                <p className="text-white/70">{user?.emailAddresses[0]?.emailAddress}</p>
              </div>

              {/* Account Stats */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Account Overview</h3>
                {accountStats.map((stat, index) => {
                  const Icon = stat.icon;
                  return (
                    <div key={stat.title} className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg bg-gradient-to-br ${stat.color}`}>
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-white/70">{stat.title}</p>
                        <p className="text-white font-medium">{stat.value}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>

          {/* Profile Form */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="lg:col-span-2 space-y-6"
          >
            {profileSections.map((section, sectionIndex) => {
              const SectionIcon = section.icon;
              return (
                <div
                  key={section.title}
                  className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-[#FF6900] to-[#FF8555]">
                      <SectionIcon className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold text-white">{section.title}</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {section.fields.map((field, fieldIndex) => {
                      const FieldIcon = field.icon;
                      return (
                        <motion.div
                          key={field.key}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.6, delay: 0.2 + sectionIndex * 0.1 + fieldIndex * 0.05 }}
                          className={field.type === 'textarea' ? 'md:col-span-2' : ''}
                        >
                          <label className="block text-sm font-medium text-white/80 mb-2">
                            <div className="flex items-center gap-2">
                              <FieldIcon className="w-4 h-4" />
                              {field.label}
                            </div>
                          </label>
                          {field.type === 'textarea' ? (
                            <textarea
                              value={formData[field.key as keyof typeof formData]}
                              onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                              disabled={!isEditing || field.readonly}
                              rows={3}
                              className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white placeholder:text-white/50 focus:outline-none focus:border-[#FF6900] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-300 resize-none"
                            />
                          ) : (
                            <input
                              type={field.type}
                              value={formData[field.key as keyof typeof formData]}
                              onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                              disabled={!isEditing || field.readonly}
                              className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white placeholder:text-white/50 focus:outline-none focus:border-[#FF6900] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-300"
                            />
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Danger Zone */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="bg-red-400/5 border border-red-400/20 rounded-xl p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <Trash2 className="w-5 h-5 text-red-400" />
                <h3 className="text-xl font-semibold text-red-400">Danger Zone</h3>
              </div>
              <p className="text-red-300/80 mb-4">
                Once you delete your account, there is no going back. Please be certain.
              </p>
              <button className="bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 font-semibold px-6 py-3 rounded-xl transition-all duration-300">
                Delete Account
              </button>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  );
}
