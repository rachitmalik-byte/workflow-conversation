import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { NotificationCenter } from './NotificationCenter';
import { PanelLeft, Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { dbClient } from '../../services/dbClient';
import { GlobalSearch } from '../ui/GlobalSearch';

interface HeaderProps {
  currentView: string;
  onNavigate: (view: string) => void;
  onToggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ currentView, onNavigate, onToggleSidebar }) => {
  const { currentUser, profiles } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [time, setTime] = useState(new Date());
  const [presenceMenuOpen, setPresenceMenuOpen] = useState(false);

  React.useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedDateTime = time.toLocaleString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const getPresenceColor = (presence?: string) => {
    switch (presence) {
      case 'online': return 'bg-success';
      case 'idle': return 'bg-warning';
      case 'busy': return 'bg-danger';
      case 'offline':
      default:
        return 'bg-muted-foreground/40';
    }
  };

  const selectPresence = async (status: 'online' | 'idle' | 'busy' | 'offline' | 'automatic') => {
    if (currentUser) {
      try {
        if (status === 'automatic') {
          localStorage.setItem('relayhq_presence_mode', 'automatic');
          localStorage.removeItem('relayhq_presence_manual_until');
          localStorage.removeItem('relayhq_presence_manual_status');
          // Update presence immediately based on window focus
          const autoStatus = document.hasFocus() ? 'online' : 'idle';
          await dbClient.updateProfile(currentUser.id, { presence: autoStatus });
        } else {
          localStorage.setItem('relayhq_presence_mode', 'manual');
          localStorage.setItem('relayhq_presence_manual_status', status);
          // Set manual override timeout (e.g. 2.5 hours)
          const durationMs = 2.5 * 60 * 60 * 1000;
          localStorage.setItem('relayhq_presence_manual_until', String(Date.now() + durationMs));
          await dbClient.updateProfile(currentUser.id, { presence: status });
        }
      } catch (e) {
        console.error('Failed to change status:', e);
      }
    }
    setPresenceMenuOpen(false);
  };

  // Parse view title
  const getViewTitle = () => {
    if (currentView === 'dashboard') return 'Dashboard';
    if (currentView === 'leads') return 'Projects';
    if (currentView === 'leads/new') return 'Create Project';
    if (currentView.startsWith('leads/') && currentView.endsWith('/edit')) return 'Edit Project';
    if (currentView.startsWith('leads/')) return 'Project Details';
    if (currentView === 'tasks') return 'Task Center';
    if (currentView === 'reminders') return 'Reminders';
    if (currentView === 'notes') return 'Workflow Scratchpad';
    if (currentView.startsWith('messaging')) return 'Messaging';
    if (currentView === 'settings') return 'Settings';
    return 'RelayHQ';
  };

  return (
    <header className="sticky top-0 z-20 flex h-14 w-full items-center justify-between border-b border-border bg-card px-4 shadow-sm">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md md:hidden"
        >
          <PanelLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-sm font-semibold text-foreground tracking-tight sm:text-base">
            {getViewTitle()}
          </h1>
        </div>
      </div>

      {/* Global Search Component */}
      <div className="flex-1 max-w-xs mx-4 hidden md:block">
        <GlobalSearch onNavigate={onNavigate} />
      </div>

      <div className="flex items-center gap-4">
        {/* Teammate Online Presence Sub-list */}
        <div className="hidden items-center gap-1.5 sm:flex">
          <span className="text-xs text-muted-foreground mr-1">Teammates:</span>
          <div className="flex -space-x-1 overflow-hidden">
            {profiles
              .filter((p) => p.id !== currentUser?.id && p.status === 'active')
              .map((p) => (
                <div
                  key={p.id}
                  className="relative inline-block h-6 w-6 rounded-full ring-2 ring-card"
                  title={`${p.full_name} (${p.role === 'head' ? 'Head' : 'Growth Specialist'}) - Status: ${p.presence || 'offline'}`}
                >
                  <div className="flex h-full w-full items-center justify-center rounded-full bg-secondary text-[10px] font-bold text-white uppercase">
                    {p.full_name.split(' ').map((n) => n[0]).join('')}
                  </div>
                  <span
                    className={`absolute bottom-0 right-0 block h-1.5 w-1.5 rounded-full ring-1 ring-card ${getPresenceColor(p.presence)}`}
                  />
                </div>
              ))}
          </div>
        </div>

        <div className="h-4 w-px bg-border hidden sm:block" />

        {/* Real-time Date and Clock */}
        <div className="hidden sm:flex items-center text-[11px] text-muted-foreground font-bold bg-muted px-2.5 py-1 rounded border border-border/40 font-mono tracking-tight select-none">
          {formattedDateTime}
        </div>

        <div className="h-4 w-px bg-border hidden sm:block" />

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md focus:outline-none transition-colors"
          title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
        >
          {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
        </button>

        {/* Notification Center */}
        <NotificationCenter onNavigate={onNavigate} />

        <div className="h-4 w-px bg-border hidden sm:block" />

        {/* User Presence dropdown selector */}
        <div className="relative">
          <button
            onClick={() => setPresenceMenuOpen(!presenceMenuOpen)}
            className="flex items-center gap-1.5 focus:outline-none focus:ring-1 focus:ring-primary rounded-full p-0.5 transition-shadow hover:shadow-sm cursor-pointer"
            title={`Status: ${currentUser?.presence || 'offline'} (Click to change)`}
          >
            <div className="relative inline-block h-7 w-7 rounded-full">
              <div className="flex h-full w-full items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs uppercase border border-primary/20">
                {currentUser?.full_name.split(' ').map((n) => n[0]).join('')}
              </div>
              <span
                className={`absolute -bottom-0.5 -right-0.5 block h-2 w-2 rounded-full ring-1 ring-card ${getPresenceColor(currentUser?.presence)}`}
              />
            </div>
          </button>
          
          {presenceMenuOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setPresenceMenuOpen(false)} />
              <div className="absolute right-0 mt-2 z-40 w-44 rounded-md border border-border bg-card shadow-lg p-1 text-xs animate-slide-up">
                <p className="px-2 py-1 text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                  Presence Status:
                </p>
                <hr className="border-border my-1" />
                
                <button
                  onClick={() => selectPresence('automatic')}
                  className="w-full text-left px-2 py-1.5 hover:bg-muted hover:text-foreground rounded transition-colors flex items-center justify-between cursor-pointer font-bold"
                >
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                    <span>Automatic</span>
                  </div>
                  {(localStorage.getItem('relayhq_presence_mode') || 'automatic') === 'automatic' && (
                    <span className="text-[9px] text-primary">✓</span>
                  )}
                </button>

                <hr className="border-border my-1" />

                <button
                  onClick={() => selectPresence('online')}
                  className="w-full text-left px-2 py-1.5 hover:bg-muted hover:text-foreground rounded transition-colors flex items-center justify-between cursor-pointer font-medium"
                >
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-success" />
                    <span>Online</span>
                  </div>
                  {localStorage.getItem('relayhq_presence_mode') === 'manual' && localStorage.getItem('relayhq_presence_manual_status') === 'online' && (
                    <span className="text-[9px] text-primary">✓</span>
                  )}
                </button>
                <button
                  onClick={() => selectPresence('idle')}
                  className="w-full text-left px-2 py-1.5 hover:bg-muted hover:text-foreground rounded transition-colors flex items-center justify-between cursor-pointer font-medium"
                >
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-warning" />
                    <span>Idle</span>
                  </div>
                  {localStorage.getItem('relayhq_presence_mode') === 'manual' && localStorage.getItem('relayhq_presence_manual_status') === 'idle' && (
                    <span className="text-[9px] text-primary">✓</span>
                  )}
                </button>
                <button
                  onClick={() => selectPresence('busy')}
                  className="w-full text-left px-2 py-1.5 hover:bg-muted hover:text-foreground rounded transition-colors flex items-center justify-between cursor-pointer font-medium"
                >
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-danger" />
                    <span>Busy</span>
                  </div>
                  {localStorage.getItem('relayhq_presence_mode') === 'manual' && localStorage.getItem('relayhq_presence_manual_status') === 'busy' && (
                    <span className="text-[9px] text-primary">✓</span>
                  )}
                </button>
                <button
                  onClick={() => selectPresence('offline')}
                  className="w-full text-left px-2 py-1.5 hover:bg-muted hover:text-foreground rounded transition-colors flex items-center justify-between cursor-pointer font-medium"
                >
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-slate-400" />
                    <span>Offline</span>
                  </div>
                  {localStorage.getItem('relayhq_presence_mode') === 'manual' && localStorage.getItem('relayhq_presence_manual_status') === 'offline' && (
                    <span className="text-[9px] text-primary">✓</span>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
