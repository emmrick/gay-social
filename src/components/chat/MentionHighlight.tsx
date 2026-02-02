import { Fragment, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MentionHighlightProps {
  content: string;
  className?: string;
}

const MentionHighlight = ({ content, className = '' }: MentionHighlightProps) => {
  const navigate = useNavigate();
  
  // Regex to match @mentions (@ followed by word characters)
  const mentionRegex = /(@\w+)/g;
  
  // Split content by mentions while keeping the mentions in the array
  const parts = content.split(mentionRegex);

  const handleMentionClick = useCallback(async (username: string) => {
    // Remove the @ symbol
    const cleanUsername = username.substring(1).toLowerCase();
    
    try {
      // Look up the user by username
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
  
  if (parts.length === 1) {
    // No mentions found, return plain text
    return <p className={className}>{content}</p>;
  }

  return (
    <p className={className}>
      {parts.map((part, index) => {
        if (mentionRegex.test(part)) {
          // Reset regex lastIndex for next test
          mentionRegex.lastIndex = 0;
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
