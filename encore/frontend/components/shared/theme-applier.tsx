'use client';

import { useEffect } from 'react';

import { useUiStore, type ThemeMode } from '@/stores/ui';

/**
 * Applies the effective theme to <html>: the persona default unless the
 * user has explicitly toggled an override (persisted in the ui store).
 * Rendered by each route-group layout with its persona default.
 */
export function ThemeApplier({ personaDefault }: { personaDefault: ThemeMode }) {
  const override = useUiStore((s) => s.theme);

  useEffect(() => {
    const effective = override ?? personaDefault;
    const root = document.documentElement;
    root.classList.toggle('dark', effective === 'dark');
  }, [override, personaDefault]);

  return null;
}
