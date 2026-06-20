import React, { useState, useEffect } from 'react';
import { dbClient } from '../../services/dbClient';
import { useAuth } from '../../context/AuthContext';
import type { Task, TaskPriority, TaskStatus, TaskType } from '../../types/database';
import { AlertCircle, CheckSquare, Clock, Plus, Trash2, User, Paperclip } from 'lucide-react';

export const TasksView: React.FC = () => {
  const { currentUser, profiles } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'personal' | 'assigned' | 'team'>(() => {
    return (localStorage.getItem('relayhq_tasks_active_tab') as any) || 'all';
  });
  
  // Creation form states
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [type, setType] = useState<TaskType>('personal');
  const [assigneeId, setAssigneeId] = useState('');
  const [assigneeSearchText, setAssigneeSearchText] = useState('');
  const [deadline, setDeadline] = useState('');
  const [offsetsInput, setOffsetsInput] = useState('15, 30');
  const [taskAttachments, setTaskAttachments] = useState<{ name: string; url: string }[]>([]);
  const [attachmentName, setAttachmentName] = useState('');

  useEffect(() => {
    localStorage.setItem('relayhq_tasks_active_tab', activeTab);
  }, [activeTab]);

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
        setAssigneeId(currentUser?.id || '');
      } else if (type === 'team') {
        setAssigneeId('');
      } else if (type === 'assigned' && assigneeId === (currentUser?.id || '')) {
        setAssigneeId(''); // Reset selection to force picking another user
      }
    }
  }, [currentUser, isCreating, type]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Task title is required.');
      return;
    }

    try {
      const offsets = offsetsInput
        .split(',')
        .map((x) => parseInt(x.trim(), 10))
        .filter((x) => !isNaN(x));

      await dbClient.createTask({
        title: title.trim(),
        description: description.trim(),
        assignee_id: type === 'team' ? undefined : (assigneeId || undefined),
        priority,
        type,
        deadline: deadline ? new Date(deadline).toISOString() : undefined,
        reminder_offsets: offsets,
        status: 'todo',
        attachments: taskAttachments,
      });

      // Reset form
      setTitle('');
      setDescription('');
      setPriority('medium');
      setType('personal');
      setDeadline('');
      setOffsetsInput('15, 30');
      setTaskAttachments([]);
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

  const filteredTasks = tasks.filter((t) => {
    if (activeTab === 'all') return true;
    return t.type === activeTab;
  });

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
            className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary/95 shadow-sm rounded-md transition-colors"
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
              <div className="space-y-1">
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Assign To <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Filter specialists by name..."
                  value={assigneeSearchText}
                  onChange={(e) => setAssigneeSearchText(e.target.value)}
                  className="w-full text-xs bg-background border border-border text-foreground px-3 py-1.5 rounded focus:outline-none focus:border-primary mb-1"
                />
                <select
                  value={assigneeId}
                  required
                  onChange={(e) => setAssigneeId(e.target.value)}
                  className="w-full text-sm bg-background border border-border text-foreground px-3 py-2 rounded focus:outline-none focus:border-primary cursor-pointer"
                >
                  <option value="">Select Growth Specialist...</option>
                  {profiles
                    .filter((p) => p.status === 'active' && p.full_name.toLowerCase().includes(assigneeSearchText.toLowerCase()))
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.full_name} ({p.role === 'head' ? 'Head' : 'Specialist'})
                      </option>
                    ))}
                </select>
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
                  <span key={i} className="flex items-center gap-1 bg-muted px-2.5 py-1 rounded-full text-xs text-foreground">
                    <Paperclip className="h-3 w-3 text-muted-foreground" />
                    <span>{f.name}</span>
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
                className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/95 rounded transition-colors"
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
          <div className="flex items-center border border-border p-0.5 bg-muted/20 rounded-md self-start w-fit">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded ${
                activeTab === 'all' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              All Tasks
            </button>
            <button
              onClick={() => setActiveTab('personal')}
              className={`px-3 py-1.5 text-xs font-semibold rounded ${
                activeTab === 'personal' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Personal Tasks
            </button>
            <button
              onClick={() => setActiveTab('assigned')}
              className={`px-3 py-1.5 text-xs font-semibold rounded ${
                activeTab === 'assigned' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Assigned Tasks
            </button>
            <button
              onClick={() => setActiveTab('team')}
              className={`px-3 py-1.5 text-xs font-semibold rounded ${
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
              {filteredTasks.map((task) => {
                return (
                  <div
                    key={task.id}
                    className={`border border-border bg-card p-4 rounded-lg shadow-sm flex items-start gap-3 transition-colors ${
                      task.status === 'done' ? 'opacity-75 bg-muted/20' : ''
                    }`}
                  >
                    {/* Status Toggle Box */}
                    <button
                      onClick={() => handleToggleStatus(task.id, task.status)}
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

                        {task.type !== 'personal' && (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <User className="h-3 w-3" />
                            <span>For: {getProfileName(task.assignee_id)}</span>
                          </span>
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
                      onClick={() => handleDeleteTask(task.id)}
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
    </div>
  );
};
