'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, userType } = useAuthStore();

  useEffect(() => {
    // Check if user is already authenticated
    if (isAuthenticated && userType) {
      // Redirect to appropriate dashboard
      if (userType === 'admin') {
        router.push('/dashboard/admin');
      } else if (userType === 'teacher') {
        router.push('/dashboard/teacher');
      } else {
        router.push('/login');
      }
    } else {
      // Not authenticated, go to login
      router.push('/login');
    }
  }, [router, isAuthenticated, userType]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  );
}
