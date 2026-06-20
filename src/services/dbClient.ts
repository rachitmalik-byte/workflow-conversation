import { mockDb } from './mockDb';
import { supabase } from './supabase';
import type { Profile, Lead, LeadUpdate, LeadAttachment, Task, Reminder, Channel, Message, Notification, PersonalNote } from '../types/database';

class DBClient {
  public isSupabaseEnabled = false;

  constructor() {
    this.isSupabaseEnabled = !!supabase;
  }

  // Helper check
  private getClient() {
    return this.isSupabaseEnabled && supabase ? supabase : null;
  }

  // Auth Operations
  async getCurrentUser(): Promise<Profile> {
    const client = this.getClient();
    if (!client) return mockDb.getCurrentUser();

    const { data: { user } } = await client.auth.getUser();
    if (!user) throw new Error('No user authenticated');

    const { data, error } = await client.from('profiles').select('*').eq('id', user.id).single();
    if (error || !data) {
      // Fallback: create profile if authenticated but missing profile record
      const newProfile: Profile = {
        id: user.id,
        full_name: user.email?.split('@')[0] || 'Teammate',
        email: user.email || '',
        role: 'growth_specialist',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      await client.from('profiles').insert(newProfile);
      return newProfile;
    }
    return data;
  }

  async getProfiles(): Promise<Profile[]> {
    const client = this.getClient();
    if (!client) return mockDb.profiles;

    const { data, error } = await client.from('profiles').select('*');
    if (error) throw error;
    return data || [];
  }

  async switchUser(userId: string): Promise<Profile> {
    const client = this.getClient();
    if (!client) {
      mockDb.setCurrentUser(userId);
      return mockDb.getCurrentUser();
    }
    const { data, error } = await client.from('profiles').select('*').eq('id', userId).single();
    if (error) throw error;
    return data;
  }

  // Realtime Subscriptions
  subscribe(callback: (table: string, type: string, payload: any) => void) {
    const client = this.getClient();
    if (!client) return mockDb.subscribe(callback);

    const channelId = `relayhq-realtime-sync-${Math.random().toString(36).substring(2, 9)}`;
    const channel = client
      .channel(channelId)
      .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
        callback(payload.table, payload.eventType.toLowerCase(), payload.new || payload.old);
      })
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }

  // Leads CRUD
  async getLeads(): Promise<Lead[]> {
    const client = this.getClient();
    if (!client) return mockDb.getLeads(mockDb.currentUser.id, mockDb.currentUser.role);

    const { data, error } = await client.from('leads').select('*').order('updated_at', { ascending: false });
    if (error) throw error;

    const leads = data || [];
    // Fetch assigned users from link table
    for (const lead of leads) {
      const { data: assignees } = await client.from('lead_assigned_users').select('user_id').eq('lead_id', lead.id);
      lead.assigned_users = assignees?.map((a) => a.user_id) || [];
    }
    return leads;
  }

  async getLeadById(id: string): Promise<Lead | undefined> {
    const client = this.getClient();
    if (!client) return mockDb.getLeadById(id, mockDb.currentUser.id, mockDb.currentUser.role);

    const { data, error } = await client.from('leads').select('*').eq('id', id).maybeSingle();
    if (error || !data) return undefined;

    const { data: assignees } = await client.from('lead_assigned_users').select('user_id').eq('lead_id', id);
    data.assigned_users = assignees?.map((a) => a.user_id) || [];
    return data;
  }

  async createLead(leadData: Omit<Lead, 'id' | 'created_by' | 'created_at' | 'updated_at'>): Promise<Lead> {
    const client = this.getClient();
    if (!client) return mockDb.createLead(leadData, mockDb.currentUser.id);

    const { data: { user } } = await client.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { assigned_users, ...rawLead } = leadData;
    delete (rawLead as any).demand_type;
    delete (rawLead as any).service_offered;
    const { data, error } = await client.from('leads').insert({
      ...rawLead,
      created_by: user.id
    }).select().single();

    if (error) throw error;

    const assignees = Array.from(new Set([user.id, ...(assigned_users || [])]));
    for (const uid of assignees) {
      await client.from('lead_assigned_users').insert({ lead_id: data.id, user_id: uid });
    }

    data.assigned_users = assignees;
    return data;
  }

  async updateLead(id: string, leadData: Partial<Lead>): Promise<Lead> {
    const client = this.getClient();
    if (!client) return mockDb.updateLead(id, leadData, mockDb.currentUser.id, mockDb.currentUser.role);

    const { assigned_users, ...rawLead } = leadData;
    delete (rawLead as any).demand_type;
    delete (rawLead as any).service_offered;
    
    // Perform update on lead basic details
    const { data, error } = await client.from('leads').update(rawLead).eq('id', id).select().single();
    if (error) throw error;

    if (assigned_users) {
      await client.from('lead_assigned_users').delete().eq('lead_id', id);
      for (const uid of assigned_users) {
        await client.from('lead_assigned_users').insert({ lead_id: id, user_id: uid });
      }
      data.assigned_users = assigned_users;
    }
    return data;
  }

  async deleteLead(id: string): Promise<void> {
    const client = this.getClient();
    if (!client) return mockDb.deleteLead(id, mockDb.currentUser.id, mockDb.currentUser.role);

    const { error } = await client.from('leads').delete().eq('id', id);
    if (error) throw error;
  }

  // Lead Updates & Attachments
  async getLeadUpdates(leadId: string): Promise<LeadUpdate[]> {
    const client = this.getClient();
    if (!client) return mockDb.getLeadUpdates(leadId);

    // If query is for all logs
    if (leadId === 'all') {
      const { data, error } = await client.from('lead_updates').select('*').order('created_at', { ascending: false }).limit(10);
      if (error) throw error;
      return data || [];
    }

    const { data, error } = await client.from('lead_updates').select('*').eq('lead_id', leadId).order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async createLeadUpdate(leadId: string, content: string): Promise<LeadUpdate> {
    const client = this.getClient();
    if (!client) return mockDb.createLeadUpdate(leadId, mockDb.currentUser.id, content);

    const { data: { user } } = await client.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await client.from('lead_updates').insert({
      lead_id: leadId,
      user_id: user.id,
      content
    }).select().single();

    if (error) throw error;
    return data;
  }

  async getLeadAttachments(leadId: string): Promise<LeadAttachment[]> {
    const client = this.getClient();
    if (!client) return mockDb.getLeadAttachments(leadId);

    const { data, error } = await client.from('lead_attachments').select('*').eq('lead_id', leadId);
    if (error) throw error;
    return data || [];
  }

  async addLeadAttachment(leadId: string, fileName: string): Promise<LeadAttachment> {
    const client = this.getClient();
    if (!client) return mockDb.addLeadAttachment(leadId, fileName, mockDb.currentUser.id);

    const { data: { user } } = await client.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await client.from('lead_attachments').insert({
      lead_id: leadId,
      file_name: fileName,
      file_url: '#',
      uploaded_by: user.id
    }).select().single();

    if (error) throw error;
    return data;
  }

  // Tasks CRUD
  async getTasks(): Promise<Task[]> {
    const client = this.getClient();
    if (!client) return mockDb.getTasks(mockDb.currentUser.id, mockDb.currentUser.role);

    const { data, error } = await client.from('tasks').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async createTask(taskData: Omit<Task, 'id' | 'creator_id' | 'created_at'>): Promise<Task> {
    const client = this.getClient();
    if (!client) return mockDb.createTask(taskData, mockDb.currentUser.id);

    const { data: { user } } = await client.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await client.from('tasks').insert({
      ...taskData,
      creator_id: user.id
    }).select().single();

    if (error) throw error;
    return data;
  }

  async updateTask(id: string, taskData: Partial<Task>): Promise<Task> {
    const client = this.getClient();
    if (!client) return mockDb.updateTask(id, taskData, mockDb.currentUser.id, mockDb.currentUser.role);

    const { data, error } = await client.from('tasks').update(taskData).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }

  async deleteTask(id: string): Promise<void> {
    const client = this.getClient();
    if (!client) return mockDb.deleteTask(id, mockDb.currentUser.id, mockDb.currentUser.role);

    const { error } = await client.from('tasks').delete().eq('id', id);
    if (error) throw error;
  }

  // Reminders CRUD
  async getReminders(): Promise<Reminder[]> {
    const client = this.getClient();
    if (!client) return mockDb.getReminders(mockDb.currentUser.id, mockDb.currentUser.role);

    const { data, error } = await client.from('reminders').select('*').order('created_at', { ascending: false });
    if (error) throw error;

    const reminders = data || [];
    for (const rem of reminders) {
      const { data: invites } = await client.from('reminder_invites').select('user_id').eq('reminder_id', rem.id);
      rem.invited_users = invites?.map((i) => i.user_id) || [];
    }
    return reminders;
  }

  async createReminder(reminderData: Omit<Reminder, 'id' | 'creator_id' | 'status' | 'created_at'>): Promise<Reminder> {
    const client = this.getClient();
    if (!client) return mockDb.createReminder(reminderData, mockDb.currentUser.id);

    const { data: { user } } = await client.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { invited_users, ...rawReminder } = reminderData;
    const { data, error } = await client.from('reminders').insert({
      ...rawReminder,
      creator_id: user.id
    }).select().single();

    if (error) throw error;

    if (invited_users) {
      for (const uid of invited_users) {
        await client.from('reminder_invites').insert({ reminder_id: data.id, user_id: uid });
      }
    }

    data.invited_users = invited_users;
    return data;
  }

  async updateReminder(id: string, reminderData: Partial<Reminder>): Promise<Reminder> {
    const client = this.getClient();
    if (!client) return mockDb.updateReminder(id, reminderData);

    const { data, error } = await client.from('reminders').update(reminderData).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }

  async deleteReminder(id: string): Promise<void> {
    const client = this.getClient();
    if (!client) {
      const idx = mockDb.reminders.findIndex((r) => r.id === id);
      if (idx !== -1) {
        mockDb.reminders.splice(idx, 1);
        mockDb.notify('reminders', 'delete', { id });
      }
      return;
    }

    const { error } = await client.from('reminders').delete().eq('id', id);
    if (error) throw error;
  }

  // Slack-style Messaging CRUD
  async getChannels(): Promise<Channel[]> {
    const client = this.getClient();
    if (!client) return mockDb.getChannels(mockDb.currentUser.id, mockDb.currentUser.role);

    const { data, error } = await client.from('channels').select('*');
    if (error) throw error;

    let channels = data || [];

    if (channels.length === 0) {
      try {
        const { data: { user } } = await client.auth.getUser();
        if (user) {
          const c1 = await this.createChannel('everyone', 'Company-wide announcements and updates.', false);
          const c2 = await this.createChannel('heads-only', 'Private channel for Heads of Growth.', true);
          const c3 = await this.createChannel('specialists-only', 'Discussion channel for Growth Specialists.', false);
          channels = [c1, c2, c3];
        }
      } catch (e) {
        console.error('Error auto-seeding default channels:', e);
      }
    }

    for (const c of channels) {
      const { data: members } = await client.from('channel_members').select('user_id').eq('channel_id', c.id);
      c.member_ids = members?.map((m) => m.user_id) || [];
    }
    return channels;
  }

  async createChannel(name: string, description: string, isPrivate: boolean): Promise<Channel> {
    const client = this.getClient();
    if (!client) return mockDb.createChannel(name, description, isPrivate, mockDb.currentUser.id);

    const { data: { user } } = await client.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await client.from('channels').insert({
      name,
      description,
      is_private: isPrivate,
      created_by: user.id
    }).select().single();

    if (error) throw error;

    await client.from('channel_members').insert({ channel_id: data.id, user_id: user.id });
    data.member_ids = [user.id];
    return data;
  }

  async getMessages(channelId?: string, receiverId?: string): Promise<Message[]> {
    const client = this.getClient();
    if (!client) return mockDb.getMessages(channelId, receiverId, mockDb.currentUser?.id);

    const { data: { user } } = await client.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    if (channelId) {
      const { data, error } = await client.from('messages').select('*').eq('channel_id', channelId).order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    } else if (receiverId) {
      const { data, error } = await client.from('messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    }
    return [];
  }

  async triggerGoogleChatWebhook(content: string, senderName: string, channelName?: string) {
    const webhookUrl = localStorage.getItem('relayhq_google_chat_webhook_url');
    if (!webhookUrl) return;

    try {
      const headerText = channelName 
        ? `*#${channelName}* | *${senderName}*:` 
        : `*DM* | *${senderName}*:`;
        
      const payload = {
        text: `${headerText}\n${content}`
      };

      // Use allorigins CORS proxy to bypass browser preflight blockages
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(webhookUrl)}`;
      
      await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
    } catch (e) {
      console.warn('Failed to forward message to Google Chat webhook:', e);
    }
  }

  async sendMessage(channelId?: string, receiverId?: string, content?: string, attachments?: { name: string; url: string }[], senderId?: string): Promise<Message> {
    const client = this.getClient();
    if (!client) {
      const msg = await mockDb.sendMessage(channelId, receiverId, content, attachments, senderId || mockDb.currentUser.id);
      
      const authorId = senderId || mockDb.currentUser.id;
      const sender = mockDb.profiles.find((p) => p.id === authorId);
      const senderName = sender ? sender.full_name : 'Teammate';
      const channel = channelId ? mockDb.channels.find((c) => c.id === channelId) : undefined;
      const channelName = channel ? channel.name : undefined;
      this.triggerGoogleChatWebhook(content || '', senderName, channelName);
      
      return msg;
    }

    const { data: { user } } = await client.auth.getUser();
    const authorId = senderId || user?.id;
    if (!authorId) throw new Error('Not authenticated');

    const { data, error } = await client.from('messages').insert({
      channel_id: channelId || undefined,
      receiver_id: receiverId || undefined,
      sender_id: authorId,
      content: content || '',
      attachments: attachments || []
    }).select().single();

    if (error) throw error;

    const sender = mockDb.profiles.find((p) => p.id === authorId);
    const senderName = sender ? sender.full_name : 'Teammate';
    const channel = channelId ? mockDb.channels.find((c) => c.id === channelId) : undefined;
    const channelName = channel ? channel.name : undefined;
    this.triggerGoogleChatWebhook(content || '', senderName, channelName);

    return data;
  }

  async deleteMessage(messageId: string): Promise<void> {
    const client = this.getClient();
    if (!client) {
      const idx = mockDb.messages.findIndex((m) => m.id === messageId);
      if (idx !== -1) {
        mockDb.messages.splice(idx, 1);
        mockDb.notify('messages', 'delete', { id: messageId });
      }
      return;
    }
    const { error } = await client.from('messages').delete().eq('id', messageId);
    if (error) throw error;
  }

  async updateMessage(messageId: string, updates: Partial<Message>): Promise<Message> {
    const client = this.getClient();
    if (!client) {
      const msg = mockDb.messages.find((m) => m.id === messageId);
      if (msg) {
        Object.assign(msg, updates);
        mockDb.notify('messages', 'update', msg);
        return msg;
      }
      throw new Error('Message not found');
    }
    const { data, error } = await client.from('messages').update(updates).eq('id', messageId).select().single();
    if (error) throw error;
    return data;
  }

  // Notifications CRUD
  async getNotifications(): Promise<Notification[]> {
    const client = this.getClient();
    if (!client) return mockDb.getNotifications(mockDb.currentUser.id);

    const { data: { user } } = await client.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await client.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async markNotificationAsRead(id: string): Promise<void> {
    const client = this.getClient();
    if (!client) return mockDb.markNotificationAsRead(id);

    const { error } = await client.from('notifications').update({ is_read: true }).eq('id', id);
    if (error) throw error;
  }

  async markAllNotificationsAsRead(): Promise<void> {
    const client = this.getClient();
    if (!client) return mockDb.markAllNotificationsAsRead(mockDb.currentUser.id);

    const { data: { user } } = await client.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await client.from('notifications').update({ is_read: true }).eq('user_id', user.id);
    if (error) throw error;
  }

  // Profile Updates
  async updateProfile(id: string, updates: Partial<Profile>): Promise<Profile> {
    const client = this.getClient();
    if (!client) return mockDb.updateProfile(id, updates);

    const { data, error } = await client.from('profiles').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }

  async deleteProfile(id: string): Promise<void> {
    const client = this.getClient();
    if (!client) {
      mockDb.profiles = mockDb.profiles.filter((p) => p.id !== id);
      mockDb.notify('profiles', 'delete', { id });
      return;
    }

    const { error } = await client.from('profiles').delete().eq('id', id);
    if (error) throw error;
  }

  // Personal Notes CRUD
  async getPersonalNotes(): Promise<PersonalNote[]> {
    const client = this.getClient();
    if (!client) return mockDb.getPersonalNotes(mockDb.currentUser.id);

    const { data: { user } } = await client.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await client.from('personal_notes').select('*').eq('creator_id', user.id).order('updated_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async createPersonalNote(noteData: Omit<PersonalNote, 'id' | 'creator_id' | 'created_at' | 'updated_at'>): Promise<PersonalNote> {
    const client = this.getClient();
    if (!client) return mockDb.createPersonalNote(noteData, mockDb.currentUser.id);

    const { data: { user } } = await client.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await client.from('personal_notes').insert({
      ...noteData,
      creator_id: user.id
    }).select().single();

    if (error) throw error;
    return data;
  }

  async updatePersonalNote(id: string, noteData: Partial<PersonalNote>): Promise<PersonalNote> {
    const client = this.getClient();
    if (!client) return mockDb.updatePersonalNote(id, noteData);

    const { data, error } = await client.from('personal_notes').update(noteData).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }

  async deletePersonalNote(id: string): Promise<void> {
    const client = this.getClient();
    if (!client) return mockDb.deletePersonalNote(id);

    const { error } = await client.from('personal_notes').delete().eq('id', id);
    if (error) throw error;
  }

  // Connection Parameters configuration
  getSupabaseConfig() {
    const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
    const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';
    const storedUrl = localStorage.getItem('relayhq_supabase_url') || '';
    const storedKey = localStorage.getItem('relayhq_supabase_key') || '';
    const defaultUrl = 'https://tybanzuobmksokxhpmhh.supabase.co';
    const defaultKey = 'sb_publishable_Ut5XrxQk02pM_WlvVqZwUA_gfOOsiv0';
    return {
      url: storedUrl || envUrl || defaultUrl,
      key: storedKey || envKey || defaultKey
    };
  }

  setSupabaseConfig(url: string, key: string) {
    if (url && key) {
      localStorage.setItem('relayhq_supabase_url', url);
      localStorage.setItem('relayhq_supabase_key', key);
    } else {
      localStorage.removeItem('relayhq_supabase_url');
      localStorage.removeItem('relayhq_supabase_key');
    }
    mockDb.supabaseUrl = url;
    mockDb.supabaseKey = key;
    this.isSupabaseEnabled = !!(url && key);
  }

  getNotificationSettings() {
    return mockDb.notificationSettings;
  }

  setNotificationSettings(settings: typeof mockDb.notificationSettings) {
    mockDb.notificationSettings = settings;
  }

  // Google Chat API operations
  async getGoogleUserInfo(token: string): Promise<any> {
    if (!token) return null;
    try {
      const url = `https://www.googleapis.com/oauth2/v3/userinfo?access_token=${encodeURIComponent(token)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      return await res.json();
    } catch (e) {
      console.warn('Failed to fetch Google userinfo directly, trying proxy:', e);
      try {
        const url = `https://www.googleapis.com/oauth2/v3/userinfo?access_token=${encodeURIComponent(token)}`;
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
        const res = await fetch(proxyUrl);
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        return await res.json();
      } catch (err) {
        console.error('Failed to fetch Google userinfo via proxy:', err);
        return null;
      }
    }
  }

  async getGoogleChatSpaces(token: string): Promise<any[]> {
    if (!token) return [];
    try {
      const url = `https://chat.googleapis.com/v1/spaces?access_token=${encodeURIComponent(token)}`;
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
      const res = await fetch(proxyUrl);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const data = await res.json();
      if (data.error) {
        if (data.error.code === 401 || data.error.status === 'UNAUTHENTICATED') {
          throw new Error('Google Chat session expired');
        }
        throw new Error(data.error.message || 'API Error');
      }
      return data.spaces || [];
    } catch (e) {
      console.error('Failed to fetch Google Chat Spaces:', e);
      throw e;
    }
  }

  async getGoogleChatMessages(spaceName: string, token: string): Promise<any[]> {
    if (!token || !spaceName) return [];
    try {
      const url = `https://chat.googleapis.com/v1/${spaceName}/messages?access_token=${encodeURIComponent(token)}&pageSize=100`;
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
      const res = await fetch(proxyUrl);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const data = await res.json();
      if (data.error) {
        if (data.error.code === 401 || data.error.status === 'UNAUTHENTICATED') {
          throw new Error('Google Chat session expired');
        }
        throw new Error(data.error.message || 'API Error');
      }
      return data.messages || [];
    } catch (e) {
      console.error(`Failed to fetch Google Chat messages for ${spaceName}:`, e);
      throw e;
    }
  }

  async sendGoogleChatMessage(spaceName: string, content: string, token: string): Promise<any> {
    if (!token || !spaceName || !content.trim()) return null;
    try {
      const url = `https://chat.googleapis.com/v1/${spaceName}/messages?access_token=${encodeURIComponent(token)}`;
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
      const res = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text: content })
      });
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      return await res.json();
    } catch (e) {
      console.error(`Failed to send Google Chat message to ${spaceName}:`, e);
      throw e;
    }
  }
}

export const dbClient = new DBClient();

