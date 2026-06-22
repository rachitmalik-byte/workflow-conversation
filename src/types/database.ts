export type UserRole = 'head' | 'growth_specialist';
export type ProfileStatus = 'active' | 'inactive';
export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost';
export type LeadPriority = 'low' | 'medium' | 'high';
export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type TaskType = 'personal' | 'assigned' | 'team';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  status: ProfileStatus;
  designation?: string;
  presence?: 'online' | 'idle' | 'busy' | 'offline';
  created_at: string;
  updated_at: string;
}

export interface Lead {
  id: string;
  company_name: string;
  prospect_name: string;
  email: string;
  phone?: string;
  linkedin?: string;
  website?: string;
  company_type?: string;
  industry?: string;
  service_needed?: string;
  service_offered?: string;
  status: LeadStatus;
  priority: LeadPriority;
  notes?: string;
  tags: string[];
  created_by: string;
  created_at: string;
  updated_at: string;
  ref_image?: string;
  demand_type?: string;
  reply_received?: string;
  proposal_sent?: string;
  hidden_by?: string[];
  // UI helper fields:
  assigned_users?: string[]; // user IDs
}

export interface LeadUpdate {
  id: string;
  lead_id: string;
  user_id: string;
  content: string;
  created_at: string;
  reactions?: { emoji: string; user_ids: string[] }[];
}

export interface LeadAttachment {
  id: string;
  lead_id: string;
  file_name: string;
  file_url: string;
  uploaded_by: string;
  created_at: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  assignee_id?: string;
  assignee_ids?: string[];
  creator_id: string;
  priority: TaskPriority;
  deadline?: string;
  reminder_offsets: number[]; // e.g. [15, 30] minutes before
  status: TaskStatus;
  type: TaskType;
  attachments: { name: string; url: string }[];
  created_at: string;
  recurrence_type?: 'none' | 'daily' | 'weekly' | 'monthly' | 'custom';
  recurrence_interval?: number;
  recurrence_end_date?: string;
  parent_task_id?: string;
}

export interface Reminder {
  id: string;
  title: string;
  reminder_time: string;
  reminder_offsets: number[];
  is_custom: boolean;
  lead_id?: string;
  task_id?: string;
  company_name?: string;
  creator_id: string;
  status: 'active' | 'dismissed';
  notification_type?: 'notification' | 'alarm';
  created_at: string;
  is_company_event?: boolean;
  notes?: string;
  // UI helper fields:
  invited_users?: string[]; // user IDs
}

export interface Channel {
  id: string;
  name: string;
  description?: string;
  is_private: boolean;
  created_by: string;
  created_at: string;
  // UI helper fields:
  member_ids?: string[];
}

export interface Message {
  id: string;
  channel_id?: string; // null if DM
  sender_id: string;
  receiver_id?: string; // null if channel message
  content: string;
  attachments: { name: string; url: string }[];
  created_at: string;
  isOptimistic?: boolean;
  message_read_receipts?: MessageReadReceipt[];
  reactions?: { emoji: string; user_ids: string[] }[];
}

export interface MessageReadReceipt {
  message_id: string;
  user_id: string;
  read_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: 'lead_update' | 'task_update' | 'reminder_alert' | 'assignment_alert' | 'mention_alert' | 'message_alert';
  title: string;
  body: string;
  link?: string;
  is_read: boolean;
  created_at: string;
}

export type NoteCategory = 'email_template' | 'call_script' | 'meeting_note' | 'draft' | 'general';

export interface PersonalNote {
  id: string;
  title: string;
  content: string;
  category: NoteCategory;
  lead_id?: string;
  creator_id: string;
  created_at: string;
  updated_at: string;
}

