import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CalendarDays, MapPin, Plus, Check, HelpCircle, X, Trash2, Users, Loader2 } from 'lucide-react';
import { useGroupEvents } from '@/hooks/useGroupEvents';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface GroupEventsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomId: string;
}

const GroupEventsSheet = ({ open, onOpenChange, roomId }: GroupEventsSheetProps) => {
  const { user } = useAuth();
  const { events, createEvent, rsvpEvent, deleteEvent, getUserRsvp } = useGroupEvents(roomId);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [location, setLocation] = useState('');

  const handleCreate = () => {
    if (!title.trim() || !eventDate) return;
    createEvent.mutate(
      { title: title.trim(), description: description.trim(), eventDate, location: location.trim() },
      { onSuccess: () => { setShowForm(false); setTitle(''); setDescription(''); setEventDate(''); setLocation(''); } }
    );
  };

  const handleRsvp = (eventId: string, status: 'going' | 'maybe' | 'not_going') => {
    rsvpEvent.mutate({ eventId, status });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0">
        <SheetHeader className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-primary" />
              Événements
            </SheetTitle>
            <Button size="sm" onClick={() => setShowForm(!showForm)}>
              {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            </Button>
          </div>
        </SheetHeader>

        <div className="p-4 space-y-4 overflow-y-auto max-h-[calc(100vh-5rem)]">
          {/* Create form */}
          {showForm && (
            <div className="p-4 rounded-xl bg-secondary/50 border border-border space-y-3">
              <Input placeholder="Titre de l'événement *" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} />
              <Textarea placeholder="Description..." value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="resize-none" />
              <Input type="datetime-local" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Lieu (optionnel)" value={location} onChange={(e) => setLocation(e.target.value)} className="pl-10" />
              </div>
              <Button className="w-full" disabled={!title.trim() || !eventDate || createEvent.isPending} onClick={handleCreate}>
                {createEvent.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                Créer l'événement
              </Button>
            </div>
          )}

          {/* Events list */}
          {events.length === 0 && !showForm ? (
            <div className="text-center py-12">
              <CalendarDays className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">Aucun événement prévu</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => setShowForm(true)}>
                <Plus className="w-4 h-4 mr-1" /> Créer un événement
              </Button>
            </div>
          ) : (
            events.map((event: any) => {
              const userRsvp = getUserRsvp(event.id);
              const isPast = new Date(event.event_date) < new Date();

              return (
                <div key={event.id} className={cn("p-4 rounded-xl border", isPast ? "bg-muted/50 border-border/50 opacity-60" : "bg-card border-border")}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-foreground">{event.title}</h3>
                    {event.created_by === user?.id && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => deleteEvent.mutate(event.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                  
                  {event.description && <p className="text-sm text-muted-foreground mb-2">{event.description}</p>}
                  
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                    <span className="flex items-center gap-1">
                      <CalendarDays className="w-3.5 h-3.5" />
                      {format(new Date(event.event_date), "d MMM yyyy 'à' HH:mm", { locale: fr })}
                    </span>
                    {event.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {event.location}
                      </span>
                    )}
                  </div>

                  {/* RSVP counts */}
                  <div className="flex items-center gap-3 text-xs mb-3">
                    <span className="flex items-center gap-1 text-green-500">
                      <Check className="w-3 h-3" /> {event.goingCount} présent{event.goingCount > 1 ? 's' : ''}
                    </span>
                    <span className="flex items-center gap-1 text-amber-500">
                      <HelpCircle className="w-3 h-3" /> {event.maybeCount} peut-être
                    </span>
                  </div>

                  {/* RSVP buttons */}
                  {!isPast && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={userRsvp === 'going' ? 'default' : 'outline'}
                        className={cn("flex-1 text-xs h-8", userRsvp === 'going' && "bg-green-600 hover:bg-green-700")}
                        onClick={() => handleRsvp(event.id, 'going')}
                      >
                        <Check className="w-3 h-3 mr-1" /> Présent
                      </Button>
                      <Button
                        size="sm"
                        variant={userRsvp === 'maybe' ? 'default' : 'outline'}
                        className={cn("flex-1 text-xs h-8", userRsvp === 'maybe' && "bg-amber-600 hover:bg-amber-700")}
                        onClick={() => handleRsvp(event.id, 'maybe')}
                      >
                        <HelpCircle className="w-3 h-3 mr-1" /> Peut-être
                      </Button>
                      <Button
                        size="sm"
                        variant={userRsvp === 'not_going' ? 'default' : 'outline'}
                        className={cn("flex-1 text-xs h-8", userRsvp === 'not_going' && "bg-destructive hover:bg-destructive/90")}
                        onClick={() => handleRsvp(event.id, 'not_going')}
                      >
                        <X className="w-3 h-3 mr-1" /> Absent
                      </Button>
                    </div>
                  )}

                  <p className="text-[10px] text-muted-foreground mt-2">Par {event.creatorName}</p>
                </div>
              );
            })
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default GroupEventsSheet;
