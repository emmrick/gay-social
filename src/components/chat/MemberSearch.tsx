import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { shouldShowOnlineIndicator } from '@/hooks/useOnlineStatus';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, X, MessageCircle, User, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface MemberSearchProps {
  onSelectUser: (userId: string) => void;
  onClose: () => void;
}

const MemberSearch = ({ onSelectUser, onClose }: MemberSearchProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const { user } = useAuth();

  // Fetch all profiles for search
  const { data: profiles, isLoading } = useQuery({
    queryKey: ['all-profiles-search'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url, region, is_online, last_seen, hide_online_status, hide_last_seen, bio')
        .neq('user_id', user?.id || '')
        .order('is_online', { ascending: false })
        .order('last_seen', { ascending: false, nullsFirst: false })
        .order('username', { ascending: true })
        .limit(100);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Filter profiles based on search query
  const filteredProfiles = useMemo(() => {
    if (!profiles) return [];
    if (!searchQuery.trim()) return profiles.slice(0, 20);

    const query = searchQuery.toLowerCase().trim();
    return profiles.filter(profile => 
      profile.username.toLowerCase().includes(query) ||
      profile.region?.toLowerCase().includes(query) ||
      profile.bio?.toLowerCase().includes(query)
    );
  }, [profiles, searchQuery]);

  const handleSelect = (userId: string) => {
    onSelectUser(userId);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="absolute inset-0 z-50 bg-background flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border bg-card/80 backdrop-blur-lg">
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher un membre..."
            className="pl-10 bg-secondary border-none"
            autoFocus
          />
        </div>
      </div>

      {/* Results */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : filteredProfiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <User className="w-12 h-12 text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">
                {searchQuery ? 'Aucun membre trouvé' : 'Commence à taper pour rechercher'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground mb-3">
                {filteredProfiles.length} membre{filteredProfiles.length > 1 ? 's' : ''} trouvé{filteredProfiles.length > 1 ? 's' : ''}
              </p>
              
              {filteredProfiles.map((profile, index) => (
                <motion.button
                  key={profile.user_id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  onClick={() => handleSelect(profile.user_id)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200",
                    "bg-secondary/30 hover:bg-secondary border border-transparent hover:border-primary/30",
                    "active:scale-[0.98]"
                  )}
                >
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-semibold overflow-hidden">
                      {profile.avatar_url ? (
                        <img
                          src={profile.avatar_url}
                          alt={profile.username}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        profile.username.charAt(0).toUpperCase()
                      )}
                    </div>
                    {shouldShowOnlineIndicator(profile) ? (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                    ) : (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-gray-400 rounded-full border-2 border-background" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 text-left min-w-0">
                    <h3 className="font-medium text-foreground truncate">
                      {profile.username}
                    </h3>
                    <p className="text-xs text-muted-foreground truncate">
                      {profile.region && `📍 ${profile.region}`}
                      {shouldShowOnlineIndicator(profile) && <span className="text-green-500 ml-2">• En ligne</span>}
                    </p>
                  </div>

                  {/* Action */}
                  <div className="flex-shrink-0 w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                    <MessageCircle className="w-4 h-4" />
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </motion.div>
  );
};

export default MemberSearch;
