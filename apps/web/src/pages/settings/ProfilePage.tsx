/**
 * ProfilePage - User profile management
 * Features: Profile editing, avatar upload, notification preferences
 */

import React, { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  Mail,
  Bell,
  Shield,
  Camera,
  Save,
  Loader2,
  Check,
  AlertCircle,
} from 'lucide-react';
import { useAuthStore } from '../../stores/auth';
import { ThemeSection } from '../../components/settings/ThemeToggle';
import { apiClient } from '../../api/client';

interface NotificationPreference {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
}

const DEFAULT_NOTIFICATION_PREFS: NotificationPreference[] = [
  {
    id: 'email_session_complete',
    label: 'Session Completion',
    description: 'Get notified when a questionnaire session is completed',
    enabled: true,
  },
  {
    id: 'email_document_ready',
    label: 'Document Ready',
    description: 'Get notified when documents are generated and ready',
    enabled: true,
  },
  {
    id: 'email_weekly_summary',
    label: 'Weekly Summary',
    description: 'Receive a weekly summary of your activity',
    enabled: false,
  },
  {
    id: 'email_product_updates',
    label: 'Product Updates',
    description: 'Stay informed about new features and improvements',
    enabled: true,
  },
  {
    id: 'email_marketing',
    label: 'Marketing Communications',
    description: 'Receive tips, best practices, and promotional content',
    enabled: false,
  },
];

export function ProfilePage() {
  const navigate = useNavigate();
  const { user, setUser } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [name, setName] = useState(user?.name || '');
  const [email] = useState(user?.email || '');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreference[]>(
    DEFAULT_NOTIFICATION_PREFS
  );

  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'security' | 'appearance'>('profile');

  const userInitials = name
    ? name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : email[0]?.toUpperCase() || 'U';

  const handleAvatarClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleAvatarChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Image must be less than 5MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }
      setAvatarFile(file);
      setAvatarUrl(URL.createObjectURL(file));
      setError(null);
    }
  }, []);

  const toggleNotification = useCallback((id: string) => {
    setNotificationPrefs((prev) =>
      prev.map((pref) => (pref.id === id ? { ...pref, enabled: !pref.enabled } : pref))
    );
  }, []);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      // Upload avatar if changed
      if (avatarFile) {
        const formData = new FormData();
        formData.append('avatar', avatarFile);
        await apiClient.post('/api/v1/users/avatar', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      // Update profile
      const { data } = await apiClient.patch('/api/v1/users/profile', {
        name,
        notificationPreferences: notificationPrefs.reduce(
          (acc, pref) => ({ ...acc, [pref.id]: pref.enabled }),
          {}
        ),
      });

      // Update local user state
      if (data.user) {
        setUser(data.user);
      } else if (user) {
        setUser({ ...user, name });
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  }, [name, avatarFile, notificationPrefs, user, setUser]);

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'appearance', label: 'Appearance', icon: Camera },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            aria-label="Go back to dashboard"
          >
            <ArrowLeft className="h-5 w-5 mr-2" aria-hidden="true" />
            Back
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
            <p className="text-gray-500 dark:text-gray-400">Manage your account settings</p>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : saveSuccess ? (
            <Check className="h-4 w-4" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {isSaving ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3 text-red-700 dark:text-red-400">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">
            Dismiss
          </button>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar tabs */}
        <nav className="lg:w-64 space-y-1" aria-label="Settings navigation">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                activeTab === id
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                  : 'text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800'
              }`}
              aria-current={activeTab === id ? 'page' : undefined}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              <span className="font-medium">{label}</span>
            </button>
          ))}
        </nav>

        {/* Content area */}
        <div className="flex-1 space-y-6">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6 space-y-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Profile Information
              </h2>

              {/* Avatar */}
              <div className="flex items-center gap-6">
                <div className="relative">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="Profile avatar"
                      className="w-20 h-20 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center text-white text-2xl font-semibold">
                      {userInitials}
                    </div>
                  )}
                  <button
                    onClick={handleAvatarClick}
                    className="absolute -bottom-1 -right-1 p-2 bg-blue-600 rounded-full text-white hover:bg-blue-700 transition-colors"
                    aria-label="Change avatar"
                  >
                    <Camera className="h-4 w-4" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Profile Photo</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    JPG, GIF or PNG. Max size 5MB.
                  </p>
                </div>
              </div>

              {/* Name */}
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Full Name
                </label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                />
              </div>

              {/* Email (read-only) */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Email Address
                </label>
                <div className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-gray-400" aria-hidden="true" />
                  <input
                    type="email"
                    id="email"
                    value={email}
                    disabled
                    className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Contact support to change your email address
                </p>
              </div>

              {/* Role badge */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Account Role
                </label>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                  {user?.role || 'CLIENT'}
                </span>
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6 space-y-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Notification Preferences
              </h2>
              <p className="text-gray-500 dark:text-gray-400">
                Choose which notifications you'd like to receive.
              </p>

              <div className="space-y-4">
                {notificationPrefs.map((pref) => (
                  <div
                    key={pref.id}
                    className="flex items-start justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-white">{pref.label}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{pref.description}</p>
                    </div>
                    <button
                      role="switch"
                      aria-checked={pref.enabled}
                      onClick={() => toggleNotification(pref.id)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                        pref.enabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          pref.enabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6 space-y-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Security Settings
                </h2>

                {/* Change Password */}
                <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Password</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Change your password to keep your account secure
                    </p>
                  </div>
                  <button className="px-4 py-2 text-blue-600 hover:text-blue-700 font-medium">
                    Change Password
                  </button>
                </div>

                {/* MFA */}
                <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      Two-Factor Authentication
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Add an extra layer of security to your account
                    </p>
                  </div>
                  <button
                    onClick={() => navigate('/settings/mfa')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Configure
                  </button>
                </div>

                {/* Sessions */}
                <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Active Sessions</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Manage your active sessions on other devices
                    </p>
                  </div>
                  <button className="px-4 py-2 text-blue-600 hover:text-blue-700 font-medium">
                    View Sessions
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Appearance Tab */}
          {activeTab === 'appearance' && (
            <div className="space-y-6">
              <ThemeSection />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;
