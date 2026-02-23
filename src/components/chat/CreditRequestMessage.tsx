import { useState } from 'react';
import { CreditCard, Check, Loader2, X, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useIsAdmin } from '@/hooks/useAdmin';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface CreditRequestData {
  last4Digits: string;
  lastName: string;
  firstName: string;
  paymentEmail: string;
  username: string;
  age: string | number;
  region: string;
  userId: string;
  status?: 'pending' | 'approved' | 'rejected';
  processedAt?: string;
  creditsAwarded?: number;
  rejectionReason?: string;
}

interface CreditRequestMessageProps {
  messageId: string;
  content: string;
  senderId: string;
  recipientId?: string;
  isOwn: boolean;
  isSupportContext?: boolean;
  ticketId?: string;
}

const CREDIT_OPTIONS = [
  { credits: 100, label: '100 crédits', price: '4,99€' },
  { credits: 250, label: '250 crédits', price: '10,99€' },
];

const REJECTION_REASONS = [
  'Transaction refusée par votre banque',
  'Approvisionnement insuffisant',
  'Paiement non trouvé dans nos systèmes',
  'Informations bancaires incorrectes',
  'Paiement expiré ou annulé',
];

const CreditRequestMessage = ({ messageId, content, senderId, recipientId, isOwn, isSupportContext, ticketId }: CreditRequestMessageProps) => {
  const { data: isAdmin } = useIsAdmin();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);
  const [customAmount, setCustomAmount] = useState('');

  // Parse the credit request data from content
  let requestData: CreditRequestData | null = null;
  try {
    requestData = JSON.parse(content);
  } catch {
    // Content might be the old format (formatted text)
  }

  // Determine status from persisted data
  const isApproved = requestData?.status === 'approved';
  const isRejected = requestData?.status === 'rejected';
  const isPending = !isApproved && !isRejected;

  // Fallback render for old format or parse error
  if (!requestData) {
    return (
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 max-w-xs">
        <div className="flex items-center gap-2 mb-2">
          <CreditCard className="w-5 h-5 text-amber-600" />
          <span className="font-semibold text-amber-600">Demande de crédits</span>
        </div>
        <p className="text-sm whitespace-pre-wrap">{content}</p>
      </div>
    );
  }

  // Helper to update message content with new status
  const updateMessageStatus = async (updatedData: CreditRequestData) => {
    if (isSupportContext) {
      // In support context, update support_messages table
      const { error } = await supabase
        .from('support_messages' as any)
        .update({ content: JSON.stringify(updatedData) } as any)
        .eq('id', messageId);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('messages')
        .update({ content: JSON.stringify(updatedData) })
        .eq('id', messageId);
      if (error) throw error;
    }
  };

  const handleCreditUser = async (credits: number) => {
    if (!requestData) return;
    
    setIsProcessing(true);
    try {
      const { error } = await supabase.rpc('add_credits', {
        _user_id: requestData.userId,
        _amount: credits,
        _credit_type: 'purchased',
        _transaction_type: 'admin_credit',
        _description: `Attribution manuelle - ${credits} crédits`,
      });

      if (error) throw error;

      // Send confirmation message
      const adminId = user?.id;
      if (adminId && isSupportContext && ticketId) {
        await supabase
          .from('support_messages' as any)
          .insert({
            ticket_id: ticketId,
            sender_id: adminId,
            content: `✅ Votre demande de crédits a été approuvée ! ${credits} crédits ont été ajoutés à votre compte.`,
            message_type: 'text',
          } as any);
      } else if (adminId && !isSupportContext) {
        await supabase.from('messages').insert({
          sender_id: adminId,
          recipient_id: requestData.userId,
          content: `✅ Votre demande de crédits a été approuvée ! ${credits} crédits ont été ajoutés à votre compte.`,
          message_type: 'text',
          is_private: true,
        });
      }

      // Update the original message with approved status
      const updatedData: CreditRequestData = {
        ...requestData,
        status: 'approved',
        processedAt: new Date().toISOString(),
        creditsAwarded: credits,
      };
      await updateMessageStatus(updatedData);

      toast.success(`${credits} crédits attribués à ${requestData.username} !`);
      queryClient.invalidateQueries({ queryKey: ['user-credits'] });
      queryClient.invalidateQueries({ queryKey: ['private-messages'] });
      queryClient.invalidateQueries({ queryKey: ['support-messages'] });
    } catch (error) {
      console.error('Error crediting user:', error);
      toast.error('Erreur lors de l\'attribution des crédits');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectCredit = async (reason: string) => {
    if (!requestData) return;
    
    const adminId = user?.id;
    if (!adminId) {
      toast.error('Erreur: utilisateur non connecté');
      return;
    }
    
    setIsProcessing(true);
    try {
      // Send rejection message
      const agentId = user?.id;
      if (isSupportContext && ticketId && agentId) {
        const { error } = await supabase
          .from('support_messages' as any)
          .insert({
            ticket_id: ticketId,
            sender_id: agentId,
            content: `❌ Votre demande de crédits a été refusée.\n\n📋 Motif : ${reason}\n\nSi vous pensez qu'il s'agit d'une erreur, veuillez nous recontacter avec plus de détails sur votre paiement.`,
            message_type: 'text',
          } as any);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('messages').insert({
          sender_id: adminId,
          recipient_id: requestData.userId,
          content: `❌ Votre demande de crédits a été refusée.\n\n📋 Motif : ${reason}\n\nSi vous pensez qu'il s'agit d'une erreur, veuillez nous recontacter avec plus de détails sur votre paiement.`,
          message_type: 'text',
          is_private: true,
        });
        if (error) throw error;
      }

      // Update the original message with rejected status
      const updatedData: CreditRequestData = {
        ...requestData,
        status: 'rejected',
        processedAt: new Date().toISOString(),
        rejectionReason: reason,
      };
      await updateMessageStatus(updatedData);

      toast.success('Message de refus envoyé');
      queryClient.invalidateQueries({ queryKey: ['private-messages'] });
      queryClient.invalidateQueries({ queryKey: ['support-messages'] });
    } catch (error) {
      console.error('Error rejecting credit request:', error);
      toast.error('Erreur lors de l\'envoi du message de refus');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className={`rounded-xl p-4 max-w-sm ${isOwn ? 'bg-primary/20 border border-primary/30' : 'bg-amber-500/10 border border-amber-500/30'}`}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <CreditCard className="w-5 h-5 text-amber-600" />
        <span className="font-semibold text-amber-600 text-sm">💳 Demande de crédits</span>
      </div>

      {/* Payment Info */}
      <div className="space-y-1.5 text-sm mb-3">
        <div className="flex justify-between">
          <span className="text-muted-foreground">4 derniers CB:</span>
          <span className="font-mono font-medium">{requestData.last4Digits}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Nom:</span>
          <span className="font-medium">{requestData.lastName}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Prénom:</span>
          <span className="font-medium">{requestData.firstName}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Email:</span>
          <span className="font-medium text-xs truncate max-w-[180px]">{requestData.paymentEmail}</span>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-border my-2" />

      {/* Account Info */}
      <div className="space-y-1.5 text-sm mb-3">
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Pseudo:</span>
          <Badge variant="secondary">{requestData.username}</Badge>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Âge:</span>
          <span className="font-medium">{requestData.age} ans</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Département:</span>
          <span className="font-medium">{requestData.region}</span>
        </div>
      </div>

      {/* Action Buttons - show for admin or agent in support context */}
      {(isAdmin || isSupportContext) && !isOwn && isPending && (
        <div className="space-y-2 mt-4">
          <p className="text-xs text-muted-foreground mb-2">Attribuer les crédits :</p>
          <div className="flex gap-2">
            {CREDIT_OPTIONS.map((option) => (
              <Button
                key={option.credits}
                size="sm"
                variant="outline"
                className="flex-1 text-xs"
                onClick={() => handleCreditUser(option.credits)}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <>
                    <CreditCard className="w-3 h-3 mr-1" />
                    {option.label}
                  </>
                )}
              </Button>
            ))}
          </div>

          {/* Custom amount input */}
          <div className="flex gap-2 mt-2">
            <Input
              type="number"
              min="1"
              max="10000"
              placeholder="Montant personnalisé"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              className="flex-1 h-8 text-xs"
              disabled={isProcessing}
            />
            <Button
              size="sm"
              variant="secondary"
              className="text-xs h-8 px-3"
              onClick={() => {
                const amount = parseInt(customAmount, 10);
                if (!amount || amount < 1 || amount > 10000) {
                  toast.error('Montant invalide (1 - 10 000)');
                  return;
                }
                handleCreditUser(amount);
              }}
              disabled={isProcessing || !customAmount}
            >
              {isProcessing ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <>
                  <Send className="w-3 h-3 mr-1" />
                  Attribuer
                </>
              )}
            </Button>
          </div>
          
          {/* Reject Button */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="destructive"
                className="w-full text-xs mt-2"
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <>
                    <X className="w-3 h-3 mr-1" />
                    Refuser la demande
                  </>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-64">
              {REJECTION_REASONS.map((reason) => (
                <DropdownMenuItem
                  key={reason}
                  onClick={() => handleRejectCredit(reason)}
                  className="text-xs cursor-pointer"
                >
                  {reason}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Approved confirmation */}
      {isApproved && (
        <div className="flex items-center gap-2 mt-4 p-2 bg-green-500/20 rounded-lg">
          <Check className="w-4 h-4 text-green-600" />
          <span className="text-sm text-green-600 font-medium">
            ✅ {requestData.creditsAwarded} crédits attribués
          </span>
        </div>
      )}

      {/* Rejected confirmation */}
      {isRejected && (
        <div className="flex flex-col gap-1 mt-4 p-2 bg-red-500/20 rounded-lg">
          <div className="flex items-center gap-2">
            <X className="w-4 h-4 text-red-600" />
            <span className="text-sm text-red-600 font-medium">Demande refusée</span>
          </div>
          {requestData.rejectionReason && (
            <span className="text-xs text-red-500 ml-6">{requestData.rejectionReason}</span>
          )}
        </div>
      )}
    </div>
  );
};

export default CreditRequestMessage;
