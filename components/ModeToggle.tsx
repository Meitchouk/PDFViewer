'use client';

import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

export function ModeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="size-8">
        <Sun className="size-4" />
      </Button>
    );
  }

  function cycle() {
    if (theme === 'system') setTheme('light');
    else if (theme === 'light') setTheme('dark');
    else setTheme('system');
  }

  const icons = {
    light: <Sun className="size-4" />,
    dark: <Moon className="size-4" />,
    system: <Monitor className="size-4" />,
  };

  const labels = {
    light: 'Modo claro',
    dark: 'Modo oscuro',
    system: 'Tema del sistema',
  };

  const current = (theme as keyof typeof icons) ?? 'system';

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={cycle}
      title={labels[current]}
      className="size-8"
    >
      {icons[current]}
      <span className="sr-only">{labels[current]}</span>
    </Button>
  );
}
