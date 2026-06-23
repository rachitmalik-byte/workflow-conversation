import React, { useState, useRef } from 'react';
import { dbClient } from '../../services/dbClient';
import { useAuth } from '../../context/AuthContext';
import type { LeadStatus, LeadPriority } from '../../types/database';
import { ArrowLeft, Check, AlertCircle, Bold, Italic, Code, List } from 'lucide-react';

interface CreatePageProps {
  onNavigate: (view: string) => void;
}

export const CreatePage: React.FC<CreatePageProps> = ({ onNavigate }) => {
  const { currentUser, profiles } = useAuth();
  
  const [companyName, setCompanyName] = useState('');
  const [prospectName, setProspectName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [website, setWebsite] = useState('');
  const [companyType, setCompanyType] = useState('Enterprise');
  const [industry, setIndustry] = useState('');
  const [serviceNeeded, setServiceNeeded] = useState('');
  const [status, setStatus] = useState<LeadStatus>('new');
  const [priority, setPriority] = useState<LeadPriority>('medium');
  const [notes, setNotes] = useState('');
  const [replyReceived, setReplyReceived] = useState('');
  const [proposalSent, setProposalSent] = useState('');
  const [refImage, setRefImage] = useState('');
  const [dragOver, setDragOver] = useState(false);
  
  const notesTextareaRef = useRef<HTMLTextAreaElement>(null);
  const replyTextareaRef = useRef<HTMLTextAreaElement>(null);
  const proposalTextareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = (textarea: HTMLTextAreaElement | null) => {
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  };

  React.useEffect(() => {
    adjustHeight(notesTextareaRef.current);
  }, [notes]);

  React.useEffect(() => {
    adjustHeight(replyTextareaRef.current);
  }, [replyReceived]);

  React.useEffect(() => {
    adjustHeight(proposalTextareaRef.current);
  }, [proposalSent]);

  const [assignedUsers, setAssignedUsers] = useState<string[]>(
    currentUser ? [currentUser.id] : []
  );
  const [searchTeam, setSearchTeam] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleAssignedToggle = (userId: string) => {
    // Safety check: Creator cannot be unassigned
    if (currentUser && userId === currentUser.id) return;

    if (assignedUsers.includes(userId)) {
      setAssignedUsers(assignedUsers.filter((id) => id !== userId));
    } else {
      setAssignedUsers([...assignedUsers, userId]);
    }
  };

  const handleImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setRefImage(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageFile(e.dataTransfer.files[0]);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    if (e.clipboardData.items) {
      for (let i = 0; i < e.clipboardData.items.length; i++) {
        const item = e.clipboardData.items[i];
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile();
          if (file) handleImageFile(file);
        }
      }
    }
  };

  const insertFormatting = (
    field: 'notes' | 'reply' | 'proposal',
    prefix: string,
    suffix: string = ''
  ) => {
    const textarea = 
      field === 'notes' ? notesTextareaRef.current : 
      field === 'reply' ? replyTextareaRef.current : 
      proposalTextareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    
    const selected = text.substring(start, end);
    const before = text.substring(0, start);
    const after = text.substring(end);

    const replacement = prefix + selected + suffix;
    const newValue = before + replacement + after;

    if (field === 'notes') {
      setNotes(newValue);
    } else if (field === 'reply') {
      setReplyReceived(newValue);
    } else {
      setProposalSent(newValue);
    }

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
      adjustHeight(textarea);
    }, 0);
  };

  const handlePasteFormatting = (
    e: React.ClipboardEvent<HTMLTextAreaElement>,
    field: 'notes' | 'reply' | 'proposal'
  ) => {
    const html = e.clipboardData.getData('text/html');
    if (!html) return;

    e.preventDefault();
    
    let formattedText = html;
    formattedText = formattedText.replace(/<(strong|b)[^>]*>(.*?)<\/\1>/gi, '**$2**');
    formattedText = formattedText.replace(/<(em|i)[^>]*>(.*?)<\/\1>/gi, '*$2*');
    formattedText = formattedText.replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`');
    formattedText = formattedText.replace(/<li[^>]*>(.*?)<\/li>/gi, '\n- $1');
    formattedText = formattedText.replace(/<[^>]*>/g, '');
    formattedText = formattedText.trim();

    const textarea = e.currentTarget;

    if (field === 'notes') {
      setNotes((prev) => {
        const next = prev + (prev ? '\n' : '') + formattedText;
        setTimeout(() => adjustHeight(textarea), 0);
        return next;
      });
    } else if (field === 'reply') {
      setReplyReceived((prev) => {
        const next = prev + (prev ? '\n' : '') + formattedText;
        setTimeout(() => adjustHeight(textarea), 0);
        return next;
      });
    } else {
      setProposalSent((prev) => {
        const next = prev + (prev ? '\n' : '') + formattedText;
        setTimeout(() => adjustHeight(textarea), 0);
        return next;
      });
    }
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    field: 'notes' | 'reply' | 'proposal'
  ) => {
    if (e.ctrlKey || e.metaKey) {
      const key = e.key.toLowerCase();
      if (key === 'b') {
        e.preventDefault();
        insertFormatting(field, '**', '**');
      } else if (key === 'i') {
        e.preventDefault();
        insertFormatting(field, '*', '*');
      } else if (key === '`') {
        e.preventDefault();
        insertFormatting(field, '`', '`');
      } else if (key === 'l') {
        e.preventDefault();
        insertFormatting(field, '\n- ', '');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || !prospectName.trim()) {
      setError('Company Name and Prospect Name are required.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const tags = replyReceived.trim() ? ['reply_received'] : [];

      await dbClient.createLead({
        company_name: companyName,
        prospect_name: prospectName,
        email,
        phone,
        linkedin,
        website,
        company_type: companyType,
        industry,
        service_needed: serviceNeeded,
        service_offered: 'Scale Plan',
        status,
        priority,
        notes,
        tags,
        assigned_users: assignedUsers,
        ref_image: refImage,
        demand_type: 'Cold Outreach',
        reply_received: replyReceived.trim(),
        proposal_sent: proposalSent.trim(),
      });

      onNavigate('leads');
    } catch (err: any) {
      setError(err.message || 'Failed to create lead.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 w-full max-w-[1600px] mx-auto space-y-6">
      {/* Back button */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onNavigate('leads')}
          className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded-md transition-colors"
          title="Back to leads list"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <span className="text-xs text-muted-foreground">Back to Projects List</span>
      </div>

      <div className="border border-border rounded-lg bg-card p-6 shadow-sm">
        <h2 className="text-xl font-bold text-foreground mb-6">Create New Project</h2>

        {error && (
          <div className="mb-4 flex items-center gap-2 bg-danger/10 border border-danger/20 p-3 rounded text-danger text-sm">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section: Basic info */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
              Company & Prospect Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Company Name <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Acme Corp"
                  className="w-full text-sm bg-background border border-border text-foreground px-3 py-2 rounded focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Prospect Name <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={prospectName}
                  onChange={(e) => setProspectName(e.target.value)}
                  placeholder="e.g. Jane Doe"
                  className="w-full text-sm bg-background border border-border text-foreground px-3 py-2 rounded focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Email Address
                </label>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. jane@company.com or write no"
                  className="w-full text-sm bg-background border border-border text-foreground px-3 py-2 rounded focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +1 (555) 123-4567"
                  className="w-full text-sm bg-background border border-border text-foreground px-3 py-2 rounded focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  LinkedIn URL
                </label>
                <input
                  type="text"
                  value={linkedin}
                  onChange={(e) => setLinkedin(e.target.value)}
                  placeholder="e.g. linkedin.com/in/jane-doe"
                  className="w-full text-sm bg-background border border-border text-foreground px-3 py-2 rounded focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Website URL
                </label>
                <input
                  type="text"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="e.g. company.com"
                  className="w-full text-sm bg-background border border-border text-foreground px-3 py-2 rounded focus:outline-none focus:border-primary"
                />
              </div>
            </div>
          </div>

          <hr className="border-border" />

          {/* Section: Strategy & Triage */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
              Strategy & Service Mapping
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Company Type
                </label>
                <select
                  value={companyType}
                  onChange={(e) => setCompanyType(e.target.value)}
                  className="w-full text-sm bg-background border border-border text-foreground px-3 py-2 rounded focus:outline-none focus:border-primary cursor-pointer"
                >
                  <option value="Enterprise">Enterprise</option>
                  <option value="Mid-Market">Mid-Market</option>
                  <option value="SMB">SMB</option>
                  <option value="Startup">Startup</option>
                  <option value="Agency">Agency</option>
                  <option value="Conglomerate">Conglomerate</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Industry
                </label>
                <input
                  type="text"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  placeholder="e.g. Biotech, FinTech, SaaS"
                  className="w-full text-sm bg-background border border-border text-foreground px-3 py-2 rounded focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Service Needed
                </label>
                <input
                  type="text"
                  value={serviceNeeded}
                  onChange={(e) => setServiceNeeded(e.target.value)}
                  placeholder="e.g. Lead Qualification Support"
                  className="w-full text-sm bg-background border border-border text-foreground px-3 py-2 rounded focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Initial Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as LeadStatus)}
                  className="w-full text-sm bg-background border border-border text-foreground px-3 py-2 rounded focus:outline-none focus:border-primary cursor-pointer"
                >
                  <option value="new">New</option>
                  <option value="contacted">Contacted</option>
                  <option value="qualified">Qualified</option>
                  <option value="proposal">Proposal</option>
                  <option value="negotiation">Negotiation</option>
                  <option value="closed_won">Closed (Won)</option>
                  <option value="closed_lost">Closed (Lost)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as LeadPriority)}
                  className="w-full text-sm bg-background border border-border text-foreground px-3 py-2 rounded focus:outline-none focus:border-primary cursor-pointer"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Reference Image
                </label>
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onPaste={handlePaste}
                  tabIndex={0}
                  className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all focus:outline-none focus:border-primary ${
                    dragOver ? 'border-primary bg-primary/5' : 'border-border bg-background hover:bg-muted/30'
                  }`}
                  onClick={() => document.getElementById('refImageFileInput')?.click()}
                >
                  <input
                    type="file"
                    id="refImageFileInput"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleImageFile(e.target.files[0]);
                      }
                    }}
                  />
                  {refImage ? (
                    <div className="relative w-full max-w-xs group" onClick={(e) => e.stopPropagation()}>
                      <img src={refImage} alt="Reference Preview" className="w-full h-auto rounded border border-border max-h-48 object-contain" />
                      <button
                        type="button"
                        onClick={() => setRefImage('')}
                        className="absolute top-1 right-1 p-1 bg-danger text-white rounded-full opacity-90 hover:opacity-100 shadow-sm cursor-pointer text-xs"
                      >
                        ✕
                      </button>
                      <p className="text-[10px] text-muted-foreground text-center mt-1">Click image ✕ to remove. Drag/paste to replace.</p>
                    </div>
                  ) : (
                    <div className="text-center space-y-1">
                      <div className="text-xs text-muted-foreground font-semibold">
                        Drag & Drop or <span className="text-primary hover:underline">Browse</span> reference image
                      </div>
                      <p className="text-[10px] text-muted-foreground">Supports PNG, JPG, GIF (Paste via Ctrl+V is also active here)</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <hr className="border-border" />

          {/* Section: Notes & Tags */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
              Context & Tags
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Outbound Action Notes
                </label>
                <div className="flex flex-col border border-border rounded bg-background focus-within:border-primary">
                  <div className="flex items-center gap-2.5 px-3 py-1.5 border-b border-border/40 bg-muted/20 text-muted-foreground text-xs select-none">
                    <button type="button" onClick={() => insertFormatting('notes', '**', '**')} className="hover:text-foreground p-0.5 transition-colors" title="Bold (Ctrl+B)">
                      <Bold className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" onClick={() => insertFormatting('notes', '*', '*')} className="hover:text-foreground p-0.5 transition-colors" title="Italic (Ctrl+I)">
                      <Italic className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" onClick={() => insertFormatting('notes', '`', '`')} className="hover:text-foreground p-0.5 transition-colors" title="Code Block (Ctrl+`)">
                      <Code className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" onClick={() => insertFormatting('notes', '\n- ', '')} className="hover:text-foreground p-0.5 transition-colors" title="Bullet List (Ctrl+L)">
                      <List className="h-3.5 w-3.5" />
                    </button>
                    <span className="text-[10px] text-muted-foreground/60 italic ml-auto">Ctrl+B/I/`/L shortcuts active • Pasting preserves rich text</span>
                  </div>
                  <textarea
                    ref={notesTextareaRef}
                    value={notes}
                    onChange={(e) => { setNotes(e.target.value); adjustHeight(e.target); }}
                    onKeyDown={(e) => handleKeyDown(e, 'notes')}
                    onPaste={(e) => handlePasteFormatting(e, 'notes')}
                    placeholder="Summarize campaign details, pain points..."
                    rows={4}
                    className="w-full text-sm bg-transparent border-none text-foreground p-3 focus:outline-none resize-none overflow-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Reply Received
                </label>
                <div className="flex flex-col border border-border rounded bg-background focus-within:border-primary">
                  <div className="flex items-center gap-2.5 px-3 py-1.5 border-b border-border/40 bg-muted/20 text-muted-foreground text-xs select-none">
                    <button type="button" onClick={() => insertFormatting('reply', '**', '**')} className="hover:text-foreground p-0.5 transition-colors" title="Bold (Ctrl+B)">
                      <Bold className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" onClick={() => insertFormatting('reply', '*', '*')} className="hover:text-foreground p-0.5 transition-colors" title="Italic (Ctrl+I)">
                      <Italic className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" onClick={() => insertFormatting('reply', '`', '`')} className="hover:text-foreground p-0.5 transition-colors" title="Code Block (Ctrl+`)">
                      <Code className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" onClick={() => insertFormatting('reply', '\n- ', '')} className="hover:text-foreground p-0.5 transition-colors" title="Bullet List (Ctrl+L)">
                      <List className="h-3.5 w-3.5" />
                    </button>
                    <span className="text-[10px] text-muted-foreground/60 italic ml-auto">Ctrl+B/I/`/L shortcuts active • Pasting preserves rich text</span>
                  </div>
                  <textarea
                    ref={replyTextareaRef}
                    value={replyReceived}
                    onChange={(e) => { setReplyReceived(e.target.value); adjustHeight(e.target); }}
                    onKeyDown={(e) => handleKeyDown(e, 'reply')}
                    onPaste={(e) => handlePasteFormatting(e, 'reply')}
                    placeholder="Paste the prospect's email reply here... (Formatting preserved)"
                    rows={4}
                    className="w-full text-sm bg-transparent border-none text-foreground p-3 focus:outline-none resize-none overflow-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Proposal Sent
                </label>
                <div className="flex flex-col border border-border rounded bg-background focus-within:border-primary">
                  <div className="flex items-center gap-2.5 px-3 py-1.5 border-b border-border/40 bg-muted/20 text-muted-foreground text-xs select-none">
                    <button type="button" onClick={() => insertFormatting('proposal', '**', '**')} className="hover:text-foreground p-0.5 transition-colors" title="Bold (Ctrl+B)">
                      <Bold className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" onClick={() => insertFormatting('proposal', '*', '*')} className="hover:text-foreground p-0.5 transition-colors" title="Italic (Ctrl+I)">
                      <Italic className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" onClick={() => insertFormatting('proposal', '`', '`')} className="hover:text-foreground p-0.5 transition-colors" title="Code Block (Ctrl+`)">
                      <Code className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" onClick={() => insertFormatting('proposal', '\n- ', '')} className="hover:text-foreground p-0.5 transition-colors" title="Bullet List (Ctrl+L)">
                      <List className="h-3.5 w-3.5" />
                    </button>
                    <span className="text-[10px] text-muted-foreground/60 italic ml-auto">Ctrl+B/I/`/L shortcuts active • Pasting preserves rich text</span>
                  </div>
                  <textarea
                    ref={proposalTextareaRef}
                    value={proposalSent}
                    onChange={(e) => { setProposalSent(e.target.value); adjustHeight(e.target); }}
                    onKeyDown={(e) => handleKeyDown(e, 'proposal')}
                    onPaste={(e) => handlePasteFormatting(e, 'proposal')}
                    placeholder="Paste details of the proposal sent here... (Formatting preserved)"
                    rows={4}
                    className="w-full text-sm bg-transparent border-none text-foreground p-3 focus:outline-none resize-none overflow-hidden"
                  />
                </div>
              </div>
            </div>
          </div>

          <hr className="border-border" />

          {/* Section: Team Assignment */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Team Assignment & Visibility
            </h3>
            <p className="text-[10px] text-muted-foreground mb-4">
              You are automatically assigned as the creator of this project. Assigning other team members allows them to view/work on this project.
            </p>
            {/* Teammate Assignment Search */}
            <div className="mb-3 max-w-xs">
              <input
                type="text"
                value={searchTeam}
                onChange={(e) => setSearchTeam(e.target.value)}
                placeholder="Search teammates..."
                className="w-full px-2.5 py-1.5 bg-background border border-border text-xs rounded focus:outline-none focus:border-primary text-foreground"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {profiles
                .filter((p) => p.status === 'active' && p.full_name.toLowerCase().includes(searchTeam.toLowerCase()))
                .map((p) => {
                  const isAssigned = assignedUsers.includes(p.id);
                  const isSelf = currentUser?.id === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleAssignedToggle(p.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                        isAssigned
                          ? 'bg-primary/10 border-primary text-primary'
                          : 'bg-background border-border text-muted-foreground hover:bg-muted hover:text-foreground'
                      } ${isSelf ? 'cursor-not-allowed opacity-85' : 'cursor-pointer'}`}
                    >
                      {isAssigned && <Check className="h-3.5 w-3.5" />}
                      <span>{p.full_name}</span>
                      {isSelf && <span className="text-[9px] uppercase opacity-60">(Creator)</span>}
                    </button>
                  );
                })}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={() => onNavigate('leads')}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted rounded transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/95 disabled:opacity-50 rounded transition-colors"
            >
              {isSaving ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
