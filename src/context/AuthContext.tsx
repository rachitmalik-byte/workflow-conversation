import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import type { Profile } from '../types/database';
import { dbClient } from '../services/dbClient';
import { supabase } from '../services/supabase';

const MOCK_GOOGLE_SPACES = [
  { name: 'spaces/leads-collaboration', displayName: '💬 Google Chat: Lead Sync space' },
  { name: 'spaces/campaign-announcements', displayName: '📢 Google Chat: Campaign Announcements' }
];

const getMockGoogleMessages = () => ({
  'spaces/leads-collaboration': [
    {
      name: 'spaces/leads-collaboration/messages/1',
      sender: { displayName: 'Sarah Jenkins', email: 'sarah@relayhq.io', name: 'users/sarah' },
      text: 'Hey team, did we send the proposal to Pepper Potts?',
      createTime: new Date(Date.now() - 3600000).toISOString()
    },
    {
      name: 'spaces/leads-collaboration/messages/2',
      sender: { displayName: 'Michael Scott', email: 'michael@relayhq.io', name: 'users/michael' },
      text: 'Yes! Sent it yesterday. Waiting for reply.',
      createTime: new Date(Date.now() - 1800000).toISOString()
    }
  ],
  'spaces/campaign-announcements': [
    {
      name: 'spaces/campaign-announcements/messages/1',
      sender: { displayName: 'Sarah Jenkins', email: 'sarah@relayhq.io', name: 'users/sarah' },
      text: 'Welcome to the new Outbound Campaign tracking workspace!',
      createTime: new Date(Date.now() - 7200000).toISOString()
    }
  ]
});

interface AuthContextType {
  currentUser: Profile | null;
  profiles: Profile[];
  switchUser: (userId: string) => Promise<void>;
  isLoading: boolean;
  isSimulator: boolean;
  bypassAuth: () => Promise<void>;
  signOutUser: () => Promise<void>;
  isDeveloper: boolean;
  isAdmin: boolean;
  googleAccessToken: string;
  setGoogleAccessToken: (token: string) => void;
  googleSpaces: any[];
  googleMessages: Record<string, any[]>;
  googleUserInfo: any | null;
  isTokenExpired: boolean;
  setIsTokenExpired: (expired: boolean) => void;
  refreshGoogleChat: () => Promise<void>;
  sendGoogleMessage: (spaceName: string, content: string) => Promise<void>;
}


const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const currentUserRef = useRef<Profile | null>(null);

  const isDeveloper = !!(
    currentUser?.email?.toLowerCase() === 'rachit.malik@vaidik.edu' ||
    currentUser?.email?.toLowerCase() === 'rachit.malik@vaidikedu.com'
  );

  const isAdmin = !!(
    currentUser?.role === 'head' ||
    isDeveloper
  );
  
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);
  const [isSimulator, setIsSimulator] = useState(false); // Do not default to simulator on load
  const [googleAccessToken, setGoogleAccessTokenState] = useState(
    localStorage.getItem('relayhq_google_provider_token') || ''
  );

  // Google Chat integration states
  const [googleSpaces, setGoogleSpaces] = useState<any[]>([]);
  const [googleMessages, setGoogleMessages] = useState<Record<string, any[]>>({});
  const [googleUserInfo, setGoogleUserInfo] = useState<any>(() => {
    try {
      const saved = localStorage.getItem('relayhq_google_user_info');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isTokenExpired, setIsTokenExpired] = useState(false);
  const [lastMessageIds, setLastMessageIds] = useState<Record<string, string>>({});
  // Consecutive auth failure counter — only show expired banner after 3+ failures
  const authFailCountRef = useRef(0);

  const fetchGoogleUserInfo = async (token: string) => {
    if (!token) return null;
    try {
      const info = await dbClient.getGoogleUserInfo(token);
      if (info) {
        setGoogleUserInfo(info);
        localStorage.setItem('relayhq_google_user_info', JSON.stringify(info));
      }
      return info;
    } catch (e) {
      console.warn('Failed to fetch Google user info:', e);
      return null;
    }
  };

  const setGoogleAccessToken = (token: string) => {
    setGoogleAccessTokenState(token);
    if (token) {
      localStorage.setItem('relayhq_google_provider_token', token);
      fetchGoogleUserInfo(token);
    } else {
      localStorage.removeItem('relayhq_google_provider_token');
      localStorage.removeItem('relayhq_google_user_info');
      setGoogleUserInfo(null);
    }
  };

  const refreshGoogleChat = async () => {
    const token = googleAccessToken;
    if (!token) return;
    try {
      const spaces = await dbClient.getGoogleChatSpaces(token);
      setGoogleSpaces(spaces);
      setIsTokenExpired(false);

      const initialLastIds: Record<string, string> = {};
      const initialMessages: Record<string, any[]> = {};
      for (const space of spaces) {
        try {
          const msgs = await dbClient.getGoogleChatMessages(space.name, token);
          initialMessages[space.name] = msgs;
          if (msgs.length > 0) {
            initialLastIds[space.name] = msgs[msgs.length - 1].name;
          }
        } catch (err) {
          console.warn(`Failed initial fetch for ${space.name}:`, err);
        }
      }
      setLastMessageIds(initialLastIds);
      setGoogleMessages(initialMessages);
    } catch (err: any) {
      console.error('Failed to refresh Google Chat spaces:', err);
      const isAuthError = err.message?.includes('expired') || err.message?.includes('401') || err.message?.includes('UNAUTHENTICATED');
      if (isAuthError) {
        authFailCountRef.current += 1;
        if (authFailCountRef.current >= 2) setIsTokenExpired(true);
      }
    }
  };

  const sendGoogleMessage = async (spaceName: string, content: string) => {
    const token = googleAccessToken;
    const isMock = !token || isTokenExpired;

    // Create optimistic message
    const tempId = `temp-${Date.now()}`;
    const senderDisplayName = currentUser?.full_name || 'You';
    const senderEmail = currentUser?.email || '';
    const optimisticMsg = {
      name: `${spaceName}/messages/${tempId}`,
      sender: {
        name: googleUserInfo ? `users/${googleUserInfo.sub}` : `users/temp`,
        displayName: senderDisplayName,
        email: senderEmail,
        type: 'HUMAN'
      },
      text: content,
      createTime: new Date().toISOString(),
      isOptimistic: true
    };

    // Optimistically update the state
    setGoogleMessages(prev => {
      const spaceMsgs = prev[spaceName] || [];
      return {
        ...prev,
        [spaceName]: [...spaceMsgs, optimisticMsg]
      };
    });

    if (isMock) {
      // Simulation mode response!
      setTimeout(() => {
        const replyMsg = {
          name: `${spaceName}/messages/reply-${Date.now()}`,
          sender: {
            displayName: 'Sarah Jenkins (AI Campaign Bot)',
            email: 'sarah@relayhq.io',
            type: 'HUMAN',
            name: 'users/sarah'
          },
          text: `Got your message! (Simulated response to: "${content}")`,
          createTime: new Date().toISOString()
        };
        setGoogleMessages(prev => {
          const spaceMsgs = prev[spaceName] || [];
          return {
            ...prev,
            [spaceName]: [...spaceMsgs, replyMsg]
          };
        });
      }, 1500);
      return;
    }

    try {
      const sent = await dbClient.sendGoogleChatMessage(spaceName, content, token);
      if (sent) {
        // Immediately fetch updated messages for this space
        const msgs = await dbClient.getGoogleChatMessages(spaceName, token);
        setGoogleMessages(prev => ({
          ...prev,
          [spaceName]: msgs
        }));
        if (msgs.length > 0) {
          setLastMessageIds(prev => ({
            ...prev,
            [spaceName]: msgs[msgs.length - 1].name
          }));
        }
      }
    } catch (err: any) {
      // Revert optimistic message on error
      setGoogleMessages(prev => {
        const spaceMsgs = prev[spaceName] || [];
        return {
          ...prev,
          [spaceName]: spaceMsgs.filter(m => m.name !== optimisticMsg.name)
        };
      });
      console.error('Failed to send Google Chat message:', err);
      if (err.message.includes('expired') || err.message.includes('401') || err.message.includes('UNAUTHENTICATED')) {
        setIsTokenExpired(true);
      }
      throw err;
    }
  };

  // Background polling for ALL Google Chat spaces (or simulated fallback)
  useEffect(() => {
    const token = googleAccessToken;
    
    // In simulation mode (no token or expired token), populate mock spaces so the UI remains interactive
    if (!token || isTokenExpired) {
      if (googleSpaces.length === 0) {
        setGoogleSpaces(MOCK_GOOGLE_SPACES);
        setGoogleMessages(getMockGoogleMessages());
      }
      return;
    }

    let isSubscribed = true;
    let pollInterval: any;

    const loadInitialData = async () => {
      try {
        // Fetch user info first if not loaded
        if (!googleUserInfo) {
          await fetchGoogleUserInfo(token);
        }

        const spaces = await dbClient.getGoogleChatSpaces(token);
        if (!isSubscribed) return;
        setGoogleSpaces(spaces);
        setIsTokenExpired(false);

        const initialLastIds: Record<string, string> = {};
        const initialMessages: Record<string, any[]> = {};
        for (const space of spaces) {
          try {
            const msgs = await dbClient.getGoogleChatMessages(space.name, token);
            initialMessages[space.name] = msgs;
            if (msgs.length > 0) {
              initialLastIds[space.name] = msgs[msgs.length - 1].name;
            }
          } catch (err) {
            console.warn(`Failed initial fetch for ${space.name}:`, err);
          }
        }
        if (!isSubscribed) return;
        setLastMessageIds(initialLastIds);
        setGoogleMessages(initialMessages);
      } catch (err: any) {
        console.error('Failed initial load of Google spaces, falling back to simulator:', err);
        const isAuthError = err.message?.includes('expired') || err.message?.includes('401') || err.message?.includes('UNAUTHENTICATED');
        if (isAuthError) {
          authFailCountRef.current += 1;
          if (authFailCountRef.current >= 3) {
            setIsTokenExpired(true);
            setGoogleSpaces(MOCK_GOOGLE_SPACES);
            setGoogleMessages(getMockGoogleMessages());
          }
        }
      }
    };

    loadInitialData();

    // Poll every 30 seconds for new messages in all spaces
    pollInterval = setInterval(async () => {
      if (document.hidden) return; // Pause polling when tab is hidden
      if (isTokenExpired || !isSubscribed) return;
      try {
        const updatedMessages = { ...googleMessages };

        for (const space of googleSpaces) {
          try {
            const msgs = await dbClient.getGoogleChatMessages(space.name, token);
            if (!isSubscribed) return;

            updatedMessages[space.name] = msgs;

            if (msgs.length > 0) {
              const lastId = msgs[msgs.length - 1].name;
              const prevLastId = lastMessageIds[space.name];

              if (prevLastId && lastId !== prevLastId) {
                const newMsg = msgs[msgs.length - 1];
                const senderName = newMsg.sender?.displayName || 'Teammate';
                const senderEmail = newMsg.sender?.email || '';
                const senderRawName = newMsg.sender?.name || '';
                const spaceDisplayName = space.displayName || space.name.split('/').pop();

                // Determine if sender is current user
                let isMe = false;
                if (googleUserInfo) {
                  if (senderRawName && googleUserInfo.sub && senderRawName === `users/${googleUserInfo.sub}`) {
                    isMe = true;
                  } else if (senderEmail && googleUserInfo.email && senderEmail.toLowerCase() === googleUserInfo.email.toLowerCase()) {
                    isMe = true;
                  }
                }
                if (!isMe) {
                  if (senderEmail && currentUser?.email && senderEmail.toLowerCase() === currentUser.email.toLowerCase()) {
                    isMe = true;
                  } else if (senderName.toLowerCase() === currentUser?.full_name?.toLowerCase()) {
                    isMe = true;
                  }
                }

                // Dispatch event if sender is not current user
                if (!isMe) {
                  window.dispatchEvent(new CustomEvent('new-google-message', {
                    detail: {
                      spaceId: space.name,
                      spaceName: spaceDisplayName,
                      senderName,
                      text: newMsg.text || 'Sent an attachment.'
                    }
                  }));
                }
              }
              lastMessageIds[space.name] = lastId;
            }
          } catch (err) {
            console.warn(`Polling error for space ${space.name}:`, err);
          }
        }

        if (isSubscribed) {
          setGoogleMessages(updatedMessages);
          setLastMessageIds({ ...lastMessageIds });
          authFailCountRef.current = 0; // reset on success
        }
      } catch (err: any) {
        const isAuthError = err.message?.includes('expired') || err.message?.includes('401') || err.message?.includes('UNAUTHENTICATED');
        if (isAuthError) {
          authFailCountRef.current += 1;
          if (authFailCountRef.current >= 3) {
            setIsTokenExpired(true);
            setGoogleSpaces(MOCK_GOOGLE_SPACES);
            setGoogleMessages(getMockGoogleMessages());
          }
        }
      }
    }, 30000); // 30s polling

    return () => {
      isSubscribed = false;
      clearInterval(pollInterval);
    };
  }, [googleAccessToken, isTokenExpired, googleSpaces.length, currentUser, googleUserInfo]);


  const loadProfileAndTeammates = async () => {
    try {
      const allProfiles = await dbClient.getProfiles();
      setProfiles(allProfiles);

      const user = await dbClient.getCurrentUser();
      setCurrentUser(user);
    } catch (err) {
      console.error('Failed to load profile details:', err);
      setCurrentUser(null);
    }
  };

  useEffect(() => {
    // If supabase is configured, hook up authentication state listener
    if (supabase) {
      // Fetch initial session on mount
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          setIsSimulator(false);
          if (session.provider_token) {
            setGoogleAccessToken(session.provider_token);
          }
          loadProfileAndTeammates().then(() => setIsLoading(false));
        } else {
          setIsLoading(false);
        }
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'TOKEN_REFRESHED') {
          return;
        }
        // Only trigger loading state if we do not have a currentUser yet
        // (prevents bootstrapping spinner on tab switching or focus recovery checks)
        const showLoader = !currentUserRef.current;
        if (showLoader) {
          setIsLoading(true);
        }
        if (session) {
          setIsSimulator(false);
          if (session.provider_token) {
            setGoogleAccessToken(session.provider_token);
          }
          await loadProfileAndTeammates();
        } else {
          setCurrentUser(null);
        }
        if (showLoader) {
          setIsLoading(false);
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    } else {
      // In simulator mode, only load parameters if simulator is explicitly turned on
      if (isSimulator) {
        loadProfileAndTeammates().then(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    }
  }, [isSimulator]);

  useEffect(() => {
    // Listen to profile updates (e.g. role switches, name updates)
    const unsubscribe = dbClient.subscribe((table, type, payload) => {
      if (table === 'auth' && type === 'update') {
        setCurrentUser(payload);
      }
      if (table === 'profiles') {
        dbClient.getProfiles().then(setProfiles);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const switchUser = async (userId: string) => {
    setIsLoading(true);
    try {
      const user = await dbClient.switchUser(userId);
      setCurrentUser(user);
    } catch (err) {
      console.error('Failed to switch user:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const bypassAuth = async () => {
    setIsLoading(true);
    setIsSimulator(true);
    // Switch client variables back to offline simulator
    dbClient.isSupabaseEnabled = false;
    await loadProfileAndTeammates();
    setIsLoading(false);
  };

  const signOutUser = async () => {
    setIsLoading(true);
    if (supabase) {
      await supabase.auth.signOut();
    }
    setGoogleAccessToken('');
    setCurrentUser(null);
    setIsSimulator(false); // Reset simulator state on logout
    setIsLoading(false);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        profiles,
        switchUser,
        isLoading,
        isSimulator,
        bypassAuth,
        signOutUser,
        isDeveloper,
        isAdmin,
        googleAccessToken,
        setGoogleAccessToken,
        googleSpaces,
        googleMessages,
        googleUserInfo,
        isTokenExpired,
        setIsTokenExpired,
        refreshGoogleChat,
        sendGoogleMessage,
      }}
    >
      {children}
    </AuthContext.Provider>

  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
