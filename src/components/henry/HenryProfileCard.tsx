import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MessageCircle, SkipForward, Sparkles, MapPin, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { usePrivateConversations } from '@/hooks/usePrivateConversations';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAvatarUrl } from '@/hooks/useAvatarUrl';
import { toast } from 'sonner';
import { buildIntroSuggestions } from '@/lib/henry/henryFlow';
import type { HenryProfileMatch } from '@/hooks/useHenryChat';

interface Props {
  profile: HenryProfileMatch;
  interests: string[];
  onSkip: () => void;
}

const HenryProfileCard = ({ profile, interests, onSkip }: Props) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getOrCreateConversation } = usePrivateConversations();
  const [introOpen, setIntroOpen] = useState(false);
  const [sending, setSending] = useState(false);
  // Fallback côté front si l'edge function n'a pas signé l'URL
  const resolvedAvatar = useAvatarUrl(profile.avatar_url);

  const suggestions = buildIntroSuggestions(
    profile.username,
    profile.shared_tribes,
    interests,
  );

  const handleSendIntro = async (text: string) => {
    if (!user) return;
    setSending(true);
    try {
      const conv = await getOrCreateConversation.mutateAsync(profile.user_id);
      const { error } = await supabase.from('messages').insert({
        sender_id: user.id,
        recipient_id: profile.user_id,
        conversation_id: conv.id,
        content: text,
        message_type: 'text',
        is_private: true,
      } as any);
      if (error) throw error;
      toast.success(`Message envoyé à ${profile.username} 💌`);
      setIntroOpen(false);
      navigate(`/messages/${profile.user_id}`);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Envoi impossible');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.25 }}
        className="w-full max-w-[320px]"
      >
        <Card className="overflow-hidden border-primary/20 bg-card shadow-md">
          {/* Layout horizontal compact : avatar carré + infos */}
          <div className="flex gap-3 p-3">
            <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-muted shrink-0">
              {resolvedAvatar ? (
                <img
                  src={resolvedAvatar}
                  alt={profile.username}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <User className="w-8 h-8 opacity-40" />
                </div>
              )}
              {profile.is_online && (
                <span className="absolute bottom-1 right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-card" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-bold text-sm leading-tight truncate">
                  {profile.username}
                  {profile.age != null && (
                    <span className="text-muted-foreground font-normal">
                      , {profile.age}
                    </span>
                  )}
                </h3>
                <Badge className="bg-primary/15 text-primary border-0 gap-0.5 text-[10px] px-1.5 py-0 h-5 shrink-0">
                  <Sparkles className="w-2.5 h-2.5" />
                  {profile.compatibility}%
                </Badge>
              </div>
              {profile.region && (
                <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3" /> {profile.region}
                </p>
              )}
              {profile.reasons.length > 0 && (
                <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">
                  ✓ {profile.reasons.slice(0, 2).join(' · ')}
                </p>
              )}
            </div>
          </div>

          {profile.bio && (
            <p className="text-xs text-foreground/75 px-3 pb-2 line-clamp-2">
              "{profile.bio}"
            </p>
          )}

          <div className="flex gap-2 px-3 pb-3">
            <Button
              onClick={() => setIntroOpen(true)}
              className="flex-1 gap-1.5 h-8 text-xs"
              size="sm"
            >
              <MessageCircle className="w-3.5 h-3.5" /> Message
            </Button>
            <Button
              onClick={onSkip}
              variant="outline"
              size="sm"
              className="gap-1.5 h-8 text-xs"
            >
              <SkipForward className="w-3.5 h-3.5" /> Suivant
            </Button>
          </div>
        </Card>
      </motion.div>

      <Dialog open={introOpen} onOpenChange={setIntroOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>💬 Brise la glace avec {profile.username}</DialogTitle>
            <DialogDescription>
              Henry te propose quelques messages d'intro. Choisis-en un ou écris
              le tien depuis la conversation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {suggestions.map((s, i) => (
              <button
                key={i}
                disabled={sending}
                onClick={() => handleSendIntro(s)}
                className="w-full text-left text-sm bg-muted hover:bg-muted/70 rounded-lg p-3 transition disabled:opacity-50"
              >
                {s}
              </button>
            ))}
          </div>
          <Button
            variant="ghost"
            size="sm"
            disabled={sending}
            onClick={async () => {
              if (!user) return;
              setSending(true);
              try {
                await getOrCreateConversation.mutateAsync(profile.user_id);
                navigate(`/messages/${profile.user_id}`);
              } catch (err: any) {
                toast.error(err?.message || 'Ouverture impossible');
              } finally {
                setSending(false);
              }
            }}
          >
            Ouvrir la conversation sans message pré-rempli
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default HenryProfileCard;
