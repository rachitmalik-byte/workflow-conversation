import React, { useState, useEffect } from 'react';
import { dbClient } from '../../services/dbClient';
import { useAuth } from '../../context/AuthContext';
import type { PersonalNote, NoteCategory, Lead } from '../../types/database';
import { Plus, Trash2, FileText, ChevronRight, Save, Sparkles } from 'lucide-react';

export const NotesView: React.FC = () => {
  const { currentUser } = useAuth();
  const [notes, setNotes] = useState<PersonalNote[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedNote, setSelectedNote] = useState<PersonalNote | null>(null);

  // Editor states
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<NoteCategory>('general');
  const [leadId, setLeadId] = useState('');

  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('all');
  const [successMsg, setSuccessMsg] = useState(false);

  const fetchNotesAndLeads = async () => {
    const data = await dbClient.getPersonalNotes();
    setNotes(data);

    const leadsData = await dbClient.getLeads();
    setLeads(leadsData);

    // Default select first note if none selected and notes exist
    if (data.length > 0 && !selectedNote) {
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

  const handleSelectNote = (note: PersonalNote) => {
    setSelectedNote(note);
    setTitle(note.title);
    setContent(note.content);
    setCategory(note.category);
    setLeadId(note.lead_id || '');
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

  const handleSaveNote = async () => {
    if (!selectedNote) return;

    try {
      const updated = await dbClient.updatePersonalNote(selectedNote.id, {
        title: title.trim() || 'Untitled Scratch Note',
        content,
        category,
        lead_id: leadId || undefined,
      });
      await fetchNotesAndLeads();
      setSelectedNote(updated);
      setSuccessMsg(true);
      setTimeout(() => setSuccessMsg(false), 2000);
    } catch (err) {
      console.error(err);
    }
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
      await fetchNotesAndLeads();
    } catch (err) {
      console.error(err);
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

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden bg-background">
      {/* Left Rail: Notes Directory */}
      <div className="w-56 sm:w-64 border-r border-border bg-card flex flex-col flex-shrink-0">
        <div className="p-3 border-b border-border flex items-center justify-between">
          <span className="text-xs font-bold text-foreground uppercase tracking-wider">Scratchpad</span>
          <button
            onClick={handleCreateNewNote}
            className="p-1 hover:bg-muted text-primary rounded"
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
              className={`w-full text-left px-2 py-1.5 rounded text-[11px] font-semibold transition-colors ${
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
                className={`w-full text-left px-2 py-2 rounded text-xs transition-colors flex items-center gap-2 ${
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
      <div className="flex-1 flex flex-col h-full bg-background">
        {selectedNote ? (
          <div className="flex-1 flex flex-col h-full overflow-hidden p-4 sm:p-6 space-y-4">
            {/* Editor Header Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
              <div className="flex-1 min-w-0">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Untitled Scratch Note"
                  className="w-full text-base sm:text-lg font-bold bg-transparent border-none text-foreground focus:outline-none placeholder-muted-foreground/60"
                />
              </div>

              <div className="flex items-center gap-2">
                {successMsg && (
                  <span className="text-[10px] text-success bg-success/10 border border-success/20 px-2 py-1 rounded font-medium">
                    Saved Note
                  </span>
                )}
                <button
                  onClick={handleSaveNote}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary/95 text-white rounded text-xs font-semibold shadow-sm transition-colors cursor-pointer"
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
                  onChange={(e) => setCategory(e.target.value as NoteCategory)}
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
                <span className="text-muted-foreground font-semibold w-20 flex-shrink-0">Link to Lead:</span>
                <select
                  value={leadId}
                  onChange={(e) => setLeadId(e.target.value)}
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

            {/* Note Textarea */}
            <div className="flex-1 flex flex-col min-h-0 border border-border rounded-lg bg-card focus-within:border-primary">
              <div className="px-3 py-1.5 border-b border-border bg-muted/10 text-[10px] text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 text-primary animate-pulse" />
                <span>Reps Workspace Scratchpad: Jot outbound draft sequences, copy templates, or notes.</span>
              </div>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Start writing sales template, playbooks, or call scripts..."
                className="flex-1 w-full p-4 bg-transparent border-none text-foreground text-xs sm:text-sm focus:outline-none resize-none leading-relaxed font-sans"
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
              className="mt-3 px-3 py-1.5 bg-primary hover:bg-primary/95 text-white rounded font-semibold text-[10px] transition-colors"
            >
              New Scratch Note
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
