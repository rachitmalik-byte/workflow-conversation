import React, { useState, useEffect } from 'react';
import { dbClient } from '../../services/dbClient';
import { useAuth } from '../../context/AuthContext';
import type { Lead, Task, Reminder } from '../../types/database';
import { Briefcase, CheckSquare, Calendar, Activity, ChevronRight, Mail, ExternalLink } from 'lucide-react';

interface DashboardViewProps {
  onNavigate: (view: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const { currentUser, profiles } = useAuth();
  
  const [leads, setLeads] = useState<Lead[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [activities, setActivities] = useState<{ id: string; user: string; text: string; time: string }[]>([]);

  const fetchDashboardData = async () => {
    if (!currentUser) return;
    const leadsData = await dbClient.getLeads();
    setLeads(leadsData.filter(l => !l.hidden_by?.includes(currentUser.id)));

    const tasksData = await dbClient.getTasks();
    setTasks(tasksData);

    const remindersData = await dbClient.getReminders();
    setReminders(remindersData);

    // Pull recent activity logs
    const recentUpdates = await dbClient.getLeadUpdates('all'); // Simulated
    const logs = recentUpdates.slice(0, 5).map((up) => ({
      id: up.id,
      user: profiles.find((p) => p.id === up.user_id)?.full_name || 'Teammate',
      text: up.content,
      time: new Date(up.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }));
    setActivities(logs);
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

  // Render Head Analytics
  const renderHeadDashboard = () => {
    // 1. Team conversion numbers
    const totalLeads = leads.length;
    const wonLeads = leads.filter((l) => l.status === 'closed_won').length;
    const conversionRate = totalLeads ? Math.round((wonLeads / totalLeads) * 100) : 0;

    // 2. Task completeness ratio
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === 'done').length;
    const taskCompletionRate = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // 3. Lead distribution count across employees
    const employeeLeadDistribution: Record<string, number> = {};
    leads.forEach((l) => {
      (l.assigned_users || []).forEach((uid) => {
        const name = getProfileName(uid);
        employeeLeadDistribution[name] = (employeeLeadDistribution[name] || 0) + 1;
      });
    });

    // 4. Status counts for chart simulation
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
      <div className="space-y-6">
        {/* Metric Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="border border-border bg-card p-4 rounded-lg shadow-sm">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Total Sales Leads</span>
              <Briefcase className="h-4 w-4 text-primary" />
            </div>
            <p className="text-2xl font-bold text-foreground">{totalLeads}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Across all growth specialist portfolios</p>
          </div>

          <div className="border border-border bg-card p-4 rounded-lg shadow-sm">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Won Conversion Ratio</span>
              <Activity className="h-4 w-4 text-success" />
            </div>
            <p className="text-2xl font-bold text-foreground">{conversionRate}%</p>
            <div className="w-full bg-muted h-1 rounded mt-2 overflow-hidden">
              <div className="bg-success h-full" style={{ width: `${conversionRate}%` }} />
            </div>
          </div>

          <div className="border border-border bg-card p-4 rounded-lg shadow-sm">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Task Completion</span>
              <CheckSquare className="h-4 w-4 text-warning" />
            </div>
            <p className="text-2xl font-bold text-foreground">{taskCompletionRate}%</p>
            <p className="text-[10px] text-muted-foreground mt-1">{completedTasks} of {totalTasks} checklist items done</p>
          </div>

          <div className="border border-border bg-card p-4 rounded-lg shadow-sm">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Active Reminders</span>
              <Calendar className="h-4 w-4 text-danger" />
            </div>
            <p className="text-2xl font-bold text-foreground">
              {reminders.filter((r) => r.status === 'active').length}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">Calendar alarms scheduled</p>
          </div>
        </div>

        {/* Analytics Visualization Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Status distribution chart */}
          <div className="border border-border rounded-lg bg-card p-5 shadow-sm space-y-4 lg:col-span-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Lead Lifecycle Distribution</h3>
            
            <div className="space-y-3 pt-2">
              {Object.entries(statusCounts).map(([status, count]) => {
                const percentage = totalLeads ? Math.round((count / totalLeads) * 100) : 0;
                return (
                  <div key={status} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="capitalize font-medium text-foreground">{status.replace('_', ' ')}</span>
                      <span className="text-muted-foreground font-semibold">{count} leads ({percentage}%)</span>
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

          {/* Employee Distribution & Ownership Card */}
          <div className="border border-border rounded-lg bg-card p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Teammate Portfolio Breakdown</h3>

            <div className="space-y-3 pt-2">
              {Object.entries(employeeLeadDistribution).map(([name, count]) => (
                <div key={name} className="flex items-center justify-between text-xs border-b border-border/40 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-5 bg-secondary text-white font-bold rounded flex items-center justify-center text-[9px] uppercase">
                      {name.split(' ').map((n) => n[0]).join('')}
                    </div>
                    <span className="font-medium">{name}</span>
                  </div>
                  <span className="bg-muted px-2 py-0.5 rounded font-semibold text-muted-foreground">
                    {count} leads
                  </span>
                </div>
              ))}
              {Object.keys(employeeLeadDistribution).length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">No allocations logged.</p>
              )}
            </div>
          </div>
        </div>

        {/* Action Agenda and Updates */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upcoming reminders */}
          <div className="border border-border rounded-lg bg-card p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Upcoming Team Reminders</h3>
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {reminders
                .filter((r) => r.status === 'active')
                .slice(0, 4)
                .map((rem) => (
                  <div key={rem.id} className="p-3 border border-border rounded bg-muted/20 text-xs flex justify-between items-start gap-4">
                    <div className="space-y-1">
                      <p className="font-semibold text-foreground leading-snug">{rem.title}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(rem.reminder_time).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </p>
                    </div>
                    <span className="text-[9px] font-bold uppercase bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                      {getProfileName(rem.creator_id).split(' ')[0]}
                    </span>
                  </div>
                ))}
              {reminders.filter((r) => r.status === 'active').length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">No active reminders.</p>
              )}
            </div>
          </div>

          {/* Recent activities updates */}
          <div className="border border-border rounded-lg bg-card p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Recent Outbound Activity Log</h3>
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {activities.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No recent edits logged.</p>
              ) : (
                activities.map((act) => (
                  <div key={act.id} className="text-xs border-b border-border/40 pb-2.5 last:border-b-0 space-y-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-bold text-foreground">{act.user}</span>
                      <span className="text-muted-foreground">{act.time}</span>
                    </div>
                    <p className="text-muted-foreground leading-relaxed italic">"{act.text}"</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render Growth Specialist Dashboard
  const renderSpecialistDashboard = () => {
    const totalLeads = leads.length;
    const myTasks = tasks.filter((t) => t.assignee_id === currentUser?.id || t.creator_id === currentUser?.id);
    const todoTasks = myTasks.filter((t) => t.status !== 'done');
    const myReminders = reminders.filter((r) => r.status === 'active');

    return (
      <div className="space-y-6">
        {/* Statistics Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="border border-border bg-card p-4 rounded-lg shadow-sm flex items-center gap-3">
            <div className="h-10 w-10 bg-primary/10 text-primary rounded-full flex items-center justify-center flex-shrink-0">
              <Briefcase className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">My Portfolio Leads</p>
              <p className="text-2xl font-bold text-foreground">{totalLeads}</p>
            </div>
          </div>

          <div className="border border-border bg-card p-4 rounded-lg shadow-sm flex items-center gap-3">
            <div className="h-10 w-10 bg-success/10 text-success rounded-full flex items-center justify-center flex-shrink-0">
              <CheckSquare className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Active To-Do Tasks</p>
              <p className="text-2xl font-bold text-foreground">{todoTasks.length}</p>
            </div>
          </div>

          <div className="border border-border bg-card p-4 rounded-lg shadow-sm flex items-center gap-3">
            <div className="h-10 w-10 bg-danger/10 text-danger rounded-full flex items-center justify-center flex-shrink-0">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Scheduled Alarms</p>
              <p className="text-2xl font-bold text-foreground">{myReminders.length}</p>
            </div>
          </div>
        </div>

        {/* Dashboard Grid layouts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Add Lead Card */}
            <div className="border border-border rounded-lg bg-card p-6 shadow-sm space-y-4 flex flex-col items-center justify-center text-center py-8">
              <div className="h-12 w-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-1 animate-pulse">
                <Briefcase className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-bold text-foreground">Outbound Lead Command</h3>
              <p className="text-xs text-muted-foreground max-w-sm">
                Register a new outbound prospect with full details, company mappings, demand types, and reference screenshots.
              </p>
              <button
                onClick={() => onNavigate('leads/new')}
                className="mt-2 px-6 py-2 bg-primary hover:bg-primary/95 text-white rounded text-xs font-semibold shadow-sm transition-colors cursor-pointer"
              >
                Launch Lead Registration Form
              </button>
            </div>

            {/* My Lead conversion board overview */}
            <div className="border border-border rounded-lg bg-card p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">My Lead Pipeline</h3>
                <button onClick={() => onNavigate('leads')} className="text-xs text-primary hover:underline flex items-center">
                  <span>View Portfolio</span>
                  <ChevronRight className="h-3 w-3" />
                </button>
              </div>

              <div className="divide-y divide-border/60">
                {leads.slice(0, 4).map((l) => (
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
                  <p className="text-xs text-muted-foreground py-4 text-center">No leads in your portfolio. Use the quick add form above!</p>
                )}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* My Tasks lists */}
            <div className="border border-border rounded-lg bg-card p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">My Tasks</h3>
                <button onClick={() => onNavigate('tasks')} className="text-xs text-primary hover:underline flex items-center">
                  <span>Task Center</span>
                  <ChevronRight className="h-3 w-3" />
                </button>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {todoTasks.slice(0, 4).map((t) => (
                  <div key={t.id} className="p-2.5 border border-border rounded bg-muted/20 text-xs space-y-1">
                    <p className="font-semibold text-foreground leading-snug">{t.title}</p>
                    {t.deadline && (
                      <p className="text-[9px] text-muted-foreground">
                        Due {new Date(t.deadline).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                ))}
                {todoTasks.length === 0 && (
                  <p className="text-xs text-muted-foreground py-4 text-center">All caught up! No active tasks.</p>
                )}
              </div>
            </div>

            {/* My scheduled Reminders */}
            <div className="border border-border rounded-lg bg-card p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">My Upcoming Reminders</h3>
                <button onClick={() => onNavigate('reminders')} className="text-xs text-primary hover:underline flex items-center">
                  <span>Scheduler</span>
                  <ChevronRight className="h-3 w-3" />
                </button>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {myReminders.slice(0, 4).map((rem) => (
                  <div key={rem.id} className="p-2.5 border border-border rounded bg-muted/20 text-xs space-y-1">
                    <p className="font-semibold text-foreground leading-snug">{rem.title}</p>
                    <p className="text-[9px] text-muted-foreground">
                      {new Date(rem.reminder_time).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </p>
                  </div>
                ))}
                {myReminders.length === 0 && (
                  <p className="text-xs text-muted-foreground py-4 text-center">No reminders scheduled.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 w-full">
      {/* Banner Title */}
      <div>
        <h2 className="text-xl font-extrabold text-foreground sm:text-2xl tracking-tight">
          Welcome back, {currentUser?.full_name.split(' ')[0]} 👋
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Workspace role: {currentUser?.role === 'head' ? 'Workspace Head / Operations Director' : 'Growth & Outbound Campaign Specialist'}
        </p>
      </div>

      {/* Bulk Mail Campaign CTA */}
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
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary/95 text-white rounded text-xs font-semibold shadow-sm transition-all duration-200 cursor-pointer flex-shrink-0"
        >
          <span>Launch Mailer</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      {currentUser?.role === 'head' ? renderHeadDashboard() : renderSpecialistDashboard()}
    </div>
  );
};
