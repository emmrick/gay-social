import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useCustomGroups } from '@/hooks/useCustomGroups';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, X, Check, Users, Loader2, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CreateGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGroupCreated?: (groupId: string) => void;
}

interface SearchProfile {
  user_id: string;
  username: string;
  avatar_url: string | null;
  is_online: boolean;
}

const CreateGroupDialog = ({ open, onOpenChange, onGroupCreated }: CreateGroupDialogProps) => {
  const { user } = useAuth();
  const { createGroup } = useCustomGroups();
  const [step, setStep] = useState<'info' | 'members'>('info');
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchProfile[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<SearchProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setStep('info');
      setGroupName('');
      setGroupDescription('');
      setSearchQuery('');
      setSearchResults([]);
      setSelectedMembers([]);
    }
  }, [open]);

  // Search users
  useEffect(() => {
    const searchUsers = async () => {
      if (searchQuery.length < 2) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      const { data } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url, is_online')
        .ilike('username', `%${searchQuery}%`)
        .neq('user_id', user?.id || '')
        .limit(20);

      setSearchResults(data || []);
      setIsSearching(false);
    };

    const debounce = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, user?.id]);

  const toggleMember = (profile: SearchProfile) => {
    setSelectedMembers(prev => {
      const exists = prev.find(m => m.user_id === profile.user_id);
      if (exists) return prev.filter(m => m.user_id !== profile.user_id);
      return [...prev, profile];
    });
  };

  const handleCreate = async () => {
    if (!groupName.trim() || selectedMembers.length === 0) return;

    createGroup.mutate(
      {
        name: groupName.trim(),
        description: groupDescription.trim() || undefined,
        memberIds: selectedMembers.map(m => m.user_id),
      },
      {
        onSuccess: (room) => {
          onOpenChange(false);
          onGroupCreated?.(room.id);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            {step === 'info' ? 'Créer un groupe' : 'Ajouter des membres'}
          </DialogTitle>
          <DialogDescription>
            {step === 'info'
              ? 'Choisis un nom pour ton groupe privé'
              : `${selectedMembers.length} membre${selectedMembers.length > 1 ? 's' : ''} sélectionné${selectedMembers.length > 1 ? 's' : ''}`}
          </DialogDescription>
        </DialogHeader>

        {step === 'info' ? (
          <div className="px-6 pb-6 space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">
                Nom du groupe *
              </label>
              <Input
                placeholder="Ex: Les copains, Soirée Paris..."
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                maxLength={50}
                className="bg-secondary/50"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">
                Description (optionnel)
              </label>
              <Textarea
                placeholder="Décris ton groupe..."
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
                maxLength={200}
                rows={3}
                className="bg-secondary/50 resize-none"
              />
            </div>
            <Button
              className="w-full"
              disabled={!groupName.trim()}
              onClick={() => setStep('members')}
            >
              Suivant — Ajouter des membres
            </Button>
          </div>
        ) : (
          <div className="flex flex-col flex-1 min-h-0">
            {/* Selected members chips */}
            {selectedMembers.length > 0 && (
              <div className="px-6 pb-3 flex flex-wrap gap-2">
                {selectedMembers.map((member) => (
                  <button
                    key={member.user_id}
                    onClick={() => toggleMember(member)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/30 text-sm text-primary hover:bg-primary/20 transition-colors"
                  >
                    <span>{member.username}</span>
                    <X className="w-3 h-3" />
                  </button>
                ))}
              </div>
            )}

            {/* Search */}
            <div className="px-6 pb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un membre..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-secondary/50"
                />
              </div>
            </div>

            {/* Results */}
            <ScrollArea className="flex-1 max-h-[300px]">
              <div className="px-4 pb-4 space-y-1">
                {isSearching ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  </div>
                ) : searchQuery.length < 2 ? (
                  <p className="text-center text-sm text-muted-foreground py-8">
                    Tape au moins 2 caractères pour rechercher
                  </p>
                ) : searchResults.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-8">
                    Aucun membre trouvé
                  </p>
                ) : (
                  searchResults.map((profile) => {
                    const isSelected = selectedMembers.some(m => m.user_id === profile.user_id);
                    return (
                      <button
                        key={profile.user_id}
                        onClick={() => toggleMember(profile)}
                        className={cn(
                          "w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left",
                          "hover:bg-secondary",
                          isSelected && "bg-primary/10 border border-primary/20"
                        )}
                      >
                        <div className="relative flex-shrink-0">
                          <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                            {profile.avatar_url ? (
                              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-white font-bold text-sm">
                                {profile.username.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          {profile.is_online && (
                            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                          )}
                        </div>
                        <div className="flex-1">
                          <span className="font-medium text-foreground text-sm">{profile.username}</span>
                        </div>
                        {isSelected ? (
                          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                            <Check className="w-4 h-4 text-primary-foreground" />
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded-full border-2 border-border" />
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </ScrollArea>

            {/* Actions */}
            <div className="px-6 py-4 border-t border-border flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setStep('info')}
              >
                Retour
              </Button>
              <Button
                className="flex-1"
                disabled={selectedMembers.length === 0 || createGroup.isPending}
                onClick={handleCreate}
              >
                {createGroup.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                Créer ({selectedMembers.length})
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CreateGroupDialog;
