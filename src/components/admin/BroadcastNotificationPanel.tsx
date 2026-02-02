import { useState } from 'react';
import { Bell, Send, Users, Globe, Loader2, CheckCircle, History, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useBroadcastHistory } from '@/hooks/useBroadcastHistory';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const REGIONS = [
  { code: 'FR-IDF', name: 'Île-de-France' },
  { code: 'FR-PAC', name: "Provence-Alpes-Côte d'Azur" },
  { code: 'FR-ARA', name: 'Auvergne-Rhône-Alpes' },
  { code: 'FR-OCC', name: 'Occitanie' },
  { code: 'FR-NAQ', name: 'Nouvelle-Aquitaine' },
  { code: 'FR-BRE', name: 'Bretagne' },
  { code: 'FR-NOR', name: 'Normandie' },
  { code: 'FR-HDF', name: 'Hauts-de-France' },
  { code: 'FR-GES', name: 'Grand Est' },
  { code: 'FR-PDL', name: 'Pays de la Loire' },
  { code: 'FR-CVL', name: 'Centre-Val de Loire' },
  { code: 'FR-BFC', name: 'Bourgogne-Franche-Comté' },
  { code: 'FR-COR', name: 'Corse' },
  { code: 'BE', name: 'Belgique' },
  { code: 'CH', name: 'Suisse' },
  { code: 'LU', name: 'Luxembourg' },
  { code: 'CA-QC', name: 'Québec' },
  { code: 'OTHER', name: 'Autre' },
];

type TargetType = 'all' | 'region' | 'premium';

const getTargetLabel = (targetType: string, targetRegion: string | null) => {
  if (targetType === 'all') return 'Tous';
  if (targetType === 'premium') return 'Premium';
  if (targetType === 'region' && targetRegion) {
    const region = REGIONS.find(r => r.code === targetRegion);
    return region?.name || targetRegion;
  }
  return targetType;
};

const BroadcastNotificationPanel = () => {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [url, setUrl] = useState('/');
  const [targetType, setTargetType] = useState<TargetType>('all');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [lastResult, setLastResult] = useState<{ sent: number; failed: number } | null>(null);
  
  const queryClient = useQueryClient();
  const { data: history = [], isLoading: isLoadingHistory } = useBroadcastHistory();

  const handleSend = async () => {
    if (!title.trim()) {
      toast.error('Le titre est requis');
      return;
    }

    if (targetType === 'region' && !selectedRegion) {
      toast.error('Veuillez sélectionner une région');
      return;
    }

    setIsSending(true);
    setLastResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('broadcast-notification', {
        body: {
          title: title.trim(),
          body: body.trim(),
          url: url.trim() || '/',
          targetType,
          region: targetType === 'region' ? selectedRegion : undefined,
        },
      });

      if (error) throw error;

      setLastResult({
        sent: data.successCount || 0,
        failed: data.failedCount || 0,
      });

      toast.success(`Notifications envoyées: ${data.successCount} réussies, ${data.failedCount} échouées`);
      
      // Refresh history
      queryClient.invalidateQueries({ queryKey: ['broadcast-history'] });
      
      // Reset form
      setTitle('');
      setBody('');
      setUrl('/');
    } catch (error) {
      console.error('Error broadcasting notification:', error);
      toast.error('Erreur lors de l\'envoi des notifications');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Bell className="w-5 h-5" />
        <h2 className="text-lg font-semibold">Diffusion de notifications</h2>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nouvelle notification</CardTitle>
            <CardDescription>
              Envoyez une notification push à tous les utilisateurs ou un groupe spécifique
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Titre *</Label>
              <Input
                id="title"
                placeholder="Ex: 🎉 Nouvelle fonctionnalité !"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="body">Message</Label>
              <Textarea
                id="body"
                placeholder="Décrivez votre notification..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={200}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">{body.length}/200 caractères</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="url">URL de redirection</Label>
              <Input
                id="url"
                placeholder="/"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Page vers laquelle rediriger au clic</p>
            </div>

            <div className="space-y-3">
              <Label>Destinataires</Label>
              <RadioGroup value={targetType} onValueChange={(v) => setTargetType(v as TargetType)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="all" id="all" />
                  <Label htmlFor="all" className="flex items-center gap-2 cursor-pointer">
                    <Globe className="w-4 h-4" />
                    Tous les utilisateurs
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="premium" id="premium" />
                  <Label htmlFor="premium" className="flex items-center gap-2 cursor-pointer">
                    <Users className="w-4 h-4 text-amber-500" />
                    Utilisateurs Premium uniquement
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="region" id="region" />
                  <Label htmlFor="region" className="flex items-center gap-2 cursor-pointer">
                    <Users className="w-4 h-4" />
                    Par région
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {targetType === 'region' && (
              <div className="space-y-2">
                <Label>Région</Label>
                <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une région" />
                  </SelectTrigger>
                  <SelectContent>
                    {REGIONS.map((region) => (
                      <SelectItem key={region.code} value={region.code}>
                        {region.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button 
              onClick={handleSend} 
              disabled={isSending || !title.trim()}
              className="w-full"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Envoyer la notification
                </>
              )}
            </Button>

            {lastResult && (
              <div className="flex items-center gap-3 p-3 rounded-lg border border-green-500/50 bg-green-500/5">
                <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm">Envoi terminé</p>
                  <p className="text-xs text-muted-foreground">
                    {lastResult.sent} envoyées, {lastResult.failed} échouées
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* History */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <History className="w-4 h-4" />
              Historique des envois
            </CardTitle>
            <CardDescription>
              Les 50 dernières notifications envoyées
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] pr-4">
              {isLoadingHistory ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : history.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Aucune notification envoyée</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {history.map((item) => (
                    <div 
                      key={item.id} 
                      className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{item.title}</p>
                          {item.body && (
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                              {item.body}
                            </p>
                          )}
                        </div>
                        <Badge variant="outline" className="flex-shrink-0 text-xs">
                          {getTargetLabel(item.target_type, item.target_region)}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {format(new Date(item.created_at), 'dd MMM yyyy HH:mm', { locale: fr })}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-green-500">{item.success_count} ✓</span>
                          {item.failed_count > 0 && (
                            <span className="text-red-500">{item.failed_count} ✗</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BroadcastNotificationPanel;
