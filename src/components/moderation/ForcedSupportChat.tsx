import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import SupportChatRoom from '@/components/support/SupportChatRoom';
import { SupportTicket } from '@/hooks/useSupportTickets';
import { Shield, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

const ForcedSupportChat = () => {
  const { user } = useAuth();

  // Check if user has unresolved sanctioned infractions
  const { data: sanctionedInfractions = [] } = useQuery({
    queryKey: ['sanctioned-infractions', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('user_infractions' as any)
        .select('*')
        .eq('user_id', user.id)
        .eq('is_sanctioned', true)
        .eq('resolved', false);
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!user?.id,
    refetchInterval: 15000,
  });

  // Get the support ticket for the sanction
  const ticketId = sanctionedInfractions[0]?.support_ticket_id;

  const { data: ticket } = useQuery({
    queryKey: ['forced-support-ticket', ticketId],
    queryFn: async () => {
      if (!ticketId) return null;
      const { data, error } = await supabase
        .from('support_tickets' as any)
        .select('*')
        .eq('id', ticketId)
        .single();
      if (error) throw error;
      return data as unknown as SupportTicket;
    },
    enabled: !!ticketId,
    refetchInterval: 15000,
  });

  // If ticket is closed, infractions are resolved - don't show
  if (sanctionedInfractions.length === 0) return null;
  if (ticket?.status === 'closed') return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-background flex flex-col">
      {/* Header */}
      <div className="bg-destructive/10 border-b border-destructive/20 px-4 py-4">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center flex-shrink-0">
            <Shield className="w-5 h-5 text-destructive" />
          </div>
          <div>
            <h2 className="font-bold text-foreground text-sm">Sanction active</h2>
            <p className="text-xs text-muted-foreground">
              Vous devez résoudre vos infractions avec le support avant de continuer.
            </p>
          </div>
        </div>
      </div>

      {/* Warning banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-3"
      >
        <div className="flex items-start gap-2 max-w-2xl mx-auto">
          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700 dark:text-amber-400">
            Vous avez accumulé {sanctionedInfractions.length >= 3 ? '3+' : sanctionedInfractions.length} avertissement(s) pour utilisation de mots interdits.
            Un membre du support va examiner votre dossier. Vous ne pouvez pas quitter cette conversation.
          </p>
        </div>
      </motion.div>

      {/* Chat */}
      <div className="flex-1 min-h-0 max-w-2xl mx-auto w-full">
        {ticket ? (
          <SupportChatRoom
            ticket={ticket}
            onBack={() => {}} // Can't go back
            hideHeader
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-muted-foreground">Connexion au support en cours...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForcedSupportChat;
