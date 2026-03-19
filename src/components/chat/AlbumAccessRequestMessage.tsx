import { useState } from 'react';
import { FolderLock, Check, X, Clock, Loader2, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

interface AlbumAccessRequestMessageProps {
  albumIds: string[];
  albumNames: string[];
  requesterId: string;
  isOwn: boolean;
  messageId?: string;
}

const AlbumAccessRequestMessage = ({
  albumIds,
  albumNames,
  requesterId,
  isOwn,
  messageId,
}: AlbumAccessRequestMessageProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [duration, setDuration] = useState<string>('24h');
  const [isAccepting, setIsAccepting] = useState(false);
  const [isRefusing, setIsRefusing] = useState(false);

  const isOwner = !isOwn && user?.id !== requesterId;

  // Check request status
  const { data: requestStatus } = useQuery({
    queryKey: ['album-access-request-status', requesterId, user?.id, albumIds],
    queryFn: async () => {
      if (!user?.id) return null;
      const ownerId = isOwn ? requesterId : user.id;
      const reqId = isOwn ? user.id : requesterId;

      // Actually: if isOwn, current user is the requester
      // If !isOwn, current user is the owner
      const { data, error } = await supabase
        .from('album_access_requests')
        .select('status, duration')
        .eq('requester_id', isOwn ? user.id : requesterId)
        .eq('album_owner_id', isOwn ? requesterId : user.id)
        .contains('album_ids', albumIds)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) return null;
      return data;
    },
    enabled: !!user?.id,
  });

  const handleAccept = async () => {
    if (!user?.id) return;
    setIsAccepting(true);

    try {
      // Calculate expiration
      let expiresAt: string | null = null;
      const now = new Date();
      switch (duration) {
        case '1h': now.setHours(now.getHours() + 1); expiresAt = now.toISOString(); break;
        case '24h': now.setHours(now.getHours() + 24); expiresAt = now.toISOString(); break;
        case '7d': now.setDate(now.getDate() + 7); expiresAt = now.toISOString(); break;
        case 'unlimited': expiresAt = null; break;
      }

      // Create album shares for each album
      for (const albumId of albumIds) {
        // Check if share already exists
        const { data: existing } = await supabase
          .from('album_shares')
          .select('id')
          .eq('album_id', albumId)
          .eq('shared_with_user_id', requesterId)
          .eq('shared_by_user_id', user.id)
          .eq('is_active', true)
          .maybeSingle();

        if (!existing) {
          await supabase.from('album_shares').insert({
            album_id: albumId,
            shared_with_user_id: requesterId,
            shared_by_user_id: user.id,
            expires_at: expiresAt,
            is_active: true,
          });
        }
      }

      // Update request status
      await supabase
        .from('album_access_requests')
        .update({
          status: 'accepted',
          duration,
          responded_at: new Date().toISOString(),
        })
        .eq('requester_id', requesterId)
        .eq('album_owner_id', user.id)
        .eq('status', 'pending');

      // Send response message
      const durationLabel = {
        '1h': '1 heure',
        '24h': '24 heures',
        '7d': '7 jours',
        'unlimited': 'illimité',
      }[duration] || duration;

      await supabase.from('messages').insert({
        sender_id: user.id,
        recipient_id: requesterId,
        content: `✅ Accès accordé à ${albumNames.length > 1 ? 'vos albums demandés' : `l'album "${albumNames[0]}"`} (durée : ${durationLabel})`,
        message_type: 'text',
        is_private: true,
        chat_room_id: null,
      });

      // Notification
      const { data: ownerProfile } = await supabase
        .from('profiles')
        .select('username')
        .eq('user_id', user.id)
        .maybeSingle();

      await supabase.from('notifications').insert({
        user_id: requesterId,
        type: 'album_access_granted',
        title: '✅ Accès album accordé !',
        message: `${ownerProfile?.username || 'Un utilisateur'} vous a donné accès à ${albumNames.length > 1 ? `${albumNames.length} albums` : `l'album "${albumNames[0]}"`} (${durationLabel})`,
        action_url: '/',
        is_read: false,
      });

      queryClient.invalidateQueries({ queryKey: ['album-access-request-status'] });
      queryClient.invalidateQueries({ queryKey: ['album-shares'] });
      queryClient.invalidateQueries({ queryKey: ['shared-albums'] });
      toast.success('Accès accordé !');
    } catch (error) {
      console.error('Error accepting album access:', error);
      toast.error('Erreur lors de l\'acceptation');
    } finally {
      setIsAccepting(false);
    }
  };

  const handleRefuse = async () => {
    if (!user?.id) return;
    setIsRefusing(true);

    try {
      await supabase
        .from('album_access_requests')
        .update({
          status: 'refused',
          responded_at: new Date().toISOString(),
        })
        .eq('requester_id', requesterId)
        .eq('album_owner_id', user.id)
        .eq('status', 'pending');

      await supabase.from('messages').insert({
        sender_id: user.id,
        recipient_id: requesterId,
        content: `❌ La demande d'accès à ${albumNames.length > 1 ? 'vos albums' : `l'album "${albumNames[0]}"`} a été refusée.`,
        message_type: 'text',
        is_private: true,
        chat_room_id: null,
      });

      await supabase.from('notifications').insert({
        user_id: requesterId,
        type: 'album_access_refused',
        title: '❌ Demande d\'accès refusée',
        message: `Votre demande d'accès album a été refusée.`,
        action_url: '/',
        is_read: false,
      });

      queryClient.invalidateQueries({ queryKey: ['album-access-request-status'] });
      toast.success('Demande refusée');
    } catch (error) {
      console.error('Error refusing album access:', error);
      toast.error('Erreur');
    } finally {
      setIsRefusing(false);
    }
  };

  const isResolved = requestStatus?.status === 'accepted' || requestStatus?.status === 'refused';

  return (
    <div className="space-y-2">
      <div className={`flex items-start gap-3 p-4 rounded-xl transition-all w-full ${
        isOwn
          ? 'bg-primary/20'
          : 'bg-gradient-to-br from-violet-500/20 to-purple-500/20'
      }`}>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
          isOwn ? 'bg-primary/30' : 'bg-gradient-to-br from-violet-500 to-purple-500'
        }`}>
          <FolderLock className="w-5 h-5 text-white" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">
            {isOwn ? 'Demande d\'accès envoyée' : 'Demande d\'accès album'}
          </p>
          <div className="mt-1 space-y-0.5">
            {albumNames.map((name, i) => (
              <p key={i} className="text-xs text-foreground/80 flex items-center gap-1">
                <FolderLock className="w-3 h-3" />
                {name}
              </p>
            ))}
          </div>

          {isResolved && (
            <Badge
              variant={requestStatus?.status === 'accepted' ? 'default' : 'destructive'}
              className="mt-2 text-[10px]"
            >
              {requestStatus?.status === 'accepted' ? '✅ Accepté' : '❌ Refusé'}
            </Badge>
          )}
        </div>
      </div>

      {/* Owner actions - only show if not resolved and current user is the album owner */}
      {isOwner && !isResolved && (
        <div className="space-y-2 pl-2">
          <div className="flex items-center gap-2">
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger className="h-8 text-xs rounded-lg flex-1">
                <Clock className="w-3 h-3 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1h">1 heure</SelectItem>
                <SelectItem value="24h">24 heures</SelectItem>
                <SelectItem value="7d">7 jours</SelectItem>
                <SelectItem value="unlimited">Illimité</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="flex-1 h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 rounded-lg"
              onClick={handleRefuse}
              disabled={isRefusing}
            >
              {isRefusing ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3 mr-1" />}
              Refuser
            </Button>
            <Button
              size="sm"
              className="flex-1 h-8 text-xs rounded-lg"
              onClick={handleAccept}
              disabled={isAccepting}
            >
              {isAccepting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3 mr-1" />}
              Accepter
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AlbumAccessRequestMessage;
