import { Fragment, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MentionHighlightProps {
  content: string;
  className?: string;
}

// Combined regex: matches @mentions OR URLs
const tokenRegex = /(https?:\/\/[^\s<]+[^\s<.,;:!?)}\]'"])|(@\w+)/g;

const MentionHighlight = ({ content, className = '' }: MentionHighlightProps) => {
  const navigate = useNavigate();

  const handleMentionClick = useCallback(async (username: string) => {
    const cleanUsername = username.substring(1).toLowerCase();
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('user_id')
        .ilike('username', cleanUsername)
        .maybeSingle();

      if (error) throw error;

      if (profile) {
        navigate(`/profile/${profile.user_id}`, { state: { from: '/' } });
      } else {
        toast.error(`Utilisateur @${cleanUsername} introuvable`);
      }
    } catch (error) {
      console.error('Error finding user:', error);
      toast.error('Erreur lors de la recherche du profil');
    }
  }, [navigate]);

  // Split content by tokens while keeping them
  const parts = content.split(tokenRegex).filter(p => p !== undefined);

  if (parts.length <= 1 && !tokenRegex.test(content)) {
    return <p className={className}>{content}</p>;
  }

  // Reset after test
  tokenRegex.lastIndex = 0;

  return (
    <p className={className}>
      {parts.map((part, index) => {
        if (!part) return null;

        // Check if it's a URL
        if (/^https?:\/\//.test(part)) {
          return (
            <a
              key={index}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-primary underline hover:text-primary/80 break-all transition-colors"
            >
              {part}
            </a>
          );
        }

        // Check if it's a mention
        if (/^@\w+$/.test(part)) {
          return (
            <button
              key={index}
              onClick={(e) => {
                e.stopPropagation();
                handleMentionClick(part);
              }}
              className="text-primary font-medium bg-primary/10 hover:bg-primary/20 rounded px-0.5 transition-colors cursor-pointer"
            >
              {part}
            </button>
          );
        }

        return <Fragment key={index}>{part}</Fragment>;
      })}
    </p>
  );
};

export default MentionHighlight;
