'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { useTheme } from '@/lib/ThemeContext';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const router = useRouter();
  const { user, userType, isAuthenticated } = useAuthStore();
  const { theme, toggleTheme } = useTheme();
  const [notifications, setNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [showHelpDialog, setShowHelpDialog] = useState(false);
  const [showPrivacyDialog, setShowPrivacyDialog] = useState(false);
  const APP_VERSION = '1.0.25';
  const APP_NAME = 'Eduverse';

  useEffect(() => {
    if (!isAuthenticated || userType !== 'teacher') {
      router.push('/login');
      return;
    }

    // Load saved notification settings from localStorage
    const savedNotifications = localStorage.getItem('notifications');
    const savedEmailNotifications = localStorage.getItem('emailNotifications');

    if (savedNotifications !== null) setNotifications(savedNotifications === 'true');
    if (savedEmailNotifications !== null) setEmailNotifications(savedEmailNotifications === 'true');
  }, [isAuthenticated, userType, router]);

  const handleThemeChange = () => {
    toggleTheme();
    toast.success(`Theme changed to ${theme === 'light' ? 'dark' : 'light'} mode`);
  };

  const handleNotificationToggle = () => {
    const newValue = !notifications;
    setNotifications(newValue);
    localStorage.setItem('notifications', String(newValue));
    toast.success(newValue ? 'Push notifications enabled' : 'Push notifications disabled');
  };

  const handleEmailNotificationToggle = () => {
    const newValue = !emailNotifications;
    setEmailNotifications(newValue);
    localStorage.setItem('emailNotifications', String(newValue));
    toast.success(newValue ? 'Email notifications enabled' : 'Email notifications disabled');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
            <h1 className="text-xl font-bold text-gray-900">Settings</h1>
            <div className="w-20"></div> {/* Spacer for centering */}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Appearance Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
              Appearance
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Theme</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={theme === 'dark' ? handleThemeChange : undefined}
                    className={`p-4 border-2 rounded-lg transition ${
                      theme === 'light'
                        ? 'border-indigo-600 bg-indigo-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-center mb-2">
                      <svg className="w-8 h-8 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </div>
                    <p className="font-medium text-gray-900">Light</p>
                    <p className="text-xs text-gray-500 mt-1">Default theme</p>
                  </button>

                  <button
                    onClick={theme === 'light' ? handleThemeChange : undefined}
                    className={`p-4 border-2 rounded-lg transition ${
                      theme === 'dark'
                        ? 'border-indigo-600 bg-indigo-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-center mb-2">
                      <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                      </svg>
                    </div>
                    <p className="font-medium text-gray-900">Dark</p>
                    <p className="text-xs text-gray-500 mt-1">Dark theme</p>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Notifications Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              Notifications
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-gray-900">Push Notifications</p>
                  <p className="text-sm text-gray-500">Receive notifications in the app</p>
                </div>
                <button
                  onClick={handleNotificationToggle}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                    notifications ? 'bg-indigo-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                      notifications ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between py-3 border-t border-gray-100">
                <div>
                  <p className="font-medium text-gray-900">Email Notifications</p>
                  <p className="text-sm text-gray-500">Receive updates via email</p>
                </div>
                <button
                  onClick={handleEmailNotificationToggle}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                    emailNotifications ? 'bg-indigo-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                      emailNotifications ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* About Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              About
            </h2>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2">
                <span className="text-gray-600">App Name</span>
                <span className="font-medium text-gray-900">{APP_NAME}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-t border-gray-100">
                <span className="text-gray-600">Version</span>
                <span className="font-medium text-gray-900">{APP_VERSION}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-t border-gray-100">
                <span className="text-gray-600">Platform</span>
                <span className="font-medium text-gray-900">Web</span>
              </div>
            </div>
          </div>

          {/* Support Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              Support
            </h2>
            
            <div className="space-y-3">
              <button 
                onClick={() => setShowHelpDialog(true)}
                className="w-full text-left px-4 py-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition flex items-center justify-between"
              >
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-3 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-gray-900">Help & Support</span>
                </div>
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <button 
                onClick={() => setShowPrivacyDialog(true)}
                className="w-full text-left px-4 py-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition flex items-center justify-between"
              >
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-3 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span className="text-gray-900">Privacy Policy</span>
                </div>
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Help & Support Dialog */}
      {showHelpDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center">
                <svg className="w-6 h-6 mr-3 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-xl font-bold text-gray-900">Help & Support</h3>
              </div>
              <button
                onClick={() => setShowHelpDialog(false)}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <p className="text-lg font-semibold text-gray-900 mb-4">
                Need assistance? We're here to help!
              </p>
              
              <div className="space-y-4 mb-6">
                <div className="flex items-start">
                  <svg className="w-6 h-6 mr-3 text-indigo-600 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <div>
                    <p className="font-semibold text-sm text-gray-700">Email</p>
                    <p className="text-gray-900">support@eduverse.com</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <svg className="w-6 h-6 mr-3 text-indigo-600 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <div>
                    <p className="font-semibold text-sm text-gray-700">Phone</p>
                    <p className="text-gray-900">+1 (555) 123-4567</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <svg className="w-6 h-6 mr-3 text-indigo-600 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                  <div>
                    <p className="font-semibold text-sm text-gray-700">Website</p>
                    <p className="text-gray-900">www.eduverse.com/support</p>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4 mb-4">
                <h4 className="font-semibold text-gray-900 mb-2">Office Hours</h4>
                <p className="text-gray-700 text-sm">Monday - Friday: 9:00 AM - 6:00 PM</p>
                <p className="text-gray-700 text-sm">Saturday: 10:00 AM - 4:00 PM</p>
                <p className="text-gray-700 text-sm">Sunday: Closed</p>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <h4 className="font-semibold text-gray-900 mb-2">Response Time</h4>
                <p className="text-gray-700 text-sm">
                  We typically respond within 24 hours during business days.
                </p>
              </div>
            </div>
            <div className="border-t border-gray-200 px-6 py-4">
              <button
                onClick={() => setShowHelpDialog(false)}
                className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Privacy Policy Dialog */}
      {showPrivacyDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center">
                <svg className="w-6 h-6 mr-3 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <h3 className="text-xl font-bold text-gray-900">Privacy Policy</h3>
              </div>
              <button
                onClick={() => setShowPrivacyDialog(false)}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <p className="text-lg font-semibold text-gray-900 mb-4">
                Your Privacy Matters
              </p>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Data Collection</h4>
                  <p className="text-gray-700 text-sm leading-relaxed">
                    We collect only essential information needed to provide our services, including 
                    your name, email, and attendance records. We do not collect unnecessary personal data.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Data Usage</h4>
                  <p className="text-gray-700 text-sm leading-relaxed">
                    Your data is used solely for attendance tracking and reporting purposes. 
                    We do not sell or share your information with third parties without your explicit consent.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Data Security</h4>
                  <p className="text-gray-700 text-sm leading-relaxed">
                    We implement industry-standard security measures to protect your data, including 
                    encryption, secure authentication, and regular security audits.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Data Retention</h4>
                  <p className="text-gray-700 text-sm leading-relaxed">
                    Your data is stored as long as your account is active. You can request data deletion 
                    at any time by contacting our support team.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Your Rights</h4>
                  <p className="text-gray-700 text-sm leading-relaxed">
                    You have the right to access, modify, or delete your personal data. You can export 
                    your data at any time using the export feature in settings.
                  </p>
                </div>
              </div>

              <div className="border-t border-gray-200 mt-6 pt-4">
                <p className="text-xs text-gray-500 italic mb-2">Last Updated: December 2024</p>
                <p className="text-xs text-gray-600 mb-1">For the complete privacy policy, visit:</p>
                <a 
                  href="https://www.eduverse.com/privacy" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-indigo-600 underline hover:text-indigo-700"
                >
                  www.eduverse.com/privacy
                </a>
              </div>
            </div>
            <div className="border-t border-gray-200 px-6 py-4">
              <button
                onClick={() => setShowPrivacyDialog(false)}
                className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
