import { useState } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  BellOff,
  Bot,
  Check,
  CheckCheck,
  Trash2,
  ShieldCheck,
  MessageSquare,
  AlertTriangle,
  Info,
  Heart,
  FolderOpen,
  Gift,
  Crown,
  Loader2,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  useNotifications,
  useUnreadNotificationsCount,
  useMarkNotificationAsRead,
  useMarkAllNotificationsAsRead,
  useDeleteNotification,
  Notification,
} from '@/hooks/useNotifications';
import { useClearAllNotifications } from '@/hooks/useNotifications';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

const getNotificationStyle = (type: string) => {
  switch (type) {
    case 'verification_request':
    case 'verification_approved':
    case 'verification_submitted':
      return { icon: ShieldCheck, gradient: 'from-emerald-500 to-green-600', bg: 'bg-emerald-500/10', text: 'text-emerald-500' };
    case 'verification_rejected':
      return { icon: AlertTriangle, gradient: 'from-red-500 to-rose-600', bg: 'bg-red-500/10', text: 'text-red-500' };
    case 'message':
    case 'private_message':
      return { icon: MessageSquare, gradient: 'from-blue-500 to-indigo-600', bg: 'bg-blue-500/10', text: 'text-blue-500' };
    case 'group_mention':
      return { icon: Users, gradient: 'from-violet-500 to-purple-600', bg: 'bg-violet-500/10', text: 'text-violet-500' };
    case 'profile_reaction':
    case 'favorite_added':
      return { icon: Heart, gradient: 'from-pink-500 to-rose-600', bg: 'bg-pink-500/10', text: 'text-pink-500' };
    case 'swipe_match':
      return { icon: Sparkles, gradient: 'from-rose-500 to-pink-600', bg: 'bg-rose-500/10', text: 'text-rose-500' };
    case 'album_shared':
    case 'album_share_stopped':
    case 'album_share_expired':
    case 'album_share_ended':
      return { icon: FolderOpen, gradient: 'from-amber-500 to-orange-600', bg: 'bg-amber-500/10', text: 'text-amber-500' };
    case 'credits_approved':
      return { icon: Zap, gradient: 'from-emerald-500 to-teal-600', bg: 'bg-emerald-500/10', text: 'text-emerald-500' };
    case 'credits_rejected':
      return { icon: AlertTriangle, gradient: 'from-red-500 to-rose-600', bg: 'bg-red-500/10', text: 'text-red-500' };
    case 'account_suspended':
    case 'account_banned':
      return { icon: AlertTriangle, gradient: 'from-red-600 to-red-700', bg: 'bg-red-500/10', text: 'text-red-500' };
    case 'account_unblocked':
      return { icon: ShieldCheck, gradient: 'from-emerald-500 to-green-600', bg: 'bg-emerald-500/10', text: 'text-emerald-500' };
    case 'chatbot_unanswered':
      return { icon: Bot, gradient: 'from-blue-500 to-cyan-600', bg: 'bg-blue-500/10', text: 'text-blue-500' };
    case 'welcome':
      return { icon: Gift, gradient: 'from-purple-500 to-violet-600', bg: 'bg-purple-500/10', text: 'text-purple-500' };
    case 'subscription_activated':
    case 'subscription_ended':
      return { icon: Crown, gradient: 'from-amber-500 to-yellow-600', bg: 'bg-amber-500/10', text: 'text-amber-500' };
    default:
      return { icon: Info, gradient: 'from-slate-400 to-slate-500', bg: 'bg-muted', text: 'text-muted-foreground' };
  }
};

interface NotificationCardProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
  onNavigate: (url: string | null) => void;
  index: number;
}

const NotificationCard = ({
  notification,
  onMarkAsRead,
  onDelete,
  onNavigate,
  index,
}: NotificationCardProps) => {
  const style = getNotificationStyle(notification.type);
  const Icon = style.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -80, scale: 0.95 }}
      transition={{ delay: index * 0.03, duration: 0.2 }}
      layout
      className={cn(
        "relative overflow-hidden rounded-2xl border transition-all duration-200 cursor-pointer group active:scale-[0.98]",
        !notification.is_read
          ? "bg-card border-primary/20 shadow-sm shadow-primary/5"
          : "bg-card/60 border-border/50 hover:bg-card"
      )}
      onClick={() => {
        if (!notification.is_read) onMarkAsRead(notification.id);
        onNavigate(notification.action_url);
      }}
    >
      {/* Unread accent line */}
      {!notification.is_read && (
        <div className={cn("absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b", style.gradient)} />
      )}

      <div className="p-4 flex items-start gap-3.5">
        {/* Icon with gradient background */}
        <div className={cn(
          "relative w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-105",
          !notification.is_read
            ? `bg-gradient-to-br ${style.gradient} shadow-lg`
            : style.bg
        )}>
          <Icon className={cn("w-5 h-5", !notification.is_read ? "text-white" : style.text)} />
          {!notification.is_read && (
            <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-primary border-2 border-card animate-pulse" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className={cn(
            "text-sm leading-tight mb-0.5",
            !notification.is_read ? "font-semibold text-foreground" : "font-medium text-foreground/80"
          )}>
            {notification.title}
          </p>

          {notification.message && (
            <p className="text-[13px] text-muted-foreground line-clamp-2 leading-relaxed">
              {notification.message}
            </p>
          )}

          <p className="text-[11px] text-muted-foreground/70 mt-1.5 font-medium">
            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: fr })}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          {!notification.is_read && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg hover:bg-primary/10"
              onClick={(e) => { e.stopPropagation(); onMarkAsRead(notification.id); }}
            >
              <Check className="w-4 h-4 text-primary" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg hover:bg-destructive/10"
            onClick={(e) => { e.stopPropagation(); onDelete(notification.id); }}
          >
            <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

const NotificationsHistoryPage = () => {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const { data: notifications, isLoading } = useNotifications();
  const { data: unreadCount } = useUnreadNotificationsCount();
  const markAsRead = useMarkNotificationAsRead();
  const markAllAsRead = useMarkAllNotificationsAsRead();
  const deleteNotification = useDeleteNotification();
  const clearAllNotifications = useClearAllNotifications();
  const navigate = useNavigate();

  const handleNavigate = (url: string | null) => {
    if (url) navigate(url);
  };

  const filteredNotifications = notifications?.filter(n =>
    filter === 'all' ? true : !n.is_read
  ) || [];

  const groupedNotifications = filteredNotifications.reduce((groups, notification) => {
    const date = format(new Date(notification.created_at), 'yyyy-MM-dd');
    if (!groups[date]) groups[date] = [];
    groups[date].push(notification);
    return groups;
  }, {} as Record<string, Notification[]>);

  const formatDateHeader = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (format(date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')) return "Aujourd'hui";
    if (format(date, 'yyyy-MM-dd') === format(yesterday, 'yyyy-MM-dd')) return 'Hier';
    return format(date, 'EEEE d MMMM yyyy', { locale: fr });
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Hero Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/8 via-primary/3 to-transparent" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-primary/5 rounded-full blur-3xl" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="relative px-5 pt-8 pb-6"
        >
          <div className="flex items-center justify-center mb-5">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-xl shadow-primary/25 rotate-3">
                <Bell className="w-7 h-7 text-white -rotate-3" />
              </div>
              {(unreadCount ?? 0) > 0 && (
                <div className="absolute -top-2 -right-2 min-w-6 h-6 px-1.5 rounded-full bg-destructive text-destructive-foreground text-xs font-bold flex items-center justify-center shadow-lg animate-pulse">
                  {unreadCount}
                </div>
              )}
            </div>
          </div>

          <h1 className="text-2xl font-bold text-center tracking-tight">Notifications</h1>
          <p className="text-center text-muted-foreground text-sm mt-1">
            {unreadCount ? `${unreadCount} nouvelle${(unreadCount ?? 0) > 1 ? 's' : ''} notification${(unreadCount ?? 0) > 1 ? 's' : ''}` : '✨ Tout est à jour'}
          </p>
        </motion.div>
      </div>

      <div className="px-5 space-y-4">
        {/* Filters & Actions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.2 }}
          className="flex items-center justify-between gap-2"
        >
          {/* Pill filter */}
          <div className="flex bg-muted/60 rounded-xl p-1 gap-0.5">
            <button
              onClick={() => setFilter('all')}
              className={cn(
                "px-4 py-1.5 rounded-lg text-xs font-medium transition-all duration-200",
                filter === 'all'
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Toutes
              <span className="ml-1.5 text-[10px] opacity-60">{notifications?.length || 0}</span>
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={cn(
                "px-4 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-1.5",
                filter === 'unread'
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Non lues
              {(unreadCount ?? 0) > 0 && (
                <span className="min-w-4 h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5">
            {(unreadCount ?? 0) > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs gap-1.5 rounded-lg"
                onClick={() => markAllAsRead.mutate()}
                disabled={markAllAsRead.isPending}
              >
                {markAllAsRead.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCheck className="w-3.5 h-3.5" />
                )}
                <span className="hidden sm:inline">Tout lire</span>
              </Button>
            )}

            {(notifications?.length ?? 0) > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Effacer toutes les notifications ?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Cette action supprimera définitivement toutes vos notifications. Elle est irréversible.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive hover:bg-destructive/90"
                      onClick={() => clearAllNotifications.mutate()}
                    >
                      Effacer tout
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </motion.div>

        {/* Notifications List */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Chargement...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-16 text-center"
          >
            <div className="w-20 h-20 rounded-3xl bg-muted/50 flex items-center justify-center mb-4">
              <BellOff className="w-9 h-9 text-muted-foreground/30" />
            </div>
            <h3 className="font-semibold text-base mb-1">
              {filter === 'unread' ? 'Aucune notification non lue' : 'Aucune notification'}
            </h3>
            <p className="text-sm text-muted-foreground max-w-[250px]">
              {filter === 'unread'
                ? 'Toutes vos notifications ont été lues'
                : 'Vous n\'avez pas encore reçu de notifications'}
            </p>
          </motion.div>
        ) : (
          <div className="space-y-5">
            <AnimatePresence mode="popLayout">
              {Object.entries(groupedNotifications)
                .sort(([a], [b]) => b.localeCompare(a))
                .map(([date, notifs]) => (
                  <motion.div
                    key={date}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-2.5"
                  >
                    <div className="flex items-center gap-3 px-1">
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                        {formatDateHeader(date)}
                      </h3>
                      <div className="flex-1 h-px bg-border/50" />
                      <span className="text-[10px] text-muted-foreground/50 font-medium">
                        {notifs.length}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {notifs.map((notification, i) => (
                        <NotificationCard
                          key={notification.id}
                          notification={notification}
                          onMarkAsRead={(id) => markAsRead.mutate(id)}
                          onDelete={(id) => deleteNotification.mutate(id)}
                          onNavigate={handleNavigate}
                          index={i}
                        />
                      ))}
                    </div>
                  </motion.div>
                ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsHistoryPage;
