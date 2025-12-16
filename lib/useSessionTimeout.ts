import { useEffect, useRef } from 'react';
import { useAuthStore } from './store';
import toast from 'react-hot-toast';

export function useSessionTimeout(timeoutMinutes: number) {
  const { logout } = useAuthStore();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningRef = useRef<NodeJS.Timeout | null>(null);

  const resetTimer = () => {
    // Clear existing timers
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (warningRef.current) {
      clearTimeout(warningRef.current);
    }

    // Skip if timeout is disabled (-1)
    if (timeoutMinutes === -1) {
      return;
    }

    const timeoutMs = timeoutMinutes * 60 * 1000;
    const warningMs = Math.max(timeoutMs - 60000, 0); // Warn 1 minute before

    // Set warning timer
    if (warningMs > 0) {
      warningRef.current = setTimeout(() => {
        toast('Session will expire in 1 minute due to inactivity', {
          icon: '⚠️',
          duration: 60000,
        });
      }, warningMs);
    }

    // Set logout timer
    timeoutRef.current = setTimeout(() => {
      toast.error('Session expired due to inactivity');
      logout();
    }, timeoutMs);
  };

  useEffect(() => {
    // Events that reset the timer
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];

    const handleActivity = () => {
      resetTimer();
    };

    // Set initial timer
    resetTimer();

    // Add event listeners
    events.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (warningRef.current) {
        clearTimeout(warningRef.current);
      }
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [timeoutMinutes, logout]);
}
