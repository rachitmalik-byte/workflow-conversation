import React from 'react';
import { Keyboard, X } from 'lucide-react';

interface KeyboardShortcutsProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcuts: React.FC<KeyboardShortcutsProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const sections = [
    {
      title: 'Navigation & Command',
      shortcuts: [
        { keys: ['Ctrl', 'K'], desc: 'Open Command Palette' },
        { keys: ['?'], desc: 'Toggle keyboard shortcuts cheat sheet' },
        { keys: ['Esc'], desc: 'Dismiss active modals / overlays' },
      ],
    },
    {
      title: 'Quick Creation',
      shortcuts: [
        { keys: ['N'], desc: 'New Lead (outbound prospect registration)' },
        { keys: ['T'], desc: 'New Task (add checklist assignment)' },
        { keys: ['R'], desc: 'New Reminder (schedule calendar alert)' },
      ],
    },
    {
      title: 'List View Navigation',
      shortcuts: [
        { keys: ['J'], desc: 'Select next item in list' },
        { keys: ['K'], desc: 'Select previous item in list' },
      ],
    },
    {
      title: 'Jump to View (Sidebar Index)',
      shortcuts: [
        { keys: ['1'], desc: 'Jump to Dashboard' },
        { keys: ['2'], desc: 'Jump to Leads Portfolio' },
        { keys: ['3'], desc: 'Jump to Task Center' },
        { keys: ['4'], desc: 'Jump to Scheduler (Calendar)' },
        { keys: ['5'], desc: 'Jump to Personal Scratchpads' },
        { keys: ['6'], desc: 'Jump to Chat messaging room' },
        { keys: ['7'], desc: 'Jump to System Settings' },
      ],
    },
  ];

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="fixed inset-0 bg-background/60 backdrop-blur-sm z-[9998] flex items-center justify-center p-4 animate-fade-in"
    >
      <div className="bg-card w-full max-w-xl rounded-xl border border-border shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/20">
          <div className="flex items-center gap-2 text-primary">
            <Keyboard className="h-4.5 w-4.5" />
            <h3 className="text-sm font-extrabold text-foreground tracking-tight">Keyboard Shortcuts Guide</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Cheat sheet grid */}
        <div className="p-5 overflow-y-auto max-h-[60vh] space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
            {sections.map((section) => (
              <div key={section.title} className="space-y-2.5">
                <h4 className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider">
                  {section.title}
                </h4>
                <div className="space-y-2">
                  {section.shortcuts.map((shortcut) => (
                    <div key={shortcut.desc} className="flex items-center justify-between gap-4 text-xs">
                      <span className="text-muted-foreground font-medium">{shortcut.desc}</span>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {shortcut.keys.map((k) => (
                          <kbd
                            key={k}
                            className="px-1.5 py-0.5 text-[10px] font-bold font-mono bg-muted border border-border rounded text-foreground shadow-sm uppercase"
                          >
                            {k}
                          </kbd>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer info banner */}
        <div className="bg-muted/40 px-5 py-3 border-t border-border text-[10px] text-muted-foreground text-center">
          Shortcuts are disabled inside inputs, textareas, and interactive text editors.
        </div>
      </div>
    </div>
  );
};
