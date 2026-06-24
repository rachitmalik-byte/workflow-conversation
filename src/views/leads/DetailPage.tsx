import React, { useState, useEffect, useRef } from 'react';
import { dbClient } from '../../services/dbClient';
import { useAuth } from '../../context/AuthContext';
import type { Lead, LeadUpdate, LeadAttachment, LeadStatus, LeadPriority, PersonalNote } from '../../types/database';
import {
  ArrowLeft, Edit, Trash2, Send, Paperclip, Calendar, Building, Phone, Mail,
  Link, AlertTriangle, Loader2, Eye, EyeOff, Bold, Italic, Code, List, Check
} from 'lucide-react';
import { MentionTextArea } from '../../components/ui/MentionInput';

interface DetailPageProps {
  leadId: string;
  onNavigate: (view: string) => void;
}

export const DetailPage: React.FC<DetailPageProps> = ({ leadId, onNavigate }) => {
  const { currentUser, profiles } = useAuth();

  const [activeMobilePane, setActiveMobilePane] = useState<'details' | 'chat'>('details');
  const [isDesktop, setIsDesktop] = useState(typeof window !== 'undefined' ? window.innerWidth >= 1024 : true);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [lead, setLead] = useState<Lead | null>(null);
  const [updates, setUpdates] = useState<LeadUpdate[]>([]);
  const [attachments, setAttachments] = useState<LeadAttachment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [linkedNotes, setLinkedNotes] = useState<PersonalNote[]>([]);

  const [updateText, setUpdateText] = useState('');
  const [attachFileName, setAttachFileName] = useState('');
  const [isAttaching, setIsAttaching] = useState(false);

  const [notesValue, setNotesValue] = useState('');
  const [replyValue, setReplyValue] = useState('');
  const [proposalValue, setProposalValue] = useState('');

  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [isSavingReply, setIsSavingReply] = useState(false);
  const [isSavingProposal, setIsSavingProposal] = useState(false);

  const [savedNotes, setSavedNotes] = useState(false);
  const [savedReply, setSavedReply] = useState(false);
  const [savedProposal, setSavedProposal] = useState(false);

  const [chatDragOver, setChatDragOver] = useState(false);
  const [chatWidth, setChatWidth] = useState(380);
  const [activeReactionPickerId, setActiveReactionPickerId] = useState<string | null>(null);
  const isResizingRef = useRef(false);

  const startResizing = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizingRef.current = true;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizingRef.current) return;
    const newWidth = window.innerWidth - e.clientX;
    if (newWidth > 280 && newWidth < 600) {
      setChatWidth(newWidth);
    }
  };

  const handleMouseUp = () => {
    isResizingRef.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const notesTextareaRef = useRef<HTMLTextAreaElement>(null);
  const replyTextareaRef = useRef<HTMLTextAreaElement>(null);
  const proposalTextareaRef = useRef<HTMLTextAreaElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const adjustHeight = (textarea: HTMLTextAreaElement | null) => {
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  };

  useEffect(() => {
    if (lead) {
      setTimeout(() => {
        adjustHeight(notesTextareaRef.current);
        adjustHeight(replyTextareaRef.current);
        adjustHeight(proposalTextareaRef.current);
      }, 100);
    }
  }, [lead]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [updates]);

  const fetchLeadData = async () => {
    try {
      const leadData = await dbClient.getLeadById(leadId);
      if (!leadData) { setError('Lead not found or access denied.'); return; }
      setLead(leadData);
      if (document.activeElement !== notesTextareaRef.current) setNotesValue(leadData.notes || '');
      if (document.activeElement !== replyTextareaRef.current) setReplyValue(leadData.reply_received || '');
      if (document.activeElement !== proposalTextareaRef.current) setProposalValue(leadData.proposal_sent || '');
      const updatesData = await dbClient.getLeadUpdates(leadId);
      setUpdates(updatesData);
      const attachmentsData = await dbClient.getLeadAttachments(leadId);
      setAttachments(attachmentsData);
      const notesData = await dbClient.getPersonalNotes();
      setLinkedNotes(notesData.filter((n) => n.lead_id === leadId));
    } catch (err: any) {
      setError(err.message || 'Failed to load details.');
    }
  };

  const handleToggleHide = async () => {
    if (!lead || !currentUser) return;
    const isHidden = lead.hidden_by?.includes(currentUser.id);
    let updatedHiddenBy = lead.hidden_by || [];
    updatedHiddenBy = isHidden
      ? updatedHiddenBy.filter((id) => id !== currentUser.id)
      : [...updatedHiddenBy, currentUser.id];
    try { await dbClient.updateLead(lead.id, { hidden_by: updatedHiddenBy }); await fetchLeadData(); }
    catch (err: any) { alert(err.message || 'Failed to update visibility.'); }
  };

  useEffect(() => {
    setIsLoading(true);
    fetchLeadData().then(() => setIsLoading(false));
    const unsubscribe = dbClient.subscribe((table, type, payload) => {
      if (table === 'leads' && payload.id === leadId) {
        if (type === 'update') fetchLeadData();
        else if (type === 'delete') { setError('This lead has been deleted.'); setLead(null); }
      }
      if (table === 'lead_updates' && payload.lead_id === leadId) fetchLeadData();
      if (table === 'lead_attachments' && payload.lead_id === leadId) fetchLeadData();
    });
    return () => unsubscribe();
  }, [leadId]);

  const handleStatusChange = async (newStatus: LeadStatus) => {
    if (!lead) return;
    try {
      await dbClient.updateLead(lead.id, { status: newStatus });
      if (newStatus === 'closed_won') {
        triggerConfetti();
      }
      await fetchLeadData();
    }
    catch (err: any) { alert(err.message || 'Failed to update status.'); }
  };

  const handlePriorityChange = async (newPriority: LeadPriority) => {
    if (!lead) return;
    try { await dbClient.updateLead(lead.id, { priority: newPriority }); await fetchLeadData(); }
    catch (err: any) { alert(err.message || 'Failed to update priority.'); }
  };

  const handleAttachFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead || !attachFileName.trim()) return;
    setIsAttaching(true);
    try { await dbClient.addLeadAttachment(lead.id, attachFileName.trim()); setAttachFileName(''); await fetchLeadData(); }
    catch (err: any) { alert(err.message || 'Failed to attach file.'); }
    finally { setIsAttaching(false); }
  };

  const handleSaveField = async (field: 'notes' | 'reply_received' | 'proposal_sent', value: string) => {
    if (!lead) return;
    const original = field === 'notes' ? lead.notes : field === 'reply_received' ? lead.reply_received : lead.proposal_sent;
    if ((original || '') === value.trim()) return;

    if (field === 'notes') setIsSavingNotes(true);
    if (field === 'reply_received') setIsSavingReply(true);
    if (field === 'proposal_sent') setIsSavingProposal(true);

    try {
      const upd: any = { [field]: value.trim() };
      if (field === 'reply_received') upd.tags = value.trim() ? ['reply_received'] : [];
      await dbClient.updateLead(lead.id, upd);
      if (field === 'notes') { setSavedNotes(true); setTimeout(() => setSavedNotes(false), 2000); }
      if (field === 'reply_received') { setSavedReply(true); setTimeout(() => setSavedReply(false), 2000); }
      if (field === 'proposal_sent') { setSavedProposal(true); setTimeout(() => setSavedProposal(false), 2000); }
      triggerConfetti();
      await fetchLeadData();
    } catch (err: any) {
      alert(err.message || `Failed to save ${field}`);
    } finally {
      if (field === 'notes') setIsSavingNotes(false);
      if (field === 'reply_received') setIsSavingReply(false);
      if (field === 'proposal_sent') setIsSavingProposal(false);
    }
  };

  const insertFormatting = (field: 'notes' | 'reply' | 'proposal', prefix: string, suffix = '') => {
    const textarea = field === 'notes' ? notesTextareaRef.current : field === 'reply' ? replyTextareaRef.current : proposalTextareaRef.current;
    if (!textarea) return;
    const { selectionStart: start, selectionEnd: end, value: text } = textarea;
    const selected = text.substring(start, end);
    const newValue = text.substring(0, start) + prefix + selected + suffix + text.substring(end);
    if (field === 'notes') setNotesValue(newValue);
    else if (field === 'reply') setReplyValue(newValue);
    else setProposalValue(newValue);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
      adjustHeight(textarea);
    }, 0);
  };

  const handlePasteFormatting = (e: React.ClipboardEvent<HTMLTextAreaElement>, field: 'notes' | 'reply' | 'proposal') => {
    const html = e.clipboardData.getData('text/html');
    const plainText = e.clipboardData.getData('text/plain');
    
    e.preventDefault();
    let text = '';
    
    if (html) {
      // Convert HTML tags to markdown
      text = html
        // Handle list items
        .replace(/<li[^>]*>(.*?)<\/li>/gi, '\n- $1')
        .replace(/<ol[^>]*>|<\/ol>|<ul[^>]*>|<\/ul>/gi, '')
        // Convert block elements to newlines
        .replace(/<\/p>|<\/div>|<\/h[1-6]>|<\/tr>|<\/li>/gi, '\n')
        .replace(/<br\s*\/?>/gi, '\n')
        // Bold, italic, code
        .replace(/<(strong|b)[^>]*>(.*?)<\/\1>/gi, '**$2**')
        .replace(/<(em|i)[^>]*>(.*?)<\/\1>/gi, '*$2*')
        .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
        // Strip remaining HTML tags
        .replace(/<[^>]*>/g, '');
        
      // Decode HTML entities
      text = text
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
    } else {
      text = plainText;
    }
    
    text = text.trim();
    
    const ta = e.currentTarget;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const val = ta.value;
    
    // Insert at cursor position
    const newValue = val.substring(0, start) + text + val.substring(end);
    
    if (field === 'notes') setNotesValue(newValue);
    else if (field === 'reply') setReplyValue(newValue);
    else setProposalValue(newValue);
    
    setTimeout(() => {
      adjustHeight(ta);
      ta.focus();
      const newCursorPos = start + text.length;
      ta.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, field: 'notes' | 'reply' | 'proposal') => {
    if (e.ctrlKey || e.metaKey) {
      const k = e.key.toLowerCase();
      if (k === 'b') { e.preventDefault(); insertFormatting(field, '**', '**'); }
      else if (k === 'i') { e.preventDefault(); insertFormatting(field, '*', '*'); }
      else if (k === '`') { e.preventDefault(); insertFormatting(field, '`', '`'); }
      else if (k === 'l') { e.preventDefault(); insertFormatting(field, '\n- ', ''); }
    }
  };

  const handleChatKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handlePostUpdateChat(); }
  };

  const handlePostUpdateChat = async () => {
    if (!lead || !updateText.trim()) return;
    try { await dbClient.createLeadUpdate(lead.id, updateText.trim()); setUpdateText(''); await fetchLeadData(); }
    catch (err: any) { alert(err.message || 'Failed to post update.'); }
  };

  const handleToggleLeadUpdateReaction = async (updateId: string, emoji: string) => {
    try {
      await dbClient.toggleLeadUpdateReaction(updateId, emoji);
      await fetchLeadData();
    } catch (err: any) {
      alert(err.message || 'Failed to toggle reaction.');
    }
  };

  const handleChatPaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (!lead) return;
    for (let i = 0; i < e.clipboardData.items.length; i++) {
      const item = e.clipboardData.items[i];
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          const reader = new FileReader();
          reader.onload = async () => {
            if (typeof reader.result === 'string') {
              await dbClient.addLeadAttachment(lead.id, `Pasted_Image_${Date.now()}.png`);
              await fetchLeadData();
            }
          };
          reader.readAsDataURL(file);
        }
      }
    }
  };

  const handleChatDrop = async (e: React.DragEvent) => {
    if (!lead) return;
    e.preventDefault();
    setChatDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async () => {
        if (typeof reader.result === 'string') {
          await dbClient.addLeadAttachment(lead.id, file.name);
          await fetchLeadData();
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDelete = async () => {
    if (!lead) return;
    if (!window.confirm(`Delete project: ${lead.company_name}? This cannot be undone.`)) return;
    try { await dbClient.deleteLead(lead.id); onNavigate('leads'); }
    catch (err: any) { alert(err.message || 'Failed to delete project.'); }
  };

  const getProfileName = (uid: string) => profiles.find((p) => p.id === uid)?.full_name || 'Unknown';

  // ── Render ──────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex h-64 w-full flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
        <span className="text-sm text-muted-foreground font-medium">Loading project details...</span>
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="p-8 max-w-md mx-auto text-center">
        <div className="h-16 w-16 rounded-full bg-warning/10 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="h-8 w-8 text-warning" />
        </div>
        <h3 className="text-base font-bold text-foreground mb-2">Access Restricted</h3>
        <p className="text-sm text-muted-foreground">{error || 'This project does not exist.'}</p>
        <button
          onClick={() => onNavigate('leads')}
          className="mt-5 px-5 py-2.5 text-xs font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/95 transition-colors shadow-sm"
        >
          Return to Projects
        </button>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    new: 'bg-slate-100 dark:bg-slate-900/60 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800',
    contacted: 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 border-blue-200 dark:border-blue-900/50',
    qualified: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/50',
    proposal: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300 border-indigo-200 dark:border-indigo-900/50',
    negotiation: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-300 border-amber-200 dark:border-amber-900/50',
    closed_won: 'bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300 border-green-200 dark:border-green-900/50',
    closed_lost: 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-300 border-red-200 dark:border-red-900/50',
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ══ Frozen Header ══ */}
      <div className="flex-shrink-0 bg-background/96 backdrop-blur-md border-b border-border z-20 px-4 sm:px-6 py-3 shadow-sm">
        <div className="flex items-start sm:items-center justify-between gap-3 flex-col sm:flex-row">
          {/* Title block */}
          <div className="flex items-start gap-3 min-w-0">
            <button
              onClick={() => onNavigate('leads')}
              className="mt-0.5 flex-shrink-0 p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base font-extrabold text-foreground tracking-tight">{lead.company_name}</h1>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${statusColors[lead.status] || statusColors.new}`}>
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  {lead.status.replace('_', ' ')}
                </span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                  lead.priority === 'high' ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-300 border-red-200 dark:border-red-900/50' :
                  lead.priority === 'medium' ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-300 border-amber-200 dark:border-amber-900/50' :
                  'bg-slate-100 dark:bg-slate-900/60 text-slate-500 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                }`}>
                  {lead.priority}
                </span>
                {(lead.reply_received || lead.tags?.includes('reply_received')) && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-success/10 text-success border border-success/20">
                    <Check className="h-3 w-3" /> Reply
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                {lead.prospect_name}
                {lead.email && <> · <a href={`mailto:${lead.email}`} className="hover:text-primary transition-colors">{lead.email}</a></>}
                {lead.phone && ` · ${lead.phone}`}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {currentUser?.role === 'head' && (
              <button
                onClick={handleToggleHide}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-muted text-foreground border border-border rounded-lg hover:bg-muted/80 transition-colors"
              >
                {lead.hidden_by?.includes(currentUser.id) ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                <span className="hidden sm:inline">{lead.hidden_by?.includes(currentUser.id) ? 'Show' : 'Hide'}</span>
              </button>
            )}
            <button
              onClick={() => onNavigate(`leads/${lead.id}/edit`)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-primary/10 text-primary border border-primary/20 rounded-lg hover:bg-primary/15 transition-colors"
            >
              <Edit className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Edit</span>
            </button>
            <button
              onClick={handleDelete}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-danger/10 text-danger border border-danger/20 rounded-lg hover:bg-danger/15 transition-colors cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Delete</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Toggle Tabs */}
      <div className="flex border-b border-border bg-card lg:hidden flex-shrink-0">
        <button
          onClick={() => setActiveMobilePane('details')}
          className={`flex-1 text-center py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
            activeMobilePane === 'details'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Project Details
        </button>
        <button
          onClick={() => setActiveMobilePane('chat')}
          className={`flex-1 text-center py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer relative ${
            activeMobilePane === 'chat'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Activity Chat
          {updates.length > 0 && (
            <span className="ml-1.5 bg-muted px-1.5 py-0.2 rounded-full text-[9px]">
              {updates.filter(u => !u.content.startsWith('Status') && !u.content.includes('created') && !u.content.startsWith('Attached') && !u.content.startsWith('Project details')).length}
            </span>
          )}
        </button>
      </div>

      {/* ══ 2-Column Body ══ */}
      <div className="flex-1 overflow-hidden flex min-h-0">

        {/* Left: scrollable content */}
        <div className={`flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-4 min-w-0 ${activeMobilePane === 'details' ? 'block' : 'hidden lg:block'}`}>

          {/* Quick Triage */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Status</label>
              <select
                value={lead.status}
                onChange={(e) => handleStatusChange(e.target.value as LeadStatus)}
                className="w-full text-xs font-semibold bg-background border border-border text-foreground px-3 py-2 rounded-lg focus:outline-none focus:border-primary cursor-pointer transition-colors"
              >
                <option value="new">🆕 New</option>
                <option value="contacted">📞 Contacted</option>
                <option value="qualified">✅ Qualified</option>
                <option value="proposal">📝 Proposal</option>
                <option value="negotiation">🤝 Negotiation</option>
                <option value="closed_won">🎉 Closed Won</option>
                <option value="closed_lost">❌ Closed Lost</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Priority</label>
              <select
                value={lead.priority}
                onChange={(e) => handlePriorityChange(e.target.value as LeadPriority)}
                className="w-full text-xs font-semibold bg-background border border-border text-foreground px-3 py-2 rounded-lg focus:outline-none focus:border-primary cursor-pointer"
              >
                <option value="low">🟢 Low</option>
                <option value="medium">🟡 Medium</option>
                <option value="high">🔴 High</option>
              </select>
            </div>
          </div>

          {/* Contact Card */}
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="bg-muted/30 border-b border-border px-4 py-2.5 flex items-center gap-2">
              <Building className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-bold text-foreground">Contact Details</span>
            </div>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
              <InfoRow icon={<Mail className="h-3.5 w-3.5" />} label="Email">
                <a href={`mailto:${lead.email}`} className="text-primary hover:underline text-xs font-medium break-all">{lead.email || 'N/A'}</a>
              </InfoRow>
              <InfoRow icon={<Phone className="h-3.5 w-3.5" />} label="Phone">
                <span className="text-xs font-medium text-foreground">{lead.phone || 'N/A'}</span>
              </InfoRow>
              <InfoRow icon={<Building className="h-3.5 w-3.5" />} label="Company Type">
                <span className="text-xs font-medium text-foreground">{lead.company_type || 'N/A'}</span>
              </InfoRow>
              <InfoRow icon={<Calendar className="h-3.5 w-3.5" />} label="Industry">
                <span className="text-xs font-medium text-foreground">{lead.industry || 'N/A'}</span>
              </InfoRow>
              {lead.linkedin && (
                <InfoRow icon={<Link className="h-3.5 w-3.5" />} label="LinkedIn">
                  <a href={`https://${lead.linkedin}`} target="_blank" rel="noreferrer" className="text-primary hover:underline text-xs font-medium truncate block max-w-[200px]">{lead.linkedin}</a>
                </InfoRow>
              )}
              {lead.website && (
                <InfoRow icon={<Link className="h-3.5 w-3.5" />} label="Website">
                  <a href={`https://${lead.website}`} target="_blank" rel="noreferrer" className="text-primary hover:underline text-xs font-medium truncate block max-w-[200px]">{lead.website}</a>
                </InfoRow>
              )}
              {lead.service_needed && (
                <div className="sm:col-span-2 pt-1 border-t border-border/50">
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1.5">Service Needed</p>
                  <p className="text-xs text-foreground bg-muted/40 p-2.5 rounded-lg">{lead.service_needed}</p>
                </div>
              )}
            </div>
            {(lead.assigned_users || []).length > 0 && (
              <div className="border-t border-border px-4 py-3">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Assigned Team</p>
                <div className="flex flex-wrap gap-1.5">
                  {(lead.assigned_users || []).map((uid) => (
                    <span key={uid} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-medium text-primary">
                      <span className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center text-[9px] font-bold">
                        {getProfileName(uid).split(' ').map(n => n[0]).join('')}
                      </span>
                      {getProfileName(uid)}
                      {uid === lead.created_by && <span className="text-[9px] opacity-60 ml-0.5">· creator</span>}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Ref image */}
          {lead.ref_image && (
            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
              <div className="bg-muted/30 border-b border-border px-4 py-2.5">
                <span className="text-xs font-bold text-foreground">Reference Image</span>
              </div>
              <div className="p-3 flex justify-center bg-muted/10 max-h-56 overflow-hidden">
                <img src={lead.ref_image} alt="Reference" className="max-w-full max-h-52 object-contain rounded-lg" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
              </div>
            </div>
          )}

          {/* Rich text fields */}
          <RichTextField
            label="📝 Project Strategy & Playbook Notes"
            value={notesValue}
            onChange={setNotesValue}
            onSave={() => handleSaveField('notes', notesValue)}
            isSaving={isSavingNotes}
            saved={savedNotes}
            textareaRef={notesTextareaRef}
            onKeyDown={(e) => handleKeyDown(e, 'notes')}
            onPaste={(e) => handlePasteFormatting(e, 'notes')}
            onFormat={(p, s) => insertFormatting('notes', p, s)}
            adjustHeight={adjustHeight}
            placeholder="Summarize campaign strategy, persona, messaging angles..."
            borderColor="border-border"
          />

          <RichTextField
            label="📥 Workflow Feedback & Response"
            value={replyValue}
            onChange={setReplyValue}
            onSave={() => handleSaveField('reply_received', replyValue)}
            isSaving={isSavingReply}
            saved={savedReply}
            textareaRef={replyTextareaRef}
            onKeyDown={(e) => handleKeyDown(e, 'reply')}
            onPaste={(e) => handlePasteFormatting(e, 'reply')}
            onFormat={(p, s) => insertFormatting('reply', p, s)}
            adjustHeight={adjustHeight}
            placeholder="Paste the prospect's email reply here..."
            borderColor="border-emerald-200"
            headerBg="bg-emerald-50/50"
          />

          <RichTextField
            label="📤 Project Proposal / Details"
            value={proposalValue}
            onChange={setProposalValue}
            onSave={() => handleSaveField('proposal_sent', proposalValue)}
            isSaving={isSavingProposal}
            saved={savedProposal}
            textareaRef={proposalTextareaRef}
            onKeyDown={(e) => handleKeyDown(e, 'proposal')}
            onPaste={(e) => handlePasteFormatting(e, 'proposal')}
            onFormat={(p, s) => insertFormatting('proposal', p, s)}
            adjustHeight={adjustHeight}
            placeholder="Paste pricing, contract details or deck summary..."
            borderColor="border-blue-200"
            headerBg="bg-blue-50/50"
          />

          {/* Attachments */}
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="bg-muted/30 border-b border-border px-4 py-2.5 flex items-center gap-2">
              <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-bold text-foreground">Project Workflow Assets</span>
            </div>
            <div className="p-4 space-y-3">
              <form onSubmit={handleAttachFile} className="flex gap-2">
                <input
                  type="text"
                  required
                  value={attachFileName}
                  onChange={(e) => setAttachFileName(e.target.value)}
                  placeholder="e.g. Acme_Proposal_v2.pdf"
                  className="flex-1 text-xs bg-background border border-border text-foreground px-3 py-2 rounded-lg focus:outline-none focus:border-primary transition-colors"
                />
                <button
                  type="submit"
                  disabled={isAttaching}
                  className="px-3 py-2 bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground border border-border rounded-lg transition-colors"
                >
                  <Paperclip className="h-4 w-4" />
                </button>
              </form>
              {attachments.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2 italic">No assets attached yet.</p>
              ) : (
                <div className="space-y-1.5">
                  {attachments.map((file) => (
                    <div key={file.id} className="flex items-center justify-between px-3 py-2 border border-border rounded-lg bg-muted/20 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <Paperclip className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                        <span className="truncate font-medium text-foreground">{file.file_name}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">{new Date(file.created_at).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Linked Scratchpad Notes */}
          {linkedNotes.length > 0 && (
            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
              <div className="bg-muted/30 border-b border-border px-4 py-2.5">
                <span className="text-xs font-bold text-foreground">Linked Scratchpad Notes</span>
              </div>
              <div className="p-4 space-y-2">
                {linkedNotes.map((note) => (
                  <div key={note.id} className="p-3 border border-border rounded-lg bg-muted/30 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-foreground">{note.title}</span>
                      <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold">{note.category.replace('_', ' ')}</span>
                    </div>
                    {note.content && (
                      <div 
                        className="text-muted-foreground text-[11px] leading-relaxed mt-1.5 editor-content whitespace-normal"
                        dangerouslySetInnerHTML={{ __html: note.content }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="h-6" />
        </div>

        {/* ══ Right: Chat Panel ══ */}
        <div 
          className={`relative flex-shrink-0 border-l border-border flex flex-col bg-card/40 w-full lg:w-auto ${activeMobilePane === 'chat' ? 'flex' : 'hidden lg:flex'}`}
          style={isDesktop ? { width: `${chatWidth}px` } : undefined}
        >
          {/* Drag Resizer Bar */}
          <div 
            onMouseDown={startResizing} 
            className="absolute left-0 top-0 bottom-0 w-1 hover:w-1.5 active:w-1.5 cursor-col-resize bg-border hover:bg-primary/50 active:bg-primary z-20 transition-all"
          />
          {/* Chat Header */}
          <div className="flex-shrink-0 bg-card border-b border-border px-4 py-3">
            <h3 className="text-xs font-bold text-foreground flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-success animate-pulse flex-shrink-0" />
              Project Activity Chat
            </h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Team updates · {updates.filter(u => !u.content.startsWith('Status') && !u.content.includes('created') && !u.content.startsWith('Attached') && !u.content.startsWith('Project details')).length} messages
            </p>
          </div>

          {/* Messages */}
          <div
            className={`flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-0 ${chatDragOver ? 'bg-primary/5 border-2 border-dashed border-primary' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setChatDragOver(true); }}
            onDragLeave={() => setChatDragOver(false)}
            onDrop={handleChatDrop}
          >
            {updates.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground px-6 py-12">
                <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
                  <Send className="h-6 w-6 text-muted-foreground/40" />
                </div>
                <p className="text-xs font-semibold">No messages yet</p>
                <p className="text-[10px] mt-1 leading-relaxed opacity-70">Send a progress update below or drag a file to attach</p>
              </div>
            ) : (() => {
              const reversedUpdates = [...updates].reverse();
              return reversedUpdates.map((update, index) => {
                const isSystem =
                  update.content.startsWith('Status changed') ||
                  update.content.includes('Project was created') ||
                  update.content.startsWith('Attached file') ||
                  update.content.startsWith('Project details updated');

                const isMe = String(update.user_id) === String(currentUser?.id);
                const senderName = getProfileName(update.user_id);
                const senderInitials = senderName.split(' ').map((n: string) => n[0]).join('').slice(0, 2);
                const dt = new Date(update.created_at);
                const timeStr = dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                const currentDate = dt.toDateString();
                const prevDate = index > 0 ? new Date(reversedUpdates[index - 1].created_at).toDateString() : null;
                const showDateSeparator = currentDate !== prevDate;

                return (
                  <React.Fragment key={update.id}>
                    {showDateSeparator && (
                      <div className="flex justify-center my-3 select-none">
                        <span className="text-[9px] font-bold text-muted-foreground bg-muted/60 border border-border/40 px-2.5 py-0.5 rounded-full shadow-sm">
                          {formatSeparatorDate(update.created_at)}
                        </span>
                      </div>
                    )}

                    {isSystem ? (
                      <div className="flex justify-center">
                        <span className="text-[9px] text-muted-foreground bg-muted/50 border border-border/40 px-2.5 py-0.5 rounded-full">
                          {update.content}
                        </span>
                      </div>
                    ) : (
                      <div className={`flex gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                        <div
                          className={`h-7 w-7 rounded-full font-bold text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5 select-none uppercase ${
                            isMe ? 'bg-primary/25 text-primary' : 'bg-primary/15 text-primary'
                          }`}
                          title={senderName}
                        >
                          {senderInitials}
                        </div>
                        <div className={`flex flex-col gap-0.5 max-w-[82%] ${isMe ? 'items-end' : 'items-start'} group relative`}>
                          <span className="text-[10px] font-semibold text-muted-foreground px-1">
                            {isMe ? 'You' : senderName}
                          </span>
                          <div className={`px-3 py-2 text-xs leading-relaxed shadow-sm w-fit max-w-full chat-bubble ${
                            isMe
                              ? 'chat-bubble-outgoing rounded-tr-sm'
                              : 'chat-bubble-incoming rounded-tl-sm'
                          }`}>
                            <div className="whitespace-pre-wrap break-words space-y-1">
                              {parseMarkdown(update.content)}
                            </div>
                          </div>
                          
                          {/* Reactions badges */}
                          {update.reactions && update.reactions.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1 px-1">
                              {update.reactions.map((r) => {
                                const hasReacted = r.user_ids.includes(currentUser?.id || '');
                                return (
                                  <button
                                    key={r.emoji}
                                    onClick={() => handleToggleLeadUpdateReaction(update.id, r.emoji)}
                                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold border transition-colors cursor-pointer ${
                                      hasReacted
                                        ? 'bg-primary/10 border-primary/30 text-primary hover:bg-primary/15'
                                        : 'bg-muted/40 border-border/60 text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                                    }`}
                                  >
                                    <span>{r.emoji}</span>
                                    <span>{r.user_ids.length}</span>
                                  </button>
                                );
                              })}
                            </div>
                          )}

                          {/* Reaction Trigger Button */}
                          <div className="flex items-center gap-1.5 mt-0.5 px-1">
                            <button
                              onClick={() => setActiveReactionPickerId(activeReactionPickerId === update.id ? null : update.id)}
                              className="text-[9px] text-muted-foreground hover:text-foreground font-bold flex items-center gap-0.5 px-1 py-0.5 rounded bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer"
                            >
                              <span>+</span> React
                            </button>
                            
                            {activeReactionPickerId === update.id && (
                              <div className="absolute z-30 bottom-full mb-1 flex items-center gap-1 bg-card border border-border px-2 py-1 rounded-full shadow-lg">
                                {['👍', '✅', '👀', '🔥', '❓'].map((emoji) => (
                                  <button
                                    key={emoji}
                                    onClick={() => {
                                      handleToggleLeadUpdateReaction(update.id, emoji);
                                      setActiveReactionPickerId(null);
                                    }}
                                    className="hover:scale-125 transition-transform px-1 cursor-pointer text-xs"
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            )}
                            <span className="text-[9px] text-muted-foreground">{timeStr}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </React.Fragment>
                );
              });
            })()}
            )
            <div ref={chatBottomRef} />
          </div>

          {/* Chat Input */}
          <div className="flex-shrink-0 border-t border-border p-3 bg-card">
            <div className="flex gap-2 items-end">
              <MentionTextArea
                value={updateText}
                onChangeValue={setUpdateText}
                onKeyDown={handleChatKeyDown}
                onPaste={handleChatPaste}
                placeholder="Type a message… Enter to send"
                rows={2}
                className="flex-1 text-xs bg-background border border-border text-foreground px-3 py-2 rounded-xl focus:outline-none focus:border-primary resize-none transition-colors"
                style={{ minHeight: '60px', maxHeight: '120px' }}
              />
              <button
                onClick={handlePostUpdateChat}
                disabled={!updateText.trim()}
                className="flex-shrink-0 h-9 w-9 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl flex items-center justify-center disabled:opacity-40 transition-all cursor-pointer shadow-sm"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="text-[9px] text-muted-foreground/60 mt-1.5 text-center">Shift+Enter for new line · Drag files to attach</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// Helper: InfoRow
// ─────────────────────────────────────────────────────────────────
function InfoRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 text-muted-foreground flex-shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground font-medium mb-0.5">{label}</p>
        {children}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Helper: RichTextField
// ─────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────
// Helper: parseMarkdown
// ─────────────────────────────────────────────────────────────────
function parseInlineStyles(text: string): React.ReactNode {
  // Matches bold, italic, code, link patterns, and raw URLs
  // Link pattern: \[([^\]]+)\]\(([^)]+)\)
  // Bold pattern: \*\*([^*]+)\*\*
  // Italic pattern: \*([^*]+)\*
  // Code pattern: `([^`]+)`
  // Raw URL: https?://... or www....
  const regex = /(\*\*.*?\*\*|\*.*?\*|`.*?`|\[[^\]]+\]\([^)]+\)|https?:\/\/[^\s]+|www\.[^\s]+)/g;
  const parts = text.split(regex);

  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={idx} className="font-extrabold">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={idx} className="italic">{part.slice(1, -1)}</em>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={idx} className="bg-muted/30 px-1 py-0.5 rounded font-mono text-[11px]">{part.slice(1, -1)}</code>;
    }
    if (part.startsWith('[') && part.includes('](') && part.endsWith(')')) {
      const closeBracketIdx = part.indexOf('](');
      const label = part.slice(1, closeBracketIdx);
      const url = part.slice(closeBracketIdx + 2, -1);
      const linkClass = 'text-current hover:opacity-80 underline font-bold break-all';
      return (
        <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className={linkClass}>
          {label}
        </a>
      );
    }
    if (part.startsWith('http://') || part.startsWith('https://') || part.startsWith('www.')) {
      const href = part.startsWith('www.') ? 'http://' + part : part;
      const linkClass = 'text-current hover:opacity-80 underline font-bold break-all';
      return (
        <a key={idx} href={href} target="_blank" rel="noopener noreferrer" className={linkClass}>
          {part}
        </a>
      );
    }
    return part;
  });
}

function parseMarkdown(text: string): React.ReactNode {
  if (!text) return null;

  const lines = text.split('\n');
  return lines.map((line, idx) => {
    const trimmed = line.trim();
    
    // Check if bullet point
    const isBullet = trimmed.startsWith('- ') || trimmed.startsWith('* ');
    
    // Check if heading
    const isH3 = trimmed.startsWith('### ');
    const isH2 = trimmed.startsWith('## ');
    const isH1 = trimmed.startsWith('# ');

    if (isH3) {
      return (
        <h4 key={idx} className="text-[11px] font-bold mt-3 mb-1 uppercase tracking-wider">
          {parseInlineStyles(trimmed.substring(4))}
        </h4>
      );
    }
    if (isH2) {
      return (
        <h3 key={idx} className="text-xs font-extrabold mt-4 mb-1.5 border-b border-border/30 pb-0.5">
          {parseInlineStyles(trimmed.substring(3))}
        </h3>
      );
    }
    if (isH1) {
      return (
        <h2 key={idx} className="text-sm font-extrabold mt-5 mb-2">
          {parseInlineStyles(trimmed.substring(2))}
        </h2>
      );
    }
    
    if (isBullet) {
      return (
        <li key={idx} className="list-disc ml-4 my-1 text-xs leading-relaxed">
          {parseInlineStyles(trimmed.substring(2))}
        </li>
      );
    }

    return (
      <p key={idx} className="min-h-[16px] text-xs leading-relaxed my-1 whitespace-pre-wrap">
        {parseInlineStyles(line)}
      </p>
    );
  });
}

// ─────────────────────────────────────────────────────────────────
// Helper: RichTextField
// ─────────────────────────────────────────────────────────────────
interface RichTextFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onSave: () => void;
  isSaving: boolean;
  saved: boolean;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onPaste: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void;
  onFormat: (prefix: string, suffix: string) => void;
  adjustHeight: (el: HTMLTextAreaElement | null) => void;
  placeholder: string;
  borderColor?: string;
  headerBg?: string;
}

function RichTextField({
  label, value, onChange, onSave, isSaving, saved,
  textareaRef, onKeyDown, onPaste, onFormat, adjustHeight,
  placeholder, borderColor = 'border-border', headerBg = 'bg-muted/20',
}: RichTextFieldProps) {
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          adjustHeight(textareaRef.current);
        }
      }, 50);
    }
  }, [isEditing]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      adjustHeight(textareaRef.current);
    }
  }, [value, isEditing]);

  const handleBlur = () => {
    onSave();
    setIsEditing(false);
  };

  return (
    <div className={`bg-card border rounded-xl shadow-sm overflow-hidden ${borderColor} transition-all duration-200`}>
      <div className={`${headerBg} border-b border-border/60 px-4 py-2.5 flex items-center justify-between`}>
        <span className="text-xs font-bold text-foreground">{label}</span>
        <div className="flex items-center gap-1.5">
          {isEditing ? (
            <>
              <div className="flex items-center gap-0.5 text-muted-foreground border-r border-border/40 pr-2 mr-1">
                <button type="button" onClick={() => onFormat('**', '**')} className="hover:text-foreground p-1 rounded hover:bg-muted/60 transition-colors" title="Bold (Ctrl+B)">
                  <Bold className="h-3 w-3" />
                </button>
                <button type="button" onClick={() => onFormat('*', '*')} className="hover:text-foreground p-1 rounded hover:bg-muted/60 transition-colors" title="Italic (Ctrl+I)">
                  <Italic className="h-3 w-3" />
                </button>
                <button type="button" onClick={() => onFormat('`', '`')} className="hover:text-foreground p-1 rounded hover:bg-muted/60 transition-colors" title="Code">
                  <Code className="h-3 w-3" />
                </button>
                <button type="button" onClick={() => onFormat('\n- ', '')} className="hover:text-foreground p-1 rounded hover:bg-muted/60 transition-colors" title="Bullet List">
                  <List className="h-3 w-3" />
                </button>
              </div>
              <button
                type="button"
                onClick={handleBlur}
                className="px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 text-[10px] font-bold rounded hover:bg-primary/20 transition-colors cursor-pointer"
              >
                Done
              </button>
            </>
          ) : (
            <>
              {isSaving ? (
                <span className="text-[9px] text-muted-foreground animate-pulse mr-2">Saving...</span>
              ) : saved ? (
                <span className="text-[9px] text-success font-semibold flex items-center gap-0.5 mr-2"><Check className="h-3 w-3" /> Saved</span>
              ) : null}
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="px-2.5 py-1 bg-muted hover:bg-muted-foreground/10 text-foreground border border-border/60 text-[10px] font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1"
              >
                <Edit className="h-3 w-3" /> Edit
              </button>
            </>
          )}
        </div>
      </div>

      {isEditing ? (
        <MentionTextArea
          ref={textareaRef as React.RefObject<HTMLTextAreaElement>}
          value={value}
          onChangeValue={(val) => { onChange(val); setTimeout(() => { if (textareaRef.current) adjustHeight(textareaRef.current); }, 0); }}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          onBlur={handleBlur}
          placeholder={placeholder}
          className="w-full text-xs bg-transparent border-none text-foreground px-4 py-3 focus:outline-none resize-none overflow-hidden min-h-[80px] leading-relaxed placeholder:text-muted-foreground/50"
        />
      ) : (
        <div
          className="px-4 py-3 min-h-[80px] leading-relaxed"
        >
          {value.trim() ? (
            <div className="space-y-1">{parseMarkdown(value)}</div>
          ) : (
            <span className="text-xs text-muted-foreground/40 italic select-none">
              {placeholder}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

const formatSeparatorDate = (dateStr: string) => {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString()) {
    return 'Today';
  } else if (d.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  } else {
    return d.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }
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
      document.body.removeChild(canvas);
    }
  };

  draw();

  window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  });
};
