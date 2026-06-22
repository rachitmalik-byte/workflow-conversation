import React, { useState, useEffect, useRef } from 'react';
import { dbClient } from '../../services/dbClient';
import { useTheme } from '../../context/ThemeContext';
import {
  Search, Terminal, ArrowRight, Sparkles, Folder, CheckSquare,
  Calendar, FileText, Settings, Palette, Moon, Sun
} from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: string) => void;
}

interface CommandAction {
  id: string;
  category: 'Navigation' | 'Actions' | 'Themes' | 'Colors';
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  action: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, onNavigate }) => {
  const { toggleTheme, setThemeMode, setColorScheme, setThemePreset } = useTheme();
  
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  
  // Entity data states
  const [leads, setLeads] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [reminders, setReminders] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  
  // Recent commands history
  const [recents, setRecents] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('relayhq_recent_commands');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const overlayRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch entity data when palette opens
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
      
      const fetchData = async () => {
        setIsLoading(true);
        try {
          const [l, t, r, n] = await Promise.all([
            dbClient.getLeads(),
            dbClient.getTasks(),
            dbClient.getReminders(),
            dbClient.getPersonalNotes()
          ]);
          setLeads(l);
          setTasks(t);
          setReminders(r);
          setNotes(n);
        } catch (e) {
          console.warn('Failed to load command palette search context:', e);
        } finally {
          setIsLoading(false);
        }
      };
      fetchData();
    }
  }, [isOpen]);

  const addRecent = (cmdTitle: string) => {
    const updated = [cmdTitle, ...recents.filter(r => r !== cmdTitle)].slice(0, 5);
    setRecents(updated);
    localStorage.setItem('relayhq_recent_commands', JSON.stringify(updated));
  };

  // Close palette on backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) {
      onClose();
    }
  };

  // Pre-defined static actions
  const staticActions: CommandAction[] = [
    // Navigation
    { id: 'nav-dash', category: 'Navigation', title: 'Go to Dashboard', subtitle: 'View performance and recent activity', icon: <Terminal className="h-4 w-4" />, action: () => { onNavigate('dashboard'); onClose(); } },
    { id: 'nav-leads', category: 'Navigation', title: 'Go to Leads Portfolio', subtitle: 'Manage CRM outbound leads', icon: <Folder className="h-4 w-4" />, action: () => { onNavigate('leads'); onClose(); } },
    { id: 'nav-tasks', category: 'Navigation', title: 'Go to Task Checklist Center', subtitle: 'Manage assignments and followups', icon: <CheckSquare className="h-4 w-4" />, action: () => { onNavigate('tasks'); onClose(); } },
    { id: 'nav-rem', category: 'Navigation', title: 'Go to Scheduler / Reminders', subtitle: 'Manage calendar alerts', icon: <Calendar className="h-4 w-4" />, action: () => { onNavigate('reminders'); onClose(); } },
    { id: 'nav-notes', category: 'Navigation', title: 'Go to Personal Scratchpads', subtitle: 'Read template scripts and drafts', icon: <FileText className="h-4 w-4" />, action: () => { onNavigate('notes'); onClose(); } },
    { id: 'nav-chat', category: 'Navigation', title: 'Go to Messaging Chatroom', subtitle: 'Teammates channels and Google chat DMs', icon: <Terminal className="h-4 w-4" />, action: () => { onNavigate('messaging'); onClose(); } },
    { id: 'nav-set', category: 'Navigation', title: 'Go to System Settings', subtitle: 'Configure theme customization and database', icon: <Settings className="h-4 w-4" />, action: () => { onNavigate('settings'); onClose(); } },
    
    // Actions
    { id: 'act-newlead', category: 'Actions', title: 'Create New Outbound Lead', subtitle: 'Launch lead registration form', icon: <Sparkles className="h-4 w-4 text-primary" />, action: () => { onNavigate('leads/new'); onClose(); } },
    { id: 'act-newtask', category: 'Actions', title: 'Create New Task Checklist', subtitle: 'Register a new project task', icon: <CheckSquare className="h-4 w-4 text-primary" />, action: () => { onNavigate('tasks'); window.dispatchEvent(new CustomEvent('command-create-task')); onClose(); } },
    { id: 'act-newrem', category: 'Actions', title: 'Schedule New Reminder Alert', subtitle: 'Create a meeting alarm', icon: <Calendar className="h-4 w-4 text-primary" />, action: () => { onNavigate('reminders'); window.dispatchEvent(new CustomEvent('command-create-reminder')); onClose(); } },

    // Themes
    { id: 'theme-toggle', category: 'Themes', title: 'Toggle Light/Dark Theme Mode', subtitle: 'Switch color contrast mode', icon: <Moon className="h-4 w-4 text-warning" />, action: () => { toggleTheme(); onClose(); } },
    { id: 'theme-light', category: 'Themes', title: 'Set Theme Mode: Light Mode', icon: <Sun className="h-4 w-4 text-warning" />, action: () => { setThemeMode('light'); onClose(); } },
    { id: 'theme-dark', category: 'Themes', title: 'Set Theme Mode: Dark Mode', icon: <Moon className="h-4 w-4 text-warning" />, action: () => { setThemeMode('dark'); onClose(); } },
    { id: 'theme-corp', category: 'Themes', title: 'Apply Theme Preset: Corporate Professional', icon: <Palette className="h-4 w-4" />, action: () => { setThemePreset('corporate'); onClose(); } },
    { id: 'theme-glass', category: 'Themes', title: 'Apply Theme Preset: Glassmorphism Elegance', icon: <Palette className="h-4 w-4" />, action: () => { setThemePreset('glassmorphism'); onClose(); } },
    { id: 'theme-cyber', category: 'Themes', title: 'Apply Theme Preset: Cyberpunk Neon Glow', icon: <Palette className="h-4 w-4" />, action: () => { setThemePreset('cyberpunk'); onClose(); } },
    { id: 'theme-bau', category: 'Themes', title: 'Apply Theme Preset: Bauhaus Geometric Bold', icon: <Palette className="h-4 w-4" />, action: () => { setThemePreset('bauhaus'); onClose(); } },
    { id: 'theme-scand', category: 'Themes', title: 'Apply Theme Preset: Scandinavian Zen Minimal', icon: <Palette className="h-4 w-4" />, action: () => { setThemePreset('scandinavian'); onClose(); } },

    // Color Schemes
    { id: 'color-def', category: 'Colors', title: 'Set Color Scheme: Default Accent', icon: <Palette className="h-4 w-4 text-primary" />, action: () => { setColorScheme('default'); onClose(); } },
    { id: 'color-ocean', category: 'Colors', title: 'Set Color Scheme: Sapphire Ocean (Blue)', icon: <Palette className="h-4 w-4 text-blue-500" />, action: () => { setColorScheme('ocean'); onClose(); } },
    { id: 'color-forest', category: 'Colors', title: 'Set Color Scheme: Emerald Forest (Green)', icon: <Palette className="h-4 w-4 text-emerald-500" />, action: () => { setColorScheme('forest'); onClose(); } },
    { id: 'color-sunset', category: 'Colors', title: 'Set Color Scheme: Warm Sunset (Orange)', icon: <Palette className="h-4 w-4 text-orange-500" />, action: () => { setColorScheme('sunset'); onClose(); } },
    { id: 'color-royal', category: 'Colors', title: 'Set Color Scheme: Royal Purple (Amethyst)', icon: <Palette className="h-4 w-4 text-purple-500" />, action: () => { setColorScheme('royal'); onClose(); } },
    { id: 'color-crim', category: 'Colors', title: 'Set Color Scheme: Crimson Ruby (Red)', icon: <Palette className="h-4 w-4 text-red-500" />, action: () => { setColorScheme('crimson'); onClose(); } },
  ];

  // Dynamic entity matches based on query
  const getDynamicMatches = () => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    const results: any[] = [];
    
    // Filter leads
    leads.filter(l => 
      l.company_name.toLowerCase().includes(q) || 
      l.prospect_name.toLowerCase().includes(q)
    ).slice(0, 4).forEach(l => {
      results.push({
        id: `lead-${l.id}`,
        category: 'Leads Mapping',
        title: `${l.company_name} (${l.prospect_name})`,
        subtitle: `Outbound Lead · Status: ${l.status.replace('_', ' ')}`,
        icon: <Folder className="h-4 w-4 text-primary" />,
        action: () => { onNavigate(`leads/${l.id}`); onClose(); }
      });
    });

    // Filter tasks
    tasks.filter(t => 
      t.title.toLowerCase().includes(q) || 
      (t.description && t.description.toLowerCase().includes(q))
    ).slice(0, 4).forEach(t => {
      results.push({
        id: `task-${t.id}`,
        category: 'Tasks Checklist',
        title: t.title,
        subtitle: `Task status: ${t.status}`,
        icon: <CheckSquare className="h-4 w-4 text-success" />,
        action: () => { onNavigate('tasks'); onClose(); }
      });
    });

    // Filter reminders
    reminders.filter(r => 
      r.title.toLowerCase().includes(q)
    ).slice(0, 4).forEach(r => {
      results.push({
        id: `rem-${r.id}`,
        category: 'Reminders / Events',
        title: r.title,
        subtitle: `Reminder due: ${new Date(r.reminder_time).toLocaleDateString()}`,
        icon: <Calendar className="h-4 w-4 text-danger" />,
        action: () => { onNavigate('reminders'); onClose(); }
      });
    });

    // Filter notes
    notes.filter(n => 
      n.title.toLowerCase().includes(q) || 
      n.content.toLowerCase().includes(q)
    ).slice(0, 4).forEach(n => {
      results.push({
        id: `note-${n.id}`,
        category: 'Personal Scratchpad',
        title: n.title,
        subtitle: `Category: ${n.category || 'Draft'}`,
        icon: <FileText className="h-4 w-4 text-warning" />,
        action: () => { onNavigate('notes'); onClose(); }
      });
    });

    return results;
  };

  // Combine static and dynamic lists
  const filteredActions = [
    ...getDynamicMatches(),
    ...staticActions.filter(act => 
      act.title.toLowerCase().includes(query.toLowerCase()) ||
      act.category.toLowerCase().includes(query.toLowerCase()) ||
      (act.subtitle && act.subtitle.toLowerCase().includes(query.toLowerCase()))
    )
  ];

  // Group by category for visual sections
  const groupedResults: Record<string, typeof filteredActions> = {};
  filteredActions.forEach(act => {
    if (!groupedResults[act.category]) {
      groupedResults[act.category] = [];
    }
    groupedResults[act.category].push(act);
  });

  // Flat array of matches for index navigation
  const flatMatches = Object.values(groupedResults).flat();

  // Keyboard navigation listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % flatMatches.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + flatMatches.length) % flatMatches.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selected = flatMatches[selectedIndex];
        if (selected) {
          addRecent(selected.title);
          selected.action();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, flatMatches, selectedIndex]);

  // Adjust scroll when selection changes
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const selectedEl = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
    if (selectedEl) {
      selectedEl.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 bg-background/60 backdrop-blur-sm z-[9999] flex items-start justify-center pt-[10vh] px-4"
    >
      <div className="bg-card w-full max-w-2xl rounded-xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[70vh]">
        {/* Search header input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search className="h-4.5 w-4.5 text-muted-foreground flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
            placeholder="Type a command or search entities (leads, tasks, notes...)"
            className="w-full bg-transparent border-0 text-foreground placeholder-muted-foreground text-xs focus:outline-none focus:ring-0"
          />
          <span className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground uppercase flex-shrink-0">
            ESC
          </span>
        </div>

        {/* Scrollable list content */}
        <div ref={listRef} className="flex-1 overflow-y-auto p-2 min-h-0 space-y-4">
          {isLoading && (
            <div className="text-center py-2 text-[10px] text-muted-foreground animate-pulse">
              Syncing search index...
            </div>
          )}
          
          {/* Show Recents if empty query and we have history */}
          {!query && recents.length > 0 && (
            <div className="space-y-1">
              <span className="px-3 py-1 text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">
                Recently Used
              </span>
              <div className="space-y-0.5">
                {staticActions.filter(act => recents.includes(act.title)).map(act => (
                  <button
                    key={`recent-${act.id}`}
                    onClick={() => { addRecent(act.title); act.action(); }}
                    className="flex items-center gap-3 w-full px-3 py-2 text-left rounded-lg text-xs hover:bg-muted/40 transition-colors text-muted-foreground hover:text-foreground font-semibold"
                  >
                    {act.icon}
                    <span>{act.title}</span>
                    <ArrowRight className="h-3 w-3 ml-auto opacity-40" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Results grouped by category */}
          {flatMatches.length > 0 ? (
            (() => {
              let absoluteIdx = 0;
              return Object.entries(groupedResults).map(([category, items]) => (
                <div key={category} className="space-y-1">
                  <span className="px-3 py-1 text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">
                    {category}
                  </span>
                  <div className="space-y-0.5">
                    {items.map(act => {
                      const currentAbsoluteIdx = absoluteIdx++;
                      const isSelected = currentAbsoluteIdx === selectedIndex;
                      return (
                        <button
                          key={act.id}
                          data-index={currentAbsoluteIdx}
                          onClick={() => { addRecent(act.title); act.action(); }}
                          className={`flex items-start gap-3 w-full px-3 py-2 text-left rounded-lg transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-primary text-primary-foreground'
                              : 'hover:bg-muted/40 text-foreground'
                          }`}
                        >
                          <div className={`mt-0.5 ${isSelected ? 'text-primary-foreground' : 'text-muted-foreground'}`}>
                            {act.icon}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold truncate leading-snug">{act.title}</p>
                            {act.subtitle && (
                              <p className={`text-[10px] truncate mt-0.5 ${isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                                {act.subtitle}
                              </p>
                            )}
                          </div>
                          {isSelected && (
                            <span className="text-[10px] font-mono self-center bg-primary-foreground/20 text-primary-foreground px-1.5 py-0.5 rounded">
                              ENTER
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ));
            })()
          ) : (
            <div className="py-8 text-center text-xs text-muted-foreground space-y-1">
              <Terminal className="h-6 w-6 text-muted-foreground/30 mx-auto" />
              <p className="font-semibold">No commands or matches found</p>
              <p className="text-[10px]">Try typing a different search query.</p>
            </div>
          )}
        </div>

        {/* Action footer helper bar */}
        <div className="bg-muted/45 px-4 py-2 border-t border-border flex items-center justify-between text-[10px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="font-mono bg-card px-1 py-0.5 rounded border border-border shadow-sm">↑↓</span> Navigate
            </span>
            <span className="flex items-center gap-1">
              <span className="font-mono bg-card px-1 py-0.5 rounded border border-border shadow-sm">Enter</span> Select
            </span>
          </div>
          <span>Press <span className="font-mono bg-card px-1 py-0.5 rounded border border-border shadow-sm">ESC</span> to dismiss</span>
        </div>
      </div>
    </div>
  );
};
