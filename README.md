# RelayHQ 🚀

RelayHQ is a premium, real-time Outbound Campaign and Sales Pipeline Operations dashboard built for modern growth teams. It empowers Head Admins and Outbound Specialists to align prospect pipelines, manage tasks, coordinate reminders, and communicate instantly—both in-app and synced with Google Chat.

---

## 📸 Application Preview

| Dashboard & Overview | Modern Kanban Board (Drag & Drop) |
| :---: | :---: |
| ![Dashboard Mockup](https://raw.githubusercontent.com/rachitmalik-byte/workflow-conversation/main/public/dashboard-preview.png) | ![Kanban Board Mockup](https://raw.githubusercontent.com/rachitmalik-byte/workflow-conversation/main/public/kanban-preview.png) |

| Slack-Style Chat & Presence | Configuration & Webhooks |
| :---: | :---: |
| ![Messaging Preview](https://raw.githubusercontent.com/rachitmalik-byte/workflow-conversation/main/public/messaging-preview.png) | ![Settings Preview](https://raw.githubusercontent.com/rachitmalik-byte/workflow-conversation/main/public/settings-preview.png) |

*(To render your custom screenshots, drop your images into the `public/` directory and update the links above!)*

---

## ✨ Features

### 1. Modern Kanban Board with Drag & Drop
* **Interactive Pipeling**: Native, zero-dependency HTML5 drag-and-drop cards to manage lead stages:
  * *Outbound Prospecting* ➔ *Outbound Playbook* ➔ *Audit Call* ➔ *Negotiation* ➔ *Won* / *Lost*.
* **Lead Details**: Store custom company info, notes, reference screenshots, and outbound demand types (*Cold Outreach, Warm Outbound, Referral, Inbound Request, MQL*).

### 2. Slack-Style Chat with Google Chat Mirroring
* **Target Channels**: Dedicated spaces including `#everyone`, private `#heads-only` (restricted to Heads), and `#specialists-only`.
* **Typing Indicators**: Real-time typing states ("Elena is typing...") for team alignment.
* **Format Preservation**: Clipboard-paste parsing preserves bold, italic, code blocks, and list formats.
* **Google Chat Synchronization**: Send messages in-app and have them mirrored instantly to your external Google Chat space using incoming webhooks.

### 3. ClickUp-Style Presence & Statuses
* **Real-time Status**: Displays *Online*, *Idle*, *Busy*, or *Offline* next to all member avatars.
* **Inactivity Tracker**: Automatically shifts status to *Idle* after 5 minutes of system inactivity, reverting to *Online* instantly upon mouse movement or keypresses.

### 4. Interactive Reminders & Alarm Sounds
* **Audio Alerts**: High-quality chimes and continuous sawtooth alarms synthesized directly via the browser's `AudioContext` (no large audio file downloads needed).
* **Desktop Push Alerts**: Native HTML5 browser notifications for chats, reminders, and database events.

### 5. Production Database Connection & Seeding
* **Zero-Config Simulator**: Runs in offline mock mode right out of the box.
* **Live Supabase Sync**: Connect a real production database from the settings panel. Run `schema.sql` inside the Supabase SQL editor to create the tables.

---

## 🛠️ Tech Stack

* **Frontend Framework**: React 19 (Vite, TypeScript)
* **Styling**: TailwindCSS v4 & Vanilla CSS
* **Database & Auth**: Supabase JS Client (optional)
* **Icons**: Lucide React

---

## 🚀 Getting Started

### 1. Prerequisites
Ensure you have Node.js (v18+) installed.

### 2. Installation
Clone this repository and install dependencies:
```bash
npm install
```

### 3. Start Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🔗 Live Database Integration (Supabase)

To link a live production database:
1. Log in to [Supabase](https://supabase.com) and create a new project.
2. Copy the contents of [schema.sql](schema.sql).
3. In Supabase, open the **SQL Editor**, create a new query, paste the schema content, and click **Run**.
4. Log into RelayHQ as a **Head Admin**, navigate to **Settings > Database Connection**, and paste your Supabase Project URL and Anon Key.
5. Save the configuration. The app will refresh and connect live.

---

## 💬 Setting up Google Chat Webhook Mirroring

To mirror your channels and direct messages to a Google Chat Space:
1. Open Google Chat and navigate to your target Space.
2. Click the space name dropdown and select **Apps & integrations** > **Webhooks**.
3. Click **Add Webhook**, enter a name (e.g. `RelayHQ Bot`), and click **Save**.
4. Copy the generated Webhook URL.
5. In RelayHQ, go to **Settings > Notifications** and paste the Webhook URL.
6. Click **Save Notification Toggles**. Any messages sent in channels or DMs will now automatically post to Google Chat!

---

## 📦 Deploying to Vercel

The repository includes a [vercel.json](vercel.json) file to support client-side routing.

1. Create an account on [Vercel](https://vercel.com).
2. Connect your GitHub account.
3. Import this repository (`workflow-conversation`).
4. Click **Deploy**. Vercel will automatically build and publish your app on every `git push`!
