import React, { useState, useEffect, useRef } from 'react';
import { dbClient } from '../../services/dbClient';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import type { PersonalNote, NoteCategory, Lead } from '../../types/database';
import {
  Plus, Trash2, FileText, ChevronRight, Save, Sparkles,
  Bold, Italic, Underline, Strikethrough, AlignLeft, AlignCenter,
  AlignRight, AlignJustify, List, ListOrdered, Undo2, Redo2,
  Palette, Highlighter, Eraser, ChevronDown, ArrowLeft
} from 'lucide-react';

const FONTS = [
  { name: 'Inter', value: 'Inter, sans-serif' },
  { name: 'Outfit', value: 'Outfit, sans-serif' },
  { name: 'Space Grotesk', value: 'Space Grotesk, sans-serif' },
  { name: 'JetBrains Mono', value: 'JetBrains Mono, monospace' },
  { name: 'Lora', value: 'Lora, serif' },
  { name: 'Playfair Display', value: 'Playfair Display, serif' },
  { name: 'Montserrat', value: 'Montserrat, sans-serif' },
  { name: 'Poppins', value: 'Poppins, sans-serif' },
  { name: 'Roboto', value: 'Roboto, sans-serif' },
  { name: 'Open Sans', value: 'Open Sans, sans-serif' },
  { name: 'Merriweather', value: 'Merriweather, serif' },
  { name: 'Pacifico', value: 'Pacifico, cursive' },
  { name: 'Lobster', value: 'Lobster, sans-serif' },
  { name: 'Great Vibes', value: 'Great Vibes, cursive' },
  { name: 'Cinzel', value: 'Cinzel, serif' },
  { name: 'Cormorant Garamond', value: 'Cormorant Garamond, serif' },
  { name: 'Oswald', value: 'Oswald, sans-serif' },
  { name: 'Playpen Sans', value: 'Playpen Sans, sans-serif' },
  { name: 'Raleway', value: 'Raleway, sans-serif' },
  { name: 'Ubuntu', value: 'Ubuntu, sans-serif' },
  { name: 'Quicksand', value: 'Quicksand, sans-serif' },
  { name: 'Dancing Script', value: 'Dancing Script, cursive' },
  { name: 'Kanit', value: 'Kanit, sans-serif' },
  { name: 'Caveat', value: 'Caveat, cursive' },
  { name: 'Anton', value: 'Anton, sans-serif' },
  { name: 'Arial', value: 'Arial, sans-serif' },
  { name: 'Georgia', value: 'Georgia, serif' },
  { name: 'Times New Roman', value: 'Times New Roman, serif' },
  { name: 'Courier New', value: 'Courier New, monospace' }
];

const SIZES = [
  { label: '10px', value: '1' },
  { label: '13px', value: '2' },
  { label: '16px', value: '3' },
  { label: '18px', value: '4' },
  { label: '24px', value: '5' },
  { label: '32px', value: '6' },
  { label: '48px', value: '7' }
];

const TEXT_COLORS = [
  { name: 'Default', value: 'inherit' },
  { name: 'Charcoal', value: '#374151' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Yellow', value: '#eab308' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Purple', value: '#a855f7' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'White', value: '#ffffff' }
];

const HIGHLIGHT_COLORS = [
  { name: 'None', value: 'transparent' },
  { name: 'Yellow', value: '#fef08a' },
  { name: 'Green', value: '#bbf7d0' },
  { name: 'Blue', value: '#bfdbfe' },
  { name: 'Purple', value: '#e9d5ff' },
  { name: 'Pink', value: '#fbcfe8' },
  { name: 'Orange', value: '#fed7aa' }
];

const sanitizeHtmlForPaste = (html: string, isDarkMode: boolean): string => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  const allElements = doc.querySelectorAll('*');
  allElements.forEach((el) => {
    const styleAttr = el.getAttribute('style');
    if (styleAttr) {
      const styles = styleAttr.split(';').map(s => s.trim()).filter(Boolean);
      const cleanedStyles = styles.filter((style) => {
        const parts = style.split(':');
        const prop = parts[0]?.trim().toLowerCase();
        const val = parts.slice(1).join(':').trim().toLowerCase();
        if (!prop || !val) return false;
        
        // Remove background styling to prevent ugly block backgrounds
        if (prop === 'background-color' || prop === 'background') {
          return false;
        }
        
        // Remove color styling if it conflicts with readability in current theme
        if (prop === 'color') {
          if (isDarkMode) {
            // Strip out dark colors in dark mode (black, dark grays, dark blues, etc.)
            const isDarkColor = val === 'black' || 
              /^(#000|#111|#222|#333|#000000|#1f1f1f|#212529|#374151|#1e293b|#0f172a)/.test(val) ||
              /rgb\(\s*0\s*,\s*0\s*,\s*0\s*\)/.test(val) ||
              /rgb\(\s*31\s*,\s*31\s*,\s*31\s*\)/.test(val) ||
              /rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(,\s*[0-9.]+\s*)?\)/.test(val) && (
                (() => {
                  const m = val.match(/\d+/g);
                  if (m && m.length >= 3) {
                    const r = parseInt(m[0], 10);
                    const g = parseInt(m[1], 10);
                    const b = parseInt(m[2], 10);
                    return (r * 299 + g * 587 + b * 114) / 1000 < 120; // dark color threshold
                  }
                  return false;
                })()
              );
            return !isDarkColor;
          } else {
            // Strip out white or very light colors in light mode
            const isLightColor = val === 'white' || 
              /^(#fff|#eee|#ddd|#f8f9fa|#ffffff|#f3f4f6|#e5e7eb)/.test(val) ||
              /rgb\(\s*255\s*,\s*255\s*,\s*255\s*\)/.test(val) ||
              /rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(,\s*[0-9.]+\s*)?\)/.test(val) && (
                (() => {
                  const m = val.match(/\d+/g);
                  if (m && m.length >= 3) {
                    const r = parseInt(m[0], 10);
                    const g = parseInt(m[1], 10);
                    const b = parseInt(m[2], 10);
                    return (r * 299 + g * 587 + b * 114) / 1000 > 180; // light color threshold
                  }
                  return false;
                })()
              );
            return !isLightColor;
          }
        }
        return true;
      });
      
      if (cleanedStyles.length > 0) {
        el.setAttribute('style', cleanedStyles.join('; ') + ';');
      } else {
        el.removeAttribute('style');
      }
    }
    
    // Clean old font tags
    if (el.tagName.toLowerCase() === 'font') {
      el.removeAttribute('color');
      el.removeAttribute('face');
      el.removeAttribute('size');
    }
  });

  return doc.body.innerHTML;
};

export const NotesView: React.FC = () => {
  const { currentUser } = useAuth();
  const { themeMode } = useTheme();
  const [notes, setNotes] = useState<PersonalNote[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedNote, setSelectedNote] = useState<PersonalNote | null>(null);
  const [showSidebarOnMobile, setShowSidebarOnMobile] = useState(true);

  // Editor states
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<NoteCategory>('general');
  const [leadId, setLeadId] = useState('');

  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('all');
  const [successMsg, setSuccessMsg] = useState(false);

  // Rich Text Editor states
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const [openMenu, setOpenMenu] = useState<'font' | 'size' | 'color' | 'highlight' | null>(null);
  const [currentFont, setCurrentFont] = useState('Inter');
  const [currentSize, setCurrentSize] = useState('16px');

  const selectedNoteRef = useRef<PersonalNote | null>(null);
  useEffect(() => {
    selectedNoteRef.current = selectedNote;
  }, [selectedNote]);

  const fetchNotesAndLeads = async () => {
    const data = await dbClient.getPersonalNotes();
    setNotes(data);

    const leadsData = await dbClient.getLeads();
    setLeads(leadsData);

    // Default select first note if none selected and notes exist
    if (data.length > 0 && !selectedNoteRef.current) {
      handleSelectNote(data[0]);
    }
  };

  useEffect(() => {
    fetchNotesAndLeads();

    const unsubscribe = dbClient.subscribe((table) => {
      if (table === 'personal_notes' || table === 'leads') {
        fetchNotesAndLeads();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [currentUser]);

  // Sync editor content editable div only when the active note ID changes
  useEffect(() => {
    if (editorRef.current && selectedNote) {
      let contentHtml = selectedNote.content || '';
      // If content contains newlines but no HTML tags, convert newlines to <br> for rich text
      if (contentHtml && !/<[a-z][\s\S]*>/i.test(contentHtml)) {
        contentHtml = contentHtml.replace(/\n/g, '<br>');
      }
      editorRef.current.innerHTML = contentHtml;
      // Try to parse font/size from first element or reset default
      setCurrentFont('Inter');
      setCurrentSize('16px');
    }
  }, [activeNoteId]);

  const handleSelectNote = (note: PersonalNote) => {
    setSelectedNote(note);
    setTitle(note.title);
    setContent(note.content);
    setCategory(note.category);
    setLeadId(note.lead_id || '');
    setActiveNoteId(note.id);
    setShowSidebarOnMobile(false);
  };

  const handleCreateNewNote = async () => {
    try {
      const newNote = await dbClient.createPersonalNote({
        title: 'Untitled Scratch Note',
        content: '',
        category: 'general',
      });
      await fetchNotesAndLeads();
      handleSelectNote(newNote);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveField = async (fields: { title?: string; content?: string; category?: NoteCategory; leadId?: string }) => {
    if (!selectedNoteRef.current) return;

    const newTitle = fields.title !== undefined ? fields.title : title;
    const newContent = fields.content !== undefined ? fields.content : (editorRef.current ? editorRef.current.innerHTML : content);
    const newCategory = fields.category !== undefined ? fields.category : category;
    const newLeadId = fields.leadId !== undefined ? fields.leadId : leadId;

    if (
      newTitle.trim() === selectedNoteRef.current.title &&
      newContent === selectedNoteRef.current.content &&
      newCategory === selectedNoteRef.current.category &&
      (newLeadId || undefined) === selectedNoteRef.current.lead_id
    ) {
      return; // No change, skip save
    }

    try {
      const updated = await dbClient.updatePersonalNote(selectedNoteRef.current.id, {
        title: newTitle.trim() || 'Untitled Scratch Note',
        content: newContent,
        category: newCategory,
        lead_id: newLeadId || undefined,
      });
      await fetchNotesAndLeads();
      setSelectedNote(updated);
      setSuccessMsg(true);
      setTimeout(() => setSuccessMsg(false), 2000);
    } catch (err: any) {
      console.error('Failed to auto-save scratch note:', err);
    }
  };

  const handleSaveNote = async () => {
    await handleSaveField({});
    triggerConfetti();
  };

  const handleDeleteNote = async () => {
    if (!selectedNote) return;
    if (!window.confirm('Are you sure you want to delete this scratch note?')) return;

    try {
      await dbClient.deletePersonalNote(selectedNote.id);
      setSelectedNote(null);
      setTitle('');
      setContent('');
      setCategory('general');
      setLeadId('');
      setActiveNoteId(null);
      setShowSidebarOnMobile(true);
      await fetchNotesAndLeads();
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditorInput = () => {
    if (editorRef.current) {
      setContent(editorRef.current.innerHTML);
    }
  };

  const execCmd = (command: string, value: string = '') => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      editorRef.current.focus();
    }
    handleEditorInput();
    setOpenMenu(null);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const html = e.clipboardData.getData('text/html');
    const text = e.clipboardData.getData('text/plain');

    let contentToInsert = '';

    if (html) {
      contentToInsert = sanitizeHtmlForPaste(html, themeMode === 'dark');
    } else if (text) {
      contentToInsert = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br>');
    }

    if (contentToInsert) {
      const selection = window.getSelection();
      if (!selection || !selection.rangeCount) return;
      
      const range = selection.getRangeAt(0);
      range.deleteContents();

      const el = document.createElement('div');
      el.innerHTML = contentToInsert;
      
      const frag = document.createDocumentFragment();
      let node;
      let lastNode;
      while ((node = el.firstChild)) {
        lastNode = frag.appendChild(node);
      }
      
      range.insertNode(frag);
      
      if (lastNode) {
        const newRange = range.cloneRange();
        newRange.setStartAfter(lastNode);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);
      }
      
      handleEditorInput();
    }
  };

  const categories: { value: string; label: string }[] = [
    { value: 'all', label: 'All Notes' },
    { value: 'email_template', label: '📩 Email Templates' },
    { value: 'call_script', label: '📞 Call Scripts' },
    { value: 'meeting_note', label: '📝 Meeting Notes' },
    { value: 'draft', label: '✏️ Drafts' },
    { value: 'general', label: '📋 General' },
  ];

  const getFilteredNotes = () => {
    if (activeCategoryFilter === 'all') return notes;
    return notes.filter((n) => n.category === activeCategoryFilter);
  };

  const filteredNotes = getFilteredNotes();

  // Close menus on click outside
  useEffect(() => {
    const handleOutsideClick = () => {
      setOpenMenu(null);
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden bg-background">
      {/* Left Rail: Notes Directory */}
      <div className={`w-full md:w-64 border-r border-border bg-card flex flex-col flex-shrink-0 ${showSidebarOnMobile ? 'flex' : 'hidden md:flex'}`}>
        <div className="p-3 border-b border-border flex items-center justify-between">
          <span className="text-xs font-bold text-foreground uppercase tracking-wider">Scratchpad</span>
          <button
            onClick={handleCreateNewNote}
            className="p-1 hover:bg-muted text-primary rounded cursor-pointer"
            title="Create new note"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {/* Category Filters */}
        <div className="p-2 border-b border-border space-y-0.5">
          {categories.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setActiveCategoryFilter(cat.value)}
              className={`w-full text-left px-2 py-1.5 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                activeCategoryFilter === cat.value
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Notes Listings */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredNotes.length === 0 ? (
            <p className="text-[10px] text-muted-foreground text-center py-6">No notes found.</p>
          ) : (
            filteredNotes.map((note) => (
              <button
                key={note.id}
                onClick={() => handleSelectNote(note)}
                className={`w-full text-left px-2 py-2 rounded text-xs transition-colors flex items-center gap-2 cursor-pointer ${
                  selectedNote?.id === note.id
                    ? 'bg-primary/10 text-primary font-bold'
                    : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                }`}
              >
                <FileText className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                <span className="truncate flex-1">{note.title || 'Untitled Scratch Note'}</span>
                <ChevronRight className="h-3 w-3 opacity-40" />
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right Rail: Editor Panel */}
      <div className={`flex-1 flex flex-col h-full bg-background min-w-0 ${!showSidebarOnMobile ? 'flex' : 'hidden md:flex'}`}>
        {selectedNote ? (
          <div className="flex-1 flex flex-col h-full overflow-hidden p-4 sm:p-6 space-y-4">
            {/* Editor Header Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
              <div className="flex-1 min-w-0 flex items-center">
                <button
                  type="button"
                  onClick={() => setShowSidebarOnMobile(true)}
                  className="md:hidden p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg transition-colors cursor-pointer mr-2 flex-shrink-0"
                  title="Back to list"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={() => handleSaveField({ title })}
                  placeholder="Untitled Scratch Note"
                  className="w-full text-base sm:text-lg font-bold bg-transparent border-none text-foreground focus:outline-none placeholder-muted-foreground/60"
                />
              </div>

              <div className="flex items-center gap-2">
                {successMsg && (
                  <span className="animate-fade-in text-[10px] text-success bg-success/10 border border-success/20 px-2 py-1 rounded font-medium">
                    Saved Note
                  </span>
                )}
                <button
                  onClick={handleSaveNote}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary/95 text-primary-foreground rounded text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                  title="Save scratch notes"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>Save</span>
                </button>
                <button
                  onClick={handleDeleteNote}
                  className="p-1.5 bg-muted hover:bg-danger/10 text-muted-foreground hover:text-danger border border-border rounded transition-colors cursor-pointer"
                  title="Delete scratch notes"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Note Meta Options (Category & Lead Linkage) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-muted/20 border border-border/60 p-3 rounded-lg text-xs">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground font-semibold w-20 flex-shrink-0">Category:</span>
                <select
                  value={category}
                  onChange={(e) => {
                    const val = e.target.value as NoteCategory;
                    setCategory(val);
                    handleSaveField({ category: val });
                  }}
                  className="bg-card border border-border text-foreground px-2 py-1 rounded text-xs focus:outline-none focus:border-primary cursor-pointer flex-1"
                >
                  <option value="general">📋 General Note</option>
                  <option value="email_template">📩 Email Template</option>
                  <option value="call_script">📞 Call Script</option>
                  <option value="meeting_note">📝 Meeting Note</option>
                  <option value="draft">✏️ Draft Copy</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-muted-foreground font-semibold w-20 flex-shrink-0">Link to Project:</span>
                <select
                  value={leadId}
                  onChange={(e) => {
                    const val = e.target.value;
                    setLeadId(val);
                    handleSaveField({ leadId: val });
                  }}
                  className="bg-card border border-border text-foreground px-2 py-1 rounded text-xs focus:outline-none focus:border-primary cursor-pointer flex-1"
                >
                  <option value="">No link...</option>
                  {leads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.company_name} ({l.prospect_name})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Text Formatting Toolbar */}
            <div className="flex items-center gap-1 bg-card border border-border p-2 rounded-lg text-xs shadow-sm z-10 w-full overflow-x-auto scrollbar-none flex-nowrap md:flex-wrap flex-shrink-0">
              {/* Font Family Dropdown */}
              <div className="relative flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => setOpenMenu(openMenu === 'font' ? null : 'font')}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-muted/50 hover:bg-muted text-foreground border border-border rounded text-[11px] font-semibold cursor-pointer min-w-32 max-w-40 justify-between flex-shrink-0"
                  title="Choose Font Style"
                >
                  <span className="truncate" style={{ fontFamily: FONTS.find(f => f.name === currentFont)?.value || 'sans-serif' }}>
                    {currentFont}
                  </span>
                  <ChevronDown className="h-3 w-3 opacity-60 flex-shrink-0" />
                </button>
                {openMenu === 'font' && (
                  <div className="absolute left-0 mt-1 w-56 max-h-64 overflow-y-auto bg-card border border-border rounded-lg shadow-xl py-1 z-30">
                    {FONTS.map((font) => (
                      <button
                        key={font.name}
                        type="button"
                        onClick={() => {
                          setCurrentFont(font.name);
                          execCmd('fontName', font.value);
                        }}
                        style={{ fontFamily: font.value }}
                        className={`w-full text-left px-3 py-1.5 text-xs hover:bg-muted text-foreground transition-colors cursor-pointer flex items-center justify-between ${
                          currentFont === font.name ? 'bg-primary/10 text-primary font-bold' : ''
                        }`}
                      >
                        <span>{font.name}</span>
                        <span className="text-[10px] text-muted-foreground opacity-50">Abc</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Font Size Dropdown */}
              <div className="relative flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => setOpenMenu(openMenu === 'size' ? null : 'size')}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-muted/50 hover:bg-muted text-foreground border border-border rounded text-[11px] font-semibold cursor-pointer min-w-20 justify-between flex-shrink-0"
                  title="Font Size"
                >
                  <span>{currentSize}</span>
                  <ChevronDown className="h-3 w-3 opacity-60 flex-shrink-0" />
                </button>
                {openMenu === 'size' && (
                  <div className="absolute left-0 mt-1 w-28 bg-card border border-border rounded-lg shadow-xl py-1 z-30">
                    {SIZES.map((size) => (
                      <button
                        key={size.label}
                        type="button"
                        onClick={() => {
                          setCurrentSize(size.label);
                          execCmd('fontSize', size.value);
                        }}
                        className={`w-full text-left px-3 py-1.5 text-xs hover:bg-muted text-foreground cursor-pointer ${
                          currentSize === size.label ? 'bg-primary/10 text-primary font-bold' : ''
                        }`}
                      >
                        {size.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="h-6 w-px bg-border mx-1 flex-shrink-0" />

              {/* Basic Styles */}
              <button
                type="button"
                onClick={() => execCmd('bold')}
                className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded cursor-pointer flex-shrink-0"
                title="Bold (Ctrl+B)"
              >
                <Bold className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => execCmd('italic')}
                className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded cursor-pointer flex-shrink-0"
                title="Italic (Ctrl+I)"
              >
                <Italic className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => execCmd('underline')}
                className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded cursor-pointer flex-shrink-0"
                title="Underline (Ctrl+U)"
              >
                <Underline className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => execCmd('strikeThrough')}
                className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded cursor-pointer flex-shrink-0"
                title="Strikethrough"
              >
                <Strikethrough className="h-4 w-4" />
              </button>

              <div className="h-6 w-px bg-border mx-1 flex-shrink-0" />

              {/* Text Color dropdown */}
              <div className="relative flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => setOpenMenu(openMenu === 'color' ? null : 'color')}
                  className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded cursor-pointer flex items-center gap-0.5 flex-shrink-0"
                  title="Text Color"
                >
                  <Palette className="h-4 w-4" />
                  <ChevronDown className="h-2 w-2 opacity-60 flex-shrink-0" />
                </button>
                {openMenu === 'color' && (
                  <div className="absolute left-0 mt-1 p-2 bg-card border border-border rounded-lg shadow-xl z-30 grid grid-cols-4 gap-1.5 w-40">
                    {TEXT_COLORS.map((color) => (
                      <button
                        key={color.name}
                        type="button"
                        onClick={() => execCmd('foreColor', color.value)}
                        style={{ backgroundColor: color.value === 'inherit' ? 'transparent' : color.value }}
                        className={`h-6 w-6 rounded-full border border-border/80 hover:scale-110 transition-transform cursor-pointer flex items-center justify-center`}
                        title={color.name}
                      >
                        {color.value === 'inherit' && <Eraser className="h-3 w-3 text-foreground" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Highlight dropdown */}
              <div className="relative flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => setOpenMenu(openMenu === 'highlight' ? null : 'highlight')}
                  className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded cursor-pointer flex items-center gap-0.5 flex-shrink-0"
                  title="Highlight Text"
                >
                  <Highlighter className="h-4 w-4" />
                  <ChevronDown className="h-2 w-2 opacity-60 flex-shrink-0" />
                </button>
                {openMenu === 'highlight' && (
                  <div className="absolute left-0 mt-1 p-2 bg-card border border-border rounded-lg shadow-xl z-30 grid grid-cols-4 gap-1.5 w-40">
                    {HIGHLIGHT_COLORS.map((color) => (
                      <button
                        key={color.name}
                        type="button"
                        onClick={() => execCmd('hiliteColor', color.value)}
                        style={{ backgroundColor: color.value === 'transparent' ? 'transparent' : color.value }}
                        className={`h-6 w-6 rounded-full border border-border/80 hover:scale-110 transition-transform cursor-pointer flex items-center justify-center`}
                        title={color.name}
                      >
                        {color.value === 'transparent' && <Eraser className="h-3 w-3 text-foreground" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="h-6 w-px bg-border mx-1 flex-shrink-0" />

              {/* Alignments */}
              <button
                type="button"
                onClick={() => execCmd('justifyLeft')}
                className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded cursor-pointer flex-shrink-0"
                title="Align Left"
              >
                <AlignLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => execCmd('justifyCenter')}
                className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded cursor-pointer flex-shrink-0"
                title="Align Center"
              >
                <AlignCenter className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => execCmd('justifyRight')}
                className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded cursor-pointer flex-shrink-0"
                title="Align Right"
              >
                <AlignRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => execCmd('justifyFull')}
                className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded cursor-pointer flex-shrink-0"
                title="Justify"
              >
                <AlignJustify className="h-4 w-4" />
              </button>

              <div className="h-6 w-px bg-border mx-1 flex-shrink-0" />

              {/* Lists */}
              <button
                type="button"
                onClick={() => execCmd('insertUnorderedList')}
                className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded cursor-pointer flex-shrink-0"
                title="Bullet List"
              >
                <List className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => execCmd('insertOrderedList')}
                className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded cursor-pointer flex-shrink-0"
                title="Numbered List"
              >
                <ListOrdered className="h-4 w-4" />
              </button>

              <div className="h-6 w-px bg-border mx-1 flex-shrink-0" />

              {/* History */}
              <button
                type="button"
                onClick={() => execCmd('undo')}
                className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded cursor-pointer flex-shrink-0"
                title="Undo"
              >
                <Undo2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => execCmd('redo')}
                className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded cursor-pointer flex-shrink-0"
                title="Redo"
              >
                <Redo2 className="h-4 w-4" />
              </button>

              <div className="h-6 w-px bg-border mx-1 flex-shrink-0" />

              {/* Clear Formatting */}
              <button
                type="button"
                onClick={() => execCmd('removeFormat')}
                className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded cursor-pointer flex-shrink-0"
                title="Clear Formatting"
              >
                <Eraser className="h-4 w-4" />
              </button>
            </div>

            {/* Note Editor Body */}
            <div className="flex-1 flex flex-col min-h-0 border border-border rounded-lg bg-card focus-within:border-primary overflow-hidden">
              <div className="px-3 py-1.5 border-b border-border bg-muted/10 text-[10px] text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 text-primary animate-pulse" />
                <span>Reps Workspace Scratchpad: Copy-paste rich text, edit styles, select fonts, or clean up templates.</span>
              </div>
              
              <div
                ref={editorRef}
                contentEditable
                onInput={handleEditorInput}
                onPaste={handlePaste}
                onBlur={() => handleSaveField({ content: editorRef.current?.innerHTML || '' })}
                {...{ placeholder: "Start writing sales template, playbooks, or call scripts..." }}
                className="flex-1 w-full p-4 bg-transparent text-foreground text-xs sm:text-sm focus:outline-none overflow-y-auto leading-relaxed font-sans editor-content"
                style={{ outline: 'none' }}
              />
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-xs text-muted-foreground">
            <FileText className="h-10 w-10 text-muted-foreground/30 mb-2" />
            <p className="font-semibold">No Note Selected</p>
            <p className="text-[10px] mt-1">Select an existing scratchpad template or create a new one.</p>
            <button
              onClick={handleCreateNewNote}
              className="mt-3 px-3 py-1.5 bg-primary hover:bg-primary/95 text-primary-foreground rounded font-semibold text-[10px] transition-colors cursor-pointer"
            >
              New Scratch Note
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const triggerConfetti = () => {
  const canvas = document.createElement('canvas');
  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '9999';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const particles: any[] = [];
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  for (let i = 0; i < 150; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      r: Math.random() * 6 + 4,
      d: Math.random() * canvas.height,
      color: colors[Math.floor(Math.random() * colors.length)],
      tilt: Math.random() * 10 - 5,
      tiltAngleIncremental: Math.random() * 0.07 + 0.02,
      tiltAngle: 0,
    });
  }

  const handleResize = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };
  window.addEventListener('resize', handleResize);

  const draw = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let remaining = 0;

    particles.forEach((p) => {
      p.tiltAngle += p.tiltAngleIncremental;
      p.y += (Math.cos(p.d) + 3 + p.r / 2) / 2;
      p.x += Math.sin(p.tiltAngle);
      p.tilt = Math.sin(p.tiltAngle - p.r / 2) * 5;

      if (p.y <= canvas.height) {
        remaining++;
      }

      ctx.beginPath();
      ctx.lineWidth = p.r;
      ctx.strokeStyle = p.color;
      ctx.moveTo(p.x + p.tilt + p.r / 2, p.y);
      ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 2);
      ctx.stroke();
    });

    if (remaining > 0) {
      requestAnimationFrame(draw);
    } else {
      window.removeEventListener('resize', handleResize);
      if (document.body.contains(canvas)) {
        document.body.removeChild(canvas);
      }
    }
  };

  draw();
};
