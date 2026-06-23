import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { dbClient } from '../../services/dbClient';
import {
  LayoutDashboard, Briefcase, CheckSquare, Calendar,
  MessageSquare, ArrowLeftRight, FileText,
  ChevronLeft, ChevronRight, Settings, LogOut, Mail, ExternalLink
} from 'lucide-react';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  isOpen: boolean;
  onClose: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  isOpen,
  onClose,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const { currentUser, profiles, switchUser, isSimulator, signOutUser } = useAuth();
  const [unreadCounts, setUnreadCounts] = useState<{
    leads: number;
    tasks: number;
    reminders: number;
    messaging: number;
  }>({ leads: 0, tasks: 0, reminders: 0, messaging: 0 });

  const isExpanded = !isCollapsed;

  useEffect(() => {
    const checkUnread = async () => {
      try {
        let localUnread = 0;
        try {
          const saved = localStorage.getItem('relayhq_unread_counts');
          if (saved) {
            const counts = JSON.parse(saved);
            localUnread = Object.values(counts).reduce((a: any, b: any) => a + b, 0) as number;
          }
        } catch (e) { /* ignore */ }

        let unreadLeadsList: string[] = [];
        try {
          const savedLeads = localStorage.getItem('relayhq_unread_leads');
          if (savedLeads) {
            unreadLeadsList = JSON.parse(savedLeads);
          }
        } catch (e) {}

        const notifs = await dbClient.getNotifications();
        const unreadNotifs = notifs.filter(n => !n.is_read);

        const leadsCount = unreadNotifs.filter(n => n.type === 'lead_update' || n.type === 'assignment_alert').length + unreadLeadsList.length;
        const tasksCount = unreadNotifs.filter(n => n.type === 'task_update').length;
        const remindersCount = unreadNotifs.filter(n => n.type === 'reminder_alert').length;
        const msgCount = unreadNotifs.filter(n => n.type === 'message_alert' || n.type === 'mention_alert').length + localUnread;

        setUnreadCounts({
          leads: leadsCount,
          tasks: tasksCount,
          reminders: remindersCount,
          messaging: msgCount
        });
      } catch (err) {
        console.error(err);
      }
    };

    checkUnread();
    const handleUnreadUpdate = () => {
      checkUnread();
    };
    window.addEventListener('unread-counts-updated', handleUnreadUpdate);
    const unsubscribe = dbClient.subscribe((table) => {
      if (table === 'notifications' || table === 'messages' || table === 'lead_updates') checkUnread();
    });

    return () => {
      window.removeEventListener('unread-counts-updated', handleUnreadUpdate);
      unsubscribe();
    };
  }, [currentUser]);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'leads', label: 'Projects', icon: Briefcase, badge: unreadCounts.leads > 0 ? unreadCounts.leads : undefined, isDot: true },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare, badge: unreadCounts.tasks > 0 ? unreadCounts.tasks : undefined, isDot: true },
    { id: 'reminders', label: 'Reminders', icon: Calendar, badge: unreadCounts.reminders > 0 ? unreadCounts.reminders : undefined, isDot: true },
    { id: 'notes', label: 'Scratchpad', icon: FileText },
    { id: 'messaging', label: 'Messaging', icon: MessageSquare, badge: unreadCounts.messaging > 0 ? unreadCounts.messaging : undefined },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const handleNavClick = (id: string) => {
    let target = id;
    if (id === 'leads') {
      if (currentView.startsWith('leads/')) {
        target = 'leads';
      } else {
        target = localStorage.getItem('relayhq_last_leads_subview') || 'leads';
      }
    }
    onNavigate(target);
    onClose();
  };

  const getIsActive = (id: string) => {
    if (id === 'leads') return currentView.startsWith('leads');
    if (id === 'messaging') return currentView.startsWith('messaging');
    return currentView === id;
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleCollapse?.();
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        data-expanded={isExpanded ? 'true' : 'false'}
        style={{
          width: isExpanded ? '256px' : '64px',
          transition: 'width 220ms cubic-bezier(0.4, 0, 0.2, 1)',
        }}
        className={`fixed top-0 bottom-0 left-0 z-40 flex flex-col border-r border-border bg-card overflow-hidden
          ${isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* ── Brand Header ── */}
        <div
          className="flex h-14 items-center border-b border-border flex-shrink-0 overflow-hidden"
          style={{ paddingLeft: isExpanded ? '16px' : '0', paddingRight: isExpanded ? '12px' : '0', justifyContent: isExpanded ? 'space-between' : 'center', transition: 'padding 220ms cubic-bezier(0.4, 0, 0.2, 1)' }}
        >
          <div className="flex items-center min-w-0" style={{ gap: isExpanded ? '10px' : '0' }}>
            <img src="/logo.svg" className="h-8 w-8 flex-shrink-0 object-contain rounded-lg shadow-sm" alt="RelayHQ" />
            <span
              className="text-sm font-extrabold text-foreground tracking-tight whitespace-nowrap overflow-hidden"
              style={{ opacity: isExpanded ? 1 : 0, maxWidth: isExpanded ? '120px' : '0', transition: 'opacity 180ms ease, max-width 220ms cubic-bezier(0.4,0,0.2,1)' }}
            >
              RelayHQ
            </span>
          </div>

          {/* Collapse toggle - only shown when expanded */}
          {onToggleCollapse && (
            <button
              onClick={handleToggle}
              style={{ opacity: isExpanded ? 1 : 0, pointerEvents: isExpanded ? 'auto' : 'none', transition: 'opacity 150ms ease' }}
              className={`${isExpanded ? 'hidden md:flex' : 'hidden'} h-6 w-6 flex-shrink-0 items-center justify-center rounded border border-border text-muted-foreground hover:text-foreground bg-muted/40 hover:bg-muted transition-colors cursor-pointer`}
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>

        {/* ── Navigation ── */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 space-y-0.5" style={{ padding: isExpanded ? '12px 8px' : '12px 8px' }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = getIsActive(item.id);
            return (
              <button
                key={item.id}
                id={`sidebar-item-${item.id}`}
                onClick={() => handleNavClick(item.id)}
                title={!isExpanded ? item.label : undefined}
                className={`
                  relative flex w-full items-center rounded-lg text-sm font-medium
                  transition-all duration-150 group
                  ${isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }
                `}
                style={{
                  height: '40px',
                  paddingLeft: isExpanded ? '12px' : '0',
                  paddingRight: isExpanded ? '12px' : '0',
                  justifyContent: isExpanded ? 'flex-start' : 'center',
                  transition: 'padding 220ms cubic-bezier(0.4,0,0.2,1), background 150ms, color 150ms',
                }}
              >
                {/* Icon with optional dot badge */}
                <div className="relative flex-shrink-0">
                  <Icon className={`h-[18px] w-[18px] ${isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`} />
                  {!isExpanded && item.badge !== undefined && (
                    <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-danger border-2 border-card" />
                  )}
                </div>

                {/* Label */}
                <span
                  className={`${isExpanded ? 'ml-3' : 'ml-0'} whitespace-nowrap font-medium overflow-hidden`}
                  style={{ opacity: isExpanded ? 1 : 0, maxWidth: isExpanded ? '160px' : '0', transition: 'opacity 160ms ease, max-width 220ms cubic-bezier(0.4,0,0.2,1)' }}
                >
                  {item.label}
                </span>

                {/* Badge (expanded mode) */}
                {isExpanded && item.badge !== undefined && (
                  item.isDot ? (
                    <span className="ml-auto h-2 w-2 rounded-full bg-danger mr-1 animate-pulse" />
                  ) : (
                    <span className="ml-auto flex h-4.5 min-w-4 items-center justify-center rounded-full bg-danger px-1.5 text-[10px] font-bold text-white">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )
                )}

                {/* Active indicator bar */}
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-r-full" />
                )}
              </button>
            );
          })}

          {/* Bottom collapse toggle button */}
          {onToggleCollapse && (
            <div className="pt-3 mt-2 border-t border-border/40">
              <button
                onClick={handleToggle}
                title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                className="hidden md:flex w-full items-center rounded-lg text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-150 cursor-pointer"
                style={{
                  height: '36px',
                  paddingLeft: isExpanded ? '12px' : '0',
                  paddingRight: isExpanded ? '12px' : '0',
                  justifyContent: isExpanded ? 'flex-start' : 'center',
                  gap: isExpanded ? '12px' : '0',
                  transition: 'padding 220ms cubic-bezier(0.4,0,0.2,1)',
                }}
              >
                {isCollapsed ? (
                  <ChevronRight className="h-4 w-4 flex-shrink-0" />
                ) : (
                  <>
                    <ChevronLeft className="h-4 w-4 flex-shrink-0" />
                    <span
                      className="whitespace-nowrap overflow-hidden"
                      style={{ opacity: isExpanded ? 1 : 0, maxWidth: isExpanded ? '120px' : '0', transition: 'opacity 160ms ease, max-width 220ms' }}
                    >
                      Collapse Menu
                    </span>
                  </>
                )}
              </button>
            </div>
          )}
        </nav>

        {/* Bulk Mail Chip */}
        {currentUser?.role === 'growth_specialist' && (
          <div className="px-3 py-2 flex-shrink-0">
            <a
              href="https://mainsitesend.vercel.app/followups"
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center text-primary bg-primary/10 border border-primary/20 rounded-lg hover:bg-primary/15 transition-all duration-200 ${isExpanded ? 'gap-2' : ''}`}
              style={{ justifyContent: isExpanded ? 'flex-start' : 'center', padding: isExpanded ? '8px 12px' : '8px' }}
              title="Bulk Email & Follow-ups"
            >
              <Mail className="h-3.5 w-3.5 flex-shrink-0" />
              {isExpanded && (
                <span className="truncate flex items-center gap-1 text-[11px] font-semibold">
                  <span>Bulk Email Tool</span>
                  <ExternalLink className="h-3 w-3 opacity-60" />
                </span>
              )}
            </a>
          </div>
        )}

        {/* ── Profile Footer ── */}
        <div
          className="border-t border-border bg-muted/30 flex-shrink-0 overflow-hidden"
          style={{ padding: isExpanded ? '12px' : '10px 8px', transition: 'padding 220ms cubic-bezier(0.4,0,0.2,1)' }}
        >
          {/* Role simulator switcher */}
          {isExpanded && isSimulator && (
            <div className="mb-2.5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[9px] font-bold tracking-wider text-muted-foreground uppercase">
                  Role Simulation
                </span>
                <ArrowLeftRight className="h-3 w-3 text-muted-foreground" />
              </div>
              <select
                value={currentUser?.id || ''}
                onChange={(e) => switchUser(e.target.value)}
                className="w-full text-xs bg-card border border-border text-foreground px-2 py-1.5 rounded focus:outline-none focus:border-primary cursor-pointer"
              >
                {profiles.filter((p) => p.status === 'active').map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name} ({p.role === 'head' ? 'Head' : 'Specialist'})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Avatar + info row */}
          <div className="flex items-center min-w-0 w-full" style={{ justifyContent: isExpanded ? 'flex-start' : 'center', gap: isExpanded ? '10px' : '0' }}>
            {/* Clickable Profile Info */}
            <button
              onClick={() => onNavigate('settings')}
              className="flex items-center min-w-0 text-left hover:opacity-80 transition-opacity cursor-pointer focus:outline-none"
              style={{ gap: isExpanded ? '10px' : '0' }}
              title={!isExpanded ? `${currentUser?.full_name} · ${currentUser?.role === 'head' ? 'Head' : 'Specialist'} (Click to view profile)` : 'View profile settings'}
            >
              {/* Avatar */}
              <div
                className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/15 text-primary font-bold text-xs flex items-center justify-center select-none ring-2 ring-primary/20"
              >
                {currentUser?.full_name?.split(' ').map((n) => n[0]).join('').slice(0, 2)}
              </div>

              {/* Name + role */}
              <div
                className="min-w-0 overflow-hidden"
                style={{ opacity: isExpanded ? 1 : 0, maxWidth: isExpanded ? '140px' : '0', transition: 'opacity 160ms ease, max-width 220ms cubic-bezier(0.4,0,0.2,1)' }}
              >
                <p className="text-xs font-semibold text-foreground truncate leading-tight">{currentUser?.full_name}</p>
                <p className="text-[9px] text-muted-foreground uppercase tracking-wide font-medium mt-0.5">
                  {currentUser?.role === 'head' ? '👑 Head' : '💼 Specialist'}
                </p>
              </div>
            </button>

            {/* Logout icon - always visible when expanded */}
            {isExpanded && (
              <button
                onClick={signOutUser}
                title={isSimulator ? 'Exit Sandbox' : 'Log Out'}
                className="ml-auto flex-shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-danger hover:bg-danger/10 transition-colors cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Collapsed: just show logout icon below avatar */}
          {!isExpanded && (
            <button
              onClick={signOutUser}
              title={isSimulator ? 'Exit Sandbox' : 'Log Out'}
              className="mt-2 w-full flex items-center justify-center p-1.5 rounded-md text-muted-foreground hover:text-danger hover:bg-danger/10 transition-colors cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </aside>
    </>
  );
};
