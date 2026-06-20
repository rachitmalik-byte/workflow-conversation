import React, { useState, useEffect } from 'react';
import { dbClient } from '../../services/dbClient';
import type { Notification } from '../../types/database';
import { useAuth } from '../../context/AuthContext';
import { Bell, Check, Info, MessageSquare, AtSign, Briefcase, Calendar } from 'lucide-react';

interface NotificationCenterProps {
  onNavigate: (view: string) => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ onNavigate }) => {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const fetchNotifications = async () => {
    if (!currentUser) return;
    const data = await dbClient.getNotifications();
    setNotifications(data);
  };

  useEffect(() => {
    fetchNotifications();

    // Subscribe to realtime notification updates
    const unsubscribe = dbClient.subscribe((table, type, payload) => {
      if (table === 'notifications' && (type === 'insert' || type === 'update')) {
        fetchNotifications();
      }
      if (table === 'notifications' && type === 'update_all' && payload.userId === currentUser?.id) {
        fetchNotifications();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [currentUser]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleMarkRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await dbClient.markNotificationAsRead(id);
    fetchNotifications();
  };

  const handleMarkAllRead = async () => {
    await dbClient.markAllNotificationsAsRead();
    fetchNotifications();
  };

  const handleNotificationClick = async (notification: Notification) => {
    await dbClient.markNotificationAsRead(notification.id);
    fetchNotifications();
    setIsOpen(false);
    if (notification.link) {
      onNavigate(notification.link);
    }
  };

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'lead_update':
        return <Briefcase className="h-4 w-4 text-primary" />;
      case 'task_update':
        return <Check className="h-4 w-4 text-success" />;
      case 'reminder_alert':
        return <Calendar className="h-4 w-4 text-warning" />;
      case 'assignment_alert':
        return <Info className="h-4 w-4 text-primary" />;
      case 'mention_alert':
        return <AtSign className="h-4 w-4 text-danger" />;
      case 'message_alert':
        return <MessageSquare className="h-4 w-4 text-success" />;
      default:
        return <Info className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md focus:outline-none transition-colors"
        aria-label="Notification center"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-danger text-[10px] font-medium text-white ring-2 ring-background">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 sm:w-96 origin-top-right rounded-md border border-border bg-card p-0 shadow-lg ring-1 ring-black ring-opacity-5 z-40 focus:outline-none">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <span className="text-sm font-semibold text-foreground">Notifications</span>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Mark all as read
                </button>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                  <Bell className="h-8 w-8 text-muted-foreground/40 mb-2" />
                  <p className="text-sm font-medium text-muted-foreground">All caught up</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">No notifications to display</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleNotificationClick(n)}
                      className={`flex gap-3 px-4 py-3 hover:bg-muted/50 cursor-pointer transition-colors ${
                        !n.is_read ? 'bg-primary/5' : ''
                      }`}
                    >
                      <div className="flex-shrink-0 mt-0.5">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted">
                          {getIcon(n.type)}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-1">
                          <p className={`text-xs font-medium text-foreground ${!n.is_read ? 'font-semibold' : ''}`}>
                            {n.title}
                          </p>
                          {!n.is_read && (
                            <button
                              onClick={(e) => handleMarkRead(n.id, e)}
                              className="text-[10px] text-muted-foreground hover:text-foreground flex-shrink-0"
                              title="Mark as read"
                            >
                              <Check className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 break-words line-clamp-2">
                          {n.body}
                        </p>
                        <p className="text-[10px] text-muted-foreground/60 mt-1">
                          {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
