import React, { useState, useEffect, useRef } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ProfileSetupModal } from './components/auth/ProfileSetupModal';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { DashboardView } from './views/dashboard/DashboardView';
import { LeadsView } from './views/leads/LeadsView';
import { CreatePage } from './views/leads/CreatePage';
import { EditPage } from './views/leads/EditPage';
import { DetailPage } from './views/leads/DetailPage';
import { TasksView } from './views/tasks/TasksView';
import { RemindersView } from './views/reminders/RemindersView';
import { MessagingView } from './views/messaging/MessagingView';
import { SettingsView } from './views/settings/SettingsView';
import { NotesView } from './views/notes/NotesView';
import { AuthPage } from './views/auth/AuthPage';
import { dbClient } from './services/dbClient';
import { TutorialTour } from './components/ui/TutorialTour';
import type { Reminder } from './types/database';
import { Volume2 } from 'lucide-react';
import { CommandPalette } from './components/ui/CommandPalette';
import { KeyboardShortcuts } from './components/ui/KeyboardShortcuts';

// Shared lazily initialized AudioContext to bypass autoplay policies
let sharedAudioCtx: AudioContext | null = null;
const getAudioCtx = () => {
  if (!sharedAudioCtx) {
    sharedAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume();
  }
  return sharedAudioCtx;
};

const MainAppContent: React.FC = () => {
  const { currentUser, profiles, isLoading, bypassAuth, updateCurrentUserProfile, signOutUser, isSimulator } = useAuth();
  
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isShortcutsGuideOpen, setIsShortcutsGuideOpen] = useState(false);
  
  // Custom router state synchronized with browser URL hash to enable browser back/forward button support
  const [currentView, setCurrentViewInternal] = useState(() => {
    const hash = window.location.hash.substring(1);
    if (hash) return hash;
    return localStorage.getItem('relayhq_current_view') || 'dashboard';
  });
  const [showTutorial, setShowTutorial] = useState(() => {
    return localStorage.getItem('relayhq_tutorial_completed') !== 'true';
  });
  const setCurrentView = (view: string) => {
    const cleaned = view.startsWith('/') ? view.substring(1) : view;
    // Changing the hash triggers the 'hashchange' event listener below
    window.location.hash = `#${cleaned}`;
  };
  
  // Mobile sidebar states
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Desktop sidebar collapse state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => 
    localStorage.getItem('relayhq_sidebar_collapsed') === 'true'
  );

  // Sync state on mount and listen to window hash changes to make back/forward buttons work
  useEffect(() => {
    const initialHash = window.location.hash.substring(1);
    if (initialHash) {
      if (initialHash !== currentView) {
        setCurrentViewInternal(initialHash);
      }
    } else {
      window.location.hash = `#${currentView}`;
    }

    const handleHashChange = () => {
      const hash = window.location.hash.substring(1);
      if (hash) {
        setCurrentViewInternal(hash);
        localStorage.setItem('relayhq_current_view', hash);
        if (hash.startsWith('leads')) {
          localStorage.setItem('relayhq_last_leads_subview', hash);
        }
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  // Active Due Reminders Alarm system
  const [dueReminders, setDueReminders] = useState<Reminder[]>([]);
  const [toasts, setToasts] = useState<{ id: string; title: string; body: string; type: 'info' | 'success' | 'warning' | 'danger' }[]>([]);
  
  const dueRemindersRef = useRef<Reminder[]>([]);

  // Sound cue play helper
  const playChime = () => {
    const settings = dbClient.getNotificationSettings();
    if (!settings.soundAlerts) return;
    try {
      const audioCtx = getAudioCtx();
      const now = audioCtx.currentTime;
      const sound = localStorage.getItem('relayhq_notification_sound') || 'classic';

      if (sound === 'classic') {
        const playTone = (time: number, freq: number, duration: number) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, time);
          gain.gain.setValueAtTime(0.25, time);
          gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start(time);
          osc.stop(time + duration);
        };
        playTone(now, 880, 0.12);
        playTone(now + 0.08, 1150, 0.16);
      } else if (sound === 'sonar') {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.4);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.4);
      } else if (sound === 'beep') {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(1000, now);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.08);
      } else if (sound === 'zen') {
        const osc = audioCtx.createOscillator();
        const osc2 = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(220, now);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(225, now);
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
        osc.connect(gain);
        osc2.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc2.start(now);
        osc.stop(now + 0.8);
        osc2.stop(now + 0.8);
      }
    } catch (err) {
      console.warn('AudioContext playback blocked/failed:', err);
    }
  };

  const playAlarmSound = () => {
    const settings = dbClient.getNotificationSettings();
    if (!settings.soundAlerts) return;
    try {
      const audioCtx = getAudioCtx();
      const now = audioCtx.currentTime;
      const sound = localStorage.getItem('relayhq_alarm_sound') || 'sawtooth_triple';

      if (sound === 'sawtooth_triple') {
        const playTone = (time: number, freq: number, duration: number) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, time);
          gain.gain.setValueAtTime(0.35, time);
          gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start(time);
          osc.stop(time + duration);
        };
        playTone(now, 988, 0.15);
        playTone(now + 0.2, 784, 0.15);
        playTone(now + 0.4, 988, 0.15);
      } else if (sound === 'siren') {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.linearRampToValueAtTime(900, now + 0.25);
        osc.frequency.linearRampToValueAtTime(600, now + 0.5);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.5);
      } else if (sound === 'bell') {
        const playRing = (time: number) => {
          const osc = audioCtx.createOscillator();
          const osc2 = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(1500, time);
          osc2.type = 'sine';
          osc2.frequency.setValueAtTime(2200, time);
          gain.gain.setValueAtTime(0.3, time);
          gain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
          osc.connect(gain);
          osc2.connect(gain);
          gain.connect(audioCtx.destination);
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
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(800, time);
          gain.gain.setValueAtTime(0.25, time);
          gain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start(time);
          osc.stop(time + 0.08);
        };
        playBeep(now);
        playBeep(now + 0.12);
      }
    } catch (err) {
      console.warn('AudioContext playback blocked/failed:', err);
    }
  };

  // HTML5 Desktop Notification trigger
  const showDesktopNotification = (title: string, body: string, reminderId?: string) => {
    const settings = dbClient.getNotificationSettings();
    if (!settings.desktopAlerts) return;
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        const notif = new Notification(title, {
          body,
          icon: '/favicon.ico',
          tag: reminderId || 'general',
          requireInteraction: reminderId ? true : false
        });

        notif.onclick = () => {
          window.focus();
          notif.close();
        };
      } catch (e) {
        console.error('Desktop notification failed:', e);
      }
    }
  };

  const addToast = (title: string, body: string, type: 'info' | 'success' | 'warning' | 'danger' = 'info', reminderId?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, title, body, type }]);
    playChime();
    showDesktopNotification(title, body, reminderId);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const allRemindersRef = useRef<Reminder[]>([]);

  const fetchReminders = async () => {
    if (!currentUser) return;
    try {
      const data = await dbClient.getReminders();
      allRemindersRef.current = data;
      localCheckDueReminders();
    } catch (err) {
      console.error('Failed to fetch reminders:', err);
    }
  };

  const localCheckDueReminders = () => {
    if (!currentUser) return;
    const now = Date.now();
    const due = allRemindersRef.current.filter(
      (r) => r.status === 'active' && new Date(r.reminder_time).getTime() <= now
    );
    
    if (due.length > dueRemindersRef.current.length) {
      const newDue = due.filter(r => !dueRemindersRef.current.some(dr => dr.id === r.id));
      newDue.forEach(r => {
        addToast('⚠️ Alarm Triggered!', r.title, 'danger', r.id);
      });
    }
    
    dueRemindersRef.current = due;
    setDueReminders(due);
  };

  // Request browser desktop notification permissions on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Unlock AudioContext on click/keydown interaction
  useEffect(() => {
    const unlock = () => {
      try {
        const ctx = getAudioCtx();
        if (ctx) {
          ctx.resume().then(() => {
            // Play a very brief, silent oscillator chime to force browser audio authorization
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();
            osc.connect(gainNode);
            gainNode.connect(ctx.destination);
            gainNode.gain.setValueAtTime(0.0001, ctx.currentTime);
            osc.start(0);
            osc.stop(ctx.currentTime + 0.05);
          }).catch((err) => {
            console.warn('AudioContext resume failed:', err);
          });
        }
      } catch (e) {
        console.warn(e);
      }
      window.removeEventListener('click', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('click', unlock);
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('click', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  // Automatic user status presence idle/active tracker (ClickUp style)
  useEffect(() => {
    if (!currentUser) return;
    
    let idleTimer: any;
    
    const checkManualPresence = () => {
      const mode = localStorage.getItem('relayhq_presence_mode') || 'automatic';
      if (mode === 'manual') {
        const until = parseInt(localStorage.getItem('relayhq_presence_manual_until') || '0', 10);
        if (Date.now() > until) {
          localStorage.setItem('relayhq_presence_mode', 'automatic');
          localStorage.removeItem('relayhq_presence_manual_until');
          localStorage.removeItem('relayhq_presence_manual_status');
          return true;
        }
        return false;
      }
      return true;
    };

    const setOnline = async () => {
      if (!checkManualPresence()) return;
      if (currentUser.presence !== 'online') {
        try {
          await dbClient.updateProfile(currentUser.id, { presence: 'online' });
        } catch (e) {
          console.warn('Presence status update failed:', e);
        }
      }
      resetIdleTimer();
    };
    
    const setIdle = async () => {
      if (!checkManualPresence()) return;
      if (currentUser.presence === 'online') {
        try {
          await dbClient.updateProfile(currentUser.id, { presence: 'idle' });
        } catch (e) {
          console.warn('Presence status update failed:', e);
        }
      }
    };
    
    const resetIdleTimer = () => {
      if (idleTimer) clearTimeout(idleTimer);
      // Automatically mark as Idle after 5 minutes of inactivity
      idleTimer = setTimeout(setIdle, 300000);
    };
    
    const handleActivity = () => {
      const active = checkManualPresence();
      if (!active) return;

      // Only transition back to online if the user is currently idle or has no status
      if (currentUser.presence === 'idle' || !currentUser.presence) {
        setOnline();
      } else if (currentUser.presence === 'online') {
        resetIdleTimer();
      }
    };
    
    // Set initial presence if empty
    if (!currentUser.presence) {
      const mode = localStorage.getItem('relayhq_presence_mode') || 'automatic';
      if (mode === 'automatic') {
        dbClient.updateProfile(currentUser.id, { presence: 'online' });
      }
    }
    resetIdleTimer();
    
    const handleFocus = () => {
      setOnline();
    };

    const handleBlur = () => {
      setIdle();
    };

    const handleUnload = () => {
      const mode = localStorage.getItem('relayhq_presence_mode') || 'automatic';
      if (mode === 'automatic') {
        dbClient.updateProfile(currentUser.id, { presence: 'offline' });
      }
    };

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('click', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('beforeunload', handleUnload);
    
    return () => {
      if (idleTimer) clearTimeout(idleTimer);
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, [currentUser]);

  // Continuous alarm sound playback effect
  useEffect(() => {
    const hasActiveAlarm = dueReminders.some(r => r.notification_type === 'alarm' && r.status === 'active');
    if (!hasActiveAlarm) return;

    playAlarmSound();

    const soundInterval = setInterval(() => {
      playAlarmSound();
    }, 2500);

    return () => {
      clearInterval(soundInterval);
    };
  }, [dueReminders]);

  // Google Chat notifications listener
  useEffect(() => {
    const handleNewGoogleMessage = (e: Event) => {
      const { spaceName, senderName, text } = (e as CustomEvent).detail;
      addToast(`Google Chat | ${spaceName}`, `${senderName}: ${text}`, 'success');
    };

    window.addEventListener('new-google-message', handleNewGoogleMessage);
    return () => {
      window.removeEventListener('new-google-message', handleNewGoogleMessage);
    };
  }, [addToast]);

  useEffect(() => {
    if (currentView.startsWith('leads/')) {
      const parts = currentView.split('/');
      const leadId = parts[1];
      if (leadId && leadId !== 'new' && parts[2] !== 'edit') {
        try {
          const saved = localStorage.getItem('relayhq_unread_leads');
          if (saved) {
            const next = JSON.parse(saved).filter((id: string) => id !== leadId);
            localStorage.setItem('relayhq_unread_leads', JSON.stringify(next));
            window.dispatchEvent(new Event('unread-counts-updated'));
          }
        } catch (e) {}
      }
    }
  }, [currentView]);

  useEffect(() => {
    fetchReminders();

    // Inline Web Worker to bypass main thread browser tab timer throttling in background tabs
    const workerCode = `
      let timer = null;
      self.onmessage = function(e) {
        if (e.data === 'start') {
          if (timer) clearInterval(timer);
          timer = setInterval(() => {
            self.postMessage('tick');
          }, 5000);
        } else if (e.data === 'stop') {
          if (timer) clearInterval(timer);
        }
      };
    `;
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);
    const worker = new Worker(workerUrl);

    worker.onmessage = (e) => {
      if (e.data === 'tick') {
        localCheckDueReminders();
        // Periodic check for presence override expiration
        const mode = localStorage.getItem('relayhq_presence_mode') || 'automatic';
        if (mode === 'manual') {
          const until = parseInt(localStorage.getItem('relayhq_presence_manual_until') || '0', 10);
          if (Date.now() > until) {
            localStorage.setItem('relayhq_presence_mode', 'automatic');
            localStorage.removeItem('relayhq_presence_manual_until');
            localStorage.removeItem('relayhq_presence_manual_status');
            // Re-trigger online presence check
            if (currentUser) {
              dbClient.updateProfile(currentUser.id, { presence: document.hasFocus() ? 'online' : 'idle' });
            }
          }
        }
      }
    };
    worker.postMessage('start');

    // Instantly check and fetch reminders when browser tab returns to focus or visibility state turns visible
    const handleSyncOnFocus = () => {
      fetchReminders();
    };
    window.addEventListener('focus', handleSyncOnFocus);
    document.addEventListener('visibilitychange', handleSyncOnFocus);

    const unsubscribe = dbClient.subscribe((table, type, payload) => {
      if (table === 'reminders') {
        fetchReminders();
        if (type === 'insert' && payload.creator_id !== currentUser?.id) {
          const isInvited = payload.invited_users?.includes(currentUser?.id);
          if (isInvited || currentUser?.role === 'head') {
            addToast('Reminder Scheduled', payload.title, 'info');
          }
        }
      }
      if (table === 'messages' && type === 'insert') {
        const isMe = String(payload.sender_id) === String(currentUser?.id);
        if (!isMe) {
          // Play notification sound
          const settings = dbClient.getNotificationSettings();
          if (settings.soundAlerts) {
            playChime();
          }

          // Check if user is currently viewing this chat
          const activeChan = localStorage.getItem('relayhq_active_channel_id');
          const activeDM = localStorage.getItem('relayhq_active_dm_user_id');
          const isViewingChat = currentView === 'messaging' && (
            (payload.channel_id && payload.channel_id === activeChan) ||
            (!payload.channel_id && payload.sender_id === activeDM)
          );

          if (!isViewingChat) {
            try {
              const saved = localStorage.getItem('relayhq_unread_counts');
              const next = saved ? JSON.parse(saved) : {};
              const key = payload.channel_id || payload.sender_id;
              next[key] = (next[key] || 0) + 1;
              localStorage.setItem('relayhq_unread_counts', JSON.stringify(next));
              window.dispatchEvent(new Event('unread-counts-updated'));
            } catch (e) {
              console.error(e);
            }
          }

          // Trigger Toast & Native Notification
          const sender = profiles.find(p => p.id === payload.sender_id);
          const senderName = sender ? sender.full_name : 'Teammate';
          addToast(`Message from ${senderName}`, payload.content || 'Shared an attachment.', 'success');
        }
      }
      if (table === 'lead_updates' && type === 'insert') {
        const isMe = String(payload.user_id) === String(currentUser?.id);
        if (!isMe) {
          const isViewingLead = currentView === `leads/${payload.lead_id}`;
          if (!isViewingLead) {
            try {
              const saved = localStorage.getItem('relayhq_unread_leads');
              const next = saved ? JSON.parse(saved) : [];
              if (!next.includes(payload.lead_id)) {
                next.push(payload.lead_id);
                localStorage.setItem('relayhq_unread_leads', JSON.stringify(next));
                window.dispatchEvent(new Event('unread-counts-updated'));
              }
            } catch (e) {
              console.error(e);
            }

            // Fetch lead details to display actual company name in Toast
            dbClient.getLeadById(payload.lead_id).then(lead => {
              const companyName = lead ? lead.company_name : 'Unknown Company';
              const sender = profiles.find(p => p.id === payload.user_id);
              const senderName = sender ? sender.full_name : 'Teammate';
              addToast(`Update in Lead: ${companyName}`, `${senderName}: ${payload.content}`, 'info');
            }).catch(() => {
              const sender = profiles.find(p => p.id === payload.user_id);
              const senderName = sender ? sender.full_name : 'Teammate';
              addToast('New Lead Update', `${senderName}: ${payload.content}`, 'info');
            });
          }
        }
      }
      if (table === 'notifications' && type === 'insert') {
        if (payload.user_id === currentUser?.id) {
          addToast(payload.title, payload.body, 'info');
        }
      }
    });

    return () => {
      worker.postMessage('stop');
      worker.terminate();
      URL.revokeObjectURL(workerUrl);
      window.removeEventListener('focus', handleSyncOnFocus);
      document.removeEventListener('visibilitychange', handleSyncOnFocus);
      unsubscribe();
    };
  }, [currentUser]);

  // Global Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (
        activeTag === 'input' ||
        activeTag === 'textarea' ||
        document.activeElement?.getAttribute('contenteditable') === 'true'
      ) {
        return;
      }

      // Ctrl+K -> Command Palette
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
        return;
      }

      // ? -> Shortcuts Guide
      if (e.key === '?') {
        e.preventDefault();
        setIsShortcutsGuideOpen(prev => !prev);
        return;
      }

      // Jump Views (1-7)
      const viewsList = ['dashboard', 'leads', 'tasks', 'reminders', 'notes', 'messaging', 'settings'];
      if (!isNaN(Number(e.key))) {
        const num = Number(e.key);
        if (num >= 1 && num <= 7) {
          e.preventDefault();
          setCurrentView(viewsList[num - 1]);
          return;
        }
      }

      // N -> New Lead
      if (e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setCurrentView('leads/new');
        return;
      }

      // T -> New Task
      if (e.key.toLowerCase() === 't') {
        e.preventDefault();
        setCurrentView('tasks');
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('command-create-task'));
        }, 100);
        return;
      }

      // R -> New Reminder
      if (e.key.toLowerCase() === 'r') {
        e.preventDefault();
        setCurrentView('reminders');
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('command-create-reminder'));
        }, 100);
        return;
      }

      // J/K Navigation
      if (e.key.toLowerCase() === 'j') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('command-navigate-down'));
        return;
      }
      if (e.key.toLowerCase() === 'k') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('command-navigate-up'));
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentUser]);

  const handleDismissAlarm = async (id: string) => {
    try {
      await dbClient.updateReminder(id, { status: 'dismissed' });
      fetchReminders();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSnoozeAlarm = async (id: string, snoozeMinutes = 5) => {
    try {
      const snoozeTime = new Date(Date.now() + snoozeMinutes * 60000).toISOString();
      await dbClient.updateReminder(id, { 
        reminder_time: snoozeTime,
        status: 'active' 
      });
      fetchReminders();
      addToast('⏰ Alarm Snoozed', `Snoozed for ${snoozeMinutes} minutes.`, 'info');
    } catch (err) {
      console.error(err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center gap-2 bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="text-xs text-muted-foreground font-semibold">Bootstrapping RelayHQ...</span>
      </div>
    );
  }
  if (!currentUser) {
    return <AuthPage onBypass={bypassAuth} onSuccess={() => {}} />;
  }

  // Google Sign-In profile setup trigger (when designation is empty/not set yet)
  const needsProfileSetup = currentUser && !currentUser.designation && !isSimulator;
  if (needsProfileSetup) {
    return (
      <ProfileSetupModal
        currentUser={currentUser}
        onComplete={async (updates) => {
          await updateCurrentUserProfile(updates);
        }}
        onSignOut={signOutUser}
      />
    );
  }
  // Resolve active views
  const renderView = () => {
    if (currentView === 'dashboard') {
      return <DashboardView onNavigate={setCurrentView} />;
    }
    if (currentView === 'leads') {
      return <LeadsView onNavigate={setCurrentView} />;
    }
    if (currentView === 'leads/new') {
      return <CreatePage onNavigate={setCurrentView} />;
    }
    if (currentView.startsWith('leads/') && currentView.endsWith('/edit')) {
      const parts = currentView.split('/');
      return <EditPage leadId={parts[1]} onNavigate={setCurrentView} />;
    }
    if (currentView.startsWith('leads/')) {
      const parts = currentView.split('/');
      return <DetailPage leadId={parts[1]} onNavigate={setCurrentView} />;
    }
    if (currentView === 'tasks') {
      return <TasksView />;
    }
    if (currentView === 'reminders') {
      return <RemindersView />;
    }
    if (currentView === 'notes') {
      return <NotesView />;
    }
    if (currentView === 'messaging') {
      return <MessagingView />;
    }
    if (currentView === 'settings') {
      return <SettingsView />;
    }
    return <DashboardView onNavigate={setCurrentView} />;
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      {showTutorial && currentUser && (
        <TutorialTour
          currentView={currentView}
          onNavigate={setCurrentView}
          onClose={() => setShowTutorial(false)}
        />
      )}
      {/* Workspace Sidebar Wrapper */}
      <Sidebar
        currentView={currentView}
        onNavigate={setCurrentView}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => {
          setSidebarCollapsed(!sidebarCollapsed);
          localStorage.setItem('relayhq_sidebar_collapsed', String(!sidebarCollapsed));
        }}
      />

      {/* Main Container Wrapper */}
      <div
        className="flex-1 flex flex-col min-w-0 overflow-hidden sidebar-content-area"
        data-collapsed={sidebarCollapsed ? 'true' : 'false'}
      >
        {/* Real-time Reminder Alarm System Banner */}
        {dueReminders.length > 0 && (
          <div className="bg-danger text-white px-4 py-2 flex items-center justify-between text-xs font-semibold z-50 shadow-md">
            <div className="flex items-center gap-2 min-w-0">
              <Volume2 className="h-4 w-4 flex-shrink-0 animate-bounce" />
              <span className="truncate">
                Alarm: "{dueReminders[0].title}" is past due!
              </span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 ml-2">
              <button
                onClick={() => handleSnoozeAlarm(dueReminders[0].id)}
                className="bg-white text-danger px-3 py-1 rounded text-[10px] font-bold hover:bg-slate-100 transition-colors shadow-sm cursor-pointer"
              >
                Snooze (5m)
              </button>
              <button
                onClick={() => handleDismissAlarm(dueReminders[0].id)}
                className="bg-danger border border-white/50 text-white px-3 py-1 rounded text-[10px] font-bold hover:bg-white/10 transition-colors shadow-sm cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        <Header
          currentView={currentView}
          onNavigate={setCurrentView}
          onToggleSidebar={() => setSidebarOpen(true)}
        />

        {/* View Frame */}
        <main className="flex-1 flex flex-col min-h-0 overflow-y-auto">
          <div key={currentView} className="animate-slide-up flex-1 flex flex-col min-h-0">
            {renderView()}
          </div>
        </main>
      </div>

      {/* Toast Pop-out Container */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none w-80 max-w-full">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto p-3.5 rounded-lg shadow-lg border text-xs font-semibold flex flex-col gap-1 animate-slide-up bg-card ${
              t.type === 'success' ? 'border-success/35 text-success bg-success/5' :
              t.type === 'danger' ? 'border-danger/35 text-danger bg-danger/5 animate-pulse' :
              t.type === 'warning' ? 'border-warning/35 text-warning bg-warning/5' :
              'border-primary/35 text-primary bg-primary/5'
            }`}
          >
            <p className="font-bold flex items-center gap-1.5 uppercase tracking-wide text-[9px] opacity-85">
              {t.type === 'success' ? '✅ success' :
               t.type === 'danger' ? '🚨 alert' :
               t.type === 'warning' ? '⚠️ warning' :
               'ℹ️ info'}
            </p>
            <p className="font-extrabold text-foreground text-xs leading-tight">{t.title}</p>
            <p className="text-muted-foreground text-[10px] font-normal leading-snug break-words">{t.body}</p>
          </div>
        ))}
      </div>

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigate={setCurrentView}
      />
      <KeyboardShortcuts
        isOpen={isShortcutsGuideOpen}
        onClose={() => setIsShortcutsGuideOpen(false)}
      />
    </div>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <MainAppContent />
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
