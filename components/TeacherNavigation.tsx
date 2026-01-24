'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { useTheme } from '@/lib/ThemeContext';

interface TeacherNavigationProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export default function TeacherNavigation({ activeTab, onTabChange }: TeacherNavigationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useTheme();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const tabs = [
    { id: 'overview', name: 'Overview', icon: '📊', path: '/dashboard/teacher' },
    { id: 'classes', name: 'My Classes', icon: '🏫', path: '/dashboard/teacher?tab=classes' },
    { id: 'students', name: 'Students', icon: '🎓', path: '/dashboard/teacher?tab=students' },
    { id: 'attendance', name: 'Mark Attendance', icon: '✓', path: '/dashboard/teacher?tab=attendance' },
    { id: 'payments', name: 'Payments', icon: '💰', path: '/dashboard/teacher/payments' },
    { id: 'reports', name: 'Reports', icon: '📈', path: '/dashboard/teacher/reports' },
  ];

  const handleTabClick = (tabId: string, path: string) => {
    if (tabId === 'payments' || tabId === 'reports') {
      router.push(path);
      return;
    }

    // For dashboard tabs
    if (pathname === '/dashboard/teacher') {
      if (onTabChange) {
        onTabChange(tabId);
      } else {
         // Should not happen if page is implemented correctly, but fail-safe:
         router.push(path);
      }
    } else {
      router.push(path);
    }
  };

  // Determine active tab if not provided
  const currentTab = activeTab || (() => {
    if (pathname.includes('/payments')) return 'payments';
    if (pathname.includes('/reports')) return 'reports';
    if (pathname.includes('/classes') && !pathname.includes('?')) return 'classes'; // for details page?
    return 'overview';
  })();

  return (
    <>
      {/* Top Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Brand */}
            <div className="flex items-center cursor-pointer" onClick={() => router.push('/dashboard/teacher')}>
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center mr-3">
                <span className="text-white font-bold text-xl">A</span>
              </div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary-dark">
                Teacher Dashboard
              </span>
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center space-x-4">
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 rounded-lg transition"
                title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              >
                {theme === 'dark' ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>

              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-3 focus:outline-none"
                >
                  <div className="w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center border-2 border-primary/20">
                    <span className="text-primary font-bold text-sm">
                      {user?.name?.charAt(0) || 'T'}
                    </span>
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Teacher</p>
                  </div>
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                {showUserMenu && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setShowUserMenu(false)}
                    ></div>
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 py-1 z-20 overflow-hidden animate-in fade-in zoom-in duration-200">
                      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user?.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
                      </div>
                      
                      <button
                        onClick={() => {
                          router.push('/dashboard/teacher/profile');
                          setShowUserMenu(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center transition-colors"
                      >
                         <span className="mr-3">👤</span> My Profile
                      </button>
                      <button
                        onClick={() => {
                          router.push('/dashboard/teacher/settings');
                          setShowUserMenu(false);
                        }}
                         className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center transition-colors"
                      >
                         <span className="mr-3">⚙️</span> Settings
                      </button>
                      
                      <div className="border-t border-gray-100 dark:border-gray-700 my-1"></div>
                      
                      <button
                        onClick={() => {
                          handleLogout();
                          setShowUserMenu(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 flex items-center transition-colors"
                      >
                         <span className="mr-3">🚪</span> Logout
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-1 overflow-x-auto no-scrollbar" aria-label="Tabs">
            {tabs.map((tab) => {
              const isActive = currentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id, tab.path)}
                  className={`
                    whitespace-nowrap py-4 px-4 border-b-2 font-medium text-sm transition-all duration-200
                    ${isActive 
                      ? 'border-primary text-primary' 
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                    }
                  `}
                >
                  <span className={`mr-2 ${isActive ? 'scale-110 inline-block transition-transform' : ''}`}>{tab.icon}</span>
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </>
  );
}
