import React, { useState, useEffect } from 'react';
import { dbClient } from '../../services/dbClient';
import { useAuth } from '../../context/AuthContext';
import type { Reminder, Lead, Task } from '../../types/database';
import {
  AlertCircle, Calendar, Clock, Plus, User, Users, Check, Trash2,
  ChevronLeft, ChevronRight, AlertTriangle, CalendarDays, VolumeX
} from 'lucide-react';

export const RemindersView: React.FC = () => {
  const { currentUser, profiles } = useAuth();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  // Navigation states
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [selectedReminder, setSelectedReminder] = useState<Reminder | null>(null);

  // Creation form states
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [offsetsInput, setOffsetsInput] = useState('15');
  const [isCustom, setIsCustom] = useState(false);
  const [reminderType, setReminderType] = useState<'personal' | 'team' | 'company'>('personal');
  const [notes, setNotes] = useState('');
  const [notificationType, setNotificationType] = useState<'notification' | 'alarm'>('notification');
  
  // Associations
  const [leadId, setLeadId] = useState('');
  const [taskId, setTaskId] = useState('');
  const [companyName, setCompanyName] = useState('');

  // Invites
  const [invitedUsers, setInvitedUsers] = useState<string[]>([]);
  const [inviteSearchQuery, setInviteSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fetchRemindersAndAssets = async () => {
    const data = await dbClient.getReminders();
    setReminders(data);

    const leadsData = await dbClient.getLeads();
    setLeads(leadsData);

    const tasksData = await dbClient.getTasks();
    setTasks(tasksData);
  };

  useEffect(() => {
    fetchRemindersAndAssets();

    const unsubscribe = dbClient.subscribe((table) => {
      if (table === 'reminders' || table === 'leads' || table === 'tasks') {
        fetchRemindersAndAssets();
      }
    });

    const handleCreateEvent = () => {
      setIsCreating(true);
      // set to current local ISO string
      const localNow = new Date();
      const localIso = new Date(localNow.getTime() - localNow.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
      setDateTime(localIso);
    };

    window.addEventListener('command-create-reminder', handleCreateEvent);

    return () => {
      unsubscribe();
      window.removeEventListener('command-create-reminder', handleCreateEvent);
    };
  }, [currentUser]);

  // Conflict Checking Logic
  const getConflictingEvent = (rem: Reminder, allReminders: Reminder[]) => {
    if (rem.status === 'dismissed') return null;
    const remTime = new Date(rem.reminder_time).getTime();
    
    // People associated with rem
    const remPeople = new Set([rem.creator_id, ...(rem.invited_users || [])]);

    for (const other of allReminders) {
      if (other.id === rem.id || other.status === 'dismissed') continue;
      
      const otherTime = new Date(other.reminder_time).getTime();
      if (Math.abs(remTime - otherTime) <= 60 * 60 * 1000) { // within 1 hour
        // Check if they share any person, or if both are company events
        const bothCompany = rem.is_company_event && other.is_company_event;
        const otherPeople = new Set([other.creator_id, ...(other.invited_users || [])]);
        const sharePeople = [...remPeople].some(p => otherPeople.has(p));

        if (bothCompany || sharePeople) {
          return other;
        }
      }
    }
    return null;
  };

  const handleCreateReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !dateTime) {
      setError('Title and Time are required.');
      return;
    }

    const proposedTime = new Date(dateTime).toISOString();
    const tempReminder: Reminder = {
      id: 'temp',
      title: title.trim(),
      reminder_time: proposedTime,
      reminder_offsets: [],
      is_custom: isCustom,
      creator_id: currentUser?.id || 'unknown',
      status: 'active',
      is_company_event: reminderType === 'company',
      invited_users: reminderType === 'team' ? invitedUsers : [],
      notes: notes.trim() || undefined,
      created_at: new Date().toISOString()
    };

    // Check conflict before scheduling
    const conflict = getConflictingEvent(tempReminder, reminders);
    if (conflict) {
      const proceed = window.confirm(
        `Conflict warning: This overlaps with "${conflict.title}" (scheduled at ${new Date(conflict.reminder_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}) by teammate. Schedule anyway?`
      );
      if (!proceed) return;
    }

    try {
      if ('Notification' in window && Notification.permission === 'default') {
        await Notification.requestPermission();
      }

      const offsets = offsetsInput
        .split(',')
        .map((x) => parseInt(x.trim(), 10))
        .filter((x) => !isNaN(x));

      await dbClient.createReminder({
        title: title.trim(),
        reminder_time: proposedTime,
        reminder_offsets: offsets,
        is_custom: isCustom,
        notification_type: notificationType,
        lead_id: leadId || undefined,
        task_id: taskId || undefined,
        company_name: companyName.trim() || undefined,
        invited_users: reminderType === 'team' ? invitedUsers : [],
        is_company_event: reminderType === 'company',
        notes: notes.trim() || undefined
      });

      // Reset form states
      setTitle('');
      setDateTime('');
      setOffsetsInput('15');
      setIsCustom(false);
      setReminderType('personal');
      setNotes('');
      setNotificationType('notification');
      setLeadId('');
      setTaskId('');
      setCompanyName('');
      setInvitedUsers([]);
      setError(null);
      setIsCreating(false);
      fetchRemindersAndAssets();
    } catch (err: any) {
      setError(err.message || 'Failed to create reminder.');
    }
  };

  const handleInviteToggle = (userId: string) => {
    if (invitedUsers.includes(userId)) {
      setInvitedUsers(invitedUsers.filter((id) => id !== userId));
    } else {
      setInvitedUsers([...invitedUsers, userId]);
    }
  };

  const handleDismissReminder = async (id: string) => {
    try {
      await dbClient.updateReminder(id, { status: 'dismissed' });
      fetchRemindersAndAssets();
      if (selectedReminder?.id === id) {
        setSelectedReminder(null);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to dismiss reminder.');
    }
  };

  const handleDeleteReminder = async (id: string) => {
    if (!window.confirm('Delete this reminder permanently?')) return;
    try {
      await dbClient.deleteReminder(id);
      fetchRemindersAndAssets();
      if (selectedReminder?.id === id) {
        setSelectedReminder(null);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete reminder.');
    }
  };

  const getProfileName = (uid: string) => {
    return profiles.find((p) => p.id === uid)?.full_name || 'Teammate';
  };

  const getLeadName = (lid?: string) => {
    if (!lid) return '';
    const lead = leads.find((l) => l.id === lid);
    return lead ? `${lead.company_name} (${lead.prospect_name})` : 'Lead';
  };

  const getTaskName = (tid?: string) => {
    if (!tid) return '';
    const task = tasks.find((t) => t.id === tid);
    return task ? task.title : 'Task';
  };

  // Calendar Day cell builder
  const getDaysInMonth = (year: number, month: number) => {
    const date = new Date(year, month, 1);
    const days: { date: Date; isCurrentMonth: boolean }[] = [];
    
    const startDayOfWeek = date.getDay();
    const prevMonthDate = new Date(year, month, 0);
    const prevMonthDaysCount = prevMonthDate.getDate();

    // Previous month padding
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthDaysCount - i),
        isCurrentMonth: false,
      });
    }

    // Current month days
    const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
    for (let i = 1; i <= daysInCurrentMonth; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true,
      });
    }

    // Next month padding to fill grid
    const remainingCells = 42 - days.length;
    for (let i = 1; i <= remainingCells; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
      });
    }

    return days;
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const days = getDaysInMonth(year, month);

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const setToday = () => {
    setCurrentDate(new Date());
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Drag and Drop implementation
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetDate: Date) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    if (!id) return;

    const rem = reminders.find(r => r.id === id);
    if (!rem) return;

    // Preserve hours and minutes
    const origTime = new Date(rem.reminder_time);
    const newTime = new Date(targetDate);
    newTime.setHours(origTime.getHours());
    newTime.setMinutes(origTime.getMinutes());
    newTime.setSeconds(origTime.getSeconds());

    const proposedTimeStr = newTime.toISOString();
    const updatedMockRem = { ...rem, reminder_time: proposedTimeStr };

    const conflict = getConflictingEvent(updatedMockRem, reminders);
    if (conflict) {
      const proceed = window.confirm(
        `Conflict warning: Rescheduling overlaps with "${conflict.title}" (scheduled at ${new Date(conflict.reminder_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}) by teammate. Reschedule anyway?`
      );
      if (!proceed) return;
    }

    try {
      await dbClient.updateReminder(id, { reminder_time: proposedTimeStr });
      fetchRemindersAndAssets();
    } catch (err: any) {
      alert(err.message || 'Failed to reschedule reminder.');
    }
  };

  const handleCellClick = (date: Date) => {
    // Check if clicked cell, not a card.
    const localIsoString = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    setDateTime(localIsoString);
    setIsCreating(true);
  };

  // Get color styles for reminder card
  const getReminderCardStyle = (rem: Reminder) => {
    const isOwner = rem.creator_id === currentUser?.id;
    const isInvited = rem.invited_users?.includes(currentUser?.id || '');

    if (rem.status === 'dismissed') {
      return 'bg-muted/30 text-muted-foreground border-border/40';
    }

    if (rem.is_company_event) {
      return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 hover:bg-emerald-500/15';
    }

    if (isOwner) {
      if (rem.invited_users && rem.invited_users.length > 0) {
        return 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20 hover:bg-purple-500/15';
      }
      return 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20 hover:bg-blue-500/15';
    }

    if (isInvited) {
      return 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20 hover:bg-amber-500/15';
    }

    return 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20 hover:bg-slate-500/15';
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 w-full max-w-[1600px] mx-auto select-none">
      {/* Top Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="text-xl font-extrabold text-foreground sm:text-2xl tracking-tight flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-primary" />
            <span>Shared Team Calendar</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            View shared company events and team schedule conflict details. Drag reminders to reschedule them.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center p-1 bg-muted/45 rounded-lg border border-border/60">
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                viewMode === 'calendar'
                  ? 'bg-card shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              📅 Grid View
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-card shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              📋 List View
            </button>
          </div>

          {!isCreating && (
            <button
              onClick={() => setIsCreating(true)}
              className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-primary-foreground bg-primary hover:bg-primary/95 shadow-sm rounded-md transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Schedule Event</span>
            </button>
          )}
        </div>
      </div>

      {isCreating ? (
        /* Create Reminder Form Card */
        <div className="border border-border rounded-xl bg-card p-6 shadow-sm max-w-2xl mx-auto">
          <h3 className="text-base font-bold text-foreground mb-4">Set Team Event & Reminder</h3>

          {error && (
            <div className="mb-4 flex items-center gap-2 bg-danger/10 border border-danger/20 p-3 rounded text-danger text-sm">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleCreateReminder} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                Event Title / Agenda <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Call John regarding Acme contract clauses"
                className="w-full text-xs bg-background border border-border text-foreground px-3 py-2.5 rounded focus:outline-none focus:border-primary"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                  Event Date & Time <span className="text-danger">*</span>
                </label>
                <input
                  type="datetime-local"
                  required
                  value={dateTime}
                  onChange={(e) => setDateTime(e.target.value)}
                  className="w-full text-xs bg-background border border-border text-foreground px-3 py-2 rounded focus:outline-none focus:border-primary cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                  Alert Offsets (minutes before)
                </label>
                <input
                  type="text"
                  value={offsetsInput}
                  onChange={(e) => setOffsetsInput(e.target.value)}
                  placeholder="e.g. 15, 30, 60"
                  className="w-full text-xs bg-background border border-border text-foreground px-3 py-2.5 rounded focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            <div className="flex flex-col gap-4 py-1">
               <label className="flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer select-none">
                 <input
                   type="checkbox"
                   checked={isCustom}
                   onChange={(e) => setIsCustom(e.target.checked)}
                   className="h-4 w-4 border-border rounded text-primary focus:ring-primary cursor-pointer"
                 />
                 <span>Mark as Custom Campaign Reminder</span>
               </label>

               <div className="space-y-1.5">
                 <label className="block text-xs font-semibold text-muted-foreground uppercase">
                   Reminder Classification
                 </label>
                 <div className="flex flex-wrap gap-4 py-1">
                   <label className="flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer select-none">
                     <input
                       type="radio"
                       name="reminderType"
                       value="personal"
                       checked={reminderType === 'personal'}
                       onChange={() => {
                         setReminderType('personal');
                         setInvitedUsers([]);
                       }}
                       className="h-4 w-4 border-border text-primary focus:ring-primary cursor-pointer"
                     />
                     <span>🔒 Personal Reminder</span>
                   </label>

                   <label className="flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer select-none">
                     <input
                       type="radio"
                       name="reminderType"
                       value="team"
                       checked={reminderType === 'team'}
                       onChange={() => setReminderType('team')}
                       className="h-4 w-4 border-border text-primary focus:ring-primary cursor-pointer"
                     />
                     <span>👥 Shared with Team</span>
                   </label>

                   <label className="flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer select-none">
                     <input
                       type="radio"
                       name="reminderType"
                       value="company"
                       checked={reminderType === 'company'}
                       onChange={() => {
                         setReminderType('company');
                         setInvitedUsers([]);
                       }}
                       className="h-4 w-4 border-border text-primary focus:ring-primary cursor-pointer"
                     />
                     <span className="text-emerald-600 dark:text-emerald-400 font-bold">🏢 Shared Company Event</span>
                   </label>
                 </div>
               </div>

               <div className="space-y-1">
                 <label className="block text-xs font-semibold text-muted-foreground uppercase">
                   Reminder Note
                 </label>
                 <textarea
                   value={notes}
                   onChange={(e) => setNotes(e.target.value)}
                   placeholder="Add notes or agenda for this alarm (e.g. Call details, meeting link, notes)..."
                   rows={3}
                   className="w-full text-xs bg-background border border-border text-foreground px-3 py-2 rounded focus:outline-none focus:border-primary"
                 />
               </div>
             </div>

            <div className="space-y-1.5 py-1">
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide">Alert Behavior</label>
              <div className="flex flex-col sm:flex-row gap-4">
                <label className="flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer">
                  <input
                    type="radio"
                    name="notificationType"
                    value="notification"
                    checked={notificationType === 'notification'}
                    onChange={() => setNotificationType('notification')}
                    className="h-4 w-4 border-border text-primary focus:ring-primary cursor-pointer"
                  />
                  <span>Desktop Notification (One-time Chime)</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer">
                  <input
                    type="radio"
                    name="notificationType"
                    value="alarm"
                    checked={notificationType === 'alarm'}
                    onChange={() => setNotificationType('alarm')}
                    className="h-4 w-4 border-border text-primary focus:ring-primary cursor-pointer"
                  />
                  <span>Continuous Alarm (Rings until Dismissed)</span>
                </label>
              </div>
            </div>

            <hr className="border-border" />

            {/* Asset Linkages */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Associations (Optional Link)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-semibold text-muted-foreground mb-1">
                    Link to Lead
                  </label>
                  <select
                    value={leadId}
                    onChange={(e) => setLeadId(e.target.value)}
                    className="w-full text-xs bg-background border border-border text-foreground px-2.5 py-2 rounded focus:outline-none focus:border-primary cursor-pointer"
                  >
                    <option value="">No Lead link...</option>
                    {leads.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.company_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-muted-foreground mb-1">
                    Link to Task
                  </label>
                  <select
                    value={taskId}
                    onChange={(e) => setTaskId(e.target.value)}
                    className="w-full text-xs bg-background border border-border text-foreground px-2.5 py-2 rounded focus:outline-none focus:border-primary cursor-pointer"
                  >
                    <option value="">No Task link...</option>
                    {tasks.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-muted-foreground mb-1">
                    Link to Company
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. Stark Industries"
                    className="w-full text-xs bg-background border border-border text-foreground px-2.5 py-2 rounded focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
            </div>

            <hr className="border-border" />

            {/* Teammate Invites */}
            {reminderType === 'team' && (
              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  <span>Invite Teammates</span>
                </h4>
                <p className="text-[10px] text-muted-foreground mb-3">
                  Invited teammates will receive notification alerts and can view this reminder in their calendar boards.
                </p>
                
                {/* Search Teammates */}
                <div className="mb-3 max-w-xs">
                  <input
                    type="text"
                    value={inviteSearchQuery}
                    onChange={(e) => setInviteSearchQuery(e.target.value)}
                    placeholder="Search colleagues..."
                    className="w-full px-2.5 py-2 bg-background border border-border text-xs rounded focus:outline-none focus:border-primary text-foreground"
                  />
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {profiles
                    .filter((p) => p.id !== currentUser?.id && p.status === 'active' && p.full_name.toLowerCase().includes(inviteSearchQuery.toLowerCase()))
                    .map((p) => {
                      const isInvited = invitedUsers.includes(p.id);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handleInviteToggle(p.id)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors cursor-pointer ${
                            isInvited
                              ? 'bg-primary/10 border-primary text-primary'
                              : 'bg-background border-border text-muted-foreground hover:bg-muted hover:text-foreground'
                          }`}
                        >
                          {isInvited && <Check className="h-3.5 w-3.5" />}
                          <span>{p.full_name}</span>
                        </button>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted rounded transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-semibold text-primary-foreground bg-primary hover:bg-primary/95 rounded transition-colors"
              >
                Set Reminder
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* Calendar Grid & Lists */
        <div className="space-y-4">
          
          {/* Calendar Navigation Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-card border border-border p-3.5 rounded-xl shadow-sm">
            <div className="flex items-center gap-2">
              <button
                onClick={prevMonth}
                className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg transition-colors border border-border"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <h3 className="text-sm font-extrabold text-foreground min-w-[120px] text-center tracking-tight">
                {monthNames[month]} {year}
              </h3>
              <button
                onClick={nextMonth}
                className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg transition-colors border border-border"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                onClick={setToday}
                className="ml-2 px-3 py-1 bg-muted hover:bg-muted/80 text-foreground border border-border rounded text-xs font-semibold transition-colors"
              >
                Today
              </button>
            </div>

            {/* Legend guide */}
            <div className="flex flex-wrap items-center gap-4 text-[10px] font-semibold text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/20 border border-emerald-500/40" />
                <span>Company Event</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-500/20 border border-blue-500/40" />
                <span>Personal</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-purple-500/20 border border-purple-500/40" />
                <span>Teammates Invited</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500/20 border border-amber-500/40" />
                <span>Invited By Others</span>
              </div>
            </div>
          </div>

          {viewMode === 'calendar' ? (
            /* Monthly Calendar Grid */
            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
              {/* Day names */}
              <div className="grid grid-cols-7 border-b border-border text-center py-2 text-xs font-extrabold text-muted-foreground bg-muted/20">
                <div>Sun</div>
                <div>Mon</div>
                <div>Tue</div>
                <div>Wed</div>
                <div>Thu</div>
                <div>Fri</div>
                <div>Sat</div>
              </div>

              {/* Grid cells */}
              <div className="grid grid-cols-7 grid-rows-6 divide-x divide-y divide-border/60">
                {days.map((day, index) => {
                  const isToday = day.date.toDateString() === new Date().toDateString();
                  const dayReminders = reminders.filter((rem) => {
                    const rDate = new Date(rem.reminder_time);
                    return (
                      rDate.getFullYear() === day.date.getFullYear() &&
                      rDate.getMonth() === day.date.getMonth() &&
                      rDate.getDate() === day.date.getDate()
                    );
                  });

                  return (
                    <div
                      key={index}
                      onClick={() => handleCellClick(day.date)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => handleDrop(e, day.date)}
                      className={`min-h-[70px] lg:min-h-[90px] p-1.5 flex flex-col justify-between transition-colors relative cursor-pointer group ${
                        day.isCurrentMonth
                          ? isToday
                            ? 'bg-primary/5 dark:bg-primary/10'
                            : 'bg-card hover:bg-muted/10'
                          : 'bg-muted/15 opacity-60'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={`text-[10px] lg:text-xs font-bold px-1 py-0.5 rounded-full ${
                            isToday
                              ? 'bg-primary text-primary-foreground font-extrabold shadow-sm'
                              : 'text-foreground'
                          }`}
                        >
                          {day.date.getDate()}
                        </span>
                        
                        {/* Cell Quick add button icon */}
                        <Plus className="h-3 w-3 text-muted-foreground/30 group-hover:text-primary transition-colors opacity-0 group-hover:opacity-100" />
                      </div>

                      {/* Reminder chips inside cell */}
                      <div className="flex-1 space-y-1 overflow-y-auto max-h-[45px] lg:max-h-[70px] scrollbar-none">
                        {dayReminders.map((rem) => {
                          const hasConflict = !!getConflictingEvent(rem, reminders);
                          
                          return (
                            <div
                              key={rem.id}
                              draggable="true"
                              onDragStart={(e) => handleDragStart(e, rem.id)}
                              onClick={(e) => {
                                e.stopPropagation(); // prevent opening create form
                                setSelectedReminder(rem);
                              }}
                              className={`flex items-center justify-between px-1 py-0.5 lg:px-2 lg:py-1 text-[9px] lg:text-[10px] font-bold border rounded shadow-sm transition-all truncate select-none cursor-grab active:cursor-grabbing ${getReminderCardStyle(
                                rem
                              )} ${hasConflict ? 'border-red-500 border-2' : ''}`}
                            >
                              <div className="flex items-center gap-1 truncate w-full">
                                {hasConflict && (
                                  <span title="Overlapping conflict within 1 hour!">
                                    <AlertTriangle
                                      className="h-3 w-3 text-red-600 dark:text-red-400 flex-shrink-0 animate-pulse"
                                    />
                                  </span>
                                )}
                                <span className="truncate">{rem.title}</span>
                              </div>
                              <span className="text-[8px] opacity-75 font-medium ml-1 flex-shrink-0">
                                {new Date(rem.reminder_time).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: false
                                })}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Traditional List View */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reminders.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 border border-border border-dashed bg-card rounded-lg text-center col-span-2">
                  <Calendar className="h-12 w-12 text-muted-foreground/30 mb-3" />
                  <h3 className="text-base font-bold text-foreground">No reminders active</h3>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                    Schedule calendar reminders to ping you before critical outbound sales sync points.
                  </p>
                </div>
              ) : (
                reminders.map((rem) => {
                  const rTime = new Date(rem.reminder_time);
                  const isUpcoming = rTime.getTime() > Date.now();
                  const hasConflict = !!getConflictingEvent(rem, reminders);

                  return (
                    <div
                      key={rem.id}
                      onClick={() => setSelectedReminder(rem)}
                      className={`border border-border p-4 rounded-xl bg-card shadow-sm flex flex-col justify-between gap-4 transition-opacity cursor-pointer hover:border-primary/40 ${
                        rem.status === 'dismissed' ? 'opacity-65 bg-muted/10' : ''
                      } ${hasConflict ? 'border-red-500 border-2' : ''}`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-sm font-bold text-foreground leading-snug flex items-center gap-1.5">
                            {hasConflict && (
                              <span title="Overlapping conflict!">
                                <AlertTriangle className="h-4 w-4 text-red-500 animate-pulse flex-shrink-0" />
                              </span>
                            )}
                            <span className="break-words">{rem.title}</span>
                          </h4>
                          
                          {rem.status === 'active' && !isUpcoming && (
                            <span className="flex h-2 w-2 relative flex-shrink-0 mt-1">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-danger opacity-75 animate-none animate-pulse"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-danger"></span>
                            </span>
                          )}
                        </div>

                        {/* Association tags links */}
                        {(rem.company_name || rem.lead_id || rem.task_id) && (
                          <div className="flex flex-wrap gap-1.5 text-[9px] font-semibold text-muted-foreground">
                            {rem.company_name && (
                              <span className="bg-muted px-1.5 py-0.5 rounded border border-border/30">
                                🏢 {rem.company_name}
                              </span>
                            )}
                            {rem.lead_id && (
                              <span className="bg-muted px-1.5 py-0.5 rounded border border-border/30">
                                💼 {getLeadName(rem.lead_id)}
                              </span>
                            )}
                            {rem.task_id && (
                              <span className="bg-muted px-1.5 py-0.5 rounded border border-border/30">
                                📋 {getTaskName(rem.task_id)}
                              </span>
                            )}
                          </div>
                        )}

                        <div className="flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>
                              {rTime.toLocaleDateString()} at{' '}
                              {rTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </span>

                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            <span>Owner: {getProfileName(rem.creator_id)}</span>
                          </span>

                          <span className="flex items-center gap-1">
                            <span className={rem.notification_type === 'alarm' ? 'text-danger font-semibold' : 'text-primary font-semibold'}>
                              {rem.notification_type === 'alarm' ? '🚨 Continuous Alarm' : '🔔 Notification'}
                            </span>
                          </span>
                        </div>

                        {rem.invited_users && rem.invited_users.length > 0 && (
                          <div className="pt-1 flex items-center gap-1.5">
                            <span className="text-[9px] text-muted-foreground font-semibold">Invited Teammates:</span>
                            <div className="flex -space-x-1.5 overflow-hidden">
                              {rem.invited_users.map((uid) => (
                                <span
                                  key={uid}
                                  className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-secondary text-[8px] font-bold text-white border border-card uppercase"
                                  title={getProfileName(uid)}
                                >
                                  {getProfileName(uid).split(' ').map((n) => n[0]).join('')}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between border-t border-border/40 pt-3 text-xs" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold capitalize text-[10px] ${
                            rem.status === 'dismissed' ? 'text-muted-foreground' : 'text-primary'
                          }`}>
                            {rem.status === 'dismissed' ? 'dismissed' : 'scheduled'}
                          </span>

                          <button
                            onClick={() => handleDeleteReminder(rem.id)}
                            className="p-1 text-muted-foreground hover:text-danger hover:bg-muted/60 rounded transition-colors cursor-pointer"
                            title="Delete reminder"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {rem.status === 'active' && (
                          <button
                            onClick={() => handleDismissReminder(rem.id)}
                            className="px-2.5 py-1 bg-muted hover:bg-muted/80 text-foreground border border-border rounded text-[10px] font-semibold transition-colors cursor-pointer"
                          >
                            Dismiss / Silent
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}

      {/* Detail Modal Overlay */}
      {selectedReminder && (
        <div
          className="fixed inset-0 bg-background/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4"
          onClick={() => setSelectedReminder(null)}
        >
          <div
            className="bg-card w-full max-w-md rounded-xl border border-border shadow-2xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-border pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-foreground leading-snug">
                  {selectedReminder.title}
                </h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Scheduled by {getProfileName(selectedReminder.creator_id)}
                </p>
              </div>

              {selectedReminder.is_company_event && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[9px] font-bold">
                  Company Event
                </span>
              )}
            </div>

            {/* Time details */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4 text-primary" />
                <span>
                  {new Date(selectedReminder.reminder_time).toLocaleDateString(undefined, {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground pl-6">
                <span>
                  At {new Date(selectedReminder.reminder_time).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            </div>

            {/* Notes details */}
            {selectedReminder.notes && (
              <div className="bg-muted/40 border border-border/60 p-3 rounded-lg text-xs space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Reminder Note</span>
                <p className="text-foreground leading-relaxed whitespace-pre-wrap">{selectedReminder.notes}</p>
              </div>
            )}

            {/* Conflict details */}
            {(() => {
              const conflict = getConflictingEvent(selectedReminder, reminders);
              if (conflict) {
                return (
                  <div className="p-3 bg-danger/10 border border-danger/20 rounded-lg text-danger text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-bold">
                      <AlertTriangle className="h-4 w-4" />
                      <span>Overlapping Sync Conflict!</span>
                    </div>
                    <p className="text-[10px] leading-relaxed">
                      This overlapping reminder occurs within 1 hour of teammate event: 
                      <strong> "{conflict.title}"</strong> (scheduled at {new Date(conflict.reminder_time).toLocaleTimeString()}).
                    </p>
                  </div>
                );
              }
              return null;
            })()}

            {/* Associations */}
            {(selectedReminder.company_name || selectedReminder.lead_id || selectedReminder.task_id) && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Linked Entities</span>
                <div className="grid grid-cols-1 gap-1 text-xs">
                  {selectedReminder.company_name && (
                    <div className="flex items-center gap-2 text-foreground bg-muted/40 p-2 rounded border border-border/30">
                      <span>🏢</span>
                      <span>Company: {selectedReminder.company_name}</span>
                    </div>
                  )}
                  {selectedReminder.lead_id && (
                    <div className="flex items-center gap-2 text-foreground bg-muted/40 p-2 rounded border border-border/30">
                      <span>💼</span>
                      <span>Lead: {getLeadName(selectedReminder.lead_id)}</span>
                    </div>
                  )}
                  {selectedReminder.task_id && (
                    <div className="flex items-center gap-2 text-foreground bg-muted/40 p-2 rounded border border-border/30">
                      <span>📋</span>
                      <span>Task: {getTaskName(selectedReminder.task_id)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Invites list */}
            {selectedReminder.invited_users && selectedReminder.invited_users.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Invited Teammates</span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedReminder.invited_users.map((uid) => (
                    <span
                      key={uid}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-secondary/10 border border-secondary/20 text-xs font-semibold text-foreground"
                    >
                      <User className="h-3 w-3 text-secondary mr-1" />
                      {getProfileName(uid)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-between border-t border-border pt-4 mt-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDeleteReminder(selectedReminder.id)}
                  className="flex items-center gap-1.5 px-3 py-2 border border-danger/20 bg-danger/10 hover:bg-danger/15 text-danger rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete Event</span>
                </button>

                {selectedReminder.status === 'active' && (
                  <button
                    onClick={() => handleDismissReminder(selectedReminder.id)}
                    className="flex items-center gap-1.5 px-3 py-2 border border-border hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <VolumeX className="h-3.5 w-3.5" />
                    <span>Dismiss Alert</span>
                  </button>
                )}
              </div>

              <button
                onClick={() => setSelectedReminder(null)}
                className="px-4 py-2 bg-primary hover:bg-primary/95 text-primary-foreground rounded-lg text-xs font-semibold shadow-sm transition-colors cursor-pointer"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
