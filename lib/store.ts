import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Teacher, AdminUser, WebSession } from './types';

interface AuthState {
  user: Teacher | AdminUser | null;
  session: WebSession | null;
  token: string | null;
  isAuthenticated: boolean;
  userType: 'admin' | 'teacher' | null;
  setAuth: (user: Teacher | AdminUser, session: WebSession, token: string) => void;
  updateUser: (user: Teacher | AdminUser) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      session: null,
      token: null,
      isAuthenticated: false,
      userType: null,
      setAuth: (user, session, token) => {
        localStorage.setItem('auth_token', token);
        set({
          user,
          session,
          token,
          isAuthenticated: true,
          userType: session.userType,
        });
      },
      updateUser: (user) => {
        set({ user });
      },
      logout: () => {
        localStorage.removeItem('auth_token');
        set({
          user: null,
          session: null,
          token: null,
          isAuthenticated: false,
          userType: null,
        });
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);
