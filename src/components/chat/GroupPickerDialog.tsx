import { useState } from 'react';
import { useChatRooms } from '@/hooks/useChatRooms';
import { useOnlineMemberCounts } from '@/hooks/useOnlineMemberCounts';
import { useJoinedGroups } from '@/hooks/useJoinedGroups';
import { Search, X, MapPin, Users, Check, Loader2, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface GroupPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGroupJoined: (regionCode: string) => void;
}

const GroupPickerDialog = ({ open, onOpenChange, onGroupJoined }: GroupPickerDialogProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const { data: rooms, isLoading } = useChatRooms();
  const { data: onlineCounts } = useOnlineMemberCounts();
  const { joinGroup, isJoined, canJoinMore, remainingSlots, maxGroups } = useJoinedGroups();

  const filteredRegions = rooms?.filter(room =>
    room.region_code.includes(searchQuery) ||
    room.region_name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const handleJoinGroup = (regionCode: string, regionName: string) => {
    if (!canJoinMore && !isJoined(regionCode)) {
      toast.error(`Tu es limité à ${maxGroups} groupes !`, {
        description: 'Quitte un groupe pour en rejoindre un autre.',
      });
      return;
    }

    const success = joinGroup(regionCode, regionName);
    if (success) {
      toast.success(`Groupe ${regionName} rejoint !`);
      onGroupJoined(regionCode);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            Rejoindre un groupe
          </DialogTitle>
          <DialogDescription>
            Choisis un groupe régional à rejoindre
          </DialogDescription>
        </DialogHeader>

        {/* Limit warning */}
        {!canJoinMore && (
          <div className="mx-6 mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-destructive">Limite atteinte</p>
              <p className="text-muted-foreground text-xs mt-0.5">
                Tu es limité à {maxGroups} groupes. Quitte un groupe pour en rejoindre un autre.
              </p>
            </div>
          </div>
        )}

        {/* Remaining slots */}
        {canJoinMore && (
          <div className="mx-6 mb-4 text-sm text-muted-foreground">
            {remainingSlots} place{remainingSlots > 1 ? 's' : ''} restante{remainingSlots > 1 ? 's' : ''} sur {maxGroups}
          </div>
        )}

        {/* Search */}
        <div className="px-6 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Rechercher par code ou nom..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10 h-10 bg-secondary/50 border-border/50 rounded-xl"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>

        {/* Regions list */}
        <ScrollArea className="flex-1 max-h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : filteredRegions.length === 0 ? (
            <div className="text-center py-12 px-6">
              <MapPin className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">Aucune région trouvée</p>
            </div>
          ) : (
            <div className="px-4 pb-6 space-y-1">
              {filteredRegions.map((room) => {
                const onlineCount = onlineCounts?.[room.region_code] || 0;
                const joined = isJoined(room.region_code);

                return (
                  <button
                    key={room.id}
                    onClick={() => handleJoinGroup(room.region_code, room.region_name)}
                    disabled={joined}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 text-left",
                      "hover:bg-secondary",
                      joined && "bg-primary/10 cursor-default"
                    )}
                  >
                    {/* Region code */}
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs",
                      joined
                        ? "bg-primary text-primary-foreground"
                        : "bg-gradient-to-br from-primary/80 to-accent/80 text-white"
                    )}>
                      {room.region_code}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-foreground truncate text-sm">
                        {room.region_name}
                      </h3>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Users className="w-3 h-3" />
                        <span>
                          {onlineCount > 0 ? (
                            <span className="text-green-500">{onlineCount} en ligne</span>
                          ) : (
                            'Aucun en ligne'
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Status */}
                    {joined ? (
                      <div className="flex items-center gap-1 text-primary text-xs font-medium">
                        <Check className="w-4 h-4" />
                        Rejoint
                      </div>
                    ) : (
                      <Button size="sm" variant="secondary" className="h-7 text-xs">
                        Rejoindre
                      </Button>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default GroupPickerDialog;
