import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Teacher, AdminUser, WebSession } from './types';

interface AuthState {
  user: Teacher | AdminUser | null;
  session: WebSession | null;
  token: string | null;
  isAuthenticated: boolean;
  userType: 'admin' | 'teacher' | null;
  isHydrated: boolean;
  setAuth: (user: Teacher | AdminUser, session: WebSession, token: string) => void;
  updateUser: (user: Teacher | AdminUser) => void;
  logout: () => void;
  setHydrated: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      session: null,
      token: null,
      isAuthenticated: false,
      userType: null,
      isHydrated: false,
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
      setHydrated: () => set({ isHydrated: true }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHydrated();
        }
      },
    }
  )
);
