import { create } from 'zustand';
import { User } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: (() => {
    try {
      const u = localStorage.getItem('uitp_user');
      return u ? JSON.parse(u) : null;
    } catch { return null; }
  })(),
  token: localStorage.getItem('uitp_token'),
  setAuth: (user, token) => {
    localStorage.setItem('uitp_token', token);
    localStorage.setItem('uitp_user', JSON.stringify(user));
    set({ user, token });
  },
  logout: () => {
    localStorage.removeItem('uitp_token');
    localStorage.removeItem('uitp_user');
    set({ user: null, token: null });
  },
  isAuthenticated: () => !!get().token && !!get().user,
}));
