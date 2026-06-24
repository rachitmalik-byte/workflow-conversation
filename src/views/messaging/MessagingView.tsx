import React, { useState, useEffect, useRef } from 'react';
import { dbClient } from '../../services/dbClient';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase';
import type { Message, Channel } from '../../types/database';
import { Hash, Lock, Send, Search, Sparkles, Paperclip, Bold, Italic, Code, List, Loader2, Copy, Edit, Trash2, Filter, Check, CheckCheck, Archive, ArrowLeft, Smile } from 'lucide-react';
import { MentionTextArea } from '../../components/ui/MentionInput';

const getNameColor = (name: string) => {
  const colors = [
    'text-blue-500 font-bold',
    'text-emerald-500 font-bold',
    'text-indigo-500 font-bold',
    'text-violet-500 font-bold',
    'text-amber-500 font-bold',
    'text-rose-500 font-bold',
    'text-cyan-500 font-bold',
    'text-fuchsia-500 font-bold',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};


export const MessagingView: React.FC = () => {
  const {
    currentUser,
    profiles,
    googleAccessToken,
    setGoogleAccessToken,
    googleSpaces,
    googleMessages: allGoogleMessages,
    googleUserInfo,
    isTokenExpired,
    setIsTokenExpired,
    refreshGoogleChat,
    sendGoogleMessage,
    googleConnectionStatus,
    isSimulator
  } = useAuth();
  
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeMobilePane, setActiveMobilePane] = useState<'list' | 'chat'>('list');
  const [archivedDMs, setArchivedDMs] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('relayhq_archived_dms');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const archiveDM = (userId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = [...archivedDMs, userId];
    setArchivedDMs(updated);
    localStorage.setItem('relayhq_archived_dms', JSON.stringify(updated));
    if (activeDMUserId === userId) {
      setActiveDMUserId(null);
    }
  };

  const unarchiveDM = (userId: string) => {
    const updated = archivedDMs.filter((id) => id !== userId);
    setArchivedDMs(updated);
    localStorage.setItem('relayhq_archived_dms', JSON.stringify(updated));
  };
  const [activeChannelId, setActiveChannelId] = useState<string | null>(() => {
    if (localStorage.getItem('relayhq_active_dm_user_id') || localStorage.getItem('relayhq_active_google_space_id')) {
      return null;
    }
    const saved = localStorage.getItem('relayhq_active_channel_id');
    return saved !== null ? saved : 'chan-1';
  });
  const [activeDMUserId, setActiveDMUserId] = useState<string | null>(() => {
    return localStorage.getItem('relayhq_active_dm_user_id') || null;
  });
  const [activeGoogleSpaceId, setActiveGoogleSpaceId] = useState<string | null>(() => {
    return localStorage.getItem('relayhq_active_google_space_id') || null;
  });

  useEffect(() => {
    if (activeChannelId) {
      localStorage.setItem('relayhq_active_channel_id', activeChannelId);
      localStorage.removeItem('relayhq_active_dm_user_id');
      localStorage.removeItem('relayhq_active_google_space_id');
    } else {
      localStorage.removeItem('relayhq_active_channel_id');
    }
  }, [activeChannelId]);

  useEffect(() => {
    if (activeDMUserId) {
      localStorage.setItem('relayhq_active_dm_user_id', activeDMUserId);
      localStorage.removeItem('relayhq_active_channel_id');
      localStorage.removeItem('relayhq_active_google_space_id');
    } else {
      localStorage.removeItem('relayhq_active_dm_user_id');
    }
  }, [activeDMUserId]);

  useEffect(() => {
    if (activeGoogleSpaceId) {
      localStorage.setItem('relayhq_active_google_space_id', activeGoogleSpaceId);
      localStorage.removeItem('relayhq_active_channel_id');
      localStorage.removeItem('relayhq_active_dm_user_id');
    } else {
      localStorage.removeItem('relayhq_active_google_space_id');
    }
  }, [activeGoogleSpaceId]);

  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [dmSearchText, setDmSearchText] = useState('');

  // Unread badge counts state
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('relayhq_unread_counts');
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });
  
  // Last message previews
  const [lastMessages, setLastMessages] = useState<Record<string, {text: string, time: number}>>({});

  const isGoogleChatLoading = false;
  const [customToken, setCustomToken] = useState(googleAccessToken || '');
  const googleMessages: any[] = activeGoogleSpaceId ? (allGoogleMessages[activeGoogleSpaceId] || []) : [];
  
  // Simulated features
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [activeReactionPickerId, setActiveReactionPickerId] = useState<string | null>(null);
  const typingTimeoutRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [selectedProfile, setSelectedProfile] = useState<any | null>(null);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  useEffect(() => {
    const handleUnreadRefresh = () => {
      try {
        const saved = localStorage.getItem('relayhq_unread_counts');
        setUnreadCounts(saved ? JSON.parse(saved) : {});
      } catch (e) {}
    };

    window.addEventListener('unread-counts-updated', handleUnreadRefresh);
    return () => {
      window.removeEventListener('unread-counts-updated', handleUnreadRefresh);
    };
  }, []);

  // New Channel Dialog States
  const [isCreatingChannel, setIsCreatingChannel] = useState(false);
  const [newChanName, setNewChanName] = useState('');
  const [newChanDesc, setNewChanDesc] = useState('');
  const [newChanPrivate, setNewChanPrivate] = useState(false);

  const reconnectGoogle = async () => {
    // Attempt silent recovery first if possible
    if (googleAccessToken) {
      try {
        await refreshGoogleChat();
        if (!isTokenExpired) {
          return; // silent recovery worked!
        }
      } catch (err) {
        console.warn('Silent refresh attempt failed:', err);
      }
    }

    if (!dbClient.isSupabaseEnabled || !supabase) {
      alert('Production database is not connected. Configure database in Settings or Login screen first!');
      return;
    }
    try {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          scopes: 'https://www.googleapis.com/auth/chat.spaces.readonly https://www.googleapis.com/auth/chat.messages.readonly https://www.googleapis.com/auth/chat.messages.create'
        }
      });
    } catch (e) {
      console.error('Failed to trigger Google OAuth reconnect:', e);
    }
  };


  const fetchChannelData = async () => {
    if (!currentUser) return;
    const chans = await dbClient.getChannels();
    
    // Filter channels based on role
    const filteredChans = chans.filter((chan) => {
      const name = chan.name.toLowerCase();
      if (name === 'heads-only' && currentUser.role !== 'head') return false;
      if (name === 'specialists-only' && currentUser.role !== 'growth_specialist') return false;
      return true;
    });

    setChannels(chans);

    let currentChannelId = activeChannelId;
    if (filteredChans.length > 0 && !activeDMUserId) {
      const exists = filteredChans.some(c => c.id === activeChannelId);
      if (!exists) {
        currentChannelId = filteredChans[0].id;
        setActiveChannelId(currentChannelId);
      }
    }

    if (currentChannelId) {
      const msgs = await dbClient.getMessages(currentChannelId);
      setMessages(msgs);
      dbClient.markMessagesAsRead(currentChannelId, undefined).catch(console.error);
    } else if (activeDMUserId) {
      const msgs = await dbClient.getMessages(undefined, activeDMUserId);
      setMessages(msgs);
      dbClient.markMessagesAsRead(undefined, activeDMUserId).catch(console.error);
    }
  };

  const handleToggleMessageReaction = async (messageId: string, emoji: string) => {
    try {
      await dbClient.toggleMessageReaction(messageId, emoji);
      fetchChannelData();
    } catch (e: any) {
      console.error('Failed to toggle reaction', e);
    }
  };



  useEffect(() => {
    const token = googleAccessToken || customToken;
    if (token) {
      setCustomToken(token);
    }
  }, [googleAccessToken]);

  useEffect(() => {
    if (activeGoogleSpaceId && googleAccessToken) {
      refreshGoogleChat();
    }
  }, [activeGoogleSpaceId, googleAccessToken]);

  // Listen to Google Chat background message events to update local unread counts
  useEffect(() => {
    const handleNewGoogleMessage = (e: Event) => {
      const { spaceId } = (e as CustomEvent).detail;
      if (activeGoogleSpaceId === spaceId) return;

      setUnreadCounts((prev) => ({
        ...prev,
        [spaceId]: (prev[spaceId] || 0) + 1
      }));
    };

    window.addEventListener('new-google-message', handleNewGoogleMessage);
    return () => {
      window.removeEventListener('new-google-message', handleNewGoogleMessage);
    };
  }, [activeGoogleSpaceId]);

  useEffect(() => {
    fetchChannelData();

    // Subscribe to realtime messaging exchanges
    const unsubscribe = dbClient.subscribe((table, type, payload) => {
      if (table === 'messages' || table === 'channels') {
        fetchChannelData();
      }
      if (table === 'messages' && type === 'insert') {
        const msgChanId = payload.channel_id;
        const msgSenderId = payload.sender_id;
        const isFromMe = String(msgSenderId) === String(currentUser?.id);
        const textPreview = payload.content || 'Shared an attachment';
        const time = new Date(payload.created_at || Date.now()).getTime();

        // Update previews
        if (msgChanId) {
          setLastMessages(prev => ({ ...prev, [msgChanId]: { text: textPreview, time } }));
          if (!isFromMe && activeChannelId !== msgChanId) {
            setUnreadCounts((prev) => {
              const next = { ...prev, [msgChanId]: (prev[msgChanId] || 0) + 1 };
              localStorage.setItem('relayhq_unread_counts', JSON.stringify(next));
              return next;
            });
          }
        } else if (msgSenderId) {
          // If it's a DM, update preview for the OTHER person
          const targetId = isFromMe ? payload.receiver_id : msgSenderId;
          if (targetId) {
            setLastMessages(prev => ({ ...prev, [targetId]: { text: textPreview, time } }));
          }
          if (!isFromMe && activeDMUserId !== msgSenderId) {
            setUnreadCounts((prev) => {
              const next = { ...prev, [msgSenderId]: (prev[msgSenderId] || 0) + 1 };
              localStorage.setItem('relayhq_unread_counts', JSON.stringify(next));
              return next;
            });
          }
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [currentUser, activeChannelId, activeDMUserId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  const insertFormatting = (prefix: string, suffix: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    
    const selected = text.substring(start, end);
    const before = text.substring(0, start);
    const after = text.substring(end);

    const replacement = prefix + selected + suffix;
    setMessageInput(before + replacement + after);

    // Focus and select the text
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e as any);
    }
  };

  // typing status simulation
  const handleMentionInputChange = (val: string) => {
    setMessageInput(val);
    
    if (!isTyping) {
      setIsTyping(true);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 2000);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const html = e.clipboardData.getData('text/html');
    const plainText = e.clipboardData.getData('text/plain');
    
    e.preventDefault();
    let text = '';
    
    if (html) {
      // Convert HTML tags to markdown
      text = html
        // Handle list items
        .replace(/<li[^>]*>(.*?)<\/li>/gi, '\n- $1')
        .replace(/<ol[^>]*>|<\/ol>|<ul[^>]*>|<\/ul>/gi, '')
        // Convert block elements to newlines
        .replace(/<\/p>|<\/div>|<\/h[1-6]>|<\/tr>|<\/li>/gi, '\n')
        .replace(/<br\s*\/?>/gi, '\n')
        // Bold, italic, code
        .replace(/<(strong|b)[^>]*>(.*?)<\/\1>/gi, '**$2**')
        .replace(/<(em|i)[^>]*>(.*?)<\/\1>/gi, '*$2*')
        .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
        // Strip remaining HTML tags
        .replace(/<[^>]*>/g, '');
        
      // Decode HTML entities
      text = text
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
    } else {
      text = plainText;
    }
    
    text = text.trim();
    
    const ta = e.currentTarget;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const val = ta.value;
    
    // Insert at cursor position
    const newValue = val.substring(0, start) + text + val.substring(end);
    setMessageInput(newValue);
    
    setTimeout(() => {
      ta.focus();
      const newCursorPos = start + text.length;
      ta.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !currentUser) return;

    const content = messageInput.trim();
    setMessageInput('');

    try {
      if (activeGoogleSpaceId) {
        await sendGoogleMessage(activeGoogleSpaceId, content);
      } else if (activeChannelId) {
        const tempMsg: Message = {
          id: `temp-${Date.now()}`,
          channel_id: activeChannelId,
          sender_id: currentUser.id,
          content: content,
          created_at: new Date().toISOString(),
          attachments: []
        };
        setMessages(prev => [...prev, tempMsg]);

        await dbClient.sendMessage(activeChannelId, undefined, content);
        fetchChannelData();
      } else if (activeDMUserId) {
        const tempMsg: Message = {
          id: `temp-${Date.now()}`,
          sender_id: currentUser.id,
          receiver_id: activeDMUserId,
          content: content,
          created_at: new Date().toISOString(),
          attachments: []
        };
        setMessages(prev => [...prev, tempMsg]);

        await dbClient.sendMessage(undefined, activeDMUserId, content);
        fetchChannelData();
        
        // Colleague AI reply simulation! (Makes DMs feel extremely responsive and premium)
        if (isSimulator) {
          const recipient = profiles.find(p => p.id === activeDMUserId);
          if (recipient && recipient.status === 'active') {
            // Trigger typing after 1.5 seconds
            setTimeout(() => {
              setTypingUsers([recipient.full_name]);
              
              // Trigger reply message after 3.5 seconds
              setTimeout(async () => {
                setTypingUsers([]);
                const autoReplies = [
                  `Hey! Thanks for pinging me. I've noted down your feedback on this campaign. Let's touch base in tomorrow's sync.`,
                  `Got it! Let me check the target lead sheet and update my notes on that.`,
                  `Awesome Outbound details! Shared this with Sarah. Let's keep moving.`,
                  `Hi there, I am currently wrapping up another target campaign but will look at this shortly.`
                ];
                const randomReply = autoReplies[Math.floor(Math.random() * autoReplies.length)];
                
                // Insert message into DB as other user
                await dbClient.sendMessage(undefined, currentUser.id, randomReply, [], recipient.id);
                fetchChannelData();
              }, 2500);
            }, 1000);
          }
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChanName.trim()) return;

    try {
      const newChan = await dbClient.createChannel(newChanName.trim(), newChanDesc.trim(), newChanPrivate);
      setNewChanName('');
      setNewChanDesc('');
      setNewChanPrivate(false);
      setIsCreatingChannel(false);
      
      // Auto switch
      setActiveChannelId(newChan.id);
      setActiveDMUserId(null);
      fetchChannelData();
    } catch (err) {
      console.error(err);
    }
  };

  const selectChannel = (chanId: string) => {
    setActiveChannelId(chanId);
    setActiveDMUserId(null);
    setActiveGoogleSpaceId(null);
    localStorage.setItem('relayhq_active_channel_id', chanId);
    localStorage.setItem('relayhq_active_dm_user_id', '');
    localStorage.setItem('relayhq_active_google_space_id', '');
    setUnreadCounts((prev) => {
      const next = { ...prev };
      delete next[chanId];
      localStorage.setItem('relayhq_unread_counts', JSON.stringify(next));
      window.dispatchEvent(new Event('unread-counts-updated'));
      return next;
    });
    setActiveMobilePane('chat');
  };

  const selectDMUser = (userId: string) => {
    unarchiveDM(userId);
    setActiveDMUserId(userId);
    setActiveChannelId(null);
    setActiveGoogleSpaceId(null);
    localStorage.setItem('relayhq_active_channel_id', '');
    localStorage.setItem('relayhq_active_dm_user_id', userId);
    localStorage.setItem('relayhq_active_google_space_id', '');
    setUnreadCounts((prev) => {
      const next = { ...prev };
      delete next[userId];
      localStorage.setItem('relayhq_unread_counts', JSON.stringify(next));
      window.dispatchEvent(new Event('unread-counts-updated'));
      return next;
    });
    setActiveMobilePane('chat');
  };

  const selectGoogleSpace = (spaceId: string) => {
    setActiveGoogleSpaceId(spaceId);
    setActiveChannelId(null);
    setActiveDMUserId(null);
    localStorage.setItem('relayhq_active_channel_id', '');
    localStorage.setItem('relayhq_active_dm_user_id', '');
    localStorage.setItem('relayhq_active_google_space_id', spaceId);
    setUnreadCounts((prev) => {
      const next = { ...prev };
      delete next[spaceId];
      localStorage.setItem('relayhq_unread_counts', JSON.stringify(next));
      window.dispatchEvent(new Event('unread-counts-updated'));
      return next;
    });
    if (googleAccessToken) {
      refreshGoogleChat();
    }
    setActiveMobilePane('chat');
  };


  const getProfileName = (uid: string) => {
    return profiles.find((p) => p.id === uid)?.full_name || 'Unknown';
  };

  // Filter messages based on search query
  const getFilteredMessages = () => {
    if (!searchQuery.trim()) return messages;
    const query = searchQuery.toLowerCase();
    return messages.filter(
      (m) =>
          m.content.toLowerCase().includes(query) ||
          getProfileName(m.sender_id).toLowerCase().includes(query)
    );
  };

  const getGoogleChatDisplayMessages = () => {
    return googleMessages.map((msg) => ({
      id: msg.name,
      sender_name: msg.sender?.displayName || 'Teammate',
      sender_email: msg.sender?.email || '',
      sender_name_raw: msg.sender?.name || '',
      content: msg.text || '',
      created_at: msg.createTime || new Date().toISOString(),
      isOptimistic: msg.isOptimistic || false
    }));
  };

  const filteredMessages = getFilteredMessages();

  // Active channel context details
  const getActiveHeaderDetails = () => {
    if (activeGoogleSpaceId) {
      const space = googleSpaces.find((s) => s.name === activeGoogleSpaceId);
      return {
        title: space ? space.displayName || space.name.split('/').pop() : 'Google Space',
        desc: 'Live Google Chat Space Sync Room.',
        isPrivate: false
      };
    }
    if (activeChannelId) {
      const chan = channels.find((c) => c.id === activeChannelId);
      return {
        title: chan ? `#${chan.name}` : 'Channel',
        desc: chan?.description || 'Discussion room.',
        isPrivate: chan?.is_private || false
      };
    } else if (activeDMUserId) {
      const p = profiles.find((p) => p.id === activeDMUserId);
      return {
        title: p ? p.full_name : 'Direct Message',
        desc: p?.role === 'head' ? 'Head of Growth' : 'Growth Specialist',
        isPrivate: true
      };
    }
    return { title: 'Messaging', desc: '', isPrivate: false };
  };

  const renderMessageBody = (text: string) => {
    let body = text;
    const boldRegex = /\*\*(.*?)\*\*/g;
    const italicRegex = /\*(.*?)\*/g;
    const codeRegex = /`(.*?)`/g;

    // Escape HTML
    body = body
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Linkify URLs
    const urlRegex = /(\b(https?|ftp):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|]|\bwww\.[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
    body = body.replace(urlRegex, (url) => {
      const hyperLink = url.match(/^https?:\/\//i) ? url : 'http://' + url;
      const linkClass = 'text-current hover:opacity-85 underline font-bold break-all';
      return `<a href="${hyperLink}" target="_blank" rel="noopener noreferrer" class="${linkClass}">${url}</a>`;
    });

    // Format markdown elements
    body = body.replace(boldRegex, '<strong>$1</strong>');
    body = body.replace(italicRegex, '<em>$2</em>');
    body = body.replace(codeRegex, '<code class="bg-muted/30 px-1 rounded text-xs font-mono">$1</code>');

    return <div dangerouslySetInnerHTML={{ __html: body }} className="rich-text-content leading-relaxed break-words" />;
  };

  const getReadReceiptStatus = (msg: Message) => {
    const isDM = !msg.channel_id;
    if (isDM) {
      const recipientId = msg.receiver_id;
      if (!recipientId) return 'sent';
      const isRead = msg.message_read_receipts?.some((r: any) => String(r.user_id) === String(recipientId));
      if (isRead) return 'read';
      const recipient = profiles.find((p) => p.id === recipientId);
      if (recipient?.presence === 'online') {
        return 'delivered';
      }
      return 'sent';
    } else {
      const hasOtherRead = msg.message_read_receipts?.some((r: any) => String(r.user_id) !== String(msg.sender_id));
      if (hasOtherRead) return 'read';
      return 'delivered';
    }
  };

  const headerDetails = getActiveHeaderDetails();

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden bg-background w-full">
      {/* Messages Left Sidebar Directory */}
      <div className={`w-full md:w-64 border-r border-border bg-card flex flex-col flex-shrink-0 ${
        activeMobilePane === 'list' ? 'flex' : 'hidden md:flex'
      }`}>
        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {/* Unread Filters Toggle bar */}
          <div className="flex items-center justify-between px-2.5 py-1.5 bg-muted/40 border border-border/40 rounded-lg">
            <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1">
              <Filter className="h-3 w-3 text-muted-foreground" />
              <span>Filter Chats</span>
            </span>
            <button
              type="button"
              onClick={() => setShowUnreadOnly(!showUnreadOnly)}
              className={`px-2 py-0.5 text-[9px] font-bold rounded transition-colors ${
                showUnreadOnly
                  ? 'bg-danger text-white'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {showUnreadOnly ? 'Show All' : 'Unread Only'}
            </button>
          </div>

          {/* Channels Section */}
          <div className="space-y-1">
            <div className="flex items-center justify-between px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              <span>Channels</span>
              <button
                onClick={() => setIsCreatingChannel(true)}
                className="hover:text-foreground text-xs"
                title="Create a Channel"
              >
                +
              </button>
            </div>

            {channels
              .filter((chan) => {
                const name = chan.name.toLowerCase();
                if (name === 'heads-only' && currentUser?.role !== 'head') return false;
                if (name === 'specialists-only' && currentUser?.role !== 'growth_specialist') return false;
                if (showUnreadOnly && !(unreadCounts[chan.id] > 0)) return false;
                return true;
              })
              .map((chan) => {
                const unreadCount = unreadCounts[chan.id] || 0;
                const hasUnread = unreadCount > 0;
                const preview = lastMessages[chan.id]?.text;
                
                return (
                  <button
                    key={chan.id}
                    onClick={() => selectChannel(chan.id)}
                    className={`flex flex-col w-full text-left gap-1 px-2.5 py-1.5 rounded transition-colors ${
                      activeChannelId === chan.id
                        ? 'bg-primary/10 border border-primary/20'
                        : hasUnread 
                          ? 'bg-muted/30 hover:bg-muted/60'
                          : 'hover:bg-muted/40'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className={`flex items-center gap-1.5 min-w-0 ${hasUnread ? 'text-foreground font-extrabold' : activeChannelId === chan.id ? 'text-primary font-bold' : 'text-muted-foreground font-semibold'}`}>
                        {chan.is_private ? (
                          <Lock className="h-3 w-3 flex-shrink-0" />
                        ) : (
                          <Hash className="h-3 w-3 flex-shrink-0" />
                        )}
                        <span className="truncate text-xs">{chan.name}</span>
                      </div>
                      {hasUnread && (
                        <div className="flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full bg-danger animate-pulse flex-shrink-0" />
                          <span className="px-1.5 py-[1px] text-[9px] font-bold bg-danger text-white rounded flex-shrink-0">
                            {unreadCount}
                          </span>
                        </div>
                      )}
                    </div>
                    {preview && (
                      <div className={`text-[9.5px] truncate w-full pr-2 ${hasUnread ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}>
                        {preview}
                      </div>
                    )}
                  </button>
                );
              })}
          </div>

          {/* Direct Messages Section */}
          <div className="space-y-1 pt-2">
            <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Direct Messages
            </div>

            {/* Teammate DM Search */}
            <div className="px-2 pb-1.5">
              <input
                type="text"
                value={dmSearchText}
                onChange={(e) => setDmSearchText(e.target.value)}
                placeholder="Search colleagues..."
                className="w-full px-2.5 py-1 bg-background border border-border text-[11px] rounded focus:outline-none focus:border-primary text-foreground"
              />
            </div>

            {profiles
              .filter((p) => p.id !== currentUser?.id && p.status === 'active' && p.full_name.toLowerCase().includes(dmSearchText.toLowerCase()))
              .filter((p) => {
                if (showUnreadOnly && !(unreadCounts[p.id] > 0)) return false;
                if (dmSearchText === '' && archivedDMs.includes(p.id)) return false;
                return true;
              })
              .map((p) => {
                const unreadCount = unreadCounts[p.id] || 0;
                const hasUnread = unreadCount > 0;
                const preview = lastMessages[p.id]?.text;

                return (
                  <button
                    key={p.id}
                    onClick={() => selectDMUser(p.id)}
                    className={`flex flex-col w-full text-left gap-1 px-2.5 py-1.5 rounded transition-colors group relative ${
                      activeDMUserId === p.id
                        ? 'bg-primary/10 border border-primary/20'
                        : hasUnread 
                          ? 'bg-muted/30 hover:bg-muted/60'
                          : 'hover:bg-muted/40'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className={`flex items-center gap-2 min-w-0 ${hasUnread ? 'text-foreground font-extrabold' : activeDMUserId === p.id ? 'text-primary font-bold' : 'text-muted-foreground font-semibold'}`}>
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedProfile(p);
                          }}
                          className="relative flex-shrink-0 cursor-pointer hover:scale-110 transition-transform"
                          title="View profile details"
                        >
                          <span className={`flex h-4 w-4 items-center justify-center rounded bg-secondary text-[8px] font-bold text-white uppercase ${hasUnread ? 'ring-2 ring-danger ring-offset-1 ring-offset-card' : ''}`}>
                            {p.full_name.split(' ').map((n) => n[0]).join('').substring(0, 2)}
                          </span>
                          <span
                            className={`absolute -bottom-0.5 -right-0.5 block h-1.5 w-1.5 rounded-full ring-1 ring-card ${
                              p.presence === 'online' ? 'bg-success' :
                              p.presence === 'idle' ? 'bg-warning' :
                              p.presence === 'busy' ? 'bg-danger' :
                              'bg-muted-foreground/40'
                            }`}
                          />
                        </div>
                        <span className="truncate text-xs">{p.full_name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {hasUnread && (
                          <span className="px-1.5 py-[1px] text-[9px] font-bold bg-danger text-white rounded flex-shrink-0">
                            {unreadCount}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => archiveDM(p.id, e)}
                          className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                          title="Archive Chat"
                        >
                          <Archive className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                    {preview && (
                      <div className={`text-[9.5px] truncate w-full pr-2 ${hasUnread ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}>
                        {preview}
                      </div>
                    )}
                  </button>
                );
              })}
          </div>

          {/* Google Chat Spaces Section */}
          <div className="space-y-1 pt-2 border-t border-border/40">
            <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
              <span>Google Chat Spaces</span>
              <span 
                className={`h-1.5 w-1.5 rounded-full ${
                  googleConnectionStatus === 'connected' ? 'bg-success' :
                  googleConnectionStatus === 'reconnecting' ? 'bg-warning animate-pulse' :
                  'bg-muted-foreground/40'
                }`} 
                title={`Google Chat Status: ${googleConnectionStatus}`} 
              />
            </div>

            {isTokenExpired && (
              <div className="mx-2 mb-2 p-2.5 bg-warning/8 border border-warning/25 rounded-lg text-[10px] text-amber-700 dark:text-amber-300 space-y-2">
                <div className="flex items-start justify-between gap-1">
                  <p className="leading-tight font-semibold">⚠️ Google Chat session expired</p>
                  <button
                    type="button"
                    onClick={() => setIsTokenExpired(false)}
                    className="text-muted-foreground hover:text-foreground text-xs leading-none cursor-pointer flex-shrink-0 mt-0.5"
                    title="Dismiss"
                  >
                    ✕
                  </button>
                </div>
                <button
                  type="button"
                  onClick={reconnectGoogle}
                  className="w-full py-1.5 bg-primary hover:bg-primary/95 text-primary-foreground rounded-lg text-[10px] font-bold cursor-pointer transition-colors"
                >
                  Reconnect Google Chat
                </button>
              </div>
            )}

            {!(googleAccessToken || customToken) ? (
              <div className="mx-2 mb-2 p-2.5 bg-muted/20 border border-border/40 rounded-lg space-y-2">
                <p className="text-[10px] text-muted-foreground leading-normal font-medium">
                  Connect your workspace Google Account to access spaces and direct messages.
                </p>
                <button
                  type="button"
                  onClick={reconnectGoogle}
                  className="w-full py-1.5 bg-primary hover:bg-primary/95 text-primary-foreground rounded text-xs font-bold shadow-sm cursor-pointer"
                >
                  Connect Google Account
                </button>
                
                <details className="text-[9px] text-muted-foreground">
                  <summary className="cursor-pointer hover:underline">Or paste developer token</summary>
                  <input
                    type="password"
                    value={customToken}
                    onChange={(e) => {
                      setCustomToken(e.target.value);
                      setGoogleAccessToken(e.target.value);
                    }}
                    placeholder="Paste access token..."
                    className="w-full mt-1 px-2 py-1 bg-background border border-border text-[9px] rounded focus:outline-none focus:border-primary text-foreground font-mono"
                  />
                </details>
              </div>
            ) : (
              <div className="px-2 pb-1 text-[9px] text-muted-foreground flex justify-between items-center">
                <span>Sync Active</span>
                <button
                  type="button"
                  onClick={() => {
                    setCustomToken('');
                    setGoogleAccessToken('');
                  }}
                  className="hover:underline text-primary cursor-pointer font-bold"
                >
                  Disconnect
                </button>
              </div>
            )}

            {googleSpaces.map((space) => (
              <button
                key={space.name}
                onClick={() => selectGoogleSpace(space.name)}
                className={`flex w-full items-center justify-between gap-2 px-2.5 py-1.5 rounded text-xs font-semibold ${
                  activeGoogleSpaceId === space.name
                    ? 'bg-primary/10 text-primary font-bold'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Hash className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                  <span className="truncate">{space.displayName || space.name.split('/').pop()}</span>
                </div>
                {unreadCounts[space.name] > 0 && (
                  <span className="px-1.5 py-0.5 text-[9px] font-bold bg-primary text-primary-foreground rounded-full flex-shrink-0 animate-pulse">
                    {unreadCounts[space.name]}
                  </span>
                )}
              </button>
            ))}


            {(googleAccessToken || customToken) && googleSpaces.length === 0 && (
              <p className="text-[10px] text-muted-foreground px-2 py-1 italic">
                No spaces found. Verify Google Chat API permissions.
              </p>
            )}
          </div>

          {/* Real-time Setup Banner */}
          <div className="mx-2 mt-4 p-2.5 bg-primary/5 border border-primary/25 rounded-lg text-[10px] text-muted-foreground leading-normal space-y-1">
            <div className="flex items-center gap-1.5 font-extrabold text-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
              <span>Realtime Broadcast Active</span>
            </div>
            <p className="text-[9.5px]">
              If messages aren't live, run this SQL in your Supabase SQL Editor:
            </p>
            <code className="block bg-card p-1 rounded font-mono text-[9px] border border-border break-all select-all font-semibold text-primary">
              ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
            </code>
          </div>
        </div>
      </div>

      {/* Main Messaging Chat Area */}
      <div className={`flex-1 flex flex-col h-full overflow-hidden bg-background ${
        activeMobilePane === 'chat' ? 'flex' : 'hidden md:flex'
      }`}>
        {/* Chat Toolbar Header */}
        <div className="border-b border-border bg-card px-4 py-2.5 flex items-center justify-between gap-4">
          <div className="min-w-0 flex items-center gap-1.5">
            {/* Back button on mobile */}
            <button
              type="button"
              onClick={() => setActiveMobilePane('list')}
              className="md:hidden p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded transition-colors mr-1 flex-shrink-0"
              title="Back to list"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                {headerDetails.isPrivate ? (
                  <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                )}
                <h3 className="text-sm font-bold text-foreground truncate">{headerDetails.title}</h3>
                {activeGoogleSpaceId && isTokenExpired && (
                  <span className="text-[9px] bg-warning/15 text-warning px-1.5 py-0.5 rounded-full font-bold animate-pulse border border-warning/20">
                    Simulator Offline
                  </span>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground truncate max-w-[300px] mt-0.5">
                {headerDetails.desc}
              </p>
            </div>
          </div>

          {/* Chat Search Box */}
          <div className="relative max-w-xs w-40 sm:w-56">
            <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chat history..."
              className="w-full pl-7 pr-3 py-1.5 border border-border bg-background text-foreground text-xs rounded focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        {/* Message Feed Grid */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {activeGoogleSpaceId ? (
            isGoogleChatLoading ? (

              <div className="flex flex-col items-center justify-center py-12 text-center text-xs text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin text-primary mb-2" />
                <p className="font-semibold">Fetching Google Chat feed...</p>
              </div>
            ) : googleMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-xs text-muted-foreground">
                <Hash className="h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="font-semibold">Start of Conversation</p>
                <p className="text-[10px] mt-1">This is a live Google Chat space.</p>
              </div>
            ) : (
              (() => {
                const googleMsgs = getGoogleChatDisplayMessages();
                return googleMsgs.map((msg, index) => {
                  let isOutgoing = false;

                  if (googleUserInfo) {
                    if (msg.sender_name_raw && googleUserInfo.sub && msg.sender_name_raw === `users/${googleUserInfo.sub}`) {
                      isOutgoing = true;
                    } else if (msg.sender_email && googleUserInfo.email && msg.sender_email.toLowerCase() === googleUserInfo.email.toLowerCase()) {
                      isOutgoing = true;
                    }
                  }

                  if (!isOutgoing) {
                    if (msg.sender_email && currentUser?.email && msg.sender_email.toLowerCase() === currentUser.email.toLowerCase()) {
                      isOutgoing = true;
                    } else if (msg.sender_name.toLowerCase() === currentUser?.full_name?.toLowerCase()) {
                      isOutgoing = true;
                    } else if (msg.sender_name === 'You' || msg.isOptimistic) {
                      isOutgoing = true;
                    }
                  }

                  const currentDate = new Date(msg.created_at).toDateString();
                  const prevDate = index > 0 ? new Date(googleMsgs[index - 1].created_at).toDateString() : null;
                  const showDateSeparator = currentDate !== prevDate;

                  return (
                    <React.Fragment key={msg.id}>
                      {showDateSeparator && (
                        <div className="flex justify-center my-4 select-none">
                          <span className="text-[10px] font-bold text-muted-foreground bg-muted border border-border/40 px-3 py-1 rounded-full shadow-sm">
                            {formatSeparatorDate(msg.created_at)}
                          </span>
                        </div>
                      )}

                      <div className={`flex w-full mb-1.5 ${isOutgoing ? 'justify-end' : 'justify-start'} ${msg.isOptimistic ? 'opacity-70' : ''}`}>
                        <div className={`flex gap-2 max-w-[75%] items-end ${isOutgoing ? 'flex-row-reverse' : 'flex-row'}`}>
                          {/* Avatar */}
                          <div className={`flex h-6 w-6 items-center justify-center rounded-full font-bold text-[9px] uppercase flex-shrink-0 ${
                            isOutgoing ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'
                          }`}>
                            {msg.sender_name.split(' ').map((n: string) => n[0]).join('') || '?'}
                          </div>
                          
                          {/* Bubble content */}
                          <div className={`px-3.5 py-2 shadow-sm text-xs w-fit max-w-full chat-bubble ${
                            isOutgoing 
                              ? 'chat-bubble-outgoing rounded-tr-none' 
                              : 'chat-bubble-incoming rounded-tl-none'
                          }`}>
                            <span className={`block text-[10px] font-extrabold mb-1 ${
                              isOutgoing ? 'text-blue-100' : getNameColor(msg.sender_name)
                            }`}>
                              {isOutgoing ? 'You' : msg.sender_name}
                            </span>
                            <div className="whitespace-pre-wrap break-words">
                              {renderMessageBody(msg.content)}
                            </div>
                            <div className="flex items-center justify-end gap-1.5 mt-1">
                              {msg.isOptimistic && (
                                <span className="text-[7.5px] italic text-blue-200 animate-pulse">sending...</span>
                              )}
                              <span className={`block text-[8px] select-none ${
                                isOutgoing ? 'text-blue-200/90' : 'text-muted-foreground/70'
                              }`}>
                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </React.Fragment>
                  );
                });
              })()
            )
          ) : filteredMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-xs text-muted-foreground">
              <Hash className="h-8 w-8 text-muted-foreground/30 mb-2" />
              <p className="font-semibold">Start of Conversation</p>
              <p className="text-[10px] mt-1">Say hello to your colleagues!</p>
            </div>
          ) : (
            filteredMessages.map((msg, index) => {
              const sender = profiles.find((p) => p.id === msg.sender_id);
              const senderName = sender?.full_name || 'Teammate';
              
              // Force string comparison for UUIDs to prevent any strict equality bugs
              const isOutgoing = String(msg.sender_id) === String(currentUser?.id);

              const currentDate = new Date(msg.created_at).toDateString();
              const prevDate = index > 0 ? new Date(filteredMessages[index - 1].created_at).toDateString() : null;
              const showDateSeparator = currentDate !== prevDate;
              
              return (
                <React.Fragment key={msg.id}>
                  {showDateSeparator && (
                    <div className="flex justify-center my-4 select-none">
                      <span className="text-[10px] font-bold text-muted-foreground bg-muted border border-border/40 px-3 py-1 rounded-full shadow-sm">
                        {formatSeparatorDate(msg.created_at)}
                      </span>
                    </div>
                  )}

                  <div className={`flex w-full mb-3.5 ${isOutgoing ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex gap-2 max-w-[85%] sm:max-w-[75%] items-end ${isOutgoing ? 'flex-row-reverse' : 'flex-row'}`}>
                      {/* Avatar */}
                      <div
                        onClick={() => {
                          const senderProfile = profiles.find((p) => p.id === msg.sender_id);
                          if (senderProfile) setSelectedProfile(senderProfile);
                        }}
                        className={`flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-md font-bold text-[10px] uppercase flex-shrink-0 shadow-sm cursor-pointer hover:ring-2 hover:ring-primary transition-all ${
                          isOutgoing ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground border border-border/50'
                        }`}
                        title={`View ${senderName}'s Profile`}
                      >
                        {senderName.split(' ').map((n) => n[0]).join('').substring(0, 2) || '?'}
                      </div>
                      
                      {/* Bubble content */}
                      <div className="relative group">
                        {/* Hover action toolbar */}
                        {!msg.isOptimistic && editingMessageId !== msg.id && (
                          <div className={`absolute -top-3.5 ${isOutgoing ? 'left-2' : 'right-2'} hidden group-hover:flex items-center bg-card border border-border rounded-lg shadow-md px-1.5 py-0.5 z-10 gap-1.5`}>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(msg.content);
                                alert('Message copied to clipboard!');
                              }}
                              className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded transition-colors"
                              title="Copy to clipboard"
                            >
                              <Copy className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setActiveReactionPickerId(activeReactionPickerId === msg.id ? null : msg.id);
                              }}
                              className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded transition-colors cursor-pointer relative"
                              title="React to message"
                            >
                              <Smile className="h-3 w-3" />
                            </button>
                            {activeReactionPickerId === msg.id && (
                              <div className="absolute z-35 bottom-full mb-1 flex items-center gap-1 bg-card border border-border px-2 py-1 rounded-full shadow-lg">
                                {['👍', '✅', '👀', '🔥', '❓'].map((emoji) => (
                                  <button
                                    key={emoji}
                                    onClick={() => {
                                      handleToggleMessageReaction(msg.id, emoji);
                                      setActiveReactionPickerId(null);
                                    }}
                                    className="hover:scale-125 transition-transform px-1 cursor-pointer text-xs"
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            )}
                            {isOutgoing && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingMessageId(msg.id);
                                    setEditingText(msg.content);
                                  }}
                                  className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded transition-colors"
                                  title="Edit message"
                                >
                                  <Edit className="h-3 w-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (window.confirm('Delete message? This cannot be undone.')) {
                                      try {
                                        await dbClient.deleteMessage(msg.id);
                                        fetchChannelData();
                                      } catch (e: any) {
                                        alert('Failed to delete message: ' + (e.message || e));
                                      }
                                    }
                                  }}
                                  className="p-1 hover:bg-danger/15 text-muted-foreground hover:text-danger rounded transition-colors cursor-pointer"
                                  title="Delete message"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </>
                            )}
                          </div>
                        )}

                        <div className={`px-4 py-2.5 shadow-sm text-sm w-fit max-w-full chat-bubble ${
                          isOutgoing 
                            ? 'chat-bubble-outgoing rounded-br-sm' 
                            : 'chat-bubble-incoming rounded-bl-sm'
                        }`}>
                          <div className={`flex items-baseline gap-2 mb-1 justify-between ${isOutgoing ? 'flex-row-reverse' : 'flex-row'}`}>
                            <span className={`block text-[11px] font-extrabold tracking-wide ${
                              isOutgoing ? 'text-blue-100' : getNameColor(senderName)
                            }`}>
                              {isOutgoing ? 'You' : senderName}
                            </span>
                            <div className="flex items-center gap-1 justify-end">
                              <span className={`block text-[9px] font-medium select-none ${
                                isOutgoing ? 'text-blue-200/90' : 'text-muted-foreground'
                              }`}>
                                {new Date(msg.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              {isOutgoing && (
                                <span className="inline-flex flex-shrink-0 select-none">
                                  {(() => {
                                    const status = getReadReceiptStatus(msg);
                                    if (status === 'read') {
                                      return <span title="Read"><CheckCheck className="h-3.5 w-3.5 text-sky-200" style={{ color: '#7dd3fc' }} /></span>;
                                    } else if (status === 'delivered') {
                                      return <span title="Delivered"><CheckCheck className="h-3.5 w-3.5 text-blue-200/70" /></span>;
                                    } else {
                                      return <span title="Sent"><Check className="h-3.5 w-3.5 text-blue-200/70" /></span>;
                                    }
                                  })()}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Reactions badges */}
                          {msg.reactions && msg.reactions.length > 0 && (
                            <div className={`flex flex-wrap gap-1 mt-1 ${isOutgoing ? 'justify-end' : 'justify-start'}`}>
                              {msg.reactions.map((r: any) => {
                                const hasReacted = r.user_ids.includes(currentUser?.id || '');
                                return (
                                  <button
                                    key={r.emoji}
                                    onClick={() => handleToggleMessageReaction(msg.id, r.emoji)}
                                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold border transition-colors cursor-pointer ${
                                      hasReacted
                                        ? 'bg-primary/10 border-primary/30 text-primary hover:bg-primary/15'
                                        : 'bg-muted/40 border-border/60 text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                                    }`}
                                  >
                                    <span>{r.emoji}</span>
                                    <span>{r.user_ids.length}</span>
                                  </button>
                                );
                              })}
                            </div>
                          )}

                          {editingMessageId === msg.id ? (
                            <div className="space-y-1.5 mt-1.5 w-64 max-w-full">
                              <input
                                type="text"
                                value={editingText}
                                onChange={(e) => setEditingText(e.target.value)}
                                className="w-full px-2.5 py-1 bg-background text-foreground border border-border text-xs rounded-md focus:outline-none focus:border-primary font-medium"
                              />
                              <div className="flex items-center gap-1.5 justify-end">
                                <button
                                  type="button"
                                  onClick={() => setEditingMessageId(null)}
                                  className="px-2 py-0.5 hover:bg-muted text-muted-foreground text-[10px] rounded font-bold transition-colors"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (!editingText.trim()) return;
                                    try {
                                      await dbClient.updateMessage(msg.id, { content: editingText.trim() });
                                      setEditingMessageId(null);
                                      fetchChannelData();
                                    } catch (e) {
                                      alert('Failed to save changes');
                                    }
                                  }}
                                  className="px-2.5 py-0.5 bg-primary text-primary-foreground text-[10px] rounded font-bold transition-colors shadow-sm"
                                >
                                  Save
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="whitespace-pre-wrap break-words">
                              {renderMessageBody(msg.content)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </React.Fragment>
              );
            })
          )}

          {/* Live Typing Indicators */}
          {typingUsers.length > 0 && (
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium py-1 px-1">
              <span className="flex h-1.5 w-1.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-success"></span>
              </span>
              <span>{typingUsers.join(', ')} is typing...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Message Editor Input Area */}
        <div className="p-3 bg-card border-t border-border">
          <form onSubmit={handleSendMessage} className="border border-border rounded-lg bg-background p-1 flex flex-col focus-within:border-primary">
            <MentionTextArea
              ref={textareaRef}
              value={messageInput}
              onChangeValue={handleMentionInputChange}
              onPaste={handlePaste}
              onKeyDown={handleKeyDown}
              placeholder={activeChannelId ? `Message #${headerDetails.title} (Enter to send)...` : `Message ${headerDetails.title} (Enter to send)...`}
              rows={2}
              className="w-full text-xs sm:text-sm bg-transparent border-none text-foreground p-2 focus:outline-none resize-none"
            />
            <div className="flex items-center justify-between border-t border-border/40 pt-2 pb-1 px-2 text-muted-foreground">
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => insertFormatting('**', '**')} className="hover:text-foreground p-0.5 transition-colors cursor-pointer" title="Bold">
                  <Bold className="h-3.5 w-3.5" />
                </button>
                <button type="button" onClick={() => insertFormatting('*', '*')} className="hover:text-foreground p-0.5 transition-colors cursor-pointer" title="Italic">
                  <Italic className="h-3.5 w-3.5" />
                </button>
                <button type="button" onClick={() => insertFormatting('`', '`')} className="hover:text-foreground p-0.5 transition-colors cursor-pointer" title="Code Block">
                  <Code className="h-3.5 w-3.5" />
                </button>
                <button type="button" onClick={() => insertFormatting('\n- ', '')} className="hover:text-foreground p-0.5 transition-colors cursor-pointer" title="Bullet List">
                  <List className="h-3.5 w-3.5" />
                </button>
                <span className="w-px h-3.5 bg-border/60" />
                <button type="button" className="hover:text-foreground" title="Preserves formatting (bold, italic) when pasted" disabled>
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                </button>
                <button type="button" className="hover:text-foreground" title="Attach Outbound Playbooks" onClick={() => alert('Simulator: Use lead card attachments.')}>
                  <Paperclip className="h-3.5 w-3.5" />
                </button>
              </div>

              <button
                type="submit"
                disabled={!messageInput.trim()}
                className="p-1.5 bg-primary hover:bg-primary/95 text-primary-foreground disabled:opacity-40 rounded transition-colors cursor-pointer"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* New Channel Dialog Modal Popover */}
      {isCreatingChannel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md bg-card border border-border rounded-lg p-5 shadow-lg space-y-4">
            <h3 className="text-base font-bold text-foreground">Create a channel</h3>
            <p className="text-xs text-muted-foreground">
              Channels are where your growth team makes decisions and plans outbound strategy campaigns.
            </p>

            <form onSubmit={handleCreateChannel} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                  Channel Name
                </label>
                <input
                  type="text"
                  required
                  value={newChanName}
                  onChange={(e) => setNewChanName(e.target.value)}
                  placeholder="e.g. cold-email-templates"
                  className="w-full text-sm bg-background border border-border text-foreground px-3 py-2 rounded focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={newChanDesc}
                  onChange={(e) => setNewChanDesc(e.target.value)}
                  placeholder="e.g. Shared copies and conversions strategy audits"
                  className="w-full text-sm bg-background border border-border text-foreground px-3 py-2 rounded focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="chanPrivate"
                  checked={newChanPrivate}
                  onChange={(e) => setNewChanPrivate(e.target.checked)}
                  className="h-4 w-4 border-border rounded text-primary focus:ring-primary cursor-pointer"
                />
                <label htmlFor="chanPrivate" className="text-xs font-semibold text-foreground cursor-pointer select-none">
                  Make Private (Only invited members can view)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsCreatingChannel(false)}
                  className="px-3 py-1.5 text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground border border-border rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 text-xs font-semibold bg-primary text-primary-foreground rounded hover:bg-primary/95"
                >
                  Create Channel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-card border border-border rounded-xl shadow-2xl p-6 relative overflow-hidden animate-slide-up">
            <div className="absolute top-0 left-0 right-0 h-2 bg-primary" />
            
            <button
              type="button"
              onClick={() => setSelectedProfile(null)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground text-sm cursor-pointer"
            >
              ✕
            </button>

            <div className="flex flex-col items-center text-center mt-3 space-y-4">
              <div className="h-16 w-16 bg-primary/10 text-primary border border-primary/20 rounded-xl flex items-center justify-center text-xl font-black uppercase shadow-inner">
                {selectedProfile.full_name.split(' ').map((n: string) => n[0]).join('')}
              </div>

              <div>
                <h4 className="text-base font-extrabold text-foreground tracking-tight">{selectedProfile.full_name}</h4>
                <p className="text-xs text-muted-foreground mt-0.5">{selectedProfile.designation || 'Outbound campaign staff'}</p>
              </div>

              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
                selectedProfile.presence === 'online' ? 'bg-success/8 text-success border-success/20' :
                selectedProfile.presence === 'idle' ? 'bg-warning/8 text-warning border-warning/20' :
                selectedProfile.presence === 'busy' ? 'bg-danger/8 text-danger border-danger/20' :
                'bg-muted/10 text-muted-foreground border-border'
              }`}>
                <span className={`h-1.5 w-1.5 rounded-full ${
                  selectedProfile.presence === 'online' ? 'bg-success animate-pulse' :
                  selectedProfile.presence === 'idle' ? 'bg-warning' :
                  selectedProfile.presence === 'busy' ? 'bg-danger' :
                  'bg-muted-foreground/50'
                }`} />
                {selectedProfile.presence || 'offline'}
              </span>

              <div className="w-full border-t border-border/60 pt-4 text-left text-xs space-y-3">
                <div className="flex justify-between items-center py-0.5">
                  <span className="font-semibold text-muted-foreground">Work Email</span>
                  <a href={`mailto:${selectedProfile.email}`} className="text-primary font-medium hover:underline break-all max-w-[200px] text-right">{selectedProfile.email}</a>
                </div>
                <div className="flex justify-between items-center py-0.5">
                  <span className="font-semibold text-muted-foreground">Workspace Role</span>
                  <span className="capitalize font-medium text-foreground">{selectedProfile.role === 'head' ? 'Head (Operations Admin)' : 'Growth Specialist'}</span>
                </div>
                <div className="flex justify-between items-center py-0.5">
                  <span className="font-semibold text-muted-foreground">Account Status</span>
                  <span className={`capitalize font-bold flex items-center gap-1 ${
                    selectedProfile.status === 'active' ? 'text-success' : 'text-muted-foreground'
                  }`}>
                    <span className={`h-1 w-1 rounded-full ${
                      selectedProfile.status === 'active' ? 'bg-success' : 'bg-muted-foreground/60'
                    }`} /> {selectedProfile.status}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedProfile(null);
                  selectDMUser(selectedProfile.id);
                }}
                className="w-full py-2 bg-primary hover:bg-primary/95 text-primary-foreground font-bold text-xs rounded-lg transition-colors cursor-pointer shadow-sm"
              >
                Send Direct Message
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const formatSeparatorDate = (dateStr: string) => {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString()) {
    return 'Today';
  } else if (d.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  } else {
    return d.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }
};

