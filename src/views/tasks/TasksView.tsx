import React, { useState, useEffect } from 'react';
import { dbClient } from '../../services/dbClient';
import { useAuth } from '../../context/AuthContext';
import type { Task, TaskPriority, TaskStatus, TaskType } from '../../types/database';
import { AlertCircle, CheckSquare, Clock, Plus, Trash2, Paperclip, X, Edit2, Lock, RefreshCw } from 'lucide-react';

export const TasksView: React.FC = () => {
  const { currentUser, profiles } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'personal' | 'assigned' | 'team'>(() => {
    return (localStorage.getItem('relayhq_tasks_active_tab') as any) || 'all';
  });
  const filteredTasks = tasks.filter((t) => {
    if (activeTab === 'all') return true;
    return t.type === activeTab;
  });
  
  // Creation form states
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [type, setType] = useState<TaskType>('personal');
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [assigneeSearchText, setAssigneeSearchText] = useState('');
  const [deadline, setDeadline] = useState('');
  const [offsetsInput, setOffsetsInput] = useState('15, 30');
  const [taskAttachments, setTaskAttachments] = useState<{ name: string; url: string }[]>([]);
  const [attachmentName, setAttachmentName] = useState('');

  // Recurrence states
  const [recurrenceType, setRecurrenceType] = useState<'none' | 'daily' | 'weekly' | 'monthly' | 'custom'>('none');
  const [recurrenceInterval, setRecurrenceInterval] = useState(1);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('');
  const [selectedTaskIndex, setSelectedTaskIndex] = useState(-1);

  // Editing form states
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPriority, setEditPriority] = useState<TaskPriority>('medium');
  const [editType, setEditType] = useState<TaskType>('personal');
  const [editAssigneeIds, setEditAssigneeIds] = useState<string[]>([]);
  const [editAssigneeSearchText, setEditAssigneeSearchText] = useState('');
  const [editDeadline, setEditDeadline] = useState('');
  const [editOffsetsInput, setEditOffsetsInput] = useState('');
  const [editTaskAttachments, setEditTaskAttachments] = useState<{ name: string; url: string }[]>([]);
  const [editAttachmentName, setEditAttachmentName] = useState('');
  const [editRecurrenceType, setEditRecurrenceType] = useState<'none' | 'daily' | 'weekly' | 'monthly' | 'custom'>('none');
  const [editRecurrenceInterval, setEditRecurrenceInterval] = useState(1);
  const [editRecurrenceEndDate, setEditRecurrenceEndDate] = useState('');
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('relayhq_tasks_active_tab', activeTab);
    setSelectedTaskIndex(-1); // Reset highlight when changing tab
  }, [activeTab]);

  const selectedTask = selectedTaskIndex >= 0 && selectedTaskIndex < filteredTasks.length 
    ? filteredTasks[selectedTaskIndex] 
    : null;

  useEffect(() => {
    if (selectedTask) {
      setEditTitle(selectedTask.title);
      setEditDescription(selectedTask.description || '');
      setEditPriority(selectedTask.priority);
      setEditType(selectedTask.type);
      setEditAssigneeIds(selectedTask.assignee_ids || (selectedTask.assignee_id ? [selectedTask.assignee_id] : []));
      setEditDeadline(selectedTask.deadline ? new Date(selectedTask.deadline).toISOString().substring(0, 16) : '');
      setEditOffsetsInput(selectedTask.reminder_offsets ? selectedTask.reminder_offsets.join(', ') : '');
      setEditTaskAttachments(selectedTask.attachments || []);
      setEditRecurrenceType(selectedTask.recurrence_type || 'none');
      setEditRecurrenceInterval(selectedTask.recurrence_interval || 1);
      setEditRecurrenceEndDate(selectedTask.recurrence_end_date ? selectedTask.recurrence_end_date.substring(0, 10) : '');
      setEditError(null);
      setIsEditing(false);
    } else {
      setIsEditing(false);
    }
  }, [selectedTask?.id]);

  const handleRemoveAttachment = (idxToRemove: number) => {
    setTaskAttachments(taskAttachments.filter((_, idx) => idx !== idxToRemove));
  };

  const handleEditAddAttachment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editAttachmentName.trim()) return;
    setEditTaskAttachments([...editTaskAttachments, { name: editAttachmentName.trim(), url: '#' }]);
    setEditAttachmentName('');
  };

  const handleEditRemoveAttachment = (idxToRemove: number) => {
    setEditTaskAttachments(editTaskAttachments.filter((_, idx) => idx !== idxToRemove));
  };

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;
    if (!editTitle.trim()) {
      setEditError('Task title is required.');
      return;
    }
    if (editType === 'assigned' && editAssigneeIds.length === 0) {
      setEditError('Please assign at least one teammate.');
      return;
    }

    try {
      const offsets = editOffsetsInput
        .split(',')
        .map((x) => parseInt(x.trim(), 10))
        .filter((x) => !isNaN(x));

      const selectedAssignees = editType === 'personal'
        ? [currentUser?.id || '']
        : editType === 'assigned'
        ? editAssigneeIds
        : [];

      await dbClient.updateTask(selectedTask.id, {
        title: editTitle.trim(),
        description: editDescription.trim(),
        assignee_id: selectedAssignees[0] || undefined,
        assignee_ids: selectedAssignees,
        priority: editPriority,
        type: editType,
        deadline: editDeadline ? new Date(editDeadline).toISOString() : undefined,
        reminder_offsets: offsets,
        attachments: editTaskAttachments,
        recurrence_type: editRecurrenceType,
        recurrence_interval: editRecurrenceInterval,
        recurrence_end_date: editRecurrenceEndDate ? new Date(editRecurrenceEndDate).toISOString() : undefined
      });

      setEditError(null);
      setIsEditing(false);
      fetchTasks();
    } catch (err: any) {
      setEditError(err.message || 'Failed to update task.');
    }
  };

  const handleDeleteTaskFromPreview = async (id: string) => {
    if (!window.confirm('Delete this task permanently?')) return;
    try {
      await dbClient.deleteTask(id);
      setSelectedTaskIndex(-1);
      fetchTasks();
    } catch (err: any) {
      alert(err.message || 'Failed to delete task.');
    }
  };

  const [error, setError] = useState<string | null>(null);

  const fetchTasks = async () => {
    const data = await dbClient.getTasks();
    setTasks(data);
  };

  useEffect(() => {
    fetchTasks();

    const unsubscribe = dbClient.subscribe((table) => {
      if (table === 'tasks') {
        fetchTasks();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [currentUser]);

  // Set default assignee on creation
  useEffect(() => {
    if (isCreating) {
      if (type === 'personal') {
        setAssigneeIds([currentUser?.id || '']);
      } else {
        setAssigneeIds([]);
      }
    }
  }, [currentUser, isCreating, type]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Task title is required.');
      return;
    }
    if (type === 'assigned' && assigneeIds.length === 0) {
      setError('Please assign at least one teammate.');
      return;
    }

    try {
      const offsets = offsetsInput
        .split(',')
        .map((x) => parseInt(x.trim(), 10))
        .filter((x) => !isNaN(x));

      // Notification permission request check before task save
      if ('Notification' in window && Notification.permission === 'default') {
        await Notification.requestPermission();
      }

      const selectedAssignees = type === 'personal'
        ? [currentUser?.id || '']
        : type === 'assigned'
        ? assigneeIds
        : [];

      await dbClient.createTask({
        title: title.trim(),
        description: description.trim(),
        assignee_id: selectedAssignees[0] || undefined,
        assignee_ids: selectedAssignees,
        priority,
        type,
        deadline: deadline ? new Date(deadline).toISOString() : undefined,
        reminder_offsets: offsets,
        status: 'todo',
        attachments: taskAttachments,
        recurrence_type: recurrenceType,
        recurrence_interval: recurrenceInterval,
        recurrence_end_date: recurrenceEndDate ? new Date(recurrenceEndDate).toISOString() : undefined
      });

      // Reset form
      setTitle('');
      setDescription('');
      setPriority('medium');
      setType('personal');
      setDeadline('');
      setOffsetsInput('15, 30');
      setTaskAttachments([]);
      setAssigneeIds([]);
      setRecurrenceType('none');
      setRecurrenceInterval(1);
      setRecurrenceEndDate('');
      setError(null);
      setIsCreating(false);
      fetchTasks();
    } catch (err: any) {
      setError(err.message || 'Failed to create task.');
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: TaskStatus) => {
    const nextStatusMap: Record<TaskStatus, TaskStatus> = {
      todo: 'in_progress',
      in_progress: 'done',
      done: 'todo'
    };
    try {
      await dbClient.updateTask(id, { status: nextStatusMap[currentStatus] });
      fetchTasks();
    } catch (err: any) {
      alert(err.message || 'Failed to toggle status.');
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (!window.confirm('Delete this task permanently?')) return;
    try {
      await dbClient.deleteTask(id);
      setSelectedTaskIndex(-1);
      fetchTasks();
    } catch (err: any) {
      alert(err.message || 'Failed to delete task.');
    }
  };

  const handleAddAttachment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!attachmentName.trim()) return;
    setTaskAttachments([...taskAttachments, { name: attachmentName.trim(), url: '#' }]);
    setAttachmentName('');
  };

  const getProfileName = (uid?: string) => {
    if (!uid) return 'Unassigned';
    return profiles.find((p) => p.id === uid)?.full_name || 'Teammate';
  };



  // Listen to keyboard command events
  useEffect(() => {
    const handleCreate = () => {
      setIsCreating(true);
    };

    const handleDown = () => {
      if (isCreating) return;
      setSelectedTaskIndex((prev) => {
        if (filteredTasks.length === 0) return -1;
        return (prev + 1) % filteredTasks.length;
      });
    };

    const handleUp = () => {
      if (isCreating) return;
      setSelectedTaskIndex((prev) => {
        if (filteredTasks.length === 0) return -1;
        return prev <= 0 ? filteredTasks.length - 1 : prev - 1;
      });
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isCreating) return;
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea' || document.activeElement?.getAttribute('contenteditable') === 'true') {
        return;
      }

      if (e.key === 'Enter' || e.key === ' ') {
        if (selectedTaskIndex >= 0 && selectedTaskIndex < filteredTasks.length) {
          e.preventDefault();
          const task = filteredTasks[selectedTaskIndex];
          handleToggleStatus(task.id, task.status);
        }
      }
      
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedTaskIndex >= 0 && selectedTaskIndex < filteredTasks.length) {
          e.preventDefault();
          const task = filteredTasks[selectedTaskIndex];
          handleDeleteTask(task.id);
        }
      }
    };

    window.addEventListener('command-create-task', handleCreate);
    window.addEventListener('command-navigate-down', handleDown);
    window.addEventListener('command-navigate-up', handleUp);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('command-create-task', handleCreate);
      window.removeEventListener('command-navigate-down', handleDown);
      window.removeEventListener('command-navigate-up', handleUp);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [filteredTasks, selectedTaskIndex, isCreating]);

  // Scroll highlighted task into view
  useEffect(() => {
    if (selectedTaskIndex >= 0 && filteredTasks[selectedTaskIndex]) {
      const el = document.getElementById(`task-card-${filteredTasks[selectedTaskIndex].id}`);
      if (el) {
        el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedTaskIndex]);

  return (
    <div className="p-4 sm:p-6 space-y-6 w-full max-w-[1600px] mx-auto">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="text-xl font-extrabold text-foreground sm:text-2xl tracking-tight">Task Center</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Assign work, track progress, and manage personal daily action items.
          </p>
        </div>

        {!isCreating && (
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-primary-foreground bg-primary hover:bg-primary/95 shadow-sm rounded-md transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Create Task</span>
          </button>
        )}
      </div>

      {isCreating ? (
        /* Task Editor Form */
        <div className="border border-border rounded-lg bg-card p-6 shadow-sm max-w-2xl mx-auto">
          <h3 className="text-base font-bold text-foreground mb-4">New Task</h3>

          {error && (
            <div className="mb-4 flex items-center gap-2 bg-danger/10 border border-danger/20 p-3 rounded text-danger text-sm">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleCreateTask} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Task Title <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Follow up on proposal signed copy"
                className="w-full text-sm bg-background border border-border text-foreground px-3 py-2 rounded focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Specify core actions, expected outcomes..."
                rows={3}
                className="w-full text-sm bg-background border border-border text-foreground px-3 py-2 rounded focus:outline-none focus:border-primary resize-y"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Task Scope / Type
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as TaskType)}
                  className="w-full text-sm bg-background border border-border text-foreground px-3 py-2 rounded focus:outline-none focus:border-primary cursor-pointer"
                >
                  <option value="personal">Personal Item</option>
                  <option value="assigned">Assigned Teammate</option>
                  <option value="team">Team-wide Announcement</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Task Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TaskPriority)}
                  className="w-full text-sm bg-background border border-border text-foreground px-3 py-2 rounded focus:outline-none focus:border-primary cursor-pointer"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>

            {type === 'assigned' && (
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Assign To Team Members <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Search teammates by name..."
                  value={assigneeSearchText}
                  onChange={(e) => setAssigneeSearchText(e.target.value)}
                  className="w-full text-xs bg-background border border-border text-foreground px-3 py-2 rounded-lg focus:outline-none focus:border-primary mb-2"
                />
                <div className="max-h-40 overflow-y-auto border border-border rounded-lg p-2.5 space-y-2 bg-background/50">
                  {profiles
                    .filter((p) => p.status === 'active' && p.full_name.toLowerCase().includes(assigneeSearchText.toLowerCase()))
                    .map((p) => {
                      const isChecked = assigneeIds.includes(p.id);
                      return (
                        <label key={p.id} className="flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer hover:bg-muted/40 p-1.5 rounded transition-colors">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              if (isChecked) {
                                setAssigneeIds(assigneeIds.filter(id => id !== p.id));
                              } else {
                                setAssigneeIds([...assigneeIds, p.id]);
                              }
                            }}
                            className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary cursor-pointer"
                          />
                          <span>{p.full_name} ({p.role === 'head' ? 'Head' : 'Specialist'})</span>
                        </label>
                      );
                    })}
                  {profiles.filter((p) => p.status === 'active' && p.full_name.toLowerCase().includes(assigneeSearchText.toLowerCase())).length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-2">No matching active teammates</p>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Deadline / Due Date
                </label>
                <input
                  type="datetime-local"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full text-sm bg-background border border-border text-foreground px-3 py-2 rounded focus:outline-none focus:border-primary cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Reminder Offsets (minutes before)
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

            {/* Recurrence Options */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-border/40 pt-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1 font-semibold uppercase tracking-wider">
                  🔄 Recurrence Type
                </label>
                <select
                  value={recurrenceType}
                  onChange={(e) => setRecurrenceType(e.target.value as any)}
                  className="w-full text-xs bg-background border border-border text-foreground px-3 py-2 rounded focus:outline-none focus:border-primary cursor-pointer font-medium"
                >
                  <option value="none">None (One-time)</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>

              {recurrenceType !== 'none' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1 font-semibold uppercase tracking-wider">
                      Repeat Every (Interval)
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={recurrenceInterval}
                      onChange={(e) => setRecurrenceInterval(parseInt(e.target.value, 10) || 1)}
                      className="w-full text-xs bg-background border border-border text-foreground px-3 py-2 rounded focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1 font-semibold uppercase tracking-wider">
                      End Date (Optional)
                    </label>
                    <input
                      type="date"
                      value={recurrenceEndDate}
                      onChange={(e) => setRecurrenceEndDate(e.target.value)}
                      className="w-full text-xs bg-background border border-border text-foreground px-3 py-2 rounded focus:outline-none focus:border-primary cursor-pointer"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Task Attachments Sub-list */}
            <div className="pt-2">
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Task Attachments
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={attachmentName}
                  onChange={(e) => setAttachmentName(e.target.value)}
                  placeholder="Simulated attachment filename.pdf"
                  className="flex-1 text-xs bg-background border border-border text-foreground px-3 py-1.5 rounded focus:outline-none focus:border-primary"
                />
                <button
                  type="button"
                  onClick={handleAddAttachment}
                  className="px-3 py-1.5 bg-muted border border-border text-foreground hover:bg-muted/80 rounded text-xs font-semibold"
                >
                  Add Asset
                </button>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {taskAttachments.map((f, i) => (
                  <span key={i} className="flex items-center gap-1.5 bg-muted px-2.5 py-1 rounded-full text-xs text-foreground">
                    <Paperclip className="h-3 w-3 text-muted-foreground" />
                    <span>{f.name}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveAttachment(i)}
                      className="text-muted-foreground hover:text-danger rounded-full focus:outline-none ml-1 text-sm font-bold w-4 h-4 inline-flex items-center justify-center hover:bg-danger/10 transition-colors"
                      title="Remove attachment"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Action buttons */}
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
                Save Task
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* Task Board Listings */
        <div className="space-y-4">
          {/* Tab Selector */}
          <div className="flex items-center border border-border p-0.5 bg-muted/20 rounded-md self-start w-full sm:w-fit overflow-x-auto scrollbar-none flex-nowrap flex-shrink-0">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded flex-shrink-0 ${
                activeTab === 'all' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              All Tasks
            </button>
            <button
              onClick={() => setActiveTab('personal')}
              className={`px-3 py-1.5 text-xs font-semibold rounded flex-shrink-0 ${
                activeTab === 'personal' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Personal Tasks
            </button>
            <button
              onClick={() => setActiveTab('assigned')}
              className={`px-3 py-1.5 text-xs font-semibold rounded flex-shrink-0 ${
                activeTab === 'assigned' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Assigned Tasks
            </button>
            <button
              onClick={() => setActiveTab('team')}
              className={`px-3 py-1.5 text-xs font-semibold rounded flex-shrink-0 ${
                activeTab === 'team' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Team Tasks
            </button>
          </div>

          {filteredTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 border border-border border-dashed bg-card rounded-lg text-center">
              <CheckSquare className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <h3 className="text-base font-bold text-foreground">No tasks logged</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                No checklist tasks fit this tab criteria. Add action items to streamline your daily workflow.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTasks.map((task, idx) => {
                const isSelected = selectedTaskIndex === idx;
                return (
                  <div
                    key={task.id}
                    id={`task-card-${task.id}`}
                    onClick={() => setSelectedTaskIndex(idx)}
                    className={`border p-4 rounded-lg shadow-sm flex items-start gap-3 transition-all duration-200 cursor-pointer ${
                      task.status === 'done' ? 'opacity-75 bg-muted/20' : 'bg-card'
                    } ${
                      isSelected 
                        ? 'border-primary ring-2 ring-primary/20 bg-primary/5 shadow-md scale-[1.01]' 
                        : 'border-border hover:border-primary/50 hover:shadow-md'
                    }`}
                  >
                    {/* Status Toggle Box */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleStatus(task.id, task.status);
                      }}
                      className={`h-5 w-5 rounded border mt-0.5 flex-shrink-0 flex items-center justify-center transition-colors cursor-pointer ${
                        task.status === 'done'
                          ? 'bg-success border-success text-white'
                          : 'border-border hover:border-primary hover:bg-primary/5 bg-background'
                      }`}
                      title="Toggle status"
                    >
                      {task.status === 'done' && (
                        <svg className="h-3 w-3 stroke-current stroke-2" fill="none" viewBox="0 0 24 24">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </button>

                    {/* Content Area */}
                    <div className="flex-1 min-w-0 space-y-2">
                      <div>
                        <h4 className={`text-sm font-bold text-foreground leading-snug break-words ${
                          task.status === 'done' ? 'line-through text-muted-foreground' : ''
                        }`}>
                          {task.title}
                        </h4>
                        {task.description && (
                          <p className="text-xs text-muted-foreground mt-1 break-words line-clamp-3 leading-relaxed">
                            {task.description}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground font-semibold">
                        <span className={`px-1.5 py-0.5 rounded font-bold uppercase ${
                          task.priority === 'high' ? 'bg-danger/10 text-danger' :
                          task.priority === 'medium' ? 'bg-warning/10 text-warning' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {task.priority} Priority
                        </span>

                        <span className="bg-muted px-1.5 py-0.5 rounded uppercase">
                          {task.type}
                        </span>

                        {task.deadline && (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>Due {new Date(task.deadline).toLocaleDateString()}</span>
                          </span>
                        )}

                        {task.recurrence_type && task.recurrence_type !== 'none' && (
                          <span className="flex items-center gap-1 text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded font-bold uppercase text-[9px] tracking-wide">
                            🔄 {task.recurrence_type} {task.recurrence_interval && task.recurrence_interval > 1 ? `(every ${task.recurrence_interval})` : ''}
                          </span>
                        )}

                        {task.type !== 'personal' && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">For:</span>
                            <div className="flex flex-wrap gap-1">
                              {task.assignee_ids && task.assignee_ids.length > 0 ? (
                                task.assignee_ids.map((uid) => {
                                  const name = getProfileName(uid);
                                  const initials = name
                                    .split(' ')
                                    .map((n) => n[0])
                                    .join('')
                                    .substring(0, 2)
                                    .toUpperCase();
                                  return (
                                    <span
                                      key={uid}
                                      title={name}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-bold text-primary shadow-sm"
                                    >
                                      <span className="h-4 w-4 rounded-full bg-primary/20 flex items-center justify-center text-[8px] font-black">
                                        {initials}
                                      </span>
                                      {name}
                                    </span>
                                  );
                                })
                              ) : task.assignee_id ? (
                                <span
                                  title={getProfileName(task.assignee_id)}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-bold text-primary shadow-sm"
                                >
                                  {getProfileName(task.assignee_id)}
                                </span>
                              ) : (
                                <span className="text-[10px] text-muted-foreground font-semibold">Unassigned</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {task.attachments.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {task.attachments.map((file, idx) => (
                            <span key={idx} className="flex items-center gap-1 bg-muted px-2 py-0.5 rounded text-[10px] text-foreground border border-border/50">
                              <Paperclip className="h-3 w-3 text-muted-foreground" />
                              <span>{file.name}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTask(task.id);
                      }}
                      className="p-1 hover:bg-muted text-muted-foreground hover:text-danger rounded transition-colors self-start cursor-pointer"
                      title="Delete task"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Slide-over Drawer */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 overflow-hidden" aria-labelledby="slide-over-title" role="dialog" aria-modal="true">
          <div className="absolute inset-0 overflow-hidden">
            {/* Backdrop */}
            <div 
              onClick={() => {
                if (!isEditing || window.confirm('Discard unsaved changes?')) {
                  setSelectedTaskIndex(-1);
                }
              }}
              className="absolute inset-0 bg-background/50 backdrop-blur-sm transition-opacity"
            ></div>

            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
              <div className="pointer-events-auto w-screen max-w-lg">
                <div className="flex h-full flex-col overflow-y-auto bg-card border-l border-border shadow-2xl p-6 space-y-6">
                  {/* Header */}
                  <div className="flex items-center justify-between border-b border-border pb-4">
                    <h3 className="text-lg font-bold text-foreground truncate max-w-[80%]">
                      {isEditing ? 'Edit Task Details' : 'Task Details'}
                    </h3>
                    <button 
                      onClick={() => {
                        if (!isEditing || window.confirm('Discard unsaved changes?')) {
                          setSelectedTaskIndex(-1);
                        }
                      }}
                      className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded transition-colors"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  {isEditing ? (
                    /* Edit Form inside Side-sheet */
                    <form onSubmit={handleUpdateTask} className="space-y-4 flex-1">
                      {editError && (
                        <div className="flex items-center gap-2 bg-danger/10 border border-danger/20 p-3 rounded text-danger text-xs">
                          <AlertCircle className="h-4 w-4" />
                          <span>{editError}</span>
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                          Task Title *
                        </label>
                        <input
                          type="text"
                          required
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="w-full text-sm bg-background border border-border text-foreground px-3 py-2 rounded focus:outline-none focus:border-primary"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                          Description
                        </label>
                        <textarea
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          rows={4}
                          className="w-full text-sm bg-background border border-border text-foreground px-3 py-2 rounded focus:outline-none focus:border-primary resize-y"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                            Scope / Type
                          </label>
                          <select
                            value={editType}
                            onChange={(e) => setEditType(e.target.value as TaskType)}
                            className="w-full text-xs bg-background border border-border text-foreground px-3 py-2 rounded focus:outline-none focus:border-primary cursor-pointer font-medium"
                          >
                            <option value="personal">Personal Item</option>
                            <option value="assigned">Assigned Teammate</option>
                            <option value="team">Team Announcement</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                            Task Priority
                          </label>
                          <select
                            value={editPriority}
                            onChange={(e) => setEditPriority(e.target.value as TaskPriority)}
                            className="w-full text-xs bg-background border border-border text-foreground px-3 py-2 rounded focus:outline-none focus:border-primary cursor-pointer font-medium"
                          >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                          </select>
                        </div>
                      </div>

                      {editType === 'assigned' && (
                        <div className="space-y-2">
                          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Assign To Team Members *
                          </label>
                          <input
                            type="text"
                            placeholder="Search teammates by name..."
                            value={editAssigneeSearchText}
                            onChange={(e) => setEditAssigneeSearchText(e.target.value)}
                            className="w-full text-xs bg-background border border-border text-foreground px-3 py-2 rounded-lg focus:outline-none focus:border-primary mb-2"
                          />
                          <div className="max-h-40 overflow-y-auto border border-border rounded-lg p-2.5 space-y-2 bg-background/50">
                            {profiles
                              .filter((p) => p.status === 'active' && p.full_name.toLowerCase().includes(editAssigneeSearchText.toLowerCase()))
                              .map((p) => {
                                const isChecked = editAssigneeIds.includes(p.id);
                                return (
                                  <label key={p.id} className="flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer hover:bg-muted/40 p-1.5 rounded transition-colors">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => {
                                        if (isChecked) {
                                          setEditAssigneeIds(editAssigneeIds.filter(id => id !== p.id));
                                        } else {
                                          setEditAssigneeIds([...editAssigneeIds, p.id]);
                                        }
                                      }}
                                      className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary cursor-pointer"
                                    />
                                    <span>{p.full_name} ({p.role === 'head' ? 'Head' : 'Specialist'})</span>
                                  </label>
                                );
                              })}
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                            Due Date
                          </label>
                          <input
                            type="datetime-local"
                            value={editDeadline}
                            onChange={(e) => setEditDeadline(e.target.value)}
                            className="w-full text-xs bg-background border border-border text-foreground px-3 py-2 rounded focus:outline-none focus:border-primary cursor-pointer font-medium"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                            Reminders (offsets)
                          </label>
                          <input
                            type="text"
                            value={editOffsetsInput}
                            onChange={(e) => setEditOffsetsInput(e.target.value)}
                            placeholder="e.g. 15, 30"
                            className="w-full text-xs bg-background border border-border text-foreground px-3 py-2 rounded focus:outline-none focus:border-primary font-medium"
                          />
                        </div>
                      </div>

                      {/* Recurrence Options */}
                      <div className="grid grid-cols-3 gap-3 border-t border-border/40 pt-3">
                        <div>
                          <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                            🔄 Recurrence
                          </label>
                          <select
                            value={editRecurrenceType}
                            onChange={(e) => setEditRecurrenceType(e.target.value as any)}
                            className="w-full text-[10px] bg-background border border-border text-foreground px-2 py-2 rounded focus:outline-none focus:border-primary cursor-pointer font-bold"
                          >
                            <option value="none">None</option>
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                          </select>
                        </div>

                        {editRecurrenceType !== 'none' && (
                          <>
                            <div>
                              <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                                Every
                              </label>
                              <input
                                type="number"
                                min={1}
                                value={editRecurrenceInterval}
                                onChange={(e) => setEditRecurrenceInterval(parseInt(e.target.value, 10) || 1)}
                                className="w-full text-[10px] bg-background border border-border text-foreground px-2 py-2 rounded focus:outline-none focus:border-primary font-bold"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                                End Date
                              </label>
                              <input
                                type="date"
                                value={editRecurrenceEndDate}
                                onChange={(e) => setEditRecurrenceEndDate(e.target.value)}
                                className="w-full text-[10px] bg-background border border-border text-foreground px-2 py-1.5 rounded focus:outline-none focus:border-primary cursor-pointer font-bold"
                              />
                            </div>
                          </>
                        )}
                      </div>

                      {/* Attachments Section */}
                      <div className="border-t border-border/40 pt-3">
                        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                          Attachments
                        </label>
                        <div className="flex gap-2 mb-2">
                          <input
                            type="text"
                            value={editAttachmentName}
                            onChange={(e) => setEditAttachmentName(e.target.value)}
                            placeholder="Add asset filename..."
                            className="flex-1 text-xs bg-background border border-border text-foreground px-3 py-1.5 rounded focus:outline-none focus:border-primary"
                          />
                          <button
                            type="button"
                            onClick={handleEditAddAttachment}
                            className="px-3 py-1.5 bg-muted border border-border text-foreground hover:bg-muted/80 rounded text-xs font-semibold"
                          >
                            Add
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {editTaskAttachments.map((f, i) => (
                            <span key={i} className="flex items-center gap-1.5 bg-muted px-2.5 py-1 rounded-full text-xs text-foreground">
                              <Paperclip className="h-3 w-3 text-muted-foreground" />
                              <span>{f.name}</span>
                              <button
                                type="button"
                                onClick={() => handleEditRemoveAttachment(i)}
                                className="text-muted-foreground hover:text-danger rounded-full focus:outline-none ml-1 text-sm font-bold w-4 h-4 inline-flex items-center justify-center hover:bg-danger/10 transition-colors"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                        <button
                          type="button"
                          onClick={() => setIsEditing(false)}
                          className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted rounded transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-2 text-xs font-semibold text-primary-foreground bg-primary hover:bg-primary/95 rounded transition-colors"
                        >
                          Save Changes
                        </button>
                      </div>
                    </form>
                  ) : (
                    /* Read Mode View */
                    <div className="space-y-6 flex-1">
                      {/* Priority, Type, and Status Badges */}
                      <div className="flex flex-wrap gap-2 items-center">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                          selectedTask.priority === 'high' ? 'bg-danger/10 text-danger' :
                          selectedTask.priority === 'medium' ? 'bg-warning/10 text-warning' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {selectedTask.priority} Priority
                        </span>

                        <span className="bg-muted px-2 py-0.5 rounded text-xs font-bold uppercase text-muted-foreground">
                          {selectedTask.type} Scope
                        </span>

                        <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                          selectedTask.status === 'done' ? 'bg-success/15 text-success' :
                          selectedTask.status === 'in_progress' ? 'bg-primary/15 text-primary' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          Status: {selectedTask.status.replace('_', ' ')}
                        </span>
                      </div>

                      {/* Title */}
                      <div>
                        <h4 className="text-lg font-extrabold text-foreground break-words leading-tight">
                          {selectedTask.title}
                        </h4>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          Created by: <span className="font-semibold">{getProfileName(selectedTask.creator_id)}</span>
                        </p>
                      </div>

                      {/* Description */}
                      <div className="space-y-1">
                        <h5 className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Description</h5>
                        <div className="p-3 bg-muted/20 border border-border/50 rounded-lg text-sm text-foreground break-words leading-relaxed whitespace-pre-wrap">
                          {selectedTask.description || <span className="italic text-muted-foreground">No description provided.</span>}
                        </div>
                      </div>

                      {/* Details (Deadline, Recurrence, Reminders) */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-b border-border/40 py-4">
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide block">Due Date</span>
                          <span className="flex items-center gap-1.5 text-xs text-foreground font-semibold">
                            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                            {selectedTask.deadline ? (
                              <span>{new Date(selectedTask.deadline).toLocaleString()}</span>
                            ) : (
                              <span className="text-muted-foreground italic font-normal">No deadline set</span>
                            )}
                          </span>
                        </div>

                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide block">Recurrence</span>
                          <span className="flex items-center gap-1.5 text-xs text-foreground font-semibold">
                            <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
                            {selectedTask.recurrence_type && selectedTask.recurrence_type !== 'none' ? (
                              <span className="uppercase text-[11px]">
                                {selectedTask.recurrence_type} {selectedTask.recurrence_interval && selectedTask.recurrence_interval > 1 ? `(every ${selectedTask.recurrence_interval})` : ''}
                              </span>
                            ) : (
                              <span className="text-muted-foreground italic font-normal">One-time event</span>
                            )}
                          </span>
                        </div>

                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide block">Reminder offsets</span>
                          <span className="text-xs text-foreground font-semibold">
                            {selectedTask.reminder_offsets && selectedTask.reminder_offsets.length > 0 ? (
                              <span>{selectedTask.reminder_offsets.map(o => `${o} mins`).join(', ')} before</span>
                            ) : (
                              <span className="text-muted-foreground italic font-normal">No reminder alerts configured</span>
                            )}
                          </span>
                        </div>

                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide block">Assignees</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {selectedTask.type === 'personal' ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-bold text-primary">
                                Personal (Self)
                              </span>
                            ) : selectedTask.assignee_ids && selectedTask.assignee_ids.length > 0 ? (
                              selectedTask.assignee_ids.map((uid) => {
                                const name = getProfileName(uid);
                                return (
                                  <span key={uid} className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-bold text-primary">
                                    {name}
                                  </span>
                                );
                              })
                            ) : selectedTask.assignee_id ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-bold text-primary">
                                {getProfileName(selectedTask.assignee_id)}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground italic font-normal">Unassigned</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Attachments */}
                      {selectedTask.attachments && selectedTask.attachments.length > 0 && (
                        <div className="space-y-2">
                          <h5 className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Attachments</h5>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {selectedTask.attachments.map((file, idx) => (
                              <a
                                key={idx}
                                href={file.url}
                                className="flex items-center gap-2 p-2 border border-border/80 hover:border-primary/50 hover:bg-primary/5 rounded-lg text-xs text-foreground font-medium transition-colors"
                              >
                                <Paperclip className="h-4 w-4 text-muted-foreground" />
                                <span className="truncate">{file.name}</span>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Edit/Delete controls for Creator/Head */}
                      <div className="border-t border-border/40 pt-4 flex items-center justify-between gap-3">
                        {currentUser && (currentUser.role === 'head' || selectedTask.creator_id === currentUser.id) ? (
                          <>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setIsEditing(true)}
                                className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-bold rounded shadow-sm transition-colors"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                                <span>Edit Task</span>
                              </button>
                              <button
                                onClick={() => handleDeleteTaskFromPreview(selectedTask.id)}
                                className="flex items-center gap-1.5 px-3 py-2 border border-border text-muted-foreground hover:text-danger hover:bg-danger/5 text-xs font-semibold rounded transition-colors"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                <span>Delete</span>
                              </button>
                            </div>
                            <button
                              onClick={() => {
                                handleToggleStatus(selectedTask.id, selectedTask.status);
                              }}
                              className="px-3 py-2 bg-muted hover:bg-muted/80 text-foreground text-xs font-bold rounded transition-colors"
                            >
                              Toggle Status
                            </button>
                          </>
                        ) : (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground italic">
                            <Lock className="h-3.5 w-3.5 text-muted-foreground/60" />
                            <span>Read-only: only creator or heads can edit this task.</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
