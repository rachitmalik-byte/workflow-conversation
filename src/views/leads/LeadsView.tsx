import React, { useState, useEffect } from 'react';
import { dbClient } from '../../services/dbClient';
import { useAuth } from '../../context/AuthContext';
import type { Lead, LeadStatus } from '../../types/database';
import { Table, Kanban, Calendar as CalendarIcon, Search, User, Filter, ArrowUpDown, Plus, Eye, Users, Briefcase, Trash2 } from 'lucide-react';

interface LeadsViewProps {
  onNavigate: (view: string) => void;
}

type TabType = 'table' | 'kanban' | 'calendar';

export const LeadsView: React.FC<LeadsViewProps> = ({ onNavigate }) => {
  const { currentUser, profiles } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    return (localStorage.getItem('relayhq_leads_active_tab') as TabType) || 'table';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadLeads, setUnreadLeads] = useState<string[]>([]);
  
  // Filtering & Sorting (primarily for Heads)
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'company_name' | 'created_at' | 'updated_at'>('updated_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [groupByEmployee, setGroupByEmployee] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  const [draggingLeadId, setDraggingLeadId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<LeadStatus | null>(null);

  useEffect(() => {
    localStorage.setItem('relayhq_leads_active_tab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    const handleTabReset = () => {
      const tab = localStorage.getItem('relayhq_leads_active_tab') as TabType;
      if (tab) setActiveTab(tab);
    };
    window.addEventListener('leads-tab-reset', handleTabReset);
    return () => {
      window.removeEventListener('leads-tab-reset', handleTabReset);
    };
  }, []);

  useEffect(() => {
    const loadUnreadLeads = () => {
      try {
        const saved = localStorage.getItem('relayhq_unread_leads');
        setUnreadLeads(saved ? JSON.parse(saved) : []);
      } catch (e) {}
    };
    loadUnreadLeads();
    window.addEventListener('unread-counts-updated', loadUnreadLeads);
    return () => {
      window.removeEventListener('unread-counts-updated', loadUnreadLeads);
    };
  }, []);

  const getUserColorStyle = (uid: string) => {
    const colors = [
      { bg: 'rgba(59, 130, 246, 0.12)', text: 'rgb(29, 78, 216)', border: 'rgba(59, 130, 246, 0.3)' }, // blue
      { bg: 'rgba(16, 185, 129, 0.12)', text: 'rgb(4, 120, 87)', border: 'rgba(16, 185, 129, 0.3)' }, // emerald
      { bg: 'rgba(99, 102, 241, 0.12)', text: 'rgb(67, 56, 202)', border: 'rgba(99, 102, 241, 0.3)' }, // indigo
      { bg: 'rgba(139, 92, 246, 0.12)', text: 'rgb(109, 40, 217)', border: 'rgba(139, 92, 246, 0.3)' }, // purple
      { bg: 'rgba(245, 158, 11, 0.12)', text: 'rgb(180, 83, 9)', border: 'rgba(245, 158, 11, 0.3)' }, // amber
      { bg: 'rgba(236, 72, 153, 0.12)', text: 'rgb(190, 24, 74)', border: 'rgba(236, 72, 153, 0.3)' }, // pink
      { bg: 'rgba(6, 182, 212, 0.12)', text: 'rgb(9, 133, 161)', border: 'rgba(6, 182, 212, 0.3)' }, // cyan
      { bg: 'rgba(244, 63, 94, 0.12)', text: 'rgb(190, 18, 60)', border: 'rgba(244, 63, 94, 0.3)' } // rose
    ];
    let hash = 0;
    const name = profiles.find((p) => p.id === uid)?.full_name || uid || 'Unknown';
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const fetchLeads = async () => {
    const data = await dbClient.getLeads();
    setLeads(data);
  };

  useEffect(() => {
    fetchLeads();

    // Subscribe to database changes
    const unsubscribe = dbClient.subscribe((table) => {
      if (table === 'leads') {
        fetchLeads();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [currentUser]);

  const toggleSort = (field: 'company_name' | 'created_at' | 'updated_at') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const getProfileName = (uid: string) => {
    return profiles.find((p) => p.id === uid)?.full_name || 'Unknown';
  };

  // Filter & Sort Logic
  const getFilteredLeads = () => {
    let result = [...leads];

    // Filter hidden leads
    if (!showHidden) {
      result = result.filter(l => !l.hidden_by?.includes(currentUser?.id || ''));
    } else {
      result = result.filter(l => l.hidden_by?.includes(currentUser?.id || ''));
    }

    // Search Query filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (l) =>
          l.company_name.toLowerCase().includes(query) ||
          l.prospect_name.toLowerCase().includes(query) ||
          l.email.toLowerCase().includes(query) ||
          l.tags.some((t) => t.toLowerCase().includes(query))
      );
    }

    // Employee filters (Heads only)
    if (currentUser?.role === 'head' && employeeFilter !== 'all') {
      result = result.filter((l) => l.assigned_users?.includes(employeeFilter));
    }

    // Sort logic
    result.sort((a, b) => {
      let valA = a[sortBy];
      let valB = b[sortBy];

      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortOrder === 'asc'
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }
      return 0;
    });

    return result;
  };

  const filteredLeads = getFilteredLeads();

  // Kanban view statuses
  const kanbanStatuses: { value: LeadStatus; label: string; color: string }[] = [
    { value: 'new', label: 'Backlog', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' },
    { value: 'contacted', label: 'In Progress', color: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20' },
    { value: 'qualified', label: 'Under Review', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
    { value: 'proposal', label: 'Proposal Phase', color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' },
    { value: 'negotiation', label: 'In Discussion', color: 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20' },
    { value: 'closed_won', label: 'Completed', color: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20' },
    { value: 'closed_lost', label: 'Archived / Cancelled', color: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20' },
  ];

  // Move Lead Status Handler (Simulating Kanban board updates)
  const handleMoveLeadStatus = async (leadId: string, nextStatus: LeadStatus) => {
    try {
      await dbClient.updateLead(leadId, { status: nextStatus });
      if (nextStatus === 'closed_won') {
        triggerConfetti();
      }
      fetchLeads();
    } catch (err: any) {
      alert(err.message || 'Failed to update lead status');
    }
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    setDraggingLeadId(id);
  };

  const handleDragEnd = () => {
    setDraggingLeadId(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: LeadStatus) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain') || draggingLeadId;
    if (!id) return;

    try {
      await dbClient.updateLead(id, { status: targetStatus });
      if (targetStatus === 'closed_won') {
        triggerConfetti();
      }
      fetchLeads();
    } catch (err: any) {
      alert(err.message || 'Failed to update lead status');
    } finally {
      setDraggingLeadId(null);
      setDragOverColumn(null);
    }
  };

  // Group by employee representation (Heads only)
  const renderGroupedTable = () => {
    const employeeGroups: { [key: string]: Lead[] } = {};

    filteredLeads.forEach((lead) => {
      const assigned = lead.assigned_users || [];
      if (assigned.length === 0) {
        if (!employeeGroups['Unassigned']) employeeGroups['Unassigned'] = [];
        employeeGroups['Unassigned'].push(lead);
      } else {
        assigned.forEach((uid) => {
          const name = getProfileName(uid);
          if (!employeeGroups[name]) employeeGroups[name] = [];
          employeeGroups[name].push(lead);
        });
      }
    });

    return (
      <div className="space-y-6">
        {Object.entries(employeeGroups).map(([employeeName, groupLeads]) => (
          <div key={employeeName} className="border border-border rounded-lg bg-card overflow-hidden shadow-sm">
            <div className="bg-muted/50 border-b border-border px-4 py-2 flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{employeeName}</span>
              </span>
              <span className="text-[10px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {groupLeads.length} projects
              </span>
            </div>
            {renderTableBody(groupLeads)}
          </div>
        ))}
      </div>
    );
  };

  const renderTableBody = (leadsList: Lead[]) => {
    if (leadsList.length === 0) {
      return (
        <div className="p-8 text-center text-xs text-muted-foreground">
          No projects under this criteria.
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs sm:text-sm">
          <thead>
            <tr className="bg-muted/30 border-b border-border text-muted-foreground text-[10px] font-bold uppercase tracking-wider">
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Prospect</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Priority</th>
              <th className="px-4 py-3">Created Date</th>
              <th className="px-4 py-3">Uploaded By</th>
              {currentUser?.role === 'head' && <th className="px-4 py-3">Assigned Team</th>}
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {leadsList.map((l) => {
              const isUnread = unreadLeads.includes(l.id);
              return (
                <tr key={l.id} className="hover:bg-muted/40 transition-colors">
                  <td className="px-4 py-3 font-semibold text-foreground">
                    <div className="flex items-center gap-2">
                      {isUnread && (
                        <span className="h-2 w-2 rounded-full bg-danger animate-pulse flex-shrink-0" title="New unread updates" />
                      )}
                      <span className={isUnread ? 'font-extrabold text-foreground' : ''}>{l.company_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">{l.prospect_name}</td>
                  <td className="px-4 py-3 text-primary">{l.email}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${
                      kanbanStatuses.find(ks => ks.value === l.status)?.color
                    }`}>
                      {l.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      l.priority === 'high' ? 'bg-danger/10 text-danger' :
                      l.priority === 'medium' ? 'bg-warning/10 text-warning' :
                      'bg-slate-100 dark:bg-slate-800 text-muted-foreground'
                    }`}>
                      {l.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(l.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {(() => {
                      const colorStyle = getUserColorStyle(l.created_by);
                      return (
                        <span 
                          style={{ backgroundColor: colorStyle.bg, color: colorStyle.text, borderColor: colorStyle.border }} 
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border"
                        >
                          {getProfileName(l.created_by)}
                        </span>
                      );
                    })()}
                  </td>
                {currentUser?.role === 'head' && (
                  <td className="px-4 py-3 text-muted-foreground">
                    <div className="flex flex-wrap gap-1 max-w-[150px]">
                      {(l.assigned_users || []).map((uid) => (
                        <span key={uid} className="bg-muted px-1.5 py-0.5 rounded text-[10px] font-medium" title={getProfileName(uid)}>
                          {getProfileName(uid).split(' ').map((n) => n[0]).join('')}
                        </span>
                      ))}
                    </div>
                  </td>
                )}
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end items-center gap-1.5">
                    <button
                      onClick={() => onNavigate(`leads/${l.id}`)}
                      className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded transition-colors inline-flex items-center gap-1.5"
                      title="View details"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (window.confirm(`Delete project: ${l.company_name}? This will remove all updates and attachments.`)) {
                          try {
                            await dbClient.deleteLead(l.id);
                            fetchLeads();
                          } catch (err: any) {
                             alert(err.message || 'Failed to delete project');
                          }
                        }
                      }}
                      className="p-1 hover:bg-danger/10 text-muted-foreground hover:text-danger rounded transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                      title="Delete project"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            )})}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 w-full">
      {/* Top Banner Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="text-xl font-extrabold text-foreground sm:text-2xl tracking-tight">Workflow Projects Hub</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {currentUser?.role === 'head' ? 'Head Director: Monitor and coordinate active projects across your team.' : 'Teammate Portfolio: Track and execute your assigned project workflows.'}
          </p>
        </div>

        <button
          onClick={() => onNavigate('leads/new')}
          className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-primary-foreground bg-primary hover:bg-primary/95 shadow-sm rounded-md transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Create New Project</span>
        </button>
      </div>

      {/* View Options & Search Toolbar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Tab Selection */}
        <div className="flex items-center border border-border p-0.5 bg-muted/20 rounded-md self-start">
          <button
            onClick={() => setActiveTab('table')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded ${
              activeTab === 'table' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Table className="h-3.5 w-3.5" />
            <span>Table</span>
          </button>
          <button
            onClick={() => setActiveTab('kanban')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded ${
              activeTab === 'kanban' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Kanban className="h-3.5 w-3.5" />
            <span>Kanban</span>
          </button>
          <button
            id="leads-tab-calendar"
            onClick={() => setActiveTab('calendar')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded ${
              activeTab === 'calendar' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <CalendarIcon className="h-3.5 w-3.5" />
            <span>Calendar</span>
          </button>
        </div>

        {/* Filters and Search Bar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search box */}
          <div className="relative flex-1 min-w-[200px] sm:flex-initial">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects, tags..."
              className="w-full pl-9 pr-3 py-2 border border-border bg-card text-foreground text-xs sm:text-sm rounded focus:outline-none focus:border-primary"
            />
          </div>

          {/* Head-Only Filters */}
          {currentUser?.role === 'head' && (
            <>
              {/* Employee filter */}
              <div className="flex items-center gap-1 bg-card border border-border px-2.5 py-1.5 rounded text-xs">
                <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                <select
                  value={employeeFilter}
                  onChange={(e) => setEmployeeFilter(e.target.value)}
                  className="bg-transparent text-foreground focus:outline-none cursor-pointer"
                  title="Filter projects by teammate"
                >
                  <option value="all">All Teammates</option>
                  {profiles
                    .filter((p) => p.role === 'growth_specialist' && p.status === 'active')
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.full_name}
                      </option>
                    ))}
                </select>
              </div>

              {/* Group by Toggle */}
              <button
                onClick={() => setGroupByEmployee(!groupByEmployee)}
                className={`flex items-center gap-1.5 px-3 py-2 border rounded text-xs font-semibold transition-colors ${
                  groupByEmployee
                    ? 'bg-primary/10 border-primary text-primary'
                    : 'bg-card border-border text-muted-foreground hover:text-foreground'
                }`}
                title="Toggle group projects by teammate"
              >
                <Users className="h-3.5 w-3.5" />
                <span>Group by Teammate</span>
              </button>

              <button
                onClick={() => setShowHidden(!showHidden)}
                className={`flex items-center gap-1.5 px-3 py-2 border rounded text-xs font-semibold transition-colors ${
                  showHidden
                    ? 'bg-warning/10 border-warning text-warning'
                    : 'bg-card border-border text-muted-foreground hover:text-foreground'
                }`}
                title="Toggle viewing hidden projects"
              >
                <span>{showHidden ? 'Show Active Projects' : 'Show Hidden Projects'}</span>
              </button>
            </>
          )}

          {/* Sort selection (available if not grouped) */}
          {!groupByEmployee && (
            <div className="flex items-center gap-1 bg-card border border-border px-2.5 py-1.5 rounded text-xs text-muted-foreground">
              <ArrowUpDown className="h-3.5 w-3.5" />
              <button onClick={() => toggleSort('company_name')} className={`hover:text-foreground font-medium ${sortBy === 'company_name' ? 'text-foreground font-semibold underline' : ''}`}>
                Company
              </button>
              <span>|</span>
              <button onClick={() => toggleSort('updated_at')} className={`hover:text-foreground font-medium ${sortBy === 'updated_at' ? 'text-foreground font-semibold underline' : ''}`}>
                Updated
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Tab Render */}
      {leads.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 border border-border border-dashed bg-card rounded-lg text-center">
          <Briefcase className="h-12 w-12 text-muted-foreground/30 mb-3" />
          <h3 className="text-base font-bold text-foreground">No projects created yet</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm">
            Start collaborating by creating your first internal workflow or project card.
          </p>
          <button
            onClick={() => onNavigate('leads/new')}
            className="mt-4 px-4 py-2 text-xs font-semibold text-primary-foreground bg-primary rounded hover:bg-primary/95 transition-colors"
          >
            Create New Project
          </button>
        </div>
      ) : activeTab === 'table' ? (
        groupByEmployee && currentUser?.role === 'head' ? (
          renderGroupedTable()
        ) : (
          <div className="border border-border rounded-lg bg-card overflow-hidden shadow-sm">
            {renderTableBody(filteredLeads)}
          </div>
        )
      ) : activeTab === 'kanban' ? (
        /* Modernized Large Kanban Board with native Drag & Drop */
        <div className="flex gap-4 items-start overflow-x-auto pb-4 h-[calc(100vh-220px)] min-h-[550px] select-none scrollbar-thin">
          {kanbanStatuses.map((column) => {
            const columnLeads = filteredLeads.filter((l) => l.status === column.value);
            const isColumnHovered = dragOverColumn === column.value;

            return (
              <div
                key={column.value}
                onDragOver={handleDragOver}
                onDragEnter={() => setDragOverColumn(column.value)}
                onDragLeave={() => {
                  if (dragOverColumn === column.value) setDragOverColumn(null);
                }}
                onDrop={(e) => handleDrop(e, column.value)}
                className={`flex-shrink-0 w-80 h-full flex flex-col rounded-xl border p-4 transition-all duration-200 ${
                  isColumnHovered
                    ? 'border-primary bg-primary/5 shadow-md scale-[1.01]'
                    : 'border-border bg-card/50'
                }`}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between mb-4 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${
                      column.value === 'new' ? 'bg-blue-500' :
                      column.value === 'contacted' ? 'bg-yellow-500' :
                      column.value === 'qualified' ? 'bg-emerald-500' :
                      column.value === 'proposal' ? 'bg-purple-500' :
                      column.value === 'negotiation' ? 'bg-pink-500' :
                      column.value === 'closed_won' ? 'bg-green-500' :
                      'bg-red-500'
                    }`} />
                    <span className="text-xs font-extrabold text-foreground uppercase tracking-wider">
                      {column.label}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {columnLeads.length}
                  </span>
                </div>

                {/* Column Body - Cards list */}
                <div className="space-y-3 overflow-y-auto pr-1 flex-1 scrollbar-thin">
                  {columnLeads.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 border border-dashed border-border/60 rounded-xl text-center p-4">
                      <span className="text-[10px] text-muted-foreground/40 font-semibold uppercase tracking-wider">
                        Drag items here
                      </span>
                    </div>
                  ) : (
                    columnLeads.map((l) => {
                      const isDraggingThis = draggingLeadId === l.id;
                      return (
                        <div
                          key={l.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, l.id)}
                          onDragEnd={handleDragEnd}
                          onClick={() => onNavigate(`leads/${l.id}`)}
                          className={`group relative p-3.5 border border-border bg-card rounded-xl shadow-sm hover:shadow-md hover:border-primary/40 transition-all duration-150 cursor-grab active:cursor-grabbing space-y-3 ${
                            isDraggingThis ? 'opacity-40 border-dashed border-primary bg-primary/5 scale-[0.98]' : ''
                          }`}
                        >
                          {/* Card Content */}
                          <div className="space-y-1">
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors leading-tight truncate max-w-[180px] flex items-center gap-1.5">
                                {unreadLeads.includes(l.id) && (
                                  <span className="h-1.5 w-1.5 rounded-full bg-danger animate-pulse flex-shrink-0" title="New unread updates" />
                                )}
                                <span className={unreadLeads.includes(l.id) ? 'font-extrabold text-foreground' : ''}>
                                  {l.company_name}
                                </span>
                              </h4>
                              <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider border ${
                                l.priority === 'high' ? 'bg-danger/10 text-danger border-danger/20' :
                                l.priority === 'medium' ? 'bg-warning/10 text-warning border-warning/20' :
                                'bg-slate-100 dark:bg-slate-800 text-muted-foreground border-border'
                              }`}>
                                {l.priority}
                              </span>
                            </div>
                            <p className="text-[10px] text-muted-foreground">
                              <span className="font-semibold">{l.prospect_name}</span>
                            </p>
                            <p className="text-[9px] text-muted-foreground/80 flex items-center gap-1 mt-0.5">
                              <span>By:</span>
                              {(() => {
                                const colorStyle = getUserColorStyle(l.created_by);
                                return (
                                  <span 
                                    style={{ backgroundColor: colorStyle.bg, color: colorStyle.text, borderColor: colorStyle.border }} 
                                    className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-semibold border"
                                  >
                                    {getProfileName(l.created_by)}
                                  </span>
                                );
                              })()}
                            </p>
                          </div>

                          {l.tags.includes('reply_received') && (
                            <div className="flex flex-wrap gap-1">
                              <span className="text-[8px] font-bold bg-success/10 text-success px-1.5 py-0.5 rounded-full border border-success/20">
                                ✓ Reply Received
                              </span>
                            </div>
                          )}

                          {/* Card Footer controls */}
                          <div className="flex items-center justify-between pt-2.5 text-[9px] text-muted-foreground border-t border-border/40">
                            <span className="text-[9px] text-muted-foreground/60">
                              {new Date(l.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </span>

                            <div className="flex items-center gap-1.5">
                              {/* Quick status moves selector */}
                              <select
                                value={l.status}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => handleMoveLeadStatus(l.id, e.target.value as LeadStatus)}
                                className="bg-muted text-foreground border-none px-1 py-0.5 rounded text-[9px] cursor-pointer focus:outline-none font-medium hover:bg-muted/80 transition-colors"
                                title="Move status"
                              >
                                <option value="new">Move: New</option>
                                <option value="contacted">Move: Contact</option>
                                <option value="qualified">Move: Qualify</option>
                                <option value="proposal">Move: Propose</option>
                                <option value="negotiation">Move: Negot.</option>
                                <option value="closed_won">Move: Won</option>
                                <option value="closed_lost">Move: Lost</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Calendar View Grouped Timeline Plotting */
        <div className="space-y-8">
          {(() => {
            const dateGroups = (() => {
              const groups: { [dateStr: string]: Lead[] } = {};
              filteredLeads.forEach((l) => {
                const d = new Date(l.updated_at);
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                const key = `${year}-${month}-${day}`;

                if (!groups[key]) {
                  groups[key] = [];
                }
                groups[key].push(l);
              });

              return Object.keys(groups)
                .sort((a, b) => b.localeCompare(a))
                .map((dateKey) => {
                  const dateObj = new Date(dateKey + 'T00:00:00');
                  return {
                    dateKey,
                    dateObj,
                    leads: groups[dateKey],
                  };
                });
            })();

            if (dateGroups.length === 0) {
              return (
                <div className="border border-border border-dashed bg-card rounded-lg p-10 text-center text-xs text-muted-foreground">
                  No activity scheduled or logged for the current target criteria.
                </div>
              );
            }

            return dateGroups.map((group) => {
              const monthStr = group.dateObj.toLocaleString(undefined, { month: 'short' }).toUpperCase();
              const dayStr = group.dateObj.getDate();
              const yearStr = group.dateObj.getFullYear();
              const weekdayStr = group.dateObj.toLocaleString(undefined, { weekday: 'long' });
              const fullDateStr = group.dateObj.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

              const totalCount = group.leads.length;
              const wonCount = group.leads.filter(l => l.status === 'closed_won').length;
              const contactedCount = group.leads.filter(l => l.status !== 'new' && l.status !== 'closed_lost').length;

              return (
                <div key={group.dateKey} className="flex flex-col gap-4 border-b border-border/30 pb-6 last:border-0 last:pb-0">
                  {/* Group Header Row */}
                  <div className="flex items-center gap-3">
                    {/* Date Badge */}
                    <div className="flex flex-col items-center justify-center w-11 h-12 border border-border bg-slate-900 dark:bg-slate-950 text-white rounded-lg shadow-sm overflow-hidden select-none flex-shrink-0">
                      <div className="w-full bg-primary/20 text-primary text-[7px] font-extrabold py-0.2 text-center uppercase tracking-wider">
                        {monthStr}
                      </div>
                      <div className="text-sm font-extrabold leading-none text-foreground pt-0.5">
                        {dayStr}
                      </div>
                      <div className="text-[7px] text-muted-foreground/80 pb-0.5 font-mono">
                        {yearStr}
                      </div>
                    </div>

                    {/* Group Info */}
                    <div>
                      <h3 className="text-xs sm:text-sm font-bold text-foreground leading-tight">
                        {weekdayStr}, {fullDateStr}
                      </h3>
                      <div className="text-[10px] sm:text-xs text-muted-foreground flex flex-wrap items-center gap-1.5 font-medium mt-0.5">
                        <span>{totalCount} {totalCount === 1 ? 'prospect' : 'prospects'}</span>
                        <span className="text-muted-foreground/60">•</span>
                        <span className="flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                          <span>{wonCount} won</span>
                        </span>
                        <span className="text-muted-foreground/60">•</span>
                        <span className="flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-yellow-500" />
                          <span>{contactedCount} contacted</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Group Leads Card Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {group.leads.map((l) => (
                      <div
                        key={l.id}
                        className="p-4 border border-border bg-card rounded-xl hover:shadow-md hover:border-primary/45 transition-all duration-150 flex flex-col justify-between gap-4 animate-card-in"
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5 leading-tight truncate">
                              {unreadLeads.includes(l.id) && (
                                <span className="h-1.5 w-1.5 rounded-full bg-danger animate-pulse flex-shrink-0" />
                              )}
                              <span className={unreadLeads.includes(l.id) ? 'font-extrabold' : ''}>
                                {l.company_name}
                              </span>
                            </h4>
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider border ${
                              kanbanStatuses.find(ks => ks.value === l.status)?.color
                            }`}>
                              {kanbanStatuses.find(ks => ks.value === l.status)?.label || l.status}
                            </span>
                          </div>

                          <div>
                            <p className="text-xs text-muted-foreground font-semibold">{l.prospect_name}</p>
                            <p className="text-[10px] text-muted-foreground/80 font-medium">{l.email}</p>
                          </div>

                          {l.notes ? (
                            <p className="text-[10px] text-muted-foreground/60 italic line-clamp-2 leading-relaxed bg-muted/20 p-2 rounded border border-border/20">
                              {l.notes}
                            </p>
                          ) : (
                            <p className="text-[10px] text-muted-foreground/40 italic">No notes logged.</p>
                          )}

                          {l.tags && l.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-1">
                              {l.tags.map((t, i) => (
                                <span key={i} className="text-[8px] font-bold bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded-full capitalize">
                                  {t.replace('_', ' ')}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between border-t border-border/40 pt-3 mt-1 text-[9px]">
                          {(() => {
                            const colorStyle = getUserColorStyle(l.created_by);
                            return (
                              <span 
                                style={{ backgroundColor: colorStyle.bg, color: colorStyle.text, borderColor: colorStyle.border }} 
                                className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-semibold border"
                              >
                                By: {getProfileName(l.created_by)}
                              </span>
                            );
                          })()}

                          <div className="flex items-center gap-2">
                            <select
                              value={l.status}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => handleMoveLeadStatus(l.id, e.target.value as LeadStatus)}
                              className="bg-muted text-foreground border-none px-1.5 py-0.5 rounded text-[9px] cursor-pointer focus:outline-none font-medium hover:bg-muted/80 transition-colors"
                            >
                              <option value="new">Move: New</option>
                              <option value="contacted">Move: Contact</option>
                              <option value="qualified">Move: Qualify</option>
                              <option value="proposal">Move: Propose</option>
                              <option value="negotiation">Move: Negot.</option>
                              <option value="closed_won">Move: Won</option>
                              <option value="closed_lost">Move: Lost</option>
                            </select>

                            <button
                              onClick={() => onNavigate(`leads/${l.id}`)}
                              className="p-1 bg-card border border-border hover:bg-muted text-muted-foreground hover:text-foreground rounded transition-colors"
                              title="View details"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            });
          })()}
        </div>
      )}
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
