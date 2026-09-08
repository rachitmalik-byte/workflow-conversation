import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { dbClient } from '../../services/dbClient';
import { supabase } from '../../services/supabase';
import type { Profile, UserRole } from '../../types/database';
import { AlertCircle, Users, Shield, Circle, User, Wifi, Bell, Key, Lock, Trash2, Palette } from 'lucide-react';

type TabType = 'profile' | 'connection' | 'teammates' | 'notifications' | 'security';

// Web Audio sound previews
const playSynthChime = (sound: string) => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    
    if (sound === 'classic') {
      const playTone = (time: number, freq: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, time);
        gain.gain.setValueAtTime(0.08, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(time);
        osc.stop(time + duration);
      };
      playTone(now, 880, 0.12);
      playTone(now + 0.08, 1150, 0.16);
    } else if (sound === 'sonar') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.4);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.4);
    } else if (sound === 'beep') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(1000, now);
      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (sound === 'zen') {
      const osc = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, now);
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(225, now);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
      osc.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc2.start(now);
      osc.stop(now + 0.8);
      osc2.stop(now + 0.8);
    }
  } catch (e) {
    console.warn('Audio synthesis failed:', e);
  }
};

const playSynthAlarm = (sound: string) => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    
    if (sound === 'sawtooth_triple') {
      const playTone = (time: number, freq: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, time);
        gain.gain.setValueAtTime(0.1, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(time);
        osc.stop(time + duration);
      };
      playTone(now, 988, 0.15);
      playTone(now + 0.2, 784, 0.15);
      playTone(now + 0.4, 988, 0.15);
    } else if (sound === 'siren') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.linearRampToValueAtTime(900, now + 0.25);
      osc.frequency.linearRampToValueAtTime(600, now + 0.5);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.5);
    } else if (sound === 'bell') {
      const playRing = (time: number) => {
        const osc = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1500, time);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(2200, time);
        gain.gain.setValueAtTime(0.06, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
        osc.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);
        osc.start(time);
        osc2.start(time);
        osc.stop(time + 0.1);
        osc2.stop(time + 0.1);
      };
      playRing(now);
      playRing(now + 0.1);
      playRing(now + 0.2);
    } else if (sound === 'digital') {
      const playBeep = (time: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(800, time);
        gain.gain.setValueAtTime(0.05, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(time);
        osc.stop(time + 0.08);
      };
      playBeep(now);
      playBeep(now + 0.12);
    }
  } catch (e) {
    console.warn('Audio synthesis failed:', e);
  }
};

export const SettingsView: React.FC = () => {
  const { currentUser, profiles, switchUser, isDeveloper, isAdmin, refreshProfiles } = useAuth();
  const {
    themePreset, setThemePreset,
    themeMode, setThemeMode,
    fontFamily, setFontFamily,
    colorScheme, setColorScheme,
    bgStyle, setBgStyle,
    customPrimary, setCustomPrimary,
    customBg, setCustomBg,
    customCard, setCustomCard
  } = useTheme();
  const [activeTab, setActiveTabInternal] = useState<TabType>(() => {
    return (localStorage.getItem('relayhq_settings_active_tab') as TabType) || 'profile';
  });

  const setActiveTab = (tab: TabType) => {
    setActiveTabInternal(tab);
    localStorage.setItem('relayhq_settings_active_tab', tab);
  };

  const hasOnboardAccess = isAdmin;

  // --- Profile States ---
  const [profName, setProfName] = useState('');
  const [profEmail, setProfEmail] = useState('');
  const [profDesignation, setProfDesignation] = useState('');
  const [profileSuccess, setProfileSuccess] = useState(false);

  // --- Connection States ---
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [connectionSuccess, setConnectionSuccess] = useState(false);
  const [isLiveEnabled, setIsLiveEnabled] = useState(false);

  // --- Teammates Onboarding States (Heads & Developer) ---
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('growth_specialist');
  const [bypassEmailVerification, setBypassEmailVerification] = useState(true);
  const [isOnboardingSaving, setIsOnboardingSaving] = useState(false);
  const [onboardError, setOnboardError] = useState<string | null>(null);
  const [onboardSuccess, setOnboardSuccess] = useState(false);

  // --- Notification Preferences ---
  const [desktopAlerts, setDesktopAlerts] = useState(true);
  const [soundAlerts, setSoundAlerts] = useState(true);
  const [messagePreviews, setMessagePreviews] = useState(true);
  const [googleChatWebhook, setGoogleChatWebhook] = useState('');
  const [notifSuccess, setNotifSuccess] = useState(false);
  const [notificationSound, setNotificationSound] = useState('classic');
  const [alarmSound, setAlarmSound] = useState('sawtooth_triple');
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>('default');

  // --- Security / Change Password States ---
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  // Pre-load settings on mount
  useEffect(() => {
    if (currentUser) {
      setProfName(currentUser.full_name);
      setProfEmail(currentUser.email);
      setProfDesignation(currentUser.designation || '');
    }

    if (currentUser && currentUser.role !== 'head' && activeTab === 'connection') {
      setActiveTab('profile');
    }

    const config = dbClient.getSupabaseConfig();
    setSupabaseUrl(config.url || '');
    setSupabaseKey(config.key || '');
    setIsLiveEnabled(!!(config.url && config.key));

    const notifSettings = dbClient.getNotificationSettings();
    setDesktopAlerts(notifSettings.desktopAlerts);
    setSoundAlerts(notifSettings.soundAlerts);
    setMessagePreviews(notifSettings.messagePreviews);
    setGoogleChatWebhook(localStorage.getItem('relayhq_google_chat_webhook_url') || '');
    setNotificationSound(localStorage.getItem('relayhq_notification_sound') || 'classic');
    setAlarmSound(localStorage.getItem('relayhq_alarm_sound') || 'sawtooth_triple');

    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    } else {
      setNotificationPermission('unsupported');
    }
  }, [currentUser, activeTab]);

  // Profile Save Handler
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !profName.trim() || !profEmail.trim()) return;

    try {
      await dbClient.updateProfile(currentUser.id, {
        full_name: profName.trim(),
        email: profEmail.trim(),
        designation: profDesignation.trim()
      });
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 2000);
      
      // Reload switch to refresh context
      await switchUser(currentUser.id);
    } catch (err) {
      console.error(err);
    }
  };

  // Connection Save Handler
  const handleSaveConnection = (e: React.FormEvent) => {
    e.preventDefault();
    dbClient.setSupabaseConfig(supabaseUrl.trim(), supabaseKey.trim());
    setIsLiveEnabled(!!(supabaseUrl.trim() && supabaseKey.trim()));
    setConnectionSuccess(true);
    setTimeout(() => {
      setConnectionSuccess(false);
      window.location.reload();
    }, 1000);
  };

  // Teammates Onboarding Handler
  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) {
      setOnboardError('All onboarding fields are required.');
      return;
    }

    setIsOnboardingSaving(true);
    setOnboardError(null);

    try {
      if (dbClient.isSupabaseEnabled && supabase) {
        // Create user in Supabase auth first
        const signUpPass = password.trim() || 'Welcome123!';
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: signUpPass,
          options: {
            data: {
              full_name: fullName.trim()
            }
          }
        });
        
        if (error) {
          throw error;
        }

        const newProfile: Profile = {
          id: data.user?.id || `specialist-${Math.random().toString(36).substr(2, 9)}`,
          full_name: fullName.trim(),
          email: email.trim(),
          role,
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const { error: insertErr } = await supabase.from('profiles').insert(newProfile);
        if (insertErr) {
          throw insertErr;
        }
      } else {
        // Simulator mode
        const newProfile: Profile = {
          id: `specialist-${Math.random().toString(36).substr(2, 9)}`,
          full_name: fullName.trim(),
          email: email.trim(),
          role,
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        await dbClient.createProfile(newProfile);
      }
      
      if (currentUser) {
        await switchUser(currentUser.id);
      }

      setFullName('');
      setEmail('');
      setPassword('');
      setRole('growth_specialist');
      setOnboardSuccess(true);
      setTimeout(() => setOnboardSuccess(false), 3000);
    } catch (err: any) {
      setOnboardError(err.message || 'Failed to onboard employee.');
    } finally {
      setIsOnboardingSaving(false);
    }
  };

  const handleDeleteMember = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to completely delete teammate: ${name}? This will permanently remove their profile and all associated tasks, reminders, and DMs. This cannot be undone.`)) return;
    try {
      if (typeof (dbClient as any).hardDeleteProfile === 'function') {
        await (dbClient as any).hardDeleteProfile(id);
      } else {
        await dbClient.deleteProfile(id);
      }
      alert(`Teammate ${name} has been permanently deleted.`);
      if (refreshProfiles) {
        await refreshProfiles();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to remove teammate.');
    }
  };

  // Change Password Handler
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    if (!newPassword || !confirmPassword) {
      setPasswordError('Please fill in all fields.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    if (!dbClient.isSupabaseEnabled || !supabase) {
      // Simulator mode — simulate success locally
      setIsSavingPassword(true);
      setTimeout(() => {
        setIsSavingPassword(false);
        setPasswordSuccess(true);
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setPasswordSuccess(false), 3000);
      }, 1000);
      return;
    }

    setIsSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setPasswordSuccess(true);
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to update password.');
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleToggleDesktopAlerts = async (checked: boolean) => {
    if (checked) {
      if (!('Notification' in window)) {
        alert('Desktop Notifications are not supported by this browser.');
        setDesktopAlerts(false);
        return;
      }

      const perm = Notification.permission;
      if (perm === 'granted') {
        setDesktopAlerts(true);
      } else if (perm === 'default') {
        const res = await Notification.requestPermission();
        setNotificationPermission(res);
        if (res === 'granted') {
          setDesktopAlerts(true);
        } else {
          setDesktopAlerts(false);
          alert(`Permission was ${res}. Desktop notifications will not trigger.`);
        }
      } else if (perm === 'denied') {
        alert('Notifications are blocked by your browser settings. Please click the lock or settings icon in your browser address bar to allow notifications for this site.');
        setDesktopAlerts(false);
      }
    } else {
      setDesktopAlerts(false);
    }
  };

  // Notifications Save Handler
  const handleSaveNotifications = async (e: React.FormEvent) => {
    e.preventDefault();

    let targetAlerts = desktopAlerts;
    if (desktopAlerts && 'Notification' in window) {
      const perm = Notification.permission;
      if (perm === 'default') {
        const res = await Notification.requestPermission();
        setNotificationPermission(res);
        if (res !== 'granted') {
          targetAlerts = false;
          setDesktopAlerts(false);
        }
      } else if (perm === 'denied') {
        alert('Notifications are blocked by your browser. Please allow them in your browser settings.');
        targetAlerts = false;
        setDesktopAlerts(false);
      }
    }

    dbClient.setNotificationSettings({
      desktopAlerts: targetAlerts,
      soundAlerts,
      messagePreviews
    });
    localStorage.setItem('relayhq_google_chat_webhook_url', googleChatWebhook.trim());
    localStorage.setItem('relayhq_notification_sound', notificationSound);
    localStorage.setItem('relayhq_alarm_sound', alarmSound);
    setNotifSuccess(true);
    setTimeout(() => setNotifSuccess(false), 2000);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 w-full max-w-[1600px] mx-auto">
      {/* Header Info */}
      <div className="border-b border-border pb-4">
        <h2 className="text-xl font-extrabold text-foreground sm:text-2xl tracking-tight">System Settings</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Manage user profile details, database connection states, notifications, and teammates.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Settings Navigation Tabs */}
        <div className="w-full md:w-56 flex-shrink-0 flex flex-row md:flex-col gap-1 border-b md:border-b-0 md:border-r border-border pb-4 md:pb-0 md:pr-4 overflow-x-auto whitespace-nowrap scrollbar-none">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 px-3 py-2 rounded text-xs font-semibold text-left transition-colors cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-primary/10 text-primary font-bold'
                : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
            }`}
          >
            <User className="h-3.5 w-3.5" />
            <span>My Profile</span>
          </button>

          {isAdmin && (
            <button
              onClick={() => setActiveTab('connection')}
              className={`flex items-center gap-2 px-3 py-2 rounded text-xs font-semibold text-left transition-colors cursor-pointer ${
                activeTab === 'connection'
                  ? 'bg-primary/10 text-primary font-bold'
                  : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
              }`}
            >
              <Wifi className="h-3.5 w-3.5" />
              <span>Database Connection</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('teammates')}
            className={`flex items-center gap-2 px-3 py-2 rounded text-xs font-semibold text-left transition-colors cursor-pointer ${
              activeTab === 'teammates'
                ? 'bg-primary/10 text-primary font-bold'
                : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>Teammates</span>
          </button>

          <button
            onClick={() => setActiveTab('notifications')}
            className={`flex items-center gap-2 px-3 py-2 rounded text-xs font-semibold text-left transition-colors cursor-pointer ${
              activeTab === 'notifications'
                ? 'bg-primary/10 text-primary font-bold'
                : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
            }`}
          >
            <Bell className="h-3.5 w-3.5" />
            <span>Notifications</span>
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`flex items-center gap-2 px-3 py-2 rounded text-xs font-semibold text-left transition-colors cursor-pointer ${
              activeTab === 'security'
                ? 'bg-primary/10 text-primary font-bold'
                : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
            }`}
          >
            <Lock className="h-3.5 w-3.5" />
            <span>Security</span>
          </button>
        </div>

        {/* Tab Panel Display */}
        <div className="flex-1 min-w-0">
          {/* TAB: PROFILE */}
          {activeTab === 'profile' && (
            <div className="border border-border rounded-xl bg-card p-6 shadow-sm space-y-6 w-full max-w-4xl">
              <div className="flex items-center justify-between border-b border-border/40 pb-3">
                <h3 className="text-sm font-bold text-foreground">Employee Profile</h3>
                {profileSuccess && (
                  <span className="text-[10px] text-success bg-success/10 border border-success/20 px-2 py-0.5 rounded font-medium">
                    Profile Updated
                  </span>
                )}
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-6 text-xs sm:text-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={profName}
                      onChange={(e) => setProfName(e.target.value)}
                      className="w-full text-xs bg-background border border-border text-foreground px-3 py-2.5 rounded-lg focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={profEmail}
                      onChange={(e) => setProfEmail(e.target.value)}
                      className="w-full text-xs bg-background border border-border text-foreground px-3 py-2.5 rounded-lg focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                      Designation / Job Title
                    </label>
                    <input
                      type="text"
                      value={profDesignation}
                      onChange={(e) => setProfDesignation(e.target.value)}
                      placeholder="e.g. Senior SDR, VP of Marketing"
                      className="w-full text-xs bg-background border border-border text-foreground px-3 py-2.5 rounded-lg focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                      Workspace Permission Role
                    </label>
                    {isDeveloper ? (
                      <div className="w-full bg-primary/10 border border-primary/20 text-primary px-3 py-2.5 rounded-lg font-extrabold flex items-center gap-1.5">
                        <span>🛠️ Developer / Creator Role</span>
                      </div>
                    ) : (
                      <div className="w-full bg-muted border border-border text-muted-foreground px-3 py-2.5 rounded-lg capitalize font-medium">
                        {currentUser?.role === 'head' ? '👑 Head Role (Operations Admin)' : '💼 Outbound Growth Specialist'}
                      </div>
                    )}
                  </div>
                </div>

                <hr className="border-border/60" />

                {/* Theme & Customization */}
                <div className="space-y-4 pt-2">
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wide flex items-center gap-1.5">
                    <Palette className="h-4 w-4 text-primary" />
                    <span>Workspace Theme & Personalization</span>
                  </h4>
                  <p className="text-[10px] text-muted-foreground leading-normal">
                    Customize the look, colors, borders, and typography of your workspace. Changes apply immediately and persist.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
                    {/* Background Style */}
                    <div>
                      <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                        Background Style
                      </label>
                      <select
                        value={bgStyle}
                        onChange={(e) => setBgStyle(e.target.value as any)}
                        className="w-full text-xs bg-background border border-border text-foreground px-3 py-2.5 rounded-lg focus:outline-none focus:border-primary cursor-pointer font-semibold animate-none"
                      >
                        <option value="default">🖥️ Preset Default</option>
                        <option value="sunset-grad">🌅 Warm Sunset</option>
                        <option value="ocean-grad">🌊 Sapphire Ocean</option>
                        <option value="forest-grad">🌿 Emerald Forest</option>
                        <option value="midnight-grad">🌌 Midnight Royal</option>
                        <option value="minimal-grid">🏁 Clean Minimal Grid</option>
                      </select>
                    </div>

                    {/* Theme Preset */}
                    <div>
                      <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                        Theme Preset
                      </label>
                      <select
                        value={themePreset}
                        onChange={(e) => setThemePreset(e.target.value as any)}
                        className="w-full text-xs bg-background border border-border text-foreground px-3 py-2.5 rounded-lg focus:outline-none focus:border-primary cursor-pointer font-semibold animate-none"
                      >
                        <option value="corporate">💼 Corporate Professional</option>
                        <option value="glassmorphism">💎 Glassmorphism Elegance</option>
                        <option value="neobrutalist">🎨 Neobrutalist Stark</option>
                        <option value="minimalist">✉️ Minimalist Clean</option>
                        <option value="retrofuturistic">👾 Retro-futuristic Glow</option>
                        <option value="scandinavian">🍃 Scandinavian Zen</option>
                        <option value="bauhaus">📐 Bauhaus Geometric</option>
                        <option value="cyberpunk">⚡ Cyberpunk Neon</option>
                        <option value="artdeco">🏛️ Art Deco Luxury</option>
                        <option value="forestzen">🌲 Forest Sage Tranquility</option>
                        <option value="midnightroyal">🌌 Midnight Slate Royal</option>
                      </select>
                    </div>

                    {/* Accent Color Scheme */}
                    <div>
                      <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                        Accent Color Scheme
                      </label>
                      <select
                        value={colorScheme}
                        onChange={(e) => setColorScheme(e.target.value as any)}
                        className="w-full text-xs bg-background border border-border text-foreground px-3 py-2.5 rounded-lg focus:outline-none focus:border-primary cursor-pointer font-semibold animate-none"
                      >
                        <option value="default">🎨 Default Accent</option>
                        <option value="ocean">🌊 Sapphire Ocean (Blue)</option>
                        <option value="forest">🌿 Emerald Forest (Green)</option>
                        <option value="sunset">🌅 Warm Sunset (Orange)</option>
                        <option value="royal">🔮 Royal Amethyst (Purple)</option>
                        <option value="crimson">🍷 Crimson Ruby (Crimson)</option>
                      </select>
                    </div>

                    {/* Font Family */}
                    <div>
                      <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                        Typography / Font
                      </label>
                      <select
                        value={fontFamily}
                        onChange={(e) => setFontFamily(e.target.value as any)}
                        className="w-full text-xs bg-background border border-border text-foreground px-3 py-2.5 rounded-lg focus:outline-none focus:border-primary cursor-pointer font-semibold animate-none"
                      >
                        <option value="inter">Inter (Clean Sans)</option>
                        <option value="outfit">Outfit (Geometric Sans)</option>
                        <option value="space-grotesk">Space Grotesk (Modern Tech)</option>
                        <option value="lora">Lora (Sophisticated Serif)</option>
                        <option value="jetbrains-mono">JetBrains Mono (Developer)</option>
                      </select>
                    </div>

                    {/* Day/Night Mode */}
                    <div>
                      <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                        Appearance Mode
                      </label>
                      <div className="flex items-center gap-2 p-1 bg-muted/45 rounded-lg border border-border/60 w-fit">
                        <button
                          type="button"
                          onClick={() => setThemeMode('light')}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                            themeMode === 'light'
                              ? 'bg-card shadow-sm text-foreground animate-none'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          ☀️ Light
                        </button>
                        <button
                          type="button"
                          onClick={() => setThemeMode('dark')}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                            themeMode === 'dark'
                              ? 'bg-card shadow-sm text-foreground animate-none'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          🌙 Dark
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Custom Color scale customization box */}
                  <div className="mt-4 pt-4 border-t border-border/50 space-y-3">
                    <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                      🎨 Custom Color Customization (Click scales or pick custom hex)
                    </label>
                    <p className="text-[10px] text-muted-foreground leading-normal max-w-xl">
                      Design your own custom color scheme by selecting a color block from the scale boxes below. You can also pick a custom hex color. Clear a custom scale by clicking the (✕) box.
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-1">
                      {/* Primary / Accent Element Color */}
                      <div className="space-y-2">
                        <span className="block text-[10px] font-bold text-foreground/80">
                          Primary / Accent Theme Color
                        </span>
                        <div className="flex flex-wrap gap-1.5 items-center">
                          <button
                            type="button"
                            onClick={() => setCustomPrimary('')}
                            className={`h-5 w-5 rounded-full border border-border/80 flex items-center justify-center cursor-pointer transition-all hover:scale-110 active:scale-95 ${!customPrimary ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}`}
                            title="Reset to default primary"
                          >
                            <span className="text-[9px] font-bold opacity-60">✕</span>
                          </button>
                          {[
                            { hex: '#3b82f6', name: 'Blue' },
                            { hex: '#10b981', name: 'Green' },
                            { hex: '#f97316', name: 'Orange' },
                            { hex: '#8b5cf6', name: 'Purple' },
                            { hex: '#ef4444', name: 'Red' },
                            { hex: '#ec4899', name: 'Pink' },
                            { hex: '#f59e0b', name: 'Gold' }
                          ].map(color => (
                            <button
                              key={color.hex}
                              type="button"
                              onClick={() => setCustomPrimary(color.hex)}
                              style={{ backgroundColor: color.hex }}
                              className={`h-5 w-5 rounded-full border border-border/40 cursor-pointer transition-all hover:scale-110 active:scale-95 ${customPrimary === color.hex ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}`}
                              title={color.name}
                            />
                          ))}
                          <div className="relative h-6 w-8 flex items-center justify-center border border-border rounded overflow-hidden bg-muted/40 cursor-pointer hover:bg-muted/70 transition-colors">
                            <input
                              type="color"
                              value={customPrimary || '#3b82f6'}
                              onChange={(e) => setCustomPrimary(e.target.value)}
                              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                              title="Pick Custom Accent"
                            />
                            <span className="text-[10px] font-bold text-foreground pointer-events-none">🎨</span>
                          </div>
                        </div>
                      </div>

                      {/* Background Color */}
                      <div className="space-y-2">
                        <span className="block text-[10px] font-bold text-foreground/80">
                          Workspace Background Color
                        </span>
                        <div className="flex flex-wrap gap-1.5 items-center">
                          <button
                            type="button"
                            onClick={() => setCustomBg('')}
                            className={`h-5 w-5 rounded-full border border-border/80 flex items-center justify-center cursor-pointer transition-all hover:scale-110 active:scale-95 ${!customBg ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}`}
                            title="Reset to default background"
                          >
                            <span className="text-[9px] font-bold opacity-60">✕</span>
                          </button>
                          {[
                            { hex: '#f8f9fa', name: 'Pure Light' },
                            { hex: '#faf6f0', name: 'Warm Cream' },
                            { hex: '#f0f4f1', name: 'Sage Green' },
                            { hex: '#f2f1fa', name: 'Lavender' },
                            { hex: '#09090b', name: 'Clean Dark' },
                            { hex: '#0d1117', name: 'Navy Space' },
                            { hex: '#0a0f0d', name: 'Forest Dark' }
                          ].map(color => (
                            <button
                              key={color.hex}
                              type="button"
                              onClick={() => setCustomBg(color.hex)}
                              style={{ backgroundColor: color.hex }}
                              className={`h-5 w-5 rounded-full border border-border/40 cursor-pointer transition-all hover:scale-110 active:scale-95 ${customBg === color.hex ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}`}
                              title={color.name}
                            />
                          ))}
                          <div className="relative h-6 w-8 flex items-center justify-center border border-border rounded overflow-hidden bg-muted/40 cursor-pointer hover:bg-muted/70 transition-colors">
                            <input
                              type="color"
                              value={customBg || '#f3f4f6'}
                              onChange={(e) => setCustomBg(e.target.value)}
                              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                              title="Pick Custom Background"
                            />
                            <span className="text-[10px] font-bold text-foreground pointer-events-none">🎨</span>
                          </div>
                        </div>
                      </div>

                      {/* Card / Element Background */}
                      <div className="space-y-2">
                        <span className="block text-[10px] font-bold text-foreground/80">
                          Card & UI Element Background
                        </span>
                        <div className="flex flex-wrap gap-1.5 items-center">
                          <button
                            type="button"
                            onClick={() => setCustomCard('')}
                            className={`h-5 w-5 rounded-full border border-border/80 flex items-center justify-center cursor-pointer transition-all hover:scale-110 active:scale-95 ${!customCard ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}`}
                            title="Reset to default card"
                          >
                            <span className="text-[9px] font-bold opacity-60">✕</span>
                          </button>
                          {[
                            { hex: '#ffffff', name: 'White' },
                            { hex: '#fdfcfb', name: 'Ivory' },
                            { hex: '#ebedea', name: 'Sage Slate' },
                            { hex: '#18181b', name: 'Zinc Dark' },
                            { hex: '#161b22', name: 'Midnight Card' }
                          ].map(color => (
                            <button
                              key={color.hex}
                              type="button"
                              onClick={() => setCustomCard(color.hex)}
                              style={{ backgroundColor: color.hex }}
                              className={`h-5 w-5 rounded-full border border-border/40 cursor-pointer transition-all hover:scale-110 active:scale-95 ${customCard === color.hex ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}`}
                              title={color.name}
                            />
                          ))}
                          <div className="relative h-6 w-8 flex items-center justify-center border border-border rounded overflow-hidden bg-muted/40 cursor-pointer hover:bg-muted/70 transition-colors">
                            <input
                              type="color"
                              value={customCard || '#ffffff'}
                              onChange={(e) => setCustomCard(e.target.value)}
                              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                              title="Pick Custom Card Color"
                            />
                            <span className="text-[10px] font-bold text-foreground pointer-events-none">🎨</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 pt-2">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-primary hover:bg-primary/95 text-primary-foreground rounded text-xs font-semibold shadow-sm transition-colors cursor-pointer font-bold animate-none"
                  >
                    Save Profile Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      localStorage.removeItem('relayhq_tutorial_completed');
                      alert('Tutorial Tour has been reset. We will now reload the page to start the tour!');
                      window.location.reload();
                    }}
                    className="px-3 py-2 bg-muted hover:bg-muted/80 text-foreground border border-border rounded text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Reset & Restart Guided Tour
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB: CONNECTION */}
          {activeTab === 'connection' && (
            <div className="space-y-6 w-full max-w-4xl">
              {/* Connection Form */}
              <div className="border border-border rounded-xl bg-card p-6 shadow-sm space-y-6">
                <div className="flex items-center justify-between border-b border-border/40 pb-3">
                  <h3 className="text-sm font-bold text-foreground">Supabase Project Credentials</h3>
                  {connectionSuccess && (
                    <span className="text-[10px] text-success bg-success/10 border border-success/20 px-2 py-0.5 rounded font-medium">
                      Connection Applied
                    </span>
                  )}
                </div>

                {/* Status indicator */}
                <div className={`p-4 border rounded-xl flex items-center justify-between gap-4 text-xs ${
                  isLiveEnabled
                    ? 'bg-success/5 border-success/25 text-success'
                    : 'bg-primary/5 border-primary/25 text-primary'
                }`}>
                  <div className="flex items-center gap-2">
                    <div className={`h-2.5 w-2.5 rounded-full ${isLiveEnabled ? 'bg-success animate-pulse' : 'bg-primary'}`} />
                    <div>
                      <p className="font-bold text-sm">
                        {isLiveEnabled ? 'Production DB Connected' : 'Mock Simulator Active'}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 leading-normal">
                        {isLiveEnabled ? 'Performing live SQL queries on custom Supabase client url' : 'Zero dependencies. Executing database operations in-memory.'}
                      </p>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleSaveConnection} className="space-y-6 text-xs sm:text-sm">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1">
                        <Key className="h-3.5 w-3.5" />
                        <span>Supabase Project URL</span>
                      </label>
                      <input
                        type="text"
                        value={supabaseUrl}
                        onChange={(e) => setSupabaseUrl(e.target.value)}
                        placeholder="e.g. https://xyz.supabase.co"
                        className="w-full text-xs bg-background border border-border text-foreground px-3 py-2.5 rounded-lg focus:outline-none focus:border-primary font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1">
                        <Key className="h-3.5 w-3.5" />
                        <span>Anon Key</span>
                      </label>
                      <input
                        type="password"
                        value={supabaseKey}
                        onChange={(e) => setSupabaseKey(e.target.value)}
                        placeholder="e.g. eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                        className="w-full text-xs bg-background border border-border text-foreground px-3 py-2.5 rounded-lg focus:outline-none focus:border-primary font-mono"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-primary hover:bg-primary/95 text-primary-foreground rounded text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                    >
                      Save Configuration
                    </button>
                    {isLiveEnabled && (
                      <button
                        type="button"
                        onClick={() => {
                          setSupabaseUrl('');
                          setSupabaseKey('');
                          dbClient.setSupabaseConfig('', '');
                          setIsLiveEnabled(false);
                          window.location.reload();
                        }}
                        className="px-3 py-2 bg-muted hover:bg-muted/80 text-foreground border border-border rounded text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Disconnect
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Guide card */}
              <div className="border border-border rounded-lg bg-card p-5 shadow-sm space-y-3">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Shield className="h-4 w-4 text-primary" />
                  <span>Setup Guide for Admins</span>
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  To connect your real database instance:
                </p>
                <ol className="list-decimal pl-5 text-xs text-muted-foreground space-y-1">
                  <li>Create a free account and project at <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-primary hover:underline font-medium">supabase.com</a>.</li>
                  <li>Copy the contents of <a href="file:///C:/Users/Admin/.gemini/antigravity/scratch/relayhq/schema.sql" className="text-primary hover:underline font-mono">schema.sql</a> from the project root.</li>
                  <li>Go to your Supabase Project dashboard, open the **SQL Editor**, click "New Query", paste the script, and click **Run**.</li>
                  <li>Copy your Project URL and Anon API key from **Project Settings &gt; API** and paste them in the form above.</li>
                </ol>
              </div>
            </div>
          )}

          {/* TAB: TEAMMATES */}
          {activeTab === 'teammates' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Directory */}
              <div className="lg:col-span-2 border border-border rounded-lg bg-card overflow-hidden shadow-sm">
                <div className="bg-muted/30 border-b border-border px-4 py-3 flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>Workspace Teammates</span>
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-muted/10 border-b border-border text-muted-foreground text-[9px] font-bold uppercase tracking-wider">
                        <th className="px-4 py-2.5">Member</th>
                        <th className="px-4 py-2.5">Role</th>
                        <th className="px-4 py-2.5">Status</th>
                        {hasOnboardAccess && <th className="px-4 py-2.5 text-right">Actions</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {profiles.filter((p) => p.status === 'active').map((p) => (
                        <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-2.5 flex items-center gap-2">
                            <div className="h-6 w-6 bg-primary/10 text-primary font-semibold text-[10px] rounded-full flex items-center justify-center uppercase">
                              {p.full_name.split(' ').map((n) => n[0]).join('')}
                            </div>
                            <div>
                              <p className="font-semibold text-foreground">{p.full_name}</p>
                              <p className="text-[9px] text-muted-foreground">{p.email}</p>
                            </div>
                          </td>
                          <td className="px-4 py-2.5">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold border inline-flex items-center gap-1 ${
                              p.role === 'head' ? 'bg-purple-500/10 text-purple-600 border-purple-500/20' : 'bg-blue-500/10 text-blue-600 border-blue-500/20'
                            }`}>
                              {p.role === 'head' ? 'Head' : 'Specialist'}
                            </span>
                          </td>
                          <td className="px-4 py-2.5">
                            <span className={`inline-flex items-center gap-1 text-[9px] font-semibold ${
                              p.status === 'active' ? 'text-success' : 'text-muted-foreground'
                            }`}>
                              <Circle className="h-1.5 w-1.5 fill-current" />
                              <span>{p.status}</span>
                            </span>
                          </td>
                          {hasOnboardAccess && (
                            <td className="px-4 py-2.5 text-right">
                              {p.id !== currentUser?.id && (
                                <button
                                  onClick={() => handleDeleteMember(p.id, p.full_name)}
                                  className="p-1 hover:bg-danger/10 text-muted-foreground hover:text-danger rounded transition-colors cursor-pointer"
                                  title="Delete Teammate"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Onboard box */}
              <div>
                {hasOnboardAccess ? (
                  <div className="border border-border rounded-xl bg-card p-5 shadow-sm space-y-4 text-xs">
                    <div className="flex items-center justify-between border-b border-border/40 pb-2">
                      <h3 className="font-bold text-foreground flex items-center gap-1 text-sm">
                        <User className="h-4 w-4 text-primary" />
                        <span>Onboard Member</span>
                      </h3>
                      {onboardSuccess && (
                        <span className="text-[9px] bg-success/10 text-success px-1.5 py-0.5 rounded font-medium border border-success/20">
                          Created!
                        </span>
                      )}
                    </div>

                    {onboardError && (
                      <div className="flex items-center gap-1.5 bg-danger/10 border border-danger/20 p-2.5 rounded-lg text-danger text-[10px]">
                        <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                        <span>{onboardError}</span>
                      </div>
                    )}

                    <form onSubmit={handleCreateEmployee} className="space-y-3 text-xs">
                      <div>
                        <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                          Full Name
                        </label>
                        <input
                          type="text"
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="e.g. John Miller"
                          className="w-full text-xs bg-background border border-border text-foreground px-2.5 py-1.5 rounded focus:outline-none focus:border-primary"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                          Email Address
                        </label>
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="e.g. john.m@relayhq.com"
                          className="w-full text-xs bg-background border border-border text-foreground px-2.5 py-1.5 rounded focus:outline-none focus:border-primary"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                          Login Password
                        </label>
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Default is 'Welcome123!'"
                          className="w-full text-xs bg-background border border-border text-foreground px-2.5 py-1.5 rounded focus:outline-none focus:border-primary"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                          Permissions / Role
                        </label>
                        <select
                          value={role}
                          onChange={(e) => setRole(e.target.value as UserRole)}
                          className="w-full text-xs bg-background border border-border text-foreground px-2.5 py-1.5 rounded focus:outline-none focus:border-primary cursor-pointer"
                        >
                          <option value="growth_specialist">Specialist</option>
                          <option value="head">Head (Operations Admin)</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-2 p-1.5 bg-muted/35 rounded border border-border/30">
                        <input
                          type="checkbox"
                          id="bypass-verif"
                          checked={bypassEmailVerification}
                          onChange={(e) => setBypassEmailVerification(e.target.checked)}
                          className="h-3.5 w-3.5 border-border rounded text-primary focus:ring-primary cursor-pointer"
                        />
                        <label htmlFor="bypass-verif" className="text-[9px] text-muted-foreground font-semibold cursor-pointer select-none">
                          Bypass Email Verification (Auto-Confirm ID)
                        </label>
                      </div>

                      <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg text-[10px] text-muted-foreground leading-normal space-y-1">
                        <p className="font-extrabold text-foreground">💡 Supabase Mail Config</p>
                        <p>
                          To allow newly created teammates to log in immediately without checking their inbox, disable <strong>Confirm email</strong> in your Supabase Auth settings.
                        </p>
                      </div>

                      <button
                        type="submit"
                        disabled={isOnboardingSaving}
                        className="w-full py-2 bg-primary hover:bg-primary/95 text-primary-foreground rounded text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        {isOnboardingSaving ? 'Creating...' : 'Onboard Teammate'}
                      </button>
                    </form>
                  </div>
                ) : (
                  <div className="border border-border rounded-lg bg-card p-4 shadow-sm text-center text-xs space-y-2">
                    <Shield className="h-6 w-6 text-muted-foreground/40 mx-auto" />
                    <h4 className="font-bold text-foreground">Access Restricted</h4>
                    <p className="text-muted-foreground text-[10px] leading-relaxed">
                      Only Head users or Developers can onboard new employee profiles and assign global permission roles.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: NOTIFICATIONS */}
          {activeTab === 'notifications' && (
            <div className="border border-border rounded-xl bg-card p-6 shadow-sm space-y-6 w-full max-w-4xl">
              <div className="flex items-center justify-between border-b border-border/40 pb-3">
                <h3 className="text-sm font-bold text-foreground">Notification Preferences</h3>
                {notifSuccess && (
                  <span className="text-[10px] text-success bg-success/10 border border-success/20 px-2 py-0.5 rounded font-medium">
                    Preferences Saved
                  </span>
                )}
              </div>

              {desktopAlerts && 'Notification' in window && Notification.permission !== 'granted' && (
                <div className="p-3.5 rounded-lg border text-xs leading-relaxed flex items-start gap-2.5 bg-amber-500/10 border-amber-500/20 text-amber-800 dark:text-amber-300">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-foreground">Desktop Notifications Action Required</p>
                    <p className="mt-0.5 text-muted-foreground text-[11px]">
                      {Notification.permission === 'default' 
                        ? 'To receive alerts when the app is in a different tab, you must authorize browser notification permissions.' 
                        : 'Notifications are blocked in your browser settings. You must unblock them in your browser URL bar settings (click lock icon next to site URL) to receive alerts.'}
                    </p>
                    {Notification.permission === 'default' && (
                      <button
                        type="button"
                        onClick={async () => {
                          const res = await Notification.requestPermission();
                          setNotificationPermission(res);
                          if (res === 'granted') {
                            setDesktopAlerts(true);
                          }
                        }}
                        className="mt-2 px-3 py-1 bg-amber-500 text-black text-[10px] font-bold rounded hover:bg-amber-400 transition-colors cursor-pointer"
                      >
                        Grant Notification Permission Now
                      </button>
                    )}
                  </div>
                </div>
              )}

              <form onSubmit={handleSaveNotifications} className="space-y-6 text-xs sm:text-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="flex items-center justify-between p-3 bg-muted/10 hover:bg-muted/20 rounded-lg border border-border/45">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-foreground text-xs sm:text-sm">Desktop Push Alerts</p>
                        {notificationPermission === 'granted' && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-success/15 text-success border border-success/30">
                            Granted
                          </span>
                        )}
                        {notificationPermission === 'default' && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-primary/15 text-primary border border-primary/30 animate-pulse">
                            Permission Required
                          </span>
                        )}
                        {notificationPermission === 'denied' && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-danger/15 text-danger border border-danger/30">
                            Blocked by Browser
                          </span>
                        )}
                        {notificationPermission === 'unsupported' && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-muted text-muted-foreground border border-border">
                            Unsupported
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Show notifications when window is unfocused.</p>
                      {notificationPermission === 'denied' && (
                        <p className="text-[9px] text-danger/80 mt-1 font-medium leading-relaxed">
                          ⚠️ Click the lock/settings icon in your browser URL bar to allow notifications for this app.
                        </p>
                      )}
                    </div>
                    <input
                      type="checkbox"
                      checked={desktopAlerts}
                      onChange={(e) => handleToggleDesktopAlerts(e.target.checked)}
                      className="h-4 w-4 border-border rounded text-primary focus:ring-primary cursor-pointer animate-none"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 bg-muted/10 hover:bg-muted/20 rounded-lg border border-border/45">
                    <div>
                      <p className="font-semibold text-foreground text-xs sm:text-sm">Muted System Sounds</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Disable sound playbacks on incoming chats.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={soundAlerts}
                      onChange={(e) => setSoundAlerts(e.target.checked)}
                      className="h-4 w-4 border-border rounded text-primary focus:ring-primary cursor-pointer animate-none"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 bg-muted/10 hover:bg-muted/20 rounded-lg border border-border/45 md:col-span-2">
                    <div>
                      <p className="font-semibold text-foreground text-xs sm:text-sm">Message Content Previews</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Show snippets of chats in top alert notifications.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={messagePreviews}
                      onChange={(e) => setMessagePreviews(e.target.checked)}
                      className="h-4 w-4 border-border rounded text-primary focus:ring-primary cursor-pointer animate-none"
                    />
                  </div>
                  <div className="border-t border-border/40 pt-4 mt-2.5 space-y-2">
                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wide flex items-center gap-1.5">
                      <span>💬 Google Chat Synchronization</span>
                    </h4>
                    <p className="text-[10px] text-muted-foreground leading-normal">
                      Automatically mirror all new messages sent in your RelayHQ channels and DMs into Google Chat. Paste your Google Chat Space Webhook URL below:
                    </p>
                    <input
                      type="text"
                      value={googleChatWebhook}
                      onChange={(e) => setGoogleChatWebhook(e.target.value)}
                      placeholder="e.g. https://chat.googleapis.com/v1/spaces/SPACE_ID/webhooks?key=..."
                      className="w-full text-xs bg-background border border-border text-foreground px-3 py-2 rounded focus:outline-none focus:border-primary font-mono"
                    />
                  </div>

                  {/* Sound Selectors */}
                  <div className="border-t border-border/40 pt-4 mt-2.5 space-y-4 md:col-span-2">
                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wide">
                      🔊 Sound Profile Preferences
                    </h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                          Notification Chime Sound
                        </label>
                        <select
                          value={notificationSound}
                          onChange={(e) => {
                            const val = e.target.value;
                            setNotificationSound(val);
                            playSynthChime(val);
                          }}
                          className="w-full text-xs bg-background border border-border text-foreground px-3 py-2.5 rounded-lg focus:outline-none focus:border-primary cursor-pointer font-semibold animate-none"
                        >
                          <option value="classic">🔔 Classic Chime</option>
                          <option value="sonar">📡 Sonar Sweep</option>
                          <option value="beep">⚡ Digital Beep</option>
                          <option value="zen">🧘 Zen Gong</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                          Reminder Alarm Sound
                        </label>
                        <select
                          value={alarmSound}
                          onChange={(e) => {
                            const val = e.target.value;
                            setAlarmSound(val);
                            playSynthAlarm(val);
                          }}
                          className="w-full text-xs bg-background border border-border text-foreground px-3 py-2.5 rounded-lg focus:outline-none focus:border-primary cursor-pointer font-semibold animate-none"
                        >
                          <option value="sawtooth_triple">🚨 Sawtooth Alert</option>
                          <option value="siren">⚠️ Siren Warning</option>
                          <option value="bell">🔔 Ringing Bell</option>
                          <option value="digital">📟 Digital Staccato</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="px-4 py-2 bg-primary hover:bg-primary/95 text-primary-foreground rounded text-xs font-semibold shadow-sm transition-colors cursor-pointer animate-none"
                >
                  Save Notification Toggles
                </button>
              </form>

              <div className="border-t border-border/40 pt-4 mt-4 space-y-4">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Browser Permissions & Testing</h4>
                
                <div className="flex flex-col gap-2.5 text-xs text-muted-foreground">
                  <div className="flex items-center justify-between p-2 bg-muted/20 rounded border border-border/30">
                    <div>
                      <p className="font-semibold text-foreground">Desktop Notifications State</p>
                      <p className="text-[10px] mt-0.5">
                        Current Permission: <span className="font-bold capitalize text-primary">{'Notification' in window ? Notification.permission : 'unsupported'}</span>
                      </p>
                    </div>
                    {'Notification' in window && Notification.permission !== 'granted' && (
                      <button
                        type="button"
                        onClick={async () => {
                          const res = await Notification.requestPermission();
                          alert(`Notification permission response: ${res}`);
                          window.location.reload();
                        }}
                        className="px-2.5 py-1.5 bg-primary text-primary-foreground text-[10px] font-semibold rounded hover:bg-primary/95 transition-colors cursor-pointer"
                      >
                        Request Permission
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        try {
                          playSynthChime(notificationSound);
                          if ('Notification' in window && Notification.permission === 'granted') {
                            new Notification('RelayHQ Sound Test', {
                              body: `This is a test desktop notification chime (${notificationSound}).`,
                              icon: '/favicon.ico'
                            });
                          }
                        } catch (err) {
                          alert('Audio play blocked: Click or interact first.');
                        }
                      }}
                      className="px-3 py-2 bg-muted hover:bg-muted/80 text-foreground border border-border rounded text-[10px] font-semibold transition-colors cursor-pointer text-center"
                    >
                      🔊 Test Chime & Toast
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        try {
                          playSynthAlarm(alarmSound);
                          if ('Notification' in window && Notification.permission === 'granted') {
                            new Notification('RelayHQ Alarm Test', {
                              body: `🚨 This is a test reminder alarm sound (${alarmSound})!`,
                              icon: '/favicon.ico'
                            });
                          }
                        } catch (err) {
                          alert('Audio play blocked: Click or interact first.');
                        }
                      }}
                      className="px-3 py-2 bg-muted hover:bg-muted/80 text-foreground border border-border rounded text-[10px] font-semibold transition-colors cursor-pointer text-center"
                    >
                      🚨 Test Alarm Sound
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: SECURITY / CHANGE PASSWORD */}
          {activeTab === 'security' && (
            <div className="border border-border rounded-xl bg-card p-6 shadow-sm space-y-6 w-full max-w-4xl">
              <div className="flex items-center justify-between border-b border-border/40 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-foreground">Change Password</h3>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {supabase ? 'Update your account login password.' : 'Only available in live Supabase mode.'}
                  </p>
                </div>
                {passwordSuccess && (
                  <span className="text-[10px] text-success bg-success/10 border border-success/20 px-2 py-0.5 rounded font-medium">
                    Password Updated!
                  </span>
                )}
              </div>

              {!supabase && (
                <div className="flex items-start gap-3 p-3.5 bg-warning/5 border border-warning/20 rounded-lg">
                  <Lock className="h-4 w-4 text-warning mt-0.5 flex-shrink-0 animate-pulse" />
                  <div className="text-xs text-muted-foreground leading-relaxed">
                    <p className="font-semibold text-foreground mb-0.5">Simulator Mode Active</p>
                    Password changes will be simulated locally. To link to your live Supabase database, use the
                    <button onClick={() => setActiveTab('connection')} className="text-primary hover:underline font-medium mx-1 cursor-pointer">Database Connection</button>
                    tab.
                  </div>
                </div>
              )}

              <form onSubmit={handleChangePassword} className="space-y-6 text-xs sm:text-sm">
                {passwordError && (
                  <div className="flex items-center gap-2 p-3 bg-danger/10 border border-danger/20 rounded-lg text-danger text-[11px]">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span>{passwordError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                      New Password
                    </label>
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="w-full text-xs bg-background border border-border text-foreground px-3 py-2.5 rounded-lg focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      className="w-full text-xs bg-background border border-border text-foreground px-3 py-2.5 rounded-lg focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSavingPassword}
                  className="px-4 py-2 bg-primary hover:bg-primary/95 text-primary-foreground rounded text-xs font-semibold shadow-sm transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSavingPassword ? 'Updating...' : 'Update Password'}
                </button>
              </form>

              <div className="border-t border-border/40 pt-4 space-y-2">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Password Tips</h4>
                <ul className="list-disc pl-4 text-[11px] text-muted-foreground space-y-1 leading-relaxed">
                  <li>Use at least 8 characters for a stronger password.</li>
                  <li>Mix uppercase, lowercase, numbers and symbols.</li>
                  <li>Never share your password with colleagues; use role assignments instead.</li>
                  <li>After changing your password, all other sessions will be invalidated.</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
