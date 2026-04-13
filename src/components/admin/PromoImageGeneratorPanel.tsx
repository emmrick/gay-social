import { useState } from 'react';
import { Sparkles, Wand2, Loader2, RotateCcw, Download, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const TEMPLATES = [
  { id: 'welcome', label: '👋 Bienvenue', description: 'Rejoins la communauté', emoji: '👋' },
  { id: 'swipe', label: '💘 Swipe & Match', description: 'Trouve ton match', emoji: '💘' },
  { id: 'chat', label: '💬 Chat régional', description: 'Discute par région', emoji: '💬' },
  { id: 'stories', label: '📸 Stories', description: 'Partage ta Story', emoji: '📸' },
  { id: 'security', label: '🛡️ Sécurité', description: 'Profils vérifiés', emoji: '🛡️' },
  { id: 'credits', label: '💰 Crédits', description: 'Gagne des crédits', emoji: '💰' },
];

const FORMATS = [
  { id: 'story', label: 'Story (9:16)', width: 1080, height: 1920 },
  { id: 'post', label: 'Post (1:1)', width: 1080, height: 1080 },
  { id: 'banner', label: 'Bannière (16:9)', width: 1920, height: 1080 },
];

const PromoImageGeneratorPanel = () => {
  const [mode, setMode] = useState<'templates' | 'custom'>('templates');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [selectedFormat, setSelectedFormat] = useState('story');
  const [customPrompt, setCustomPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<{ url: string; name: string }[]>([]);

  const getFormatInstruction = () => {
    const f = FORMATS.find(f => f.id === selectedFormat);
    if (!f) return '';
    if (f.id === 'story') return '9:16 mobile story format';
    if (f.id === 'post') return '1:1 square Instagram post format';
    return '16:9 wide banner format';
  };

  const generate = async () => {
    setIsGenerating(true);
    try {
      const body: Record<string, string> = {};
      if (mode === 'templates' && selectedTemplate) {
        body.template_id = selectedTemplate;
        body.format_hint = getFormatInstruction();
      } else if (mode === 'custom' && customPrompt.trim()) {
        body.prompt = `${customPrompt.trim()}. Format: ${getFormatInstruction()}`;
      } else {
        toast.error('Choisis un template ou écris un prompt');
        setIsGenerating(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('generate-story-image', { body });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const imageUrl = data.image_url;
      if (!imageUrl) throw new Error('Aucune image générée');

      const formatLabel = FORMATS.find(f => f.id === selectedFormat)?.label || 'Story';
      const name = `GaySocial-Promo-${formatLabel}-${Date.now()}.png`;
      
      setGeneratedImages(prev => [{ url: imageUrl, name }, ...prev]);
      toast.success('Image promo générée !');
    } catch (err: any) {
      console.error('AI generation error:', err);
      toast.error(err.message || 'Erreur lors de la génération');
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadImage = async (url: string, name: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = name;
      a.click();
      URL.revokeObjectURL(a.href);
      toast.success('Image téléchargée !');
    } catch {
      toast.error('Erreur lors du téléchargement');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          Générateur d'images promo
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Crée des visuels promotionnels pour partager sur les réseaux sociaux et attirer du monde
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Créer un visuel</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Mode toggle */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setMode('templates')}
              className={`p-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                mode === 'templates' ? 'border-primary bg-primary/10 text-primary' : 'border-border'
              }`}
            >
              🎨 Templates
            </button>
            <button
              onClick={() => setMode('custom')}
              className={`p-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                mode === 'custom' ? 'border-primary bg-primary/10 text-primary' : 'border-border'
              }`}
            >
              ✏️ Prompt libre
            </button>
          </div>

          {/* Format selector */}
          <div>
            <p className="text-sm font-medium mb-2">Format</p>
            <div className="grid grid-cols-3 gap-2">
              {FORMATS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setSelectedFormat(f.id)}
                  className={`p-2 rounded-lg border-2 text-xs font-medium text-center transition-all ${
                    selectedFormat === f.id ? 'border-primary bg-primary/10 text-primary' : 'border-border'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {mode === 'templates' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTemplate(t.id)}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${
                    selectedTemplate === t.id
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/30'
                  }`}
                >
                  <p className="text-sm font-medium">{t.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>
                </button>
              ))}
            </div>
          ) : (
            <Textarea
              placeholder={"Décris le visuel promo que tu veux créer...\nEx: Une image festive avec le drapeau arc-en-ciel et le texte 'Rejoins GaySocial !'"}
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              className="resize-none h-28"
              maxLength={500}
            />
          )}

          <Button
            onClick={generate}
            disabled={isGenerating || (mode === 'templates' && !selectedTemplate) || (mode === 'custom' && !customPrompt.trim())}
            className="w-full h-12 rounded-xl font-semibold gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Génération en cours...
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4" />
                Générer le visuel
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Generated images gallery */}
      {generatedImages.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              Visuels générés ({generatedImages.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {generatedImages.map((img, i) => (
                <div key={i} className="group relative rounded-xl overflow-hidden border border-border bg-muted/30">
                  <img
                    src={img.url}
                    alt={img.name}
                    className="w-full aspect-[9/16] object-cover"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-end justify-center pb-4 opacity-0 group-hover:opacity-100">
                    <Button
                      size="sm"
                      onClick={() => downloadImage(img.url, img.name)}
                      className="gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Télécharger
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PromoImageGeneratorPanel;
