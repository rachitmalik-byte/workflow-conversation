import type { Profile, Lead, LeadUpdate, LeadAttachment, Task, Reminder, Channel, Message, Notification, PersonalNote } from '../types/database';


// Pre-populated Profiles
export const MOCK_PROFILES: Profile[] = [
  {
    id: 'head-1',
    full_name: 'Sarah Jenkins',
    email: 'sarah.j@relayhq.com',
    role: 'head',
    status: 'active',
    designation: 'Head of Growth',
    presence: 'online',
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'specialist-1',
    full_name: 'Alex Rivera',
    email: 'alex.r@relayhq.com',
    role: 'growth_specialist',
    status: 'active',
    designation: 'Senior Outbound Specialist',
    presence: 'online',
    created_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'specialist-2',
    full_name: 'Elena Rostova',
    email: 'elena.r@relayhq.com',
    role: 'growth_specialist',
    status: 'active',
    designation: 'Lead Generator',
    presence: 'idle',
    created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'specialist-3',
    full_name: 'Marcus Chen',
    email: 'marcus.c@relayhq.com',
    role: 'growth_specialist',
    status: 'active',
    designation: 'SDR Campaign Lead',
    presence: 'busy',
    created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'specialist-4',
    full_name: 'Jane Doe',
    email: 'jane.d@relayhq.com',
    role: 'growth_specialist',
    status: 'inactive',
    designation: 'Growth Specialist',
    presence: 'offline',
    created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
  }
];

// Realistic Pre-populated Leads
const MOCK_LEADS: Lead[] = [
  {
    id: 'lead-1',
    company_name: 'Acme Corp',
    prospect_name: 'John Smith',
    email: 'john.smith@acme.com',
    phone: '+1 (555) 019-2834',
    linkedin: 'linkedin.com/in/john-smith-acme',
    website: 'acme.com',
    company_type: 'Enterprise',
    industry: 'Software & Technology',
    service_needed: 'Outbound Campaign Strategy',
    service_offered: 'Scale Plan',
    status: 'qualified',
    priority: 'high',
    notes: 'Very interested in outbound scaling. Budget approved for Q3.',
    tags: ['enterprise', 'high-intent', 'tech'],
    created_by: 'specialist-1',
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    assigned_users: ['specialist-1']
  },
  {
    id: 'lead-2',
    company_name: 'Stark Industries',
    prospect_name: 'Pepper Potts',
    email: 'pepper@stark.com',
    phone: '+1 (555) 777-8888',
    linkedin: 'linkedin.com/in/pepper-potts-stark',
    website: 'starkindustries.com',
    company_type: 'Conglomerate',
    industry: 'Defense & Aerospace',
    service_needed: 'Lead Qualification Support',
    service_offered: 'Custom Growth Retainer',
    status: 'proposal',
    priority: 'high',
    notes: 'Negotiating custom contract. Wants a dedicated account executive.',
    tags: ['conglomerate', 'vip', 'custom'],
    created_by: 'specialist-1',
    created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    assigned_users: ['specialist-1', 'head-1']
  },
  {
    id: 'lead-3',
    company_name: 'Nova Media',
    prospect_name: 'Alice Johnson',
    email: 'alice@novamedia.co',
    phone: '+1 (555) 321-4567',
    linkedin: 'linkedin.com/in/alice-j-nova',
    website: 'novamedia.co',
    company_type: 'Agency',
    industry: 'Marketing & Advertising',
    service_needed: 'B2B Lead Generation',
    service_offered: 'Growth Pilot',
    status: 'new',
    priority: 'medium',
    notes: 'Inbound request. Replied to newsletter campaign.',
    tags: ['agency', 'inbound'],
    created_by: 'specialist-2',
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    assigned_users: ['specialist-2']
  },
  {
    id: 'lead-4',
    company_name: 'Aether Logistics',
    prospect_name: 'Bob Miller',
    email: 'bob@aetherlogistics.com',
    phone: '+1 (555) 987-6543',
    linkedin: 'linkedin.com/in/bob-miller-aether',
    website: 'aetherlogistics.com',
    company_type: 'Mid-Market',
    industry: 'Transportation & Logistics',
    service_needed: 'Cold Outreach Pipeline Set up',
    service_offered: 'Scale Plan',
    status: 'contacted',
    priority: 'low',
    notes: 'Cold email call booked. Prefers email followups.',
    tags: ['logistics', 'cold-outreach'],
    created_by: 'specialist-2',
    created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    assigned_users: ['specialist-2']
  },
  {
    id: 'lead-5',
    company_name: 'Zenith Labs',
    prospect_name: 'Claire Zhang',
    email: 'claire@zenithlabs.io',
    phone: '+1 (555) 456-7890',
    linkedin: 'linkedin.com/in/claire-z-zenith',
    website: 'zenithlabs.io',
    company_type: 'Startup',
    industry: 'Healthcare & Biotech',
    service_needed: 'Growth Consulting',
    service_offered: 'Consulting Retainer',
    status: 'negotiation',
    priority: 'high',
    notes: 'Final contract stage. Checking references.',
    tags: ['biotech', 'startup', 'high-priority'],
    created_by: 'specialist-3',
    created_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    assigned_users: ['specialist-3']
  },
  {
    id: 'lead-6',
    company_name: 'Pixel Perfect',
    prospect_name: 'David Wright',
    email: 'david@pixelperfect.design',
    website: 'pixelperfect.design',
    company_type: 'Agency',
    industry: 'Design & Creative',
    service_needed: 'Outbound Playbook Development',
    service_offered: 'Growth Pilot',
    status: 'closed_won',
    priority: 'medium',
    notes: 'Contract signed! Pilot starts next week.',
    tags: ['won', 'design'],
    created_by: 'specialist-3',
    created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    assigned_users: ['specialist-3']
  }
];

// Pre-populated Lead Updates
const MOCK_LEAD_UPDATES: LeadUpdate[] = [
  {
    id: 'update-1',
    lead_id: 'lead-1',
    user_id: 'specialist-1',
    content: 'Initial discovery call completed. Prospect is highly motivated to expand their US sales team and needs support set up automated email outbound workflows.',
    created_at: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'update-2',
    lead_id: 'lead-1',
    user_id: 'specialist-1',
    content: 'Demoed the Scale Plan features. They loved the outbound delivery dashboard. Follow-up proposal sent.',
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'update-3',
    lead_id: 'lead-2',
    user_id: 'specialist-1',
    content: 'Pepper requested a customized SLA agreement. Shared the template document and scheduled a negotiation review for this Friday.',
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'update-4',
    lead_id: 'lead-5',
    user_id: 'specialist-3',
    content: 'Sent contract revision with corrected billing terms. Expecting feedback within 24 hours.',
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  }
];

// Pre-populated Lead Attachments
const MOCK_LEAD_ATTACHMENTS: LeadAttachment[] = [
  {
    id: 'attach-1',
    lead_id: 'lead-1',
    file_name: 'Acme_Discovery_Notes.pdf',
    file_url: '#',
    uploaded_by: 'specialist-1',
    created_at: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'attach-2',
    lead_id: 'lead-2',
    file_name: 'Stark_Custom_Proposal_Draft.docx',
    file_url: '#',
    uploaded_by: 'specialist-1',
    created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
  }
];

// Pre-populated Tasks
const MOCK_TASKS: Task[] = [
  {
    id: 'task-1',
    title: 'Review Acme proposal draft',
    description: 'Double check the delivery timeline and pricing tiers before final Head review.',
    assignee_id: 'specialist-1',
    creator_id: 'head-1',
    priority: 'high',
    deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    reminder_offsets: [15, 60],
    status: 'in_progress',
    type: 'assigned',
    attachments: [{ name: 'acme_draft.pdf', url: '#' }],
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'task-2',
    title: 'Update Outreach target list',
    description: 'Compile a list of 50 enterprise tech targets for the new outreach campaign.',
    assignee_id: 'specialist-1',
    creator_id: 'specialist-1',
    priority: 'medium',
    deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    reminder_offsets: [30],
    status: 'todo',
    type: 'personal',
    attachments: [],
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'task-3',
    title: 'Outbound sales strategy sync',
    description: 'Bi-weekly team sync to review lead conversions and strategy calibration.',
    creator_id: 'head-1',
    priority: 'high',
    deadline: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
    reminder_offsets: [15, 120],
    status: 'todo',
    type: 'team',
    attachments: [],
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'task-4',
    title: 'Follow up with Pepper Potts',
    description: 'Check if they signed the customized agreement terms document.',
    assignee_id: 'specialist-1',
    creator_id: 'head-1',
    priority: 'high',
    deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    reminder_offsets: [60],
    status: 'todo',
    type: 'assigned',
    attachments: [],
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'task-5',
    title: 'Audit Biotech industry leads',
    description: 'Heads audit of Biotech industry leads to verify progress update coverage.',
    assignee_id: 'specialist-3',
    creator_id: 'head-1',
    priority: 'low',
    deadline: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
    reminder_offsets: [],
    status: 'done',
    type: 'assigned',
    attachments: [],
    created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
  }
];

// Pre-populated Reminders
const MOCK_REMINDERS: Reminder[] = [
  {
    id: 'rem-1',
    title: 'Call Pepper Potts regarding contract modifications',
    reminder_time: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes from now
    reminder_offsets: [15],
    is_custom: false,
    lead_id: 'lead-2',
    company_name: 'Stark Industries',
    creator_id: 'specialist-1',
    status: 'active',
    notification_type: 'alarm',
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    invited_users: ['head-1']
  },
  {
    id: 'rem-2',
    title: 'Acme Corp Follow-up meeting prep',
    reminder_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 1 day from now
    reminder_offsets: [60],
    is_custom: false,
    lead_id: 'lead-1',
    company_name: 'Acme Corp',
    creator_id: 'specialist-1',
    status: 'active',
    notification_type: 'notification',
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    invited_users: []
  },
  {
    id: 'rem-3',
    title: 'Biotech campaign launch checkpoint',
    reminder_time: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
    reminder_offsets: [30],
    is_custom: true,
    creator_id: 'head-1',
    status: 'active',
    notification_type: 'notification',
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    invited_users: ['specialist-3', 'specialist-2']
  }
];

// Slack-like Channels
const MOCK_CHANNELS: Channel[] = [
  {
    id: 'chan-1',
    name: 'everyone',
    description: 'Company-wide announcements and updates.',
    is_private: false,
    created_by: 'head-1',
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    member_ids: ['head-1', 'specialist-1', 'specialist-2', 'specialist-3']
  },
  {
    id: 'chan-2',
    name: 'heads-only',
    description: 'Private channel for Heads of Growth.',
    is_private: true,
    created_by: 'head-1',
    created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    member_ids: ['head-1']
  },
  {
    id: 'chan-3',
    name: 'specialists-only',
    description: 'Discussion channel for Growth Specialists.',
    is_private: false,
    created_by: 'head-1',
    created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    member_ids: ['specialist-1', 'specialist-2', 'specialist-3']
  }
];

// Messaging History
const MOCK_MESSAGES: Message[] = [
  {
    id: 'msg-1',
    channel_id: 'chan-1',
    sender_id: 'head-1',
    content: 'Welcome team to RelayHQ! This will be our central workspace for managing campaigns, tracking tasks, and handling client relationships. Let me know if you face any issues.',
    attachments: [],
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'msg-2',
    channel_id: 'chan-1',
    sender_id: 'specialist-1',
    content: 'Awesome! Glad to have this workspace. It feels super snappy.',
    attachments: [],
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000 + 5 * 60000).toISOString()
  },
  {
    id: 'msg-3',
    channel_id: 'chan-2',
    sender_id: 'specialist-2',
    content: 'Hey guys, are we seeing lower reply rates on cold LinkedIn messages lately? Let us audit our standard connection templates.',
    attachments: [],
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'msg-4',
    channel_id: 'chan-2',
    sender_id: 'specialist-1',
    content: 'I have had success customizing the intro to focus on their specific tech stack. Here is the template I use:\n\n*Hey [Prospect], noticed you are using React and Tailwind. We recently helped a startup scale their React team by 3x. Are you looking to hire?*',
    attachments: [],
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 10 * 60000).toISOString()
  },
  {
    id: 'msg-5',
    channel_id: 'chan-3',
    sender_id: 'head-1',
    content: 'Hey Alex, do we have updates on Stark Industries? PEPPER POTTS is asking about custom SLA pricing.',
    attachments: [],
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'msg-6',
    channel_id: 'chan-3',
    sender_id: 'specialist-1',
    content: 'Yes! I uploaded the draft custom proposal on their lead card. We are meeting this Friday to negotiate pricing tiers.',
    attachments: [],
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 15 * 60000).toISOString()
  },
  // Direct Messages (DMs) - Simulated as message entries where channel_id is undefined
  {
    id: 'msg-dm-1',
    sender_id: 'specialist-1',
    receiver_id: 'specialist-2',
    content: 'Hey Elena, could you take a quick look at Nova Media? They requested a growth pilot proposal, and I know you handled a similar one last month.',
    attachments: [],
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'msg-dm-2',
    sender_id: 'specialist-2',
    receiver_id: 'specialist-1',
    content: 'Sure! I will check the shared proposal templates folder. The core thing is highlighting our turnaround SLAs. I can write down some bullet points.',
    attachments: [],
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 20 * 60000).toISOString()
  }
];

// Pre-populated Notifications
const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: 'notif-1',
    user_id: 'specialist-1',
    type: 'assignment_alert',
    title: 'New Task Assigned',
    body: 'Sarah Jenkins assigned you the task: "Review Acme proposal draft".',
    link: '/tasks',
    is_read: false,
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'notif-2',
    user_id: 'specialist-1',
    type: 'mention_alert',
    title: 'Mentioned in #enterprise-pipeline',
    body: 'Sarah Jenkins mentioned you: "Hey Alex, do we have updates on Stark Industries..."',
    link: '/messaging?channel=chan-3',
    is_read: false,
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'notif-3',
    user_id: 'head-1',
    type: 'lead_update',
    title: 'Lead Progress Update',
    body: 'Alex Rivera updated Stark Industries: "Pepper requested a customized SLA agreement..."',
    link: '/leads/lead-2',
    is_read: false,
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 5000).toISOString()
  }
];

// Memory Database Store
class MemoryDB {
  profiles = [...MOCK_PROFILES];
  leads = [...MOCK_LEADS];
  leadUpdates = [...MOCK_LEAD_UPDATES];
  leadAttachments = [...MOCK_LEAD_ATTACHMENTS];
  tasks = [...MOCK_TASKS];
  reminders = [...MOCK_REMINDERS];
  channels = [...MOCK_CHANNELS];
  messages = [...MOCK_MESSAGES];
  notifications = [...MOCK_NOTIFICATIONS];
  
  personalNotes: PersonalNote[] = [
    {
      id: 'note-1',
      title: 'US Enterprise Tech - Cold Email Template',
      content: 'Hi {{prospect_name}},\n\nNoticed you are scaling up the outbound growth team at {{company_name}}. We built a workflow execution engine called RelayHQ that saves reps 2.5 hours per day on CRM updates.\n\nWould you be open to a 10-minute sync this Thursday?\n\nBest,\n{{sender_name}}',
      category: 'email_template',
      creator_id: 'specialist-1',
      created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'note-2',
      title: 'Pepper Potts follow up call script',
      content: '1. Re-pitch customized SLA terms.\n2. Address contract clause 4.2 details regarding lead generation volumes.\n3. Offer 5% discount on quarterly retainer pilot if signed before Q3.',
      category: 'call_script',
      lead_id: 'lead-2',
      creator_id: 'specialist-1',
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    }
  ];

  supabaseUrl = '';
  supabaseKey = '';
  
  notificationSettings = {
    desktopAlerts: true,
    soundAlerts: true,
    messagePreviews: true,
  };

  // Active User Profile Simulation
  currentUser: Profile = MOCK_PROFILES[0]; // defaults to Head (Sarah Jenkins)
  
  // PubSub listeners for realtime simulator
  private listeners: Set<(table: string, type: string, payload: any) => void> = new Set();

  subscribe(callback: (table: string, type: string, payload: any) => void) {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  notify(table: string, type: string, payload: any) {
    this.listeners.forEach((listener) => {
      try {
        listener(table, type, payload);
      } catch (err) {
        console.error('Listener callback error', err);
      }
    });
  }

  // Auth Operations
  getCurrentUser(): Profile {
    return this.currentUser;
  }

  setCurrentUser(userId: string) {
    const prof = this.profiles.find((p) => p.id === userId);
    if (prof) {
      this.currentUser = prof;
      this.notify('auth', 'update', prof);
    }
  }

  // Lead Privacy Filter check
  hasLeadAccess(lead: Lead, userId: string, role: string): boolean {
    if (role === 'head') return true;
    if (lead.created_by === userId) return true;
    if (lead.assigned_users?.includes(userId)) return true;
    return false;
  }

  // Leads CRUD
  getLeads(userId: string, role: string): Lead[] {
    return this.leads.filter((l) => this.hasLeadAccess(l, userId, role));
  }

  getLeadById(id: string, userId: string, role: string): Lead | undefined {
    const lead = this.leads.find((l) => l.id === id);
    if (lead && this.hasLeadAccess(lead, userId, role)) {
      return lead;
    }
    return undefined;
  }

  createLead(leadData: Omit<Lead, 'id' | 'created_by' | 'created_at' | 'updated_at'>, userId: string): Lead {
    const newLead: Lead = {
      ...leadData,
      id: `lead-${Math.random().toString(36).substr(2, 9)}`,
      created_by: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      assigned_users: Array.from(new Set([userId, ...(leadData.assigned_users || [])]))
    };
    this.leads.unshift(newLead);
    
    // Auto-create log/update
    this.createLeadUpdate(newLead.id, userId, 'Lead was created.');

    // If Head or other users are assigned, send them notification
    const assigned = newLead.assigned_users || [];
    assigned.forEach((uid) => {
      if (uid !== userId) {
        this.createNotification(
          uid,
          'assignment_alert',
          'Assigned to Lead',
          `You have been assigned to lead: ${newLead.company_name} (${newLead.prospect_name}).`,
          `/leads/${newLead.id}`
        );
      }
    });

    this.notify('leads', 'insert', newLead);
    return newLead;
  }

  updateLead(id: string, leadData: Partial<Lead>, userId: string, role: string): Lead {
    const idx = this.leads.findIndex((l) => l.id === id);
    if (idx === -1) throw new Error('Lead not found');
    
    const lead = this.leads[idx];
    if (!this.hasLeadAccess(lead, userId, role)) {
      throw new Error('Access Denied');
    }

    const prevAssigned = lead.assigned_users || [];
    const updatedLead: Lead = {
      ...lead,
      ...leadData,
      updated_at: new Date().toISOString(),
    };
    
    // Safety check: Lead creator is always assigned
    if (updatedLead.assigned_users && !updatedLead.assigned_users.includes(updatedLead.created_by)) {
      updatedLead.assigned_users.push(updatedLead.created_by);
    }

    this.leads[idx] = updatedLead;

    // Detect status changes to write an automatic progress update
    if (leadData.status && leadData.status !== lead.status) {
      this.createLeadUpdate(id, userId, `Status changed from "${lead.status}" to "${leadData.status}".`);
    } else {
      this.createLeadUpdate(id, userId, 'Lead details updated.');
    }

    // Notify new assignees
    if (updatedLead.assigned_users) {
      const addedUsers = updatedLead.assigned_users.filter(u => !prevAssigned.includes(u));
      addedUsers.forEach((uid) => {
        if (uid !== userId) {
          this.createNotification(
            uid,
            'assignment_alert',
            'Assigned to Lead',
            `You have been assigned to lead: ${updatedLead.company_name}.`,
            `/leads/${updatedLead.id}`
          );
        }
      });
    }

    this.notify('leads', 'update', updatedLead);
    return updatedLead;
  }

  deleteLead(id: string, _userId: string, _role: string) {
    const idx = this.leads.findIndex((l) => l.id === id);
    if (idx === -1) throw new Error('Lead not found');
    
    // Allow any user with access to delete a lead for portfolio pruning
    this.leads.splice(idx, 1);
    this.leadUpdates = this.leadUpdates.filter((u) => u.lead_id !== id);
    this.leadAttachments = this.leadAttachments.filter((a) => a.lead_id !== id);
    
    this.notify('leads', 'delete', { id });
  }

  // Lead Updates & Attachments
  getLeadUpdates(leadId: string): LeadUpdate[] {
    return this.leadUpdates
      .filter((u) => u.lead_id === leadId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  createLeadUpdate(leadId: string, userId: string, content: string): LeadUpdate {
    const newUpdate: LeadUpdate = {
      id: `update-${Math.random().toString(36).substr(2, 9)}`,
      lead_id: leadId,
      user_id: userId,
      content,
      created_at: new Date().toISOString()
    };
    this.leadUpdates.push(newUpdate);
    
    // Update parent lead updated_at timestamp
    const lIdx = this.leads.findIndex(l => l.id === leadId);
    if (lIdx !== -1) {
      this.leads[lIdx].updated_at = new Date().toISOString();
    }

    this.notify('lead_updates', 'insert', newUpdate);
    return newUpdate;
  }

  getLeadAttachments(leadId: string): LeadAttachment[] {
    return this.leadAttachments.filter((a) => a.lead_id === leadId);
  }

  addLeadAttachment(leadId: string, fileName: string, uploadedBy: string): LeadAttachment {
    const newAttach: LeadAttachment = {
      id: `attach-${Math.random().toString(36).substr(2, 9)}`,
      lead_id: leadId,
      file_name: fileName,
      file_url: '#', // Simulated
      uploaded_by: uploadedBy,
      created_at: new Date().toISOString()
    };
    this.leadAttachments.push(newAttach);
    
    this.createLeadUpdate(leadId, uploadedBy, `Attached file: ${fileName}`);
    this.notify('lead_attachments', 'insert', newAttach);
    return newAttach;
  }

  // Tasks CRUD
  getTasks(userId: string, role: string): Task[] {
    if (role === 'head') return this.tasks;
    return this.tasks.filter((t) => t.creator_id === userId || t.assignee_id === userId || t.type === 'team');
  }

  createTask(taskData: Omit<Task, 'id' | 'creator_id' | 'created_at'>, userId: string): Task {
    const newTask: Task = {
      ...taskData,
      id: `task-${Math.random().toString(36).substr(2, 9)}`,
      creator_id: userId,
      created_at: new Date().toISOString()
    };
    this.tasks.unshift(newTask);

    // Notify assignee
    if (newTask.assignee_id && newTask.assignee_id !== userId) {
      this.createNotification(
        newTask.assignee_id,
        'assignment_alert',
        'New Task Assigned',
        `${this.profiles.find(p => p.id === userId)?.full_name} assigned you: "${newTask.title}".`,
        '/tasks'
      );
    }

    this.notify('tasks', 'insert', newTask);
    return newTask;
  }

  updateTask(id: string, taskData: Partial<Task>, userId: string, role: string): Task {
    const idx = this.tasks.findIndex((t) => t.id === id);
    if (idx === -1) throw new Error('Task not found');
    const task = this.tasks[idx];

    // Access check
    if (role !== 'head' && task.creator_id !== userId && task.assignee_id !== userId) {
      throw new Error('Access Denied');
    }

    const updatedTask = {
      ...task,
      ...taskData
    };
    this.tasks[idx] = updatedTask;

    // Send notifications for task status updates
    if (taskData.status && taskData.status !== task.status && task.creator_id !== userId) {
      this.createNotification(
        task.creator_id,
        'task_update',
        'Task Progress Update',
        `${this.profiles.find(p => p.id === userId)?.full_name} marked task "${task.title}" as ${taskData.status}.`,
        '/tasks'
      );
    }

    this.notify('tasks', 'update', updatedTask);
    return updatedTask;
  }

  deleteTask(id: string, _userId: string, _role: string) {
    const idx = this.tasks.findIndex((t) => t.id === id);
    if (idx === -1) throw new Error('Task not found');
    // Allow any user with access to delete a task
    this.tasks.splice(idx, 1);
    this.notify('tasks', 'delete', { id });
  }

  // Reminders CRUD
  getReminders(userId: string, role: string): Reminder[] {
    if (role === 'head') return this.reminders;
    return this.reminders.filter((r) => r.creator_id === userId || r.invited_users?.includes(userId));
  }

  createReminder(reminderData: Omit<Reminder, 'id' | 'creator_id' | 'status' | 'created_at'>, userId: string): Reminder {
    const newRem: Reminder = {
      notification_type: 'notification',
      ...reminderData,
      id: `rem-${Math.random().toString(36).substr(2, 9)}`,
      creator_id: userId,
      status: 'active',
      created_at: new Date().toISOString()
    };
    this.reminders.unshift(newRem);

    // Notify invited users
    if (newRem.invited_users) {
      newRem.invited_users.forEach((uid) => {
        if (uid !== userId) {
          this.createNotification(
            uid,
            'reminder_alert',
            'Reminder Invitation',
            `${this.profiles.find(p => p.id === userId)?.full_name} invited you to reminder: "${newRem.title}".`,
            '/reminders'
          );
        }
      });
    }

    this.notify('reminders', 'insert', newRem);
    return newRem;
  }

  updateReminder(id: string, reminderData: Partial<Reminder>): Reminder {
    const idx = this.reminders.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error('Reminder not found');
    const reminder = this.reminders[idx];

    const updatedRem = {
      ...reminder,
      ...reminderData
    };
    this.reminders[idx] = updatedRem;
    this.notify('reminders', 'update', updatedRem);
    return updatedRem;
  }

  // Slack-style Messaging CRUD
  getChannels(userId: string, role: string): Channel[] {
    if (role === 'head') return this.channels;
    return this.channels.filter((c) => !c.is_private || c.member_ids?.includes(userId));
  }

  createChannel(name: string, description: string, isPrivate: boolean, userId: string): Channel {
    const newChan: Channel = {
      id: `chan-${Math.random().toString(36).substr(2, 9)}`,
      name: name.toLowerCase().replace(/\s+/g, '-'),
      description,
      is_private: isPrivate,
      created_by: userId,
      created_at: new Date().toISOString(),
      member_ids: [userId]
    };
    this.channels.push(newChan);
    this.notify('channels', 'insert', newChan);
    return newChan;
  }

  getMessages(channelId?: string, receiverId?: string, userId?: string): Message[] {
    if (channelId) {
      return this.messages
        .filter((m) => m.channel_id === channelId)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    } else if (receiverId && userId) {
      // DMs: message sender = user & receiver = other, OR sender = other & receiver = user
      return this.messages
        .filter((m) => !m.channel_id && (
          (m.sender_id === userId && m.receiver_id === receiverId) ||
          (m.sender_id === receiverId && m.receiver_id === userId)
        ))
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    }
    return [];
  }

  sendMessage(channelId?: string, receiverId?: string, content?: string, attachments?: { name: string; url: string }[], senderId?: string): Message {
    if (!senderId) throw new Error('Sender ID required');
    const newMsg: Message = {
      id: `msg-${Math.random().toString(36).substr(2, 9)}`,
      channel_id: channelId,
      sender_id: senderId,
      receiver_id: receiverId,
      content: content || '',
      attachments: attachments || [],
      created_at: new Date().toISOString()
    };
    this.messages.push(newMsg);

    // Send notifications for DMs
    if (receiverId && receiverId !== senderId) {
      this.createNotification(
        receiverId,
        'message_alert',
        `New message from ${this.profiles.find(p => p.id === senderId)?.full_name}`,
        content || 'Shared an attachment.',
        `/messaging?dm=${senderId}`
      );
    }
    // Send notifications for mentions in Channels
    else if (channelId) {
      const chan = this.channels.find(c => c.id === channelId);
      if (chan) {
        // Simple mention parsing
        const members = chan.member_ids || [];
        members.forEach((mid) => {
          if (mid !== senderId) {
            const profile = this.profiles.find(p => p.id === mid);
            if (profile && content && content.includes(`@${profile.full_name}`)) {
              this.createNotification(
                mid,
                'mention_alert',
                `Mentioned in #${chan.name}`,
                `${this.profiles.find(p => p.id === senderId)?.full_name} mentioned you in #${chan.name}.`,
                `/messaging?channel=${chan.id}`
              );
            }
          }
        });
      }
    }

    this.notify('messages', 'insert', newMsg);
    return newMsg;
  }

  // Notifications CRUD
  getNotifications(userId: string): Notification[] {
    return this.notifications
      .filter((n) => n.user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  createNotification(userId: string, type: Notification['type'], title: string, body: string, link?: string): Notification {
    const newNotif: Notification = {
      id: `notif-${Math.random().toString(36).substr(2, 9)}`,
      user_id: userId,
      type,
      title,
      body,
      link,
      is_read: false,
      created_at: new Date().toISOString()
    };
    this.notifications.unshift(newNotif);
    this.notify('notifications', 'insert', newNotif);
    return newNotif;
  }

  markNotificationAsRead(id: string) {
    const idx = this.notifications.findIndex((n) => n.id === id);
    if (idx !== -1) {
      this.notifications[idx].is_read = true;
      this.notify('notifications', 'update', this.notifications[idx]);
    }
  }

  markAllNotificationsAsRead(userId: string) {
    this.notifications.forEach((n) => {
      if (n.user_id === userId) {
        n.is_read = true;
      }
    });
    this.notify('notifications', 'update_all', { userId });
  }

  // Profile Updates Mock
  updateProfile(id: string, updates: Partial<Profile>): Profile {
    const idx = this.profiles.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error('Profile not found');
    const updated = { ...this.profiles[idx], ...updates, updated_at: new Date().toISOString() };
    this.profiles[idx] = updated;
    if (this.currentUser.id === id) {
      this.currentUser = updated;
    }
    this.notify('profiles', 'update', updated);
    this.notify('auth', 'update', updated);
    return updated;
  }

  // Personal Notes CRUD
  getPersonalNotes(userId: string): PersonalNote[] {
    return this.personalNotes.filter((n) => n.creator_id === userId);
  }

  createPersonalNote(noteData: Omit<PersonalNote, 'id' | 'creator_id' | 'created_at' | 'updated_at'>, userId: string): PersonalNote {
    const newNote: PersonalNote = {
      ...noteData,
      id: `note-${Math.random().toString(36).substr(2, 9)}`,
      creator_id: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.personalNotes.unshift(newNote);
    this.notify('personal_notes', 'insert', newNote);
    return newNote;
  }

  updatePersonalNote(id: string, noteData: Partial<PersonalNote>): PersonalNote {
    const idx = this.personalNotes.findIndex((n) => n.id === id);
    if (idx === -1) throw new Error('Note not found');
    const updated = {
      ...this.personalNotes[idx],
      ...noteData,
      updated_at: new Date().toISOString()
    };
    this.personalNotes[idx] = updated;
    this.notify('personal_notes', 'update', updated);
    return updated;
  }

  deletePersonalNote(id: string) {
    const idx = this.personalNotes.findIndex((n) => n.id === id);
    if (idx === -1) throw new Error('Note not found');
    this.personalNotes.splice(idx, 1);
    this.notify('personal_notes', 'delete', { id });
  }
}

export const mockDb = new MemoryDB();
