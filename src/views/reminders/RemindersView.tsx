import React, { useState, useEffect } from 'react';
import { dbClient } from '../../services/dbClient';
import { useAuth } from '../../context/AuthContext';
import type { Reminder, Lead, Task } from '../../types/database';
import { AlertCircle, Calendar, Clock, Plus, User, Users, Check, Trash2 } from 'lucide-react';

export const RemindersView: React.FC = () => {
  const { currentUser, profiles } = useAuth();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  // Creation form states
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [offsetsInput, setOffsetsInput] = useState('15');
  const [isCustom, setIsCustom] = useState(false);
  
  // Associations
  const [leadId, setLeadId] = useState('');
  const [taskId, setTaskId] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [notificationType, setNotificationType] = useState<'notification' | 'alarm'>('notification');

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

    return () => {
      unsubscribe();
    };
  }, [currentUser]);

  const handleCreateReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !dateTime) {
      setError('Title and Time are required.');
      return;
    }

    try {
      // Notification permission request check before reminder save
      if ('Notification' in window && Notification.permission === 'default') {
        await Notification.requestPermission();
      }

      const offsets = offsetsInput
        .split(',')
        .map((x) => parseInt(x.trim(), 10))
        .filter((x) => !isNaN(x));

      await dbClient.createReminder({
        title: title.trim(),
        reminder_time: new Date(dateTime).toISOString(),
        reminder_offsets: offsets,
        is_custom: isCustom,
        notification_type: notificationType,
        lead_id: leadId || undefined,
        task_id: taskId || undefined,
        company_name: companyName.trim() || undefined,
        invited_users: invitedUsers
      });

      // Reset form states
      setTitle('');
      setDateTime('');
      setOffsetsInput('15');
      setIsCustom(false);
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
    } catch (err: any) {
      alert(err.message || 'Failed to dismiss reminder.');
    }
  };

  const handleDeleteReminder = async (id: string) => {
    if (!window.confirm('Delete this reminder permanently?')) return;
    try {
      await dbClient.deleteReminder(id);
      fetchRemindersAndAssets();
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

  return (
    <div className="p-4 sm:p-6 space-y-6 w-full max-w-[1600px] mx-auto">
      {/* Top Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="text-xl font-extrabold text-foreground sm:text-2xl tracking-tight">Calendar Reminders</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Google Calendar-like reminders. Invite teammates, link accounts, and setup alarms.
          </p>
        </div>

        {!isCreating && (
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-primary-foreground bg-primary hover:bg-primary/95 shadow-sm rounded-md transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Create Reminder</span>
          </button>
        )}
      </div>

      {isCreating ? (
        /* Create Reminder Form Card */
        <div className="border border-border rounded-lg bg-card p-6 shadow-sm max-w-2xl mx-auto">
          <h3 className="text-base font-bold text-foreground mb-4">Set Calendar Reminder</h3>

          {error && (
            <div className="mb-4 flex items-center gap-2 bg-danger/10 border border-danger/20 p-3 rounded text-danger text-sm">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleCreateReminder} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Reminder Title <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Call John regarding Acme contract clauses"
                className="w-full text-sm bg-background border border-border text-foreground px-3 py-2 rounded focus:outline-none focus:border-primary"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Reminder Date & Time <span className="text-danger">*</span>
                </label>
                <input
                  type="datetime-local"
                  required
                  value={dateTime}
                  onChange={(e) => setDateTime(e.target.value)}
                  className="w-full text-sm bg-background border border-border text-foreground px-3 py-2 rounded focus:outline-none focus:border-primary cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Alert Offsets (minutes before)
                </label>
                <input
                  type="text"
                  value={offsetsInput}
                  onChange={(e) => setOffsetsInput(e.target.value)}
                  placeholder="e.g. 15, 30, 60"
                  className="w-full text-sm bg-background border border-border text-foreground px-3 py-2 rounded focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 py-1">
              <input
                type="checkbox"
                id="isCustom"
                checked={isCustom}
                onChange={(e) => setIsCustom(e.target.checked)}
                className="h-4 w-4 border-border rounded text-primary focus:ring-primary cursor-pointer"
              />
              <label htmlFor="isCustom" className="text-xs font-medium text-foreground cursor-pointer select-none">
                Mark as Custom Campaign Reminder
              </label>
            </div>

            <div className="space-y-1.5 py-1">
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide">Alert Behavior</label>
              <div className="flex flex-col sm:flex-row gap-3">
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
                  <label className="block text-[10px] font-medium text-muted-foreground mb-1">
                    Link to Lead
                  </label>
                  <select
                    value={leadId}
                    onChange={(e) => setLeadId(e.target.value)}
                    className="w-full text-xs bg-background border border-border text-foreground px-2.5 py-1.5 rounded focus:outline-none focus:border-primary cursor-pointer"
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
                  <label className="block text-[10px] font-medium text-muted-foreground mb-1">
                    Link to Task
                  </label>
                  <select
                    value={taskId}
                    onChange={(e) => setTaskId(e.target.value)}
                    className="w-full text-xs bg-background border border-border text-foreground px-2.5 py-1.5 rounded focus:outline-none focus:border-primary cursor-pointer"
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
                  <label className="block text-[10px] font-medium text-muted-foreground mb-1">
                    Link to Company
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. Stark Industries"
                    className="w-full text-xs bg-background border border-border text-foreground px-2.5 py-1.5 rounded focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
            </div>

            <hr className="border-border" />

            {/* Teammate Invites */}
            <div>
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
                  className="w-full px-2.5 py-1.5 bg-background border border-border text-xs rounded focus:outline-none focus:border-primary text-foreground"
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
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border transition-colors cursor-pointer ${
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

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted rounded transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/95 rounded transition-colors"
              >
                Set Reminder
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* Reminder List */
        <div className="space-y-4">
          {reminders.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 border border-border border-dashed bg-card rounded-lg text-center">
              <Calendar className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <h3 className="text-base font-bold text-foreground">No reminders active</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                Schedule calendar reminders to ping you before critical outbound sales sync points.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reminders.map((rem) => {
                const rTime = new Date(rem.reminder_time);
                const isUpcoming = rTime.getTime() > Date.now();

                return (
                  <div
                    key={rem.id}
                    className={`border border-border p-4 rounded-lg bg-card shadow-sm flex flex-col justify-between gap-4 transition-opacity ${
                      rem.status === 'dismissed' ? 'opacity-65 bg-muted/10' : ''
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-sm font-bold text-foreground leading-snug break-words">
                          {rem.title}
                        </h4>
                        
                        {rem.status === 'active' && !isUpcoming && (
                          <span className="flex h-2 w-2 relative flex-shrink-0 mt-1">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-danger opacity-75"></span>
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
                          <span className={rem.notification_type === 'alarm' ? 'text-danger font-semibold' : 'text-primary font-medium'}>
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

                    <div className="flex items-center justify-between border-t border-border/40 pt-3 text-xs">
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
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
