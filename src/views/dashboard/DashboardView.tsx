import React, { useState, useEffect } from 'react';
import { dbClient } from '../../services/dbClient';
import { useAuth } from '../../context/AuthContext';
import type { Lead, Task, Reminder } from '../../types/database';
import {
  Briefcase, CheckSquare, Calendar, Activity, ChevronRight, Mail, ExternalLink,
  GripVertical, EyeOff, Layout, RefreshCw, TrendingUp, DollarSign, Clock,
  Award, UserCheck, Users
} from 'lucide-react';

interface DashboardViewProps {
  onNavigate: (view: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const { currentUser, profiles } = useAuth();
  
  const [leads, setLeads] = useState<Lead[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [activities, setActivities] = useState<{ id: string; user: string; text: string; time: string }[]>([]);

  // Widget layout states
  const [widgetList, setWidgetList] = useState<string[]>([]);
  const [visibleWidgets, setVisibleWidgets] = useState<Record<string, boolean>>({});
  const [widgetWidths, setWidgetWidths] = useState<Record<string, '1/3' | '1/2' | '2/3' | 'full'>>({});
  const [isConfiguring, setIsConfiguring] = useState(false);

  // Mini calendar states
  const [calDate] = useState(() => new Date());

  // Load custom widget layout & data
  useEffect(() => {
    if (!currentUser) return;
    
    // Load layout
    const savedLayout = localStorage.getItem(`relayhq_dash_layout_${currentUser.id}`);
    const defaultLayout = currentUser.role === 'head'
      ? ['head-metrics', 'lifecycle', 'teammates', 'upcoming-reminders', 'recent-activity', 'pipeline-funnel', 'calendar-mini', 'quote-of-the-day', 'team-presence']
      : ['specialist-metrics', 'upcoming-reminders', 'lead-pipeline', 'quick-add', 'calendar-mini', 'tasks', 'team-presence', 'pipeline-funnel', 'quote-of-the-day'];
    setWidgetList(savedLayout ? JSON.parse(savedLayout) : defaultLayout);

    // Load visibility
    const savedVisibility = localStorage.getItem(`relayhq_dash_visibility_${currentUser.id}`);
    const defaultVisibility = currentUser.role === 'head'
      ? {
          'head-metrics': true,
          'lifecycle': true,
          'teammates': true,
          'upcoming-reminders': true,
          'recent-activity': true,
          'pipeline-funnel': true,
          'calendar-mini': false,
          'quote-of-the-day': false,
          'team-presence': true,
        }
      : {
          'specialist-metrics': true,
          'upcoming-reminders': true,
          'lead-pipeline': true,
          'quick-add': true,
          'calendar-mini': true,
          'tasks': true,
          'team-presence': true,
          'pipeline-funnel': false,
          'quote-of-the-day': false,
        };
    setVisibleWidgets(savedVisibility ? JSON.parse(savedVisibility) : defaultVisibility);

    // Load widths
    const savedWidths = localStorage.getItem(`relayhq_dash_widths_${currentUser.id}`);
    const defaultWidths = {
      'head-metrics': 'full',
      'specialist-metrics': 'full',
      'lifecycle': '2/3',
      'teammates': '1/3',
      'upcoming-reminders': '1/3',
      'recent-activity': '1/2',
      'quick-add': '1/3',
      'lead-pipeline': '1/3',
      'tasks': '1/3',
      'pipeline-funnel': '2/3',
      'calendar-mini': '1/3',
      'quote-of-the-day': '1/3',
      'team-presence': '1/3',
    };
    setWidgetWidths(savedWidths ? JSON.parse(savedWidths) : defaultWidths);
  }, [currentUser]);

  const fetchDashboardData = async () => {
    if (!currentUser) return;
    const leadsData = await dbClient.getLeads();
    setLeads(leadsData.filter(l => !l.hidden_by?.includes(currentUser.id)));

    const tasksData = await dbClient.getTasks();
    setTasks(tasksData);

    const remindersData = await dbClient.getReminders();
    setReminders(remindersData);

    // Pull recent activity logs
    try {
      const recentUpdates = await dbClient.getLeadUpdates('all');
      const logs = recentUpdates.slice(0, 8).map((up) => ({
        id: up.id,
        user: getProfileName(up.user_id),
        text: up.content,
        time: new Date(up.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }));
      setActivities(logs);
    } catch (e) {
      console.warn('Failed to load lead updates for activity log:', e);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    const unsubscribe = dbClient.subscribe((table) => {
      if (table === 'leads' || table === 'tasks' || table === 'reminders' || table === 'lead_updates') {
        fetchDashboardData();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [currentUser]);

  // Profile lookup helper
  const getProfileName = (uid: string) => {
    return profiles.find((p) => p.id === uid)?.full_name || 'Teammate';
  };

  // Drag & Drop Layout Handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/widgetId', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('text/widgetId');
    if (!sourceId || sourceId === targetId) return;

    const newList = [...widgetList];
    const sourceIdx = newList.indexOf(sourceId);
    const targetIdx = newList.indexOf(targetId);

    if (sourceIdx !== -1 && targetIdx !== -1) {
      newList.splice(sourceIdx, 1);
      newList.splice(targetIdx, 0, sourceId);
      setWidgetList(newList);
      if (currentUser) {
        localStorage.setItem(`relayhq_dash_layout_${currentUser.id}`, JSON.stringify(newList));
      }
    }
  };

  const toggleWidgetVisibility = (id: string) => {
    const updated = { ...visibleWidgets, [id]: !visibleWidgets[id] };
    setVisibleWidgets(updated);
    if (currentUser) {
      localStorage.setItem(`relayhq_dash_visibility_${currentUser.id}`, JSON.stringify(updated));
    }
  };

  const handleWidgetWidthChange = (id: string, width: '1/3' | '1/2' | '2/3' | 'full') => {
    const updated = { ...widgetWidths, [id]: width };
    setWidgetWidths(updated);
    if (currentUser) {
      localStorage.setItem(`relayhq_dash_widths_${currentUser.id}`, JSON.stringify(updated));
    }
  };

  const getWidgetWidthClass = (id: string) => {
    const w = widgetWidths[id] || '1/3';
    switch (w) {
      case '1/3': return 'col-span-6 lg:col-span-2 md:col-span-3';
      case '1/2': return 'col-span-6 lg:col-span-3 md:col-span-3';
      case '2/3': return 'col-span-6 lg:col-span-4 md:col-span-6';
      case 'full':
      default:
        return 'col-span-6 lg:col-span-6 md:col-span-6';
    }
  };

  const resetDashboardLayout = () => {
    if (!currentUser) return;
    const defaultLayout = currentUser.role === 'head'
      ? ['head-metrics', 'lifecycle', 'teammates', 'upcoming-reminders', 'recent-activity', 'pipeline-funnel', 'calendar-mini', 'quote-of-the-day', 'team-presence']
      : ['specialist-metrics', 'quick-add', 'lead-pipeline', 'tasks', 'upcoming-reminders', 'pipeline-funnel', 'calendar-mini', 'quote-of-the-day', 'team-presence'];

    const defaultVisibility: Record<string, boolean> = currentUser.role === 'head'
      ? {
          'head-metrics': true,
          'lifecycle': true,
          'teammates': true,
          'upcoming-reminders': true,
          'recent-activity': true,
          'pipeline-funnel': true,
          'calendar-mini': false,
          'quote-of-the-day': false,
          'team-presence': true,
        }
      : {
          'specialist-metrics': true,
          'quick-add': true,
          'lead-pipeline': true,
          'tasks': true,
          'upcoming-reminders': true,
          'pipeline-funnel': false,
          'calendar-mini': false,
          'quote-of-the-day': false,
          'team-presence': false,
        };

    const defaultWidths: Record<string, '1/3' | '1/2' | '2/3' | 'full'> = {
      'head-metrics': 'full',
      'specialist-metrics': 'full',
      'lifecycle': '2/3',
      'teammates': '1/3',
      'upcoming-reminders': currentUser.role === 'head' ? '1/2' : '1/3',
      'recent-activity': '1/2',
      'quick-add': '2/3',
      'lead-pipeline': '2/3',
      'tasks': '1/3',
      'pipeline-funnel': '2/3',
      'calendar-mini': '1/3',
      'quote-of-the-day': '1/3',
      'team-presence': '1/3',
    };

    setWidgetList(defaultLayout);
    setVisibleWidgets(defaultVisibility);
    setWidgetWidths(defaultWidths);

    localStorage.setItem(`relayhq_dash_layout_${currentUser.id}`, JSON.stringify(defaultLayout));
    localStorage.setItem(`relayhq_dash_visibility_${currentUser.id}`, JSON.stringify(defaultVisibility));
    localStorage.setItem(`relayhq_dash_widths_${currentUser.id}`, JSON.stringify(defaultWidths));
  };

  // Funnel Cumulative Calculation
  const funnelStages = [
    { status: 'new', label: '1. New Leads', color: 'url(#grad-new)', probability: 0.1 },
    { status: 'contacted', label: '2. Contacted', color: 'url(#grad-contacted)', probability: 0.25 },
    { status: 'qualified', label: '3. Qualified', color: 'url(#grad-qualified)', probability: 0.45 },
    { status: 'proposal', label: '4. Proposal Sent', color: 'url(#grad-proposal)', probability: 0.65 },
    { status: 'negotiation', label: '5. Negotiation', color: 'url(#grad-negotiation)', probability: 0.85 },
    { status: 'closed_won', label: '6. Won Deals', color: 'url(#grad-won)', probability: 1.0 }
  ];

  const getFunnelStageCount = (status: string) => {
    const idx = funnelStages.findIndex(s => s.status === status);
    if (idx === -1) return 0;
    const targets = funnelStages.slice(idx).map(s => s.status);
    return leads.filter(l => targets.includes(l.status)).length;
  };

  // Forecasted Pipeline Value Calculation
  const getForecastedPipelineValue = () => {
    return leads.reduce((total, lead) => {
      const stage = funnelStages.find(s => s.status === lead.status);
      const prob = stage ? stage.probability : 0.1;
      
      // Deterministic value based on industry/service
      let value = 10000; // default
      const ind = (lead.industry || '').toLowerCase();
      if (ind.includes('tech') || ind.includes('enterp')) value = 15000;
      else if (ind.includes('health') || ind.includes('medical')) value = 20000;
      else if (ind.includes('finan') || ind.includes('bank')) value = 25000;
      else if (ind.includes('consult')) value = 8000;
      
      return total + (value * prob);
    }, 0);
  };

  // Simulated Time in Stage
  const getTimeInStageStats = () => {
    return [
      { stage: 'New', avg: '1.8 days' },
      { stage: 'Contacted', avg: '3.4 days' },
      { stage: 'Qualified', avg: '5.6 days' },
      { stage: 'Proposal', avg: '7.2 days' },
      { stage: 'Negotiation', avg: '4.1 days' }
    ];
  };

  // Quotes List for Motivation Card
  const salesQuotes = [
    { text: "Success is not final; failure is not fatal: It is the courage to continue that counts.", author: "Winston Churchill" },
    { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
    { text: "Act as if what you do makes a difference. It does.", author: "William James" },
    { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
    { text: "Your attitude, not your aptitude, will determine your altitude.", author: "Zig Ziglar" },
    { text: "You miss 100% of the shots you don't take.", author: "Wayne Gretzky" },
    { text: "Opportunities don't happen. You create them.", author: "Chris Grosser" }
  ];
  const quote = salesQuotes[calDate.getDate() % salesQuotes.length];

  // -------------------------------------------------------------
  // WIDGET RENDERERS
  // -------------------------------------------------------------

  const renderFunnelWidget = () => {
    const totalCount = leads.length;
    const stageWidths = funnelStages.map(s => {
      const count = getFunnelStageCount(s.status);
      return totalCount ? 60 + (180 * (count / totalCount)) : 240;
    });

    const wonCount = leads.filter(l => l.status === 'closed_won').length;
    const lostCount = leads.filter(l => l.status === 'closed_lost').length;
    const winRatio = wonCount + lostCount ? Math.round((wonCount / (wonCount + lostCount)) * 100) : 0;

    return (
      <div className="border border-border rounded-xl bg-card p-5 shadow-sm space-y-5 lg:col-span-2">
        <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4 text-primary animate-pulse" />
            <span>Lead Pipeline Funnel & Conversion</span>
          </h4>
          <span className="text-[10px] text-muted-foreground font-semibold">Cumulative Volume</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          {/* Funnel SVG (pure scalable vector shapes) */}
          <div className="md:col-span-3 flex justify-center items-center">
            <svg width="320" height="260" viewBox="0 0 320 260" className="w-full max-w-[320px]">
              <defs>
                <linearGradient id="grad-new" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.8" />
                </linearGradient>
                <linearGradient id="grad-contacted" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.8" />
                </linearGradient>
                <linearGradient id="grad-qualified" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#34d399" stopOpacity="0.8" />
                </linearGradient>
                <linearGradient id="grad-proposal" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#818cf8" stopOpacity="0.8" />
                </linearGradient>
                <linearGradient id="grad-negotiation" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#ec4899" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#f472b6" stopOpacity="0.8" />
                </linearGradient>
                <linearGradient id="grad-won" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#4ade80" stopOpacity="0.8" />
                </linearGradient>
              </defs>

              {funnelStages.map((stage, i) => {
                const y = i * 42;
                const topW = i === 0 ? 240 : stageWidths[i - 1];
                const botW = stageWidths[i];
                const polyPoints = `
                  ${160 - topW / 2},${y}
                  ${160 + topW / 2},${y}
                  ${160 + botW / 2},${y + 38}
                  ${160 - botW / 2},${y + 38}
                `;
                const percent = totalCount ? Math.round((getFunnelStageCount(stage.status) / totalCount) * 100) : 0;

                return (
                  <g key={stage.status} className="group">
                    <polygon
                      points={polyPoints}
                      fill={stage.color}
                      stroke="var(--border)"
                      strokeWidth="1.2"
                      className="transition-all duration-200 hover:fill-opacity-100"
                    />
                    <text
                      x="160"
                      y={y + 23}
                      textAnchor="middle"
                      className="text-[10px] font-extrabold fill-foreground select-none pointer-events-none"
                    >
                      {stage.label}: {getFunnelStageCount(stage.status)} ({percent}%)
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Forecasted metrics & Time in Stage */}
          <div className="md:col-span-2 space-y-4 text-xs">
            {/* Forecast Valuation Card */}
            <div className="border border-border/80 rounded-lg p-3.5 bg-muted/20 space-y-1">
              <div className="flex items-center gap-1 text-muted-foreground font-semibold">
                <DollarSign className="h-4 w-4 text-primary" />
                <span>Forecasted Pipeline Value</span>
              </div>
              <p className="text-xl font-black text-foreground tracking-tight">
                ${getForecastedPipelineValue().toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
              <p className="text-[9px] text-muted-foreground">Weighted by stage conversion probabilities</p>
            </div>

            {/* Win/Loss Ratios */}
            <div className="space-y-1.5">
              <div className="flex justify-between font-semibold text-[10px] text-muted-foreground">
                <span>Won vs Lost deals</span>
                <span className="text-success">{winRatio}% Win Ratio</span>
              </div>
              <div className="flex h-3 w-full bg-muted rounded-full overflow-hidden border border-border/40">
                <div
                  className="bg-success h-full transition-all duration-300"
                  style={{ width: `${winRatio}%` }}
                  title={`Won: ${wonCount}`}
                />
                <div
                  className="bg-danger h-full transition-all duration-300"
                  style={{ width: `${100 - winRatio}%` }}
                  title={`Lost: ${lostCount}`}
                />
              </div>
              <div className="flex justify-between text-[9px] text-muted-foreground font-semibold">
                <span>🏆 {wonCount} Won</span>
                <span>❌ {lostCount} Lost</span>
              </div>
            </div>

            {/* Average time-in-stage metrics */}
            <div className="space-y-2">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                <Clock className="h-3.5 w-3.5" />
                <span>Average Time-in-Stage</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                {getTimeInStageStats().map((t, idx) => (
                  <div key={idx} className="flex items-center justify-between border-b border-border/40 pb-1 font-semibold">
                    <span className="text-muted-foreground">{t.stage}:</span>
                    <span className="text-foreground">{t.avg}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderRecentActivityWidget = () => {
    return (
      <div className="border border-border rounded-xl bg-card p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Activity className="h-4 w-4 text-primary animate-pulse" />
            <span>Outbound Activity Log</span>
          </h4>
          <span className="text-[10px] text-muted-foreground font-semibold">Recent updates</span>
        </div>

        <div className="space-y-3.5 max-h-72 overflow-y-auto pr-1">
          {activities.length === 0 ? (
            <div className="text-center py-8 text-xs text-muted-foreground space-y-1">
              <Briefcase className="h-6 w-6 text-muted-foreground/30 mx-auto" />
              <p className="font-semibold">No campaign activity logged</p>
            </div>
          ) : (
            activities.map((act) => (
              <div key={act.id} className="text-xs border-b border-border/30 pb-2.5 last:border-b-0 space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-bold text-foreground flex items-center gap-1.5">
                    <UserCheck className="h-3 w-3 text-primary" />
                    {act.user}
                  </span>
                  <span className="text-muted-foreground font-medium">{act.time}</span>
                </div>
                <p className="text-muted-foreground leading-relaxed italic">"{act.text}"</p>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  const renderTasksDueWidget = () => {
    const today = new Date().toDateString();
    const todoTasks = tasks.filter(t => {
      if (t.status === 'done') return false;
      if (!t.deadline) return true; // keep general checklists
      return new Date(t.deadline).toDateString() === today;
    });

    return (
      <div className="border border-border rounded-xl bg-card p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <CheckSquare className="h-4 w-4 text-success" />
            <span>Active Checklist / To-Dos</span>
          </h4>
          <button onClick={() => onNavigate('tasks')} className="text-[10px] text-primary hover:underline flex items-center font-semibold">
            <span>Open Tasks</span>
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>

        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {todoTasks.slice(0, 5).map((t) => (
            <div key={t.id} className="p-3 border border-border/80 rounded bg-muted/20 text-xs flex justify-between items-start gap-3 hover:border-primary/30 transition-all cursor-pointer" onClick={() => onNavigate('tasks')}>
              <div className="space-y-1">
                <p className="font-bold text-foreground leading-snug">{t.title}</p>
                {t.deadline && (
                  <p className="text-[9px] text-muted-foreground">
                    Due: {new Date(t.deadline).toLocaleDateString()}
                  </p>
                )}
              </div>
              <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded border ${
                t.priority === 'high' ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-300 border-red-200 dark:border-red-900/50' :
                t.priority === 'medium' ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-300 border-amber-200 dark:border-amber-900/50' :
                'bg-slate-100 dark:bg-slate-900/60 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800'
              }`}>
                {t.priority}
              </span>
            </div>
          ))}
          {todoTasks.length === 0 && (
            <div className="text-center py-8 text-xs text-muted-foreground space-y-1">
              <CheckSquare className="h-6 w-6 text-muted-foreground/30 mx-auto" />
              <p className="font-semibold">All caught up! No pending tasks.</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderTeamPresenceWidget = () => {
    const activeTeammates = profiles.filter((p) => p.status === 'active');
    
    const getPresenceBadgeColor = (presence?: string) => {
      switch (presence) {
        case 'online': return 'bg-success';
        case 'idle': return 'bg-warning';
        case 'busy': return 'bg-danger';
        case 'offline':
        default:
          return 'bg-slate-400';
      }
    };

    return (
      <div className="border border-border rounded-xl bg-card p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Users className="h-4 w-4 text-primary" />
            <span>Teammate Collaboration Room</span>
          </h4>
          <span className="text-[10px] text-muted-foreground font-semibold">Real-time presence</span>
        </div>

        <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
          {activeTeammates.map((p) => (
            <div key={p.id} className="flex items-center justify-between text-xs border-b border-border/30 pb-2 last:border-b-0">
              <div className="flex items-center gap-2">
                <div className="relative inline-block h-6 w-6 rounded-full">
                  <div className="flex h-full w-full items-center justify-center rounded-full bg-secondary text-[10px] font-bold text-white uppercase">
                    {p.full_name.split(' ').map((n) => n[0]).join('')}
                  </div>
                  <span
                    className={`absolute bottom-0 right-0 block h-1.5 w-1.5 rounded-full ring-1 ring-card ${getPresenceBadgeColor(p.presence)}`}
                  />
                </div>
                <div>
                  <p className="font-bold text-foreground leading-normal">{p.full_name}</p>
                  <p className="text-[9px] text-muted-foreground leading-none capitalize">{p.role.replace('_', ' ')}</p>
                </div>
              </div>
              <span className="capitalize text-[10px] text-muted-foreground font-semibold px-2 py-0.5 bg-muted rounded border border-border/30">
                {p.presence || 'offline'}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderQuoteWidget = () => {
    return (
      <div className="border border-border rounded-xl bg-gradient-to-br from-primary/10 to-accent/15 p-5 shadow-sm flex flex-col justify-between min-h-[140px] text-xs">
        <div className="space-y-2">
          <h4 className="text-[9px] font-bold uppercase tracking-wider text-primary flex items-center gap-1">
            <Award className="h-3.5 w-3.5" />
            <span>Daily Outbound Quote</span>
          </h4>
          <p className="font-semibold text-foreground leading-relaxed italic text-center px-2 py-1">
            "{quote.text}"
          </p>
        </div>
        <p className="text-[10px] font-bold text-muted-foreground text-right mt-2">— {quote.author}</p>
      </div>
    );
  };

  const renderMiniCalendarWidget = () => {
    const year = calDate.getFullYear();
    const month = calDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startDay = new Date(year, month, 1).getDay();

    const calendarGrid: (number | null)[] = [];
    // Padding
    for (let i = 0; i < startDay; i++) calendarGrid.push(null);
    // Days
    for (let i = 1; i <= daysInMonth; i++) calendarGrid.push(i);

    // Filter dots
    const getDotCount = (day: number) => {
      return reminders.filter(r => {
        if (r.status !== 'active') return false;
        const d = new Date(r.reminder_time);
        return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
      }).length;
    };

    return (
      <div className="border border-border rounded-xl bg-card p-5 shadow-sm space-y-3.5">
        <div className="flex items-center justify-between border-b border-border/40 pb-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-primary" />
            <span>Calendar Mini-view</span>
          </h4>
          <button onClick={() => onNavigate('reminders')} className="text-[10px] text-primary hover:underline flex items-center font-semibold">
            <span>Scheduler</span>
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>

        <div className="space-y-2">
          <p className="text-[10px] font-bold text-foreground text-center">
            {calDate.toLocaleString(undefined, { month: 'long', year: 'numeric' })}
          </p>

          <div className="grid grid-cols-7 text-center text-[9px] font-extrabold text-muted-foreground border-b border-border/40 pb-1">
            <div>S</div><div>M</div><div>T</div><div>W</div><div>T</div><div>F</div><div>S</div>
          </div>

          <div className="grid grid-cols-7 grid-rows-5 gap-y-1 gap-x-0.5 text-center text-[10px] font-semibold">
            {calendarGrid.map((day, idx) => {
              if (day === null) return <div key={idx} />;
              const dots = getDotCount(day);
              const isToday = day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();

              return (
                <div
                  key={idx}
                  onClick={() => onNavigate('reminders')}
                  className={`relative flex items-center justify-center h-6 w-6 mx-auto rounded-full cursor-pointer transition-colors ${
                    isToday
                      ? 'bg-primary text-primary-foreground font-extrabold shadow-sm'
                      : 'hover:bg-muted'
                  }`}
                >
                  <span>{day}</span>
                  {dots > 0 && !isToday && (
                    <span className="absolute bottom-0.5 h-1 w-1 bg-primary rounded-full animate-pulse" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderHeadMetrics = () => {
    const totalLeads = leads.length;
    const wonLeads = leads.filter((l) => l.status === 'closed_won').length;
    const conversionRate = totalLeads ? Math.round((wonLeads / totalLeads) * 100) : 0;

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === 'done').length;
    const taskCompletionRate = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const activeReminders = reminders.filter((r) => r.status === 'active').length;

    return (
      <div className={`space-y-2 ${isConfiguring ? 'border border-dashed border-primary/40 p-3 rounded-xl bg-card/50' : ''}`}>
        {isConfiguring && (
          <div className="flex items-center justify-between text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-2 border-b border-border/40 pb-1.5">
            <span>Director Metrics Row</span>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="border border-border bg-card p-4 rounded-xl shadow-sm">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider">Total Sales Leads</span>
              <Briefcase className="h-4 w-4 text-primary" />
            </div>
            <p className="text-2xl font-bold text-foreground">{totalLeads}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Across all growth specialist portfolios</p>
          </div>

          <div className="border border-border bg-card p-4 rounded-xl shadow-sm">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider">Won Conversion Ratio</span>
              <Award className="h-4 w-4 text-success animate-pulse" />
            </div>
            <p className="text-2xl font-bold text-foreground">{conversionRate}%</p>
            <div className="w-full bg-muted h-1 rounded mt-2 overflow-hidden">
              <div className="bg-success h-full" style={{ width: `${conversionRate}%` }} />
            </div>
          </div>

          <div className="border border-border bg-card p-4 rounded-xl shadow-sm">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider">Task Completion</span>
              <CheckSquare className="h-4 w-4 text-warning" />
            </div>
            <p className="text-2xl font-bold text-foreground">{taskCompletionRate}%</p>
            <p className="text-[10px] text-muted-foreground mt-1">{completedTasks} of {totalTasks} checklist items done</p>
          </div>

          <div className="border border-border bg-card p-4 rounded-xl shadow-sm">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider">Active Reminders</span>
              <Calendar className="h-4 w-4 text-danger" />
            </div>
            <p className="text-2xl font-bold text-foreground">{activeReminders}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Calendar alarms scheduled</p>
          </div>
        </div>
      </div>
    );
  };

  const renderSpecialistMetrics = () => {
    const totalLeads = leads.length;
    const myTasks = tasks.filter((t) => t.assignee_id === currentUser?.id || t.creator_id === currentUser?.id);
    const todoTasks = myTasks.filter((t) => t.status !== 'done');
    const myReminders = reminders.filter((r) => r.status === 'active');

    return (
      <div className={`space-y-2 ${isConfiguring ? 'border border-dashed border-primary/40 p-3 rounded-xl bg-card/50' : ''}`}>
        {isConfiguring && (
          <div className="flex items-center justify-between text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-2 border-b border-border/40 pb-1.5">
            <span>Specialist Metrics Row</span>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="border border-border bg-card p-4 rounded-xl shadow-sm flex items-center gap-3">
            <div className="h-10 w-10 bg-primary/10 text-primary rounded-full flex items-center justify-center flex-shrink-0">
              <Briefcase className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">My Portfolio Leads</p>
              <p className="text-2xl font-bold text-foreground">{totalLeads}</p>
            </div>
          </div>

          <div className="border border-border bg-card p-4 rounded-xl shadow-sm flex items-center gap-3">
            <div className="h-10 w-10 bg-success/10 text-success rounded-full flex items-center justify-center flex-shrink-0">
              <CheckSquare className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Active To-Do Tasks</p>
              <p className="text-2xl font-bold text-foreground">{todoTasks.length}</p>
            </div>
          </div>

          <div className="border border-border bg-card p-4 rounded-xl shadow-sm flex items-center gap-3">
            <div className="h-10 w-10 bg-danger/10 text-danger rounded-full flex items-center justify-center flex-shrink-0">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Scheduled Alarms</p>
              <p className="text-2xl font-bold text-foreground">{myReminders.length}</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderLifecycleWidget = () => {
    const totalLeads = leads.length;
    const statusCounts: Record<string, number> = {
      new: 0,
      contacted: 0,
      qualified: 0,
      proposal: 0,
      negotiation: 0,
      closed_won: 0,
      closed_lost: 0
    };
    leads.forEach((l) => {
      statusCounts[l.status] = (statusCounts[l.status] || 0) + 1;
    });

    return (
      <div className="border border-border rounded-xl bg-card p-5 shadow-sm space-y-4 h-full">
        <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Activity className="h-4 w-4 text-primary" />
            <span>Lead Lifecycle Distribution</span>
          </h4>
        </div>
        
        <div className="space-y-3 pt-1">
          {Object.entries(statusCounts).map(([status, count]) => {
            const percentage = totalLeads ? Math.round((count / totalLeads) * 100) : 0;
            return (
              <div key={status} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="capitalize font-medium text-foreground text-[11px]">{status.replace('_', ' ')}</span>
                  <span className="text-muted-foreground font-semibold text-[10px]">{count} leads ({percentage}%)</span>
                </div>
                <div className="w-full bg-muted h-2 rounded overflow-hidden">
                  <div
                    className={`h-full ${
                      status === 'closed_won' ? 'bg-success' :
                      status === 'closed_lost' ? 'bg-danger' :
                      status === 'qualified' ? 'bg-primary' : 'bg-slate-400'
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderTeammatesWidget = () => {
    // Only show active specialist profiles for breakdown
    const specialists = profiles.filter(p => p.role === 'growth_specialist' && p.status === 'active');

    const getPresenceBadgeColor = (presence?: string) => {
      switch (presence) {
        case 'online': return 'bg-success';
        case 'idle': return 'bg-warning';
        case 'busy': return 'bg-danger';
        case 'offline':
        default:
          return 'bg-slate-400';
      }
    };

    return (
      <div className="border border-border rounded-xl bg-card p-5 shadow-sm space-y-4 h-full">
        <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Users className="h-4 w-4 text-primary" />
            <span>Teammate Performance Overview</span>
          </h4>
          <span className="text-[10px] text-muted-foreground font-semibold">Specialist Portfolios</span>
        </div>

        <div className="space-y-4 pt-1 max-h-80 overflow-y-auto pr-1">
          {specialists.map((p) => {
            const assignedLeads = leads.filter(l => l.assigned_users?.includes(p.id));
            const leadCount = assignedLeads.length;
            const wonLeads = assignedLeads.filter(l => l.status === 'closed_won').length;
            const convRate = leadCount ? Math.round((wonLeads / leadCount) * 100) : 0;
            const openTasks = tasks.filter(t => t.assignee_id === p.id && t.status !== 'done').length;

            return (
              <div key={p.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs border-b border-border/40 pb-3 last:border-0 last:pb-0">
                <div className="flex items-center gap-2">
                  <div className="relative inline-block h-7 w-7 rounded-full">
                    <div className="flex h-full w-full items-center justify-center rounded-full bg-secondary text-[10px] font-bold text-white uppercase">
                      {p.full_name.split(' ').map((n) => n[0]).join('')}
                    </div>
                    <span
                      className={`absolute bottom-0 right-0 block h-2 w-2 rounded-full ring-1 ring-card ${getPresenceBadgeColor(p.presence)}`}
                    />
                  </div>
                  <div>
                    <p className="font-bold text-foreground leading-normal">{p.full_name}</p>
                    <p className="text-[9px] text-muted-foreground leading-none">{p.designation || 'Specialist'}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-[9px] text-muted-foreground font-semibold uppercase leading-none">Leads</p>
                    <span className="inline-block mt-1 bg-primary/10 text-primary px-2 py-0.5 rounded font-bold text-[10px]">
                      {leadCount}
                    </span>
                  </div>
                  <div className="text-center">
                    <p className="text-[9px] text-muted-foreground font-semibold uppercase leading-none">Open Tasks</p>
                    <span className="inline-block mt-1 bg-warning/10 text-warning px-2 py-0.5 rounded font-bold text-[10px]">
                      {openTasks}
                    </span>
                  </div>
                  <div className="text-right min-w-[70px]">
                    <p className="text-[9px] text-muted-foreground font-semibold uppercase leading-none">Conversion</p>
                    <p className="font-bold text-foreground text-[10px] mt-1">{convRate}%</p>
                    <div className="w-12 bg-muted h-1 rounded mt-1 overflow-hidden ml-auto">
                      <div className="bg-success h-full" style={{ width: `${convRate}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {specialists.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">No active Specialists found.</p>
          )}
        </div>
      </div>
    );
  };

  const renderUpcomingRemindersWidget = () => {
    const isHead = currentUser?.role === 'head';
    const activeReminders = reminders.filter((r) => r.status === 'active');
    
    const displayReminders = isHead 
      ? activeReminders 
      : activeReminders.filter(r => r.creator_id === currentUser?.id || r.invited_users?.includes(currentUser?.id || ''));

    return (
      <div className="border border-border rounded-xl bg-card p-5 shadow-sm space-y-4 h-full">
        <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-danger animate-pulse" />
            <span>{isHead ? 'Upcoming Team Reminders' : 'Upcoming Reminders'}</span>
          </h4>
          <button onClick={() => onNavigate('reminders')} className="text-[10px] text-primary hover:underline flex items-center font-semibold">
            <span>Scheduler</span>
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>

        <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
          {displayReminders.slice(0, 5).map((rem) => (
            <div key={rem.id} className="p-3 border border-border rounded bg-muted/20 text-xs flex justify-between items-start gap-4 hover:border-primary/30 transition-all cursor-pointer" onClick={() => onNavigate('reminders')}>
              <div className="space-y-1">
                <p className="font-semibold text-foreground leading-snug">{rem.title}</p>
                <p className="text-[9px] text-muted-foreground">
                  {new Date(rem.reminder_time).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                </p>
              </div>
              <span className="text-[8px] font-bold uppercase bg-primary/10 text-primary px-1.5 py-0.5 rounded flex-shrink-0">
                {getProfileName(rem.creator_id).split(' ')[0]}
              </span>
            </div>
          ))}
          {displayReminders.length === 0 && (
            <div className="text-center py-8 text-xs text-muted-foreground space-y-1">
              <Calendar className="h-6 w-6 text-muted-foreground/30 mx-auto" />
              <p className="font-semibold">No reminders scheduled</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderQuickAddWidget = () => {
    return (
      <div className="border border-border rounded-xl bg-card p-6 shadow-sm space-y-4 flex flex-col items-center justify-center text-center py-8 h-full">
        <div className="h-12 w-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-1 animate-pulse">
          <Briefcase className="h-6 w-6" />
        </div>
        <h3 className="text-sm font-bold text-foreground">Outbound Lead Command</h3>
        <p className="text-xs text-muted-foreground max-w-sm">
          Register a new outbound prospect with full details, company mappings, demand types, and reference screenshots.
        </p>
        <button
          onClick={() => onNavigate('leads/new')}
          className="mt-2 px-6 py-2 bg-primary hover:bg-primary/95 text-primary-foreground rounded text-xs font-semibold shadow-sm transition-colors cursor-pointer"
        >
          Launch Lead Registration Form
        </button>
      </div>
    );
  };

  const renderLeadPipelineWidget = () => {
    return (
      <div className="border border-border rounded-xl bg-card p-5 shadow-sm space-y-3 h-full">
        <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">My Lead Pipeline</h3>
          <button onClick={() => onNavigate('leads')} className="text-xs text-primary hover:underline flex items-center font-semibold">
            <span>View Portfolio</span>
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>

        <div className="divide-y divide-border/60 max-h-72 overflow-y-auto pr-1">
          {leads.slice(0, 5).map((l) => (
            <div key={l.id} className="py-2.5 flex items-center justify-between text-xs hover:bg-muted/10 px-1 rounded transition-colors cursor-pointer" onClick={() => onNavigate(`leads/${l.id}`)}>
              <div>
                <p className="font-bold text-foreground">{l.company_name}</p>
                <p className="text-[10px] text-muted-foreground">{l.prospect_name}</p>
              </div>
              <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground text-[9px] uppercase font-bold border border-border/40">
                {l.status}
              </span>
            </div>
          ))}
          {leads.length === 0 && (
            <p className="text-xs text-muted-foreground py-4 text-center">No leads in your portfolio. Use the form above!</p>
          )}
        </div>
      </div>
    );
  };

  const renderTasksWidget = () => {
    const myTasks = tasks.filter((t) => t.assignee_id === currentUser?.id || t.creator_id === currentUser?.id);
    const todoTasks = myTasks.filter((t) => t.status !== 'done');

    return (
      <div className="border border-border rounded-xl bg-card p-5 shadow-sm space-y-4 h-full">
        <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <CheckSquare className="h-4 w-4 text-primary" />
            <span>My Tasks List</span>
          </h4>
          <button onClick={() => onNavigate('tasks')} className="text-[10px] text-primary hover:underline flex items-center font-semibold">
            <span>Task Center</span>
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>

        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {todoTasks.slice(0, 5).map((t) => (
            <div key={t.id} className="p-3 border border-border rounded bg-muted/20 text-xs flex justify-between items-start gap-3 hover:border-primary/30 transition-all cursor-pointer" onClick={() => onNavigate('tasks')}>
              <div className="space-y-1">
                <p className="font-bold text-foreground leading-snug">{t.title}</p>
                {t.deadline && (
                  <p className="text-[9px] text-muted-foreground">
                    Due: {new Date(t.deadline).toLocaleDateString()}
                  </p>
                )}
              </div>
              <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded border ${
                t.priority === 'high' ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-300 border-red-200 dark:border-red-900/50' :
                t.priority === 'medium' ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-300 border-amber-200 dark:border-amber-900/50' :
                'bg-slate-100 dark:bg-slate-900/60 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800'
              }`}>
                {t.priority}
              </span>
            </div>
          ))}
          {todoTasks.length === 0 && (
            <div className="text-center py-8 text-xs text-muted-foreground space-y-1">
              <CheckSquare className="h-6 w-6 text-muted-foreground/30 mx-auto" />
              <p className="font-semibold">All tasks completed!</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderWidget = (id: string) => {
    if (!visibleWidgets[id]) return null;

    switch (id) {
      case 'head-metrics': return renderHeadMetrics();
      case 'specialist-metrics': return renderSpecialistMetrics();
      case 'lifecycle': return renderLifecycleWidget();
      case 'teammates': return renderTeammatesWidget();
      case 'upcoming-reminders': return renderUpcomingRemindersWidget();
      case 'recent-activity': return renderRecentActivityWidget();
      case 'quick-add': return renderQuickAddWidget();
      case 'lead-pipeline': return renderLeadPipelineWidget();
      case 'tasks': return renderTasksWidget();
      case 'tasks-due': return renderTasksDueWidget();
      
      // Optional widgets:
      case 'pipeline-funnel': return renderFunnelWidget();
      case 'team-presence': return renderTeamPresenceWidget();
      case 'quote-of-the-day': return renderQuoteWidget();
      case 'calendar-mini': return renderMiniCalendarWidget();
      default: return null;
    }
  };

  const getWidgetLabel = (id: string) => {
    switch (id) {
      case 'head-metrics': return 'Director Metrics Row';
      case 'specialist-metrics': return 'Specialist Metrics Row';
      case 'lifecycle': return 'Lead Lifecycle Distribution';
      case 'teammates': return 'Teammate Portfolio Breakdown';
      case 'upcoming-reminders': return currentUser?.role === 'head' ? 'Team Reminders' : 'Upcoming Reminders';
      case 'recent-activity': return 'Outbound Activity Log';
      case 'quick-add': return 'Quick Add Lead Card';
      case 'lead-pipeline': return 'My Lead Pipeline';
      case 'tasks': return 'My Tasks List';
      case 'tasks-due': return 'Tasks Due Today';
      case 'pipeline-funnel': return 'Lead Pipeline Funnel (SVG)';
      case 'calendar-mini': return 'Calendar Mini-view Month Grid';
      case 'quote-of-the-day': return 'Daily Outbound Quote';
      case 'team-presence': return 'Teammate Collaboration Room';
      default: return id;
    }
  };

  // -------------------------------------------------------------
  // MASTER RENDER
  // -------------------------------------------------------------

  return (
    <div className="p-4 sm:p-6 space-y-6 w-full max-w-[1600px] mx-auto select-none">
      
      {/* Banner Header Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="text-xl font-extrabold text-foreground sm:text-2xl tracking-tight">
            Welcome back, {currentUser?.full_name.split(' ')[0]} 👋
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5 capitalize">
            Workspace: {currentUser?.role === 'head' ? '👑 Head Director' : 'Outbound Growth Specialist'} portfolio dashboard
          </p>
        </div>

        {/* Configure widgets button */}
        {currentUser?.role === 'growth_specialist' && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsConfiguring(!isConfiguring)}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 border border-border hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              <Layout className="h-3.5 w-3.5 text-primary" />
              <span>Customize Widgets</span>
            </button>
            <button
              onClick={resetDashboardLayout}
              className="flex items-center justify-center p-1.5 border border-border hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg transition-colors cursor-pointer"
              title="Reset to default dashboard layout"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Bulk Mail Campaign CTA */}
      {currentUser?.role === 'growth_specialist' && (
        <div className="border border-border rounded-xl bg-gradient-to-r from-primary/10 to-accent/10 p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 bg-primary/20 text-primary rounded-full flex items-center justify-center flex-shrink-0">
              <Mail className="h-4 w-4" />
            </div>
            <div>
              <h4 className="text-xs font-extrabold text-foreground">Need to send bulk mails & follow-ups?</h4>
              <p className="text-[10px] text-muted-foreground mt-0.5 leading-normal max-w-2xl">
                Use our companion Bulk Mailing platform to launch cold campaigns, schedule automatic replies, and track open analytics.
              </p>
            </div>
          </div>
          <a
            href="https://mainsitesend.vercel.app/followups"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary/95 text-primary-foreground rounded text-xs font-semibold shadow-sm transition-all duration-200 cursor-pointer flex-shrink-0"
          >
            <span>Launch Mailer</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      )}

      {/* Widget toggles panel */}
      {isConfiguring && (
        <div className="border border-border bg-card rounded-xl p-4 shadow-md animate-slide-up space-y-3 max-w-xl mx-auto">
          <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Dashboard Widget Configuration</h4>
          <p className="text-[10px] text-muted-foreground leading-normal">
            Toggle checkboxes to display widgets. Grab widget headers (<GripVertical className="h-3 w-3 inline text-muted-foreground" />) and drag them to re-arrange layout order.
          </p>
          <div className="grid grid-cols-2 gap-2.5 pt-1 text-xs">
            {widgetList.map((id) => (
              <label key={id} className="flex items-center gap-2 cursor-pointer font-semibold text-foreground">
                <input
                  type="checkbox"
                  checked={visibleWidgets[id] ?? true}
                  onChange={() => toggleWidgetVisibility(id)}
                  className="h-4 w-4 border-border rounded text-primary cursor-pointer"
                />
                <span>{getWidgetLabel(id)}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Grid of Widgets */}
      {currentUser?.role === 'head' ? (
        <div className="grid grid-cols-1 lg:grid-cols-6 gap-6">
          {/* Row 1: Metrics */}
          <div className="col-span-6">{renderHeadMetrics()}</div>

          {/* Row 2: Distribution & Activity */}
          <div className="col-span-6 lg:col-span-4 space-y-6">
            {renderLifecycleWidget()}
            {renderRecentActivityWidget()}
          </div>

          {/* Sidebar widgets */}
          <div className="col-span-6 lg:col-span-2 space-y-6">
            {renderTeammatesWidget()}
            {renderUpcomingRemindersWidget()}
            {renderTeamPresenceWidget()}
            {renderMiniCalendarWidget()}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
          {widgetList.map((widgetId) => {
            if (!visibleWidgets[widgetId]) return null;

            return (
              <div
                key={widgetId}
                draggable="true"
                onDragStart={(e) => handleDragStart(e, widgetId)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, widgetId)}
                className={`relative flex flex-col group select-none transition-shadow ${getWidgetWidthClass(widgetId)}`}
              >
                {/* Drag handles & resizing bar overlay when configuring */}
                {isConfiguring && (
                  <div className="absolute top-2.5 right-2 flex items-center gap-1.5 z-20 bg-background/90 backdrop-blur-sm p-1 rounded-md border border-border shadow-sm">
                    {/* Width selector dropdown */}
                    <select
                      value={widgetWidths[widgetId] || '1/3'}
                      onChange={(e) => handleWidgetWidthChange(widgetId, e.target.value as any)}
                      className="text-[9px] font-bold bg-background border border-border rounded px-1 py-0.5 focus:outline-none cursor-pointer"
                    >
                      <option value="1/3">1/3 Width</option>
                      <option value="1/2">1/2 Width</option>
                      <option value="2/3">2/3 Width</option>
                      <option value="full">Full Width</option>
                    </select>
                    <div
                      title="Drag from here to rearrange"
                      className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded cursor-grab active:cursor-grabbing border border-border/40"
                    >
                      <GripVertical className="h-3.5 w-3.5" />
                    </div>
                    <button
                      onClick={() => toggleWidgetVisibility(widgetId)}
                      title="Hide widget"
                      className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded cursor-pointer border border-border/40 text-danger"
                    >
                      <EyeOff className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}

                {/* Render actual widget details */}
                {renderWidget(widgetId)}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
