import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Headphones, MessageCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface ActiveTicket {
  id: string;
  status: string;
  assigned_to: string | null;
  updated_at: string;
}

const ACTIVE_STATUSES = ['open', 'assigned', 'waiting_client'];

/**
 * Floating persistent badge shown whenever the user has an active support
 * conversation (waiting in queue or chatting with an agent). Click → /help.
 * Hidden on /help itself.
 */
const ActiveSupportBadge = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [ticket, setTicket] = useState<ActiveTicket | null>(null);
  const [unread, setUnread] = useState(0);

  // Fetch + subscribe to active ticket
  useEffect(() => {
    if (!user?.id) {
      setTicket(null);
      return;
    }

    let cancelled = false;

    const fetchActive = async () => {
      const { data } = await supabase
        .from('support_tickets' as any)
        .select('id,status,assigned_to,updated_at')
        .eq('user_id', user.id)
        .in('status', ACTIVE_STATUSES)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      setTicket((data as any) || null);
    };

    fetchActive();

    const channel = supabase
      .channel(`active-support-badge-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_tickets',
          filter: `user_id=eq.${user.id}`,
        },
        () => fetchActive()
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // Count unread agent messages for the active ticket
  useEffect(() => {
    if (!ticket?.id || !user?.id) {
      setUnread(0);
      return;
    }

    let cancelled = false;

    const fetchUnread = async () => {
      const { count } = await supabase
        .from('support_messages' as any)
        .select('id', { count: 'exact', head: true })
        .eq('ticket_id', ticket.id)
        .neq('sender_id', user.id)
        .is('read_at', null);
      if (!cancelled) setUnread(count || 0);
    };

    fetchUnread();

    const channel = supabase
      .channel(`active-support-badge-msgs-${ticket.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_messages',
          filter: `ticket_id=eq.${ticket.id}`,
        },
        () => fetchUnread()
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [ticket?.id, user?.id]);

  const onHelp = location.pathname.startsWith('/help');
  const visible = !!ticket && !onHelp;

  const isWaiting = ticket?.status === 'open' || !ticket?.assigned_to;
  const label = isWaiting ? "File d'attente" : 'Conseiller en ligne';

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          onClick={() => navigate('/help')}
          className={cn(
            'fixed z-[60] left-1/2 -translate-x-1/2',
            'flex items-center gap-2 px-4 py-2.5 rounded-full',
            'bg-gradient-to-r from-primary to-primary/80 text-primary-foreground',
            'shadow-lg shadow-primary/30 backdrop-blur-md',
            'border border-primary-foreground/10',
            'active:scale-95 transition-transform'
          )}
          style={{
            bottom: 'calc(env(safe-area-inset-bottom, 0px) + 5rem)',
          }}
          aria-label="Reprendre la conversation d'aide"
        >
          <span className="relative flex items-center justify-center">
            {isWaiting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Headphones className="h-4 w-4" />
            )}
            <span className="absolute inset-0 rounded-full animate-ping bg-primary-foreground/40 -z-10" />
          </span>
          <span className="text-sm font-semibold whitespace-nowrap">{label}</span>
          {unread > 0 && (
            <span className="ml-1 flex items-center gap-1 bg-destructive text-destructive-foreground text-xs font-bold px-2 py-0.5 rounded-full">
              <MessageCircle className="h-3 w-3" />
              {unread}
            </span>
          )}
        </motion.button>
      )}
    </AnimatePresence>
  );
};

export default ActiveSupportBadge;
