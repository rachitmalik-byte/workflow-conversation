-- RELAYHQ DATABASE SCHEMA & RLS POLICIES
-- Paste this script directly into your Supabase SQL Editor.

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Define Enums
CREATE TYPE user_role AS ENUM ('head', 'growth_specialist');
CREATE TYPE profile_status AS ENUM ('active', 'inactive');
CREATE TYPE lead_status AS ENUM ('new', 'contacted', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost');
CREATE TYPE lead_priority AS ENUM ('low', 'medium', 'high');
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high');
CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'done');
CREATE TYPE task_type AS ENUM ('personal', 'assigned', 'team');

-- 1. PROFILES / EMPLOYEES TABLE
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role user_role NOT NULL DEFAULT 'growth_specialist',
    status profile_status NOT NULL DEFAULT 'active',
    designation TEXT,
    presence TEXT DEFAULT 'offline',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are readable by authenticated users"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can insert their own profile"
    ON public.profiles FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Heads can insert any profile"
    ON public.profiles FOR INSERT
    TO authenticated
    WITH CHECK (public.is_head());

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id);

CREATE POLICY "Heads can update any profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (public.is_head());

CREATE POLICY "Heads can delete any profile"
    ON public.profiles FOR DELETE
    TO authenticated
    USING (public.is_head());


-- Helper SQL Function to check if user is head
CREATE OR REPLACE FUNCTION public.is_head() 
RETURNS BOOLEAN SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = (SELECT auth.uid()) 
      AND (
        role = 'head' 
        OR email ILIKE ANY (ARRAY[
          '%ashish.garg@%', 
          '%sumit.kushwah@%', 
          '%mahima.gupta@%', 
          '%rachit.malik@%', 
          '%arjab.jain@%'
        ])
      )
  );
END;
$$ LANGUAGE plpgsql;


-- Helper SQL Function to check lead assignment (avoids recursive RLS checks)
CREATE OR REPLACE FUNCTION public.is_assigned_to_lead(lead_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.lead_assigned_users
    WHERE lead_id = lead_uuid AND user_id = user_uuid
  );
END;
$$ LANGUAGE plpgsql;


-- 2. LEADS TABLE (Lead privacy is enforced here)
CREATE TABLE public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name TEXT NOT NULL,
    prospect_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    linkedin TEXT,
    website TEXT,
    company_type TEXT,
    industry TEXT,
    service_needed TEXT,
    service_offered TEXT,
    status lead_status NOT NULL DEFAULT 'new',
    priority lead_priority NOT NULL DEFAULT 'medium',
    notes TEXT,
    tags TEXT[] DEFAULT '{}',
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    ref_image TEXT,
    reply_received TEXT,
    proposal_sent TEXT,
    hidden_by TEXT[] DEFAULT '{}',
    demand_type TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexing for performance
CREATE INDEX idx_leads_created_by ON public.leads(created_by);
CREATE INDEX idx_leads_status ON public.leads(status);

-- Enable RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;


-- 3. LEAD ASSIGNED USERS
CREATE TABLE public.lead_assigned_users (
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (lead_id, user_id)
);

CREATE INDEX idx_lead_assigned_users_user ON public.lead_assigned_users(user_id);
ALTER TABLE public.lead_assigned_users ENABLE ROW LEVEL SECURITY;


-- Leads Policies
CREATE POLICY "Leads Select Policy" ON public.leads
    FOR SELECT TO authenticated
    USING (
        public.is_head() 
        OR created_by = (SELECT auth.uid())
        OR public.is_assigned_to_lead(id, (SELECT auth.uid()))
    );

CREATE POLICY "Leads Insert Policy" ON public.leads
    FOR INSERT TO authenticated
    WITH CHECK (created_by = (SELECT auth.uid()));

CREATE POLICY "Leads Update Policy" ON public.leads
    FOR UPDATE TO authenticated
    USING (
        public.is_head() 
        OR created_by = (SELECT auth.uid())
        OR public.is_assigned_to_lead(id, (SELECT auth.uid()))
    )
    WITH CHECK (true);

CREATE POLICY "Leads Delete Policy" ON public.leads
    FOR DELETE TO authenticated
    USING (
        public.is_head() 
        OR created_by = (SELECT auth.uid())
        OR public.is_assigned_to_lead(id, (SELECT auth.uid()))
    );

-- Assigned Users Policies
CREATE POLICY "Lead Assigned Users Select" ON public.lead_assigned_users
    FOR SELECT TO authenticated
    USING (
        public.is_head() 
        OR user_id = (SELECT auth.uid())
        OR public.is_assigned_to_lead(lead_id, (SELECT auth.uid()))
    );

CREATE POLICY "Lead Assigned Users Insert/Delete" ON public.lead_assigned_users
    FOR ALL TO authenticated
    USING (
        public.is_head() 
        OR EXISTS (
            SELECT 1 FROM public.leads 
            WHERE id = lead_id AND created_by = (SELECT auth.uid())
        )
    );


-- 4. LEAD UPDATES & ATTACHMENTS
CREATE TABLE public.lead_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    reactions JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE public.lead_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    uploaded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.lead_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lead Updates Select" ON public.lead_updates FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.leads WHERE id = lead_id));

CREATE POLICY "Lead Updates Write" ON public.lead_updates FOR INSERT TO authenticated
    WITH CHECK (user_id = (SELECT auth.uid()) AND EXISTS (SELECT 1 FROM public.leads WHERE id = lead_id));

CREATE POLICY "Lead Updates Delete" ON public.lead_updates FOR DELETE TO authenticated
    USING (public.is_head() OR user_id = (SELECT auth.uid()));

CREATE POLICY "Lead Attachments Select" ON public.lead_attachments FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.leads WHERE id = lead_id));

CREATE POLICY "Lead Attachments Write" ON public.lead_attachments FOR INSERT TO authenticated
    WITH CHECK (uploaded_by = (SELECT auth.uid()) AND EXISTS (SELECT 1 FROM public.leads WHERE id = lead_id));

CREATE POLICY "Lead Attachments Delete" ON public.lead_attachments FOR DELETE TO authenticated
    USING (public.is_head() OR uploaded_by = (SELECT auth.uid()));


-- 5. TASKS TABLE
CREATE TABLE public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    assignee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    assignee_ids UUID[] DEFAULT '{}',
    creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    priority task_priority NOT NULL DEFAULT 'medium',
    deadline TIMESTAMPTZ,
    reminder_offsets INTEGER[] DEFAULT '{}',
    status task_status NOT NULL DEFAULT 'todo',
    type task_type NOT NULL DEFAULT 'personal',
    attachments JSONB DEFAULT '[]',
    recurrence_type TEXT DEFAULT 'none',
    recurrence_interval INTEGER,
    recurrence_end_date TIMESTAMPTZ,
    parent_task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tasks Select" ON public.tasks FOR SELECT TO authenticated
    USING (
        public.is_head() 
        OR creator_id = auth.uid() 
        OR assignee_id = auth.uid() 
        OR auth.uid() = ANY(assignee_ids)
        OR type = 'team'
    );

CREATE POLICY "Tasks Insert" ON public.tasks FOR INSERT TO authenticated
    WITH CHECK (
        creator_id = auth.uid()
    );

CREATE POLICY "Tasks Update" ON public.tasks FOR UPDATE TO authenticated
    USING (
        public.is_head() 
        OR creator_id = auth.uid() 
        OR assignee_id = auth.uid()
        OR auth.uid() = ANY(assignee_ids)
    )
    WITH CHECK (true);

CREATE POLICY "Tasks Delete" ON public.tasks FOR DELETE TO authenticated
    USING (
        public.is_head() 
        OR creator_id = auth.uid() 
        OR assignee_id = auth.uid()
        OR auth.uid() = ANY(assignee_ids)
    );


-- 6. REMINDERS & REMINDER INVITES
CREATE TABLE public.reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    reminder_time TIMESTAMPTZ NOT NULL,
    reminder_offsets INTEGER[] DEFAULT '{}',
    is_custom BOOLEAN NOT NULL DEFAULT false,
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
    company_name TEXT,
    creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'active',
    notification_type TEXT NOT NULL DEFAULT 'notification',
    is_company_event BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE public.reminder_invites (
    reminder_id UUID NOT NULL REFERENCES public.reminders(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    PRIMARY KEY (reminder_id, user_id)
);

ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminder_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reminders Select" ON public.reminders FOR SELECT TO authenticated
    USING (
        public.is_head() 
        OR creator_id = (SELECT auth.uid())
        OR EXISTS (
            SELECT 1 FROM public.reminder_invites WHERE reminder_id = id AND user_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "Reminders All" ON public.reminders FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Reminder Invites Select" ON public.reminder_invites FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Reminder Invites All" ON public.reminder_invites FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);


-- 7. CHANNELS, MESSAGES & READ RECEIPTS
CREATE TABLE public.channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    is_private BOOLEAN NOT NULL DEFAULT false,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE public.channel_members (
    channel_id UUID REFERENCES public.channels(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    PRIMARY KEY (channel_id, user_id)
);

CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID REFERENCES public.channels(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    attachments JSONB DEFAULT '[]',
    reactions JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE public.message_read_receipts (
    message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    read_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (message_id, user_id)
);

ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Channels Select" ON public.channels FOR SELECT TO authenticated
    USING (
        NOT is_private 
        OR public.is_head()
        OR EXISTS (
            SELECT 1 FROM public.channel_members 
            WHERE channel_id = id AND user_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "Messages Select" ON public.messages FOR SELECT TO authenticated
    USING (
        (channel_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.channels c
            WHERE c.id = channel_id AND (
                NOT c.is_private 
                OR public.is_head()
                OR EXISTS (SELECT 1 FROM public.channel_members m WHERE m.channel_id = c.id AND m.user_id = (SELECT auth.uid()))
            )
        ))
        OR (channel_id IS NULL AND (
            sender_id = (SELECT auth.uid()) 
            OR receiver_id = (SELECT auth.uid())
            OR public.is_head()
        ))
    );

CREATE POLICY "Messages Insert" ON public.messages FOR INSERT TO authenticated
    WITH CHECK (sender_id = (SELECT auth.uid()));

CREATE POLICY "Messages Update" ON public.messages FOR UPDATE TO authenticated
    USING (sender_id = (SELECT auth.uid()))
    WITH CHECK (sender_id = (SELECT auth.uid()));

CREATE POLICY "Messages Delete" ON public.messages FOR DELETE TO authenticated
    USING (sender_id = (SELECT auth.uid()) OR public.is_head());


-- 8. NOTIFICATIONS TABLE
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    link TEXT,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Notifications Select/Update" ON public.notifications FOR ALL TO authenticated
    USING (user_id = (SELECT auth.uid()))
    WITH CHECK (user_id = (SELECT auth.uid()));


-- 9. PERSONAL NOTES (Playbooks Scratchpad) TABLE
CREATE TABLE public.personal_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT,
    category TEXT NOT NULL DEFAULT 'general',
    lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
    creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.personal_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Personal Notes Select/Write" ON public.personal_notes FOR ALL TO authenticated
    USING (creator_id = (SELECT auth.uid()))
    WITH CHECK (creator_id = (SELECT auth.uid()));


-- 10. ENABLE SUPABASE REALTIME REPLICATION
-- Run these commands to enable live sync updates for messaging, presence, and reminders:
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.channels;
ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reminders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- 11. MIGRATION SCRIPT FOR EXISTING DATABASES
-- Run this block if you have an existing database to apply cascades and policies:
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_created_by_fkey;
ALTER TABLE public.leads ADD CONSTRAINT leads_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.lead_updates DROP CONSTRAINT IF EXISTS lead_updates_user_id_fkey;
ALTER TABLE public.lead_updates ADD CONSTRAINT lead_updates_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.lead_attachments DROP CONSTRAINT IF EXISTS lead_attachments_uploaded_by_fkey;
ALTER TABLE public.lead_attachments ADD CONSTRAINT lead_attachments_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.channels DROP CONSTRAINT IF EXISTS channels_created_by_fkey;
ALTER TABLE public.channels ADD CONSTRAINT channels_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
