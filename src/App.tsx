import React, { useState, useEffect, useRef } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
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
import type { Reminder } from './types/database';
import { Volume2 } from 'lucide-react';

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
  const { currentUser, profiles, isLoading, bypassAuth } = useAuth();
  
  // Custom router state
  const [currentView, setCurrentViewInternal] = useState('dashboard');
  const setCurrentView = (view: string) => {
    const cleaned = view.startsWith('/') ? view.substring(1) : view;
    setCurrentViewInternal(cleaned);
  };
  
  // Mobile sidebar states
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Desktop sidebar collapse state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => 
    localStorage.getItem('relayhq_sidebar_collapsed') === 'true'
  );

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
      const playBeep = (time: number, freq: number, duration: number) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, time);
        gain.gain.setValueAtTime(0.08, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(time);
        osc.stop(time + duration);
      };
      const now = audioCtx.currentTime;
      playBeep(now, 880, 0.1);
      playBeep(now + 0.08, 1150, 0.14);
    } catch (err) {
      console.warn('AudioContext playback blocked/failed:', err);
    }
  };

  const playAlarmSound = () => {
    const settings = dbClient.getNotificationSettings();
    if (!settings.soundAlerts) return;
    try {
      const audioCtx = getAudioCtx();
      const playBeep = (time: number, freq: number, duration: number) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, time);
        gain.gain.setValueAtTime(0.12, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(time);
        osc.stop(time + duration);
      };
      const now = audioCtx.currentTime;
      playBeep(now, 988, 0.15);
      playBeep(now + 0.2, 784, 0.15);
      playBeep(now + 0.4, 988, 0.15);
    } catch (err) {
      console.warn('AudioContext playback blocked/failed:', err);
    }
  };

  // HTML5 Desktop Notification trigger
  const showDesktopNotification = (title: string, body: string) => {
    const settings = dbClient.getNotificationSettings();
    if (!settings.desktopAlerts) return;
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: '/favicon.ico',
        });
      } catch (e) {
        console.error('Desktop notification failed:', e);
      }
    }
  };

  const addToast = (title: string, body: string, type: 'info' | 'success' | 'warning' | 'danger' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, title, body, type }]);
    playChime();
    showDesktopNotification(title, body);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const checkDueReminders = async () => {
    if (!currentUser) return;
    try {
      const allReminders = await dbClient.getReminders();
      const now = Date.now();
      const due = allReminders.filter(
        (r) => r.status === 'active' && new Date(r.reminder_time).getTime() <= now
      );
      
      // If there is a new due reminder that wasn't in our previous list, trigger toast!
      if (due.length > dueRemindersRef.current.length) {
        const newDue = due.filter(r => !dueRemindersRef.current.some(dr => dr.id === r.id));
        newDue.forEach(r => {
          addToast('⚠️ Alarm Triggered!', r.title, 'danger');
        });
      }
      
      dueRemindersRef.current = due;
      setDueReminders(due);
    } catch (err) {
      console.error('Reminder check error:', err);
    }
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
        if (ctx && ctx.state === 'suspended') {
          ctx.resume();
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
    
    const setOnline = async () => {
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
      // Only transition back to online if the user is currently idle or has no status
      if (currentUser.presence === 'idle' || !currentUser.presence) {
        setOnline();
      } else if (currentUser.presence === 'online') {
        resetIdleTimer();
      }
    };
    
    // Set initial presence if empty
    if (!currentUser.presence) {
      dbClient.updateProfile(currentUser.id, { presence: 'online' });
    }
    resetIdleTimer();
    
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('click', handleActivity);
    window.addEventListener('keydown', handleActivity);
    
    const handleFocus = () => {
      setOnline();
    };

    const handleBlur = () => {
      setIdle();
    };

    const handleUnload = () => {
      dbClient.updateProfile(currentUser.id, { presence: 'offline' });
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
    checkDueReminders();
    const interval = setInterval(checkDueReminders, 5000);


    const unsubscribe = dbClient.subscribe((table, type, payload) => {
      if (table === 'reminders') {
        checkDueReminders();
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
      clearInterval(interval);
      unsubscribe();
    };
  }, [currentUser]);

  const handleDismissAlarm = async (id: string) => {
    try {
      await dbClient.updateReminder(id, { status: 'dismissed' });
      checkDueReminders();
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
          <div className="bg-danger text-white px-4 py-2 flex items-center justify-between text-xs font-semibold animate-pulse z-50">
            <div className="flex items-center gap-2 min-w-0">
              <Volume2 className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">
                Alarm: "{dueReminders[0].title}" is past due!
              </span>
            </div>
            <button
              onClick={() => handleDismissAlarm(dueReminders[0].id)}
              className="bg-white text-danger px-3 py-1 rounded text-[10px] font-bold hover:bg-slate-100 transition-colors shadow-sm ml-2 flex-shrink-0 cursor-pointer"
            >
              Dismiss
            </button>
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
