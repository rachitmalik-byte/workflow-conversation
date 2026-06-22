import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { useAuth } from '../../context/AuthContext';
import { User } from 'lucide-react';

interface MentionTextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value: string;
  onChangeValue: (val: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}

export const MentionTextArea = forwardRef<HTMLTextAreaElement, MentionTextAreaProps>(
  ({ value, onChangeValue, onKeyDown, ...props }, ref) => {
    const { profiles } = useAuth();
    const [searchQuery, setSearchQuery] = useState<string | null>(null);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
    
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    
    useImperativeHandle(ref, () => textareaRef.current as HTMLTextAreaElement);

    const activeProfiles = profiles.filter(p => p.status === 'active');
    
    // Filter profiles based on search query
    const filteredProfiles = searchQuery !== null
      ? activeProfiles.filter(p => 
          p.full_name.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : [];

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value;
      onChangeValue(val);
      detectMention(e.target);
    };

    const detectMention = (target: HTMLTextAreaElement) => {
      const cursor = target.selectionStart;
      const textBeforeCursor = target.value.slice(0, cursor);
      
      // Match @ followed by alphanumeric characters, ending at cursor
      const match = textBeforeCursor.match(/@(\w*)$/);
      if (match) {
        setSearchQuery(match[1]);
        setSelectedIndex(0);
        
        // Position below the textarea
        setMenuPosition({
          top: target.clientHeight + 4,
          left: 12
        });
      } else {
        setSearchQuery(null);
        setMenuPosition(null);
      }
    };

    const handleSelectProfile = (profileName: string) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const cursor = textarea.selectionStart;
      const textBeforeCursor = value.slice(0, cursor);
      const textAfterCursor = value.slice(cursor);
      
      const match = textBeforeCursor.match(/@(\w*)$/);
      if (match) {
        const before = textBeforeCursor.slice(0, cursor - match[0].length);
        const newValue = before + '@' + profileName + ' ' + textAfterCursor;
        onChangeValue(newValue);
        
        // Reset query and position
        setSearchQuery(null);
        setMenuPosition(null);
        
        // Refocus and place cursor after the inserted name + space
        setTimeout(() => {
          textarea.focus();
          const newCursorPos = before.length + profileName.length + 2; // +2 for @ and space
          textarea.setSelectionRange(newCursorPos, newCursorPos);
        }, 0);
      }
    };

    const handleKeyDownInternal = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // If mention dropdown is open, intercept keys
      if (searchQuery !== null && filteredProfiles.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedIndex(prev => (prev + 1) % filteredProfiles.length);
          return;
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedIndex(prev => (prev - 1 + filteredProfiles.length) % filteredProfiles.length);
          return;
        } else if (e.key === 'Enter' || e.key === 'Tab') {
          e.preventDefault();
          const selected = filteredProfiles[selectedIndex];
          if (selected) {
            handleSelectProfile(selected.full_name);
          }
          return;
        } else if (e.key === 'Escape') {
          e.preventDefault();
          setSearchQuery(null);
          setMenuPosition(null);
          return;
        }
      }

      // If dropdown is not open or not handled, run parent's onKeyDown
      if (onKeyDown) {
        onKeyDown(e);
      }
    };

    // Close menu when clicking outside
    useEffect(() => {
      const handleOutsideClick = () => {
        setSearchQuery(null);
        setMenuPosition(null);
      };
      document.addEventListener('click', handleOutsideClick);
      return () => document.removeEventListener('click', handleOutsideClick);
    }, []);

    return (
      <div className="relative w-full flex flex-col">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDownInternal}
          onClick={(e) => {
            e.stopPropagation();
            detectMention(e.currentTarget);
          }}
          onKeyUp={(e) => {
            if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Enter') {
              detectMention(e.currentTarget);
            }
          }}
          {...props}
        />

        {/* Mention floating autocomplete panel */}
        {searchQuery !== null && filteredProfiles.length > 0 && menuPosition && (
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ top: `${menuPosition.top}px`, left: `${menuPosition.left}px` }}
            className="absolute z-[999] bg-card border border-border shadow-xl rounded-lg max-h-48 overflow-y-auto w-56 p-1 text-xs"
          >
            <div className="px-2.5 py-1 text-[9px] font-bold text-muted-foreground uppercase tracking-wider border-b border-border/40">
              Mention Teammate
            </div>
            <div className="space-y-0.5 mt-1">
              {filteredProfiles.map((p, i) => {
                const isSelected = i === selectedIndex;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectProfile(p.full_name)}
                    className={`flex items-center gap-2 w-full px-2 py-1.5 text-left rounded transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-primary text-primary-foreground font-semibold'
                        : 'text-foreground hover:bg-muted'
                    }`}
                  >
                    <User className={`h-3 w-3 ${isSelected ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                    <div className="truncate">
                      <p className="font-semibold truncate">{p.full_name}</p>
                      <p className={`text-[9px] truncate ${isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                        {p.email}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }
);
