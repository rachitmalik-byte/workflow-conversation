import React, { createContext, useContext, useState, useEffect } from 'react';

export type ThemePreset = 'corporate' | 'glassmorphism' | 'neobrutalist' | 'minimalist' | 'retrofuturistic' | 'scandinavian';
export type ThemeMode = 'light' | 'dark';
export type FontFamily = 'inter' | 'outfit' | 'space-grotesk' | 'lora' | 'jetbrains-mono';

interface ThemeContextType {
  themePreset: ThemePreset;
  setThemePreset: (preset: ThemePreset) => void;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  fontFamily: FontFamily;
  setFontFamily: (font: FontFamily) => void;
  theme: ThemeMode; // Legacy support
  toggleTheme: () => void; // Legacy support
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themePreset, setThemePresetState] = useState<ThemePreset>(() => {
    return (localStorage.getItem('relayhq_theme_preset') as ThemePreset) || 'corporate';
  });

  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('relayhq_theme_mode') as ThemeMode;
    if (saved) return saved;
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  });

  const [fontFamily, setFontFamilyState] = useState<FontFamily>(() => {
    return (localStorage.getItem('relayhq_font_family') as FontFamily) || 'inter';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    
    // Set preset, mode, and font attributes
    root.setAttribute('data-theme-preset', themePreset);
    root.setAttribute('data-theme-mode', themeMode);
    root.setAttribute('data-font', fontFamily);
    
    // Manage dark class for Tailwind
    if (themeMode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [themePreset, themeMode, fontFamily]);

  const setThemePreset = (preset: ThemePreset) => {
    setThemePresetState(preset);
    localStorage.setItem('relayhq_theme_preset', preset);
  };

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
    localStorage.setItem('relayhq_theme_mode', mode);
  };

  const setFontFamily = (font: FontFamily) => {
    setFontFamilyState(font);
    localStorage.setItem('relayhq_font_family', font);
  };

  const toggleTheme = () => {
    setThemeMode(themeMode === 'light' ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider
      value={{
        themePreset,
        setThemePreset,
        themeMode,
        setThemeMode,
        fontFamily,
        setFontFamily,
        theme: themeMode,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
