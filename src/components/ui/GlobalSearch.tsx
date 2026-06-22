import React, { useState, useEffect, useRef } from 'react';
import { dbClient } from '../../services/dbClient';
import { useAuth } from '../../context/AuthContext';
import {
  Search, X, Folder, CheckSquare, Calendar, FileText, MessageSquare, ArrowRight, Loader2
} from 'lucide-react';
import type { Lead, Task, Reminder, Message, PersonalNote } from '../../types/database';

interface GlobalSearchProps {
  onNavigate: (view: string) => void;
}

interface SearchResult {
  id: string;
  type: 'lead' | 'task' | 'reminder' | 'note' | 'message';
  title: string;
  subtitle: string;
  targetView: string;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({ onNavigate }) => {
  const { currentUser } = useAuth();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Entities state
  const [leads, setLeads] = useState<Lead[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [notes, setNotes] = useState<PersonalNote[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch search index on focus
  const loadSearchIndex = async () => {
    setIsLoading(true);
    try {
      const [l, t, r, n, m] = await Promise.all([
        dbClient.getLeads(),
        dbClient.getTasks(),
        dbClient.getReminders(),
        dbClient.getPersonalNotes(),
        dbClient.getAllMessages()
      ]);
      setLeads(l);
      setTasks(t);
      setReminders(r);
      setNotes(n);
      setMessages(m);
    } catch (e) {
      console.warn('Failed to load global search index:', e);
    } finally {
      setIsLoading(false);
    }
  };

  // Keyboard shortcut to focus search input
  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      // Focus on '/' keypress
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, []);

  // Filter entities based on query
  const getFilteredResults = (): SearchResult[] => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    const results: SearchResult[] = [];

    // 1. Filter Leads
    leads.forEach(l => {
      if (l.company_name.toLowerCase().includes(q) || l.prospect_name.toLowerCase().includes(q) || (l.service_needed && l.service_needed.toLowerCase().includes(q))) {
        results.push({
          id: `lead-${l.id}`,
          type: 'lead',
          title: l.company_name,
          subtitle: `Lead prospect: ${l.prospect_name} · Status: ${l.status.replace('_', ' ')}`,
          targetView: `leads/${l.id}`
        });
      }
    });

    // 2. Filter Tasks
    tasks.forEach(t => {
      if (t.title.toLowerCase().includes(q) || (t.description && t.description.toLowerCase().includes(q))) {
        results.push({
          id: `task-${t.id}`,
          type: 'task',
          title: t.title,
          subtitle: `Task checklist · Status: ${t.status}`,
          targetView: 'tasks'
        });
      }
    });

    // 3. Filter Reminders
    reminders.forEach(r => {
      if (r.title.toLowerCase().includes(q) || (r.company_name && r.company_name.toLowerCase().includes(q))) {
        results.push({
          id: `rem-${r.id}`,
          type: 'reminder',
          title: r.title,
          subtitle: `Calendar reminder · Date: ${new Date(r.reminder_time).toLocaleDateString()}`,
          targetView: 'reminders'
        });
      }
    });

    // 4. Filter Notes
    notes.forEach(n => {
      if (n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)) {
        results.push({
          id: `note-${n.id}`,
          type: 'note',
          title: n.title,
          subtitle: `Scratchpad note · Category: ${n.category || 'Draft'}`,
          targetView: 'notes'
        });
      }
    });

    // 5. Filter Messages
    messages.forEach(m => {
      if (m.content.toLowerCase().includes(q)) {
        const isChannel = !!m.channel_id;
        const targetView = isChannel
          ? `messaging?channel=${m.channel_id}`
          : `messaging?dm=${m.sender_id === currentUser?.id ? m.receiver_id : m.sender_id}`;
        
        results.push({
          id: `msg-${m.id}`,
          type: 'message',
          title: m.content,
          subtitle: `${isChannel ? 'Channel message' : 'DM chat message'} · Sent: ${new Date(m.created_at).toLocaleDateString()}`,
          targetView
        });
      }
    });

    return results;
  };

  const filteredResults = getFilteredResults();

  // Keyboard navigation for dropdown results
  useEffect(() => {
    const handleDropdownKey = (e: KeyboardEvent) => {
      if (!isOpen || filteredResults.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filteredResults.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredResults.length) % filteredResults.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selected = filteredResults[selectedIndex];
        if (selected) {
          handleSelectResult(selected);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };

    window.addEventListener('keydown', handleDropdownKey);
    return () => window.removeEventListener('keydown', handleDropdownKey);
  }, [isOpen, filteredResults, selectedIndex]);

  // Handle outside click to close dropdown
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleSelectResult = (res: SearchResult) => {
    onNavigate(res.targetView);
    setIsOpen(false);
    setQuery('');
    inputRef.current?.blur();
  };

  const getResultIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'lead': return <Folder className="h-4 w-4 text-primary" />;
      case 'task': return <CheckSquare className="h-4 w-4 text-success" />;
      case 'reminder': return <Calendar className="h-4 w-4 text-danger" />;
      case 'note': return <FileText className="h-4 w-4 text-warning" />;
      case 'message': return <MessageSquare className="h-4 w-4 text-info" />;
    }
  };

  // Helper to highlight matching text query
  const renderHighlightedText = (text: string, highlight: string) => {
    if (!highlight.trim()) return <span>{text}</span>;
    const regex = new RegExp(`(${highlight.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return (
      <span>
        {parts.map((part, i) => 
          regex.test(part) ? (
            <mark key={i} className="bg-primary/20 dark:bg-primary/40 text-foreground font-bold px-0.5 rounded">
              {part}
            </mark>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </span>
    );
  };

  // Grouped results for rendering
  const groupedResults: Record<string, SearchResult[]> = {};
  filteredResults.forEach(res => {
    const typeLabel = res.type.charAt(0).toUpperCase() + res.type.slice(1) + 's';
    if (!groupedResults[typeLabel]) groupedResults[typeLabel] = [];
    groupedResults[typeLabel].push(res);
  });

  return (
    <div ref={dropdownRef} className="relative w-full max-w-[200px] sm:max-w-[320px]">
      {/* Search Input Bar */}
      <div className="relative flex items-center bg-muted/65 hover:bg-muted/90 focus-within:bg-background border border-border/80 focus-within:border-primary/80 focus-within:ring-1 focus-within:ring-primary/20 rounded-xl transition-all">
        <Search className="absolute left-3.5 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onFocus={() => {
            setIsOpen(true);
            loadSearchIndex();
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelectedIndex(0);
          }}
          placeholder="Search leads, tasks, chats…"
          className="w-full pl-9 pr-12 py-1.5 text-xs bg-transparent border-0 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-0 leading-normal"
        />
        
        {query ? (
          <button
            onClick={() => {
              setQuery('');
              setSelectedIndex(0);
              inputRef.current?.focus();
            }}
            className="absolute right-3.5 p-0.5 text-muted-foreground hover:text-foreground rounded transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        ) : (
          <span className="absolute right-3.5 text-[9px] font-semibold font-mono bg-muted/95 border border-border/40 px-1 py-0.2 rounded text-muted-foreground/75 tracking-tighter pointer-events-none">
            /
          </span>
        )}
      </div>

      {/* Floating Results Dropdown */}
      {isOpen && query.trim() && (
        <div className="absolute left-0 mt-2 w-[280px] sm:w-[480px] bg-card border border-border shadow-2xl rounded-xl z-[9999] overflow-hidden flex flex-col max-h-[420px] animate-slide-up">
          {isLoading && filteredResults.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-8 text-xs text-muted-foreground">
              <Loader2 className="h-4 w-4 text-primary animate-spin" />
              <span>Indexing entities...</span>
            </div>
          ) : filteredResults.length > 0 ? (
            (() => {
              let absoluteIdx = 0;
              return (
                <>
                  <div className="flex-1 overflow-y-auto p-2 min-h-0 space-y-3.5">
                    {Object.entries(groupedResults).map(([category, items]) => (
                      <div key={category} className="space-y-1">
                        <span className="px-2.5 py-0.5 text-[9px] font-extrabold text-muted-foreground uppercase tracking-wider block">
                          {category}
                        </span>
                        <div className="space-y-0.5">
                          {items.map(res => {
                            const currentAbsoluteIdx = absoluteIdx++;
                            const isSelected = currentAbsoluteIdx === selectedIndex;
                            return (
                              <button
                                key={res.id}
                                onClick={() => handleSelectResult(res)}
                                className={`flex items-start gap-3 w-full px-2.5 py-2 text-left rounded-lg transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-primary text-white'
                                    : 'hover:bg-muted/50 text-foreground'
                                }`}
                              >
                                <div className={`mt-0.5 ${isSelected ? 'text-white' : 'text-muted-foreground'}`}>
                                  {getResultIcon(res.type)}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-bold truncate leading-snug">
                                    {renderHighlightedText(res.title, query)}
                                  </p>
                                  <p className={`text-[10px] truncate mt-0.5 ${isSelected ? 'text-white/80' : 'text-muted-foreground/75'}`}>
                                    {renderHighlightedText(res.subtitle, query)}
                                  </p>
                                </div>
                                {isSelected && (
                                  <ArrowRight className="h-3.5 w-3.5 self-center text-white flex-shrink-0" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Keyboard help footer */}
                  <div className="bg-muted/45 border-t border-border px-3 py-1.8 flex items-center justify-between text-[9px] text-muted-foreground font-semibold">
                    <div className="flex items-center gap-2">
                      <span>↑↓ Navigate</span>
                      <span>Enter Select</span>
                    </div>
                    <span>ESC Close</span>
                  </div>
                </>
              );
            })()
          ) : (
            <div className="py-8 text-center text-xs text-muted-foreground space-y-1">
              <Search className="h-6 w-6 text-muted-foreground/30 mx-auto" />
              <p className="font-bold">No results match "{query}"</p>
              <p className="text-[10px]">Try checking spelling or search categories.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
