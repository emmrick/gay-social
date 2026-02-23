import { useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useSupportTickets, SupportTicket } from '@/hooks/useSupportTickets';
import { Headphones, Plus, Hash, Clock, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface SupportTicketListProps {
  onSelectTicket: (ticket: SupportTicket) => void;
}

const SupportTicketList = ({ onSelectTicket }: SupportTicketListProps) => {
  const { tickets, isLoading, createTicket } = useSupportTickets();

  const handleNewTicket = async () => {
    const result = await createTicket.mutateAsync("Demande d'assistance");
    if (result) {
      onSelectTicket(result);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-amber-500/20 text-amber-600">
            <Clock className="w-2.5 h-2.5 mr-0.5" /> En attente
          </Badge>
        );
      case 'assigned':
        return (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-green-500/20 text-green-600">
            <Loader2 className="w-2.5 h-2.5 mr-0.5" /> En cours
          </Badge>
        );
      case 'closed':
        return (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-muted text-muted-foreground">
            <CheckCircle className="w-2.5 h-2.5 mr-0.5" /> Fermé
          </Badge>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Headphones className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-sm">Support</h3>
        </div>
        <Button
          size="sm"
          className="gap-1.5 text-xs"
          onClick={handleNewTicket}
          disabled={createTicket.isPending}
        >
          {createTicket.isPending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Plus className="w-3.5 h-3.5" />
          )}
          Nouveau ticket
        </Button>
      </div>

      {/* Ticket list */}
      {tickets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center px-6">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Headphones className="w-7 h-7 text-muted-foreground" />
          </div>
          <h3 className="font-medium text-foreground mb-1">Aucun ticket</h3>
          <p className="text-sm text-muted-foreground max-w-xs mb-4">
            Besoin d'aide ? Créez un ticket et un agent vous répondra.
          </p>
          <Button
            onClick={handleNewTicket}
            disabled={createTicket.isPending}
            className="gap-2"
          >
            {createTicket.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Créer un ticket
          </Button>
        </div>
      ) : (
        <div className="divide-y divide-border/50 overflow-y-auto flex-1">
          {tickets.map((ticket) => (
            <button
              key={ticket.id}
              onClick={() => onSelectTicket(ticket)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 active:bg-muted transition-colors text-left"
            >
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                ticket.status === 'closed' ? "bg-muted" : "bg-primary/10"
              )}>
                <Headphones className={cn(
                  "w-5 h-5",
                  ticket.status === 'closed' ? "text-muted-foreground" : "text-primary"
                )} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium truncate flex items-center gap-1">
                    <Hash className="w-3 h-3 text-muted-foreground" />
                    {ticket.ticket_number}
                  </span>
                  <span className="text-[11px] text-muted-foreground flex-shrink-0">
                    {format(new Date(ticket.created_at), 'dd/MM/yy', { locale: fr })}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 mt-0.5">
                  <p className="text-xs text-muted-foreground truncate">{ticket.subject}</p>
                  {getStatusBadge(ticket.status)}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default SupportTicketList;
