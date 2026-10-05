import { create } from 'zustand';

export type ThemeMode = 'light' | 'dark';

/**
 * Global UI state: theme mode (persisted client-side only), and transient
 * global banners. Persona defaults (customer/organizer → light, ops → dark)
 * are applied by the route-group layout; this store holds the user's
 * explicit override once toggled.
 */
interface UiState {
  theme: ThemeMode | null; // null = follow persona default
  mobileNavOpen: boolean;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  setMobileNavOpen: (open: boolean) => void;
}

const THEME_KEY = 'encore.theme';

function loadTheme(): ThemeMode | null {
  if (typeof window === 'undefined') return null;
  const v = window.localStorage.getItem(THEME_KEY);
  return v === 'light' || v === 'dark' ? v : null;
}

export const useUiStore = create<UiState>((set, get) => ({
  theme: loadTheme(),
  mobileNavOpen: false,
  setTheme: (theme) => {
    if (typeof window !== 'undefined') window.localStorage.setItem(THEME_KEY, theme);
    set({ theme });
  },
  toggleTheme: () => {
    const next: ThemeMode = get().theme === 'dark' ? 'light' : 'dark';
    if (typeof window !== 'undefined') window.localStorage.setItem(THEME_KEY, next);
    set({ theme: next });
  },
  setMobileNavOpen: (open) => set({ mobileNavOpen: open }),
}));
