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
  customPrimary: string;
  setCustomPrimary: (color: string) => void;
  customBg: string;
  setCustomBg: (color: string) => void;
  customCard: string;
  setCustomCard: (color: string) => void;
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

  const [customPrimary, setCustomPrimaryState] = useState<string>(() => {
    return localStorage.getItem('relayhq_custom_primary') || '';
  });

  const [customBg, setCustomBgState] = useState<string>(() => {
    return localStorage.getItem('relayhq_custom_bg') || '';
  });

  const [customCard, setCustomCardState] = useState<string>(() => {
    return localStorage.getItem('relayhq_custom_card') || '';
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

    // Apply custom colors if defined
    if (customPrimary) {
      const hsl = hexToHslString(customPrimary);
      root.style.setProperty('--primary', hsl);
      root.style.setProperty('--chat-bubble-out', hsl);
      
      const lightness = getLightnessOfHex(customPrimary);
      root.style.setProperty('--primary-foreground', lightness > 60 ? '0 0% 0%' : '0 0% 100%');
      root.style.setProperty('--chat-bubble-out-foreground', lightness > 60 ? '0 0% 0%' : '0 0% 100%');
    } else {
      root.style.removeProperty('--primary');
      root.style.removeProperty('--chat-bubble-out');
      root.style.removeProperty('--primary-foreground');
      root.style.removeProperty('--chat-bubble-out-foreground');
    }

    if (customBg) {
      const hsl = hexToHslString(customBg);
      root.style.setProperty('--background', hsl);
      
      const lightness = getLightnessOfHex(customBg);
      root.style.setProperty('--foreground', lightness > 50 ? '222 47% 11%' : '210 40% 98%');
    } else {
      root.style.removeProperty('--background');
      root.style.removeProperty('--foreground');
    }

    if (customCard) {
      const hsl = hexToHslString(customCard);
      root.style.setProperty('--card', hsl);
      root.style.setProperty('--popover', hsl);
      root.style.setProperty('--muted', hsl);
      
      const lightness = getLightnessOfHex(customCard);
      root.style.setProperty('--card-foreground', lightness > 50 ? '222 47% 11%' : '210 40% 98%');
      root.style.setProperty('--popover-foreground', lightness > 50 ? '222 47% 11%' : '210 40% 98%');
      root.style.setProperty('--muted-foreground', lightness > 50 ? '220 20% 45%' : '215 20% 65%');
    } else {
      root.style.removeProperty('--card');
      root.style.removeProperty('--popover');
      root.style.removeProperty('--muted');
      root.style.removeProperty('--card-foreground');
      root.style.removeProperty('--popover-foreground');
      root.style.removeProperty('--muted-foreground');
    }
  }, [themePreset, themeMode, fontFamily, colorScheme, bgStyle, customPrimary, customBg, customCard]);

  const setThemePreset = (preset: ThemePreset) => {
    setThemePresetState(preset);
    localStorage.setItem('relayhq_theme_preset', preset);

    // Apply distinct signature templates (font, colorScheme, bgStyle, themeMode)
    if (preset === 'cyberpunk') {
      setFontFamily('jetbrains-mono');
      setColorScheme('crimson');
      setBgStyle('midnight-grad');
      setThemeMode('dark');
    } else if (preset === 'neobrutalist') {
      setFontFamily('space-grotesk');
      setColorScheme('default');
      setBgStyle('default');
      setThemeMode('light');
    } else if (preset === 'scandinavian') {
      setFontFamily('lora');
      setColorScheme('default');
      setBgStyle('default');
      setThemeMode('light');
    } else if (preset === 'glassmorphism') {
      setFontFamily('outfit');
      setColorScheme('royal');
      setBgStyle('midnight-grad');
      setThemeMode('dark');
    } else if (preset === 'minimalist') {
      setFontFamily('inter');
      setColorScheme('default');
      setBgStyle('minimal-grid');
      setThemeMode('light');
    } else if (preset === 'retrofuturistic') {
      setFontFamily('space-grotesk');
      setColorScheme('crimson');
      setBgStyle('sunset-grad');
      setThemeMode('dark');
    } else if (preset === 'bauhaus') {
      setFontFamily('space-grotesk');
      setColorScheme('sunset');
      setBgStyle('default');
      setThemeMode('light');
    } else if (preset === 'artdeco') {
      setFontFamily('lora');
      setColorScheme('sunset');
      setBgStyle('sunset-grad');
      setThemeMode('dark');
    } else if (preset === 'forestzen') {
      setFontFamily('lora');
      setColorScheme('forest');
      setBgStyle('forest-grad');
      setThemeMode('light');
    } else if (preset === 'midnightroyal') {
      setFontFamily('outfit');
      setColorScheme('royal');
      setBgStyle('midnight-grad');
      setThemeMode('dark');
    } else if (preset === 'corporate') {
      setFontFamily('inter');
      setColorScheme('default');
      setBgStyle('default');
      setThemeMode('light');
    }
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

  const setCustomPrimary = (color: string) => {
    setCustomPrimaryState(color);
    if (color) {
      localStorage.setItem('relayhq_custom_primary', color);
    } else {
      localStorage.removeItem('relayhq_custom_primary');
    }
  };

  const setCustomBg = (color: string) => {
    setCustomBgState(color);
    if (color) {
      localStorage.setItem('relayhq_custom_bg', color);
    } else {
      localStorage.removeItem('relayhq_custom_bg');
    }
  };

  const setCustomCard = (color: string) => {
    setCustomCardState(color);
    if (color) {
      localStorage.setItem('relayhq_custom_card', color);
    } else {
      localStorage.removeItem('relayhq_custom_card');
    }
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
        customPrimary,
        setCustomPrimary,
        customBg,
        setCustomBg,
        customCard,
        setCustomCard,
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

// Utilities for custom color parsing
function hexToHslString(hex: string): string {
  hex = hex.replace(/^#/, '');
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  let r = parseInt(hex.substring(0, 2), 16) / 255;
  let g = parseInt(hex.substring(2, 4), 16) / 255;
  let b = parseInt(hex.substring(4, 6), 16) / 255;

  let max = Math.max(r, g, b);
  let min = Math.min(r, g, b);

  let h = 0;
  let s = 0;
  let l = (max + min) / 2;

  if (max !== min) {
    let d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  h = Math.round(h * 360);
  s = Math.round(s * 100);
  l = Math.round(l * 100);

  return `${h} ${s}% ${l}%`;
}

function getLightnessOfHex(hex: string): number {
  hex = hex.replace(/^#/, '');
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  let r = parseInt(hex.substring(0, 2), 16) / 255;
  let g = parseInt(hex.substring(2, 4), 16) / 255;
  let b = parseInt(hex.substring(4, 6), 16) / 255;
  let max = Math.max(r, g, b);
  let min = Math.min(r, g, b);
  return Math.round(((max + min) / 2) * 100);
}
