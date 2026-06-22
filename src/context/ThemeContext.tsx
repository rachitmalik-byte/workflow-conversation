import React, { createContext, useContext, useState, useEffect } from 'react';

export type ThemePreset =
  | 'corporate'
  | 'glassmorphism'
  | 'neobrutalist'
  | 'minimalist'
  | 'retrofuturistic'
  | 'scandinavian'
  | 'bauhaus'
  | 'cyberpunk'
  | 'artdeco'
  | 'forestzen'
  | 'midnightroyal';

export type ThemeMode = 'light' | 'dark';
export type FontFamily = 'inter' | 'outfit' | 'space-grotesk' | 'lora' | 'jetbrains-mono';
export type ColorScheme = 'default' | 'ocean' | 'forest' | 'sunset' | 'royal' | 'crimson';
export type BgStyle = 'default' | 'sunset-grad' | 'ocean-grad' | 'forest-grad' | 'midnight-grad' | 'minimal-grid';

interface ThemeContextType {
  themePreset: ThemePreset;
  setThemePreset: (preset: ThemePreset) => void;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  fontFamily: FontFamily;
  setFontFamily: (font: FontFamily) => void;
  colorScheme: ColorScheme;
  setColorScheme: (scheme: ColorScheme) => void;
  bgStyle: BgStyle;
  setBgStyle: (style: BgStyle) => void;
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

  const [colorScheme, setColorSchemeState] = useState<ColorScheme>(() => {
    return (localStorage.getItem('relayhq_color_scheme') as ColorScheme) || 'default';
  });

  const [bgStyle, setBgStyleState] = useState<BgStyle>(() => {
    return (localStorage.getItem('relayhq_bg_style') as BgStyle) || 'default';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    
    // Set preset, mode, font, color scheme, and background style attributes
    root.setAttribute('data-theme-preset', themePreset);
    root.setAttribute('data-theme-mode', themeMode);
    root.setAttribute('data-font', fontFamily);
    root.setAttribute('data-color-scheme', colorScheme);
    root.setAttribute('data-bg-style', bgStyle);
    
    // Manage dark class for Tailwind
    if (themeMode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [themePreset, themeMode, fontFamily, colorScheme, bgStyle]);

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

  const setColorScheme = (scheme: ColorScheme) => {
    setColorSchemeState(scheme);
    localStorage.setItem('relayhq_color_scheme', scheme);
  };

  const setBgStyle = (style: BgStyle) => {
    setBgStyleState(style);
    localStorage.setItem('relayhq_bg_style', style);
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
        colorScheme,
        setColorScheme,
        bgStyle,
        setBgStyle,
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
