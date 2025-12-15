'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import webSessionService from '@/lib/webSessionPolling';
import { useAuthStore } from '@/lib/store';
import toast from 'react-hot-toast';

export default function QRLoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [qrCode, setQrCode] = useState<string>('');
  const [sessionId, setSessionId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    // Request QR code
    const generateQR = async () => {
      try {
        setIsLoading(true);
        const data = await webSessionService.requestQR('teacher');
        setQrCode(data.qrCode);
        setSessionId(data.sessionId);
        setIsLoading(false);
      } catch (error) {
        console.error('Error generating QR:', error);
        toast.error('Failed to generate QR code');
        setIsLoading(false);
      }
    };

    generateQR();

    // Listen for authentication
    webSessionService.onAuthenticated((data) => {
      if (data.success) {
        setIsConnecting(true);
        toast.success('Successfully connected!');
        
        // Store auth data
        setAuth(data.user, data.session, data.token);
        
        // Redirect to dashboard
        setTimeout(() => {
          router.push('/dashboard/teacher');
        }, 1000);
      }
    });

    return () => {
      webSessionService.disconnect();
    };
  }, [router, setAuth]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Attendance Web
            </h1>
            <p className="text-gray-600">
              Scan QR code with your mobile app
            </p>
          </div>

          {/* QR Code Section */}
          <div className="bg-gray-50 rounded-xl p-6 mb-6">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
                <p className="text-gray-600">Generating QR code...</p>
              </div>
            ) : isConnecting ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-pulse">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <p className="text-gray-900 font-medium">Connected!</p>
                <p className="text-gray-600 text-sm">Redirecting...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                {qrCode && (
                  <img
                    src={qrCode}
                    alt="QR Code"
                    className="w-64 h-64 mb-4"
                  />
                )}
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 text-sm font-bold">
                1
              </div>
              <p className="text-sm text-gray-600">
                Open the Teacher Attendance app on your mobile device
              </p>
            </div>
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 text-sm font-bold">
                2
              </div>
              <p className="text-sm text-gray-600">
                Tap on the QR scanner icon in the app
              </p>
            </div>
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 text-sm font-bold">
                3
              </div>
              <p className="text-sm text-gray-600">
                Scan this QR code to connect your account
              </p>
            </div>
          </div>

          {/* Admin Login Link */}
          <div className="mt-8 pt-6 border-t border-gray-200 text-center">
            <button
              onClick={() => router.push('/login/admin')}
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Login as Admin →
            </button>
          </div>
        </div>

        {/* Footer Note */}
        <p className="text-center text-sm text-gray-500 mt-6">
          By connecting, you agree to keep your session secure
        </p>
      </div>
    </div>
  );
}
