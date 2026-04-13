import { useState } from 'react';
import { Sparkles, Wand2, Loader2, RotateCcw, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AIStoryGeneratorProps {
  onImageGenerated: (file: File) => void;
}

const TEMPLATES = [
  { id: 'welcome', label: '👋 Bienvenue', description: 'Rejoins la communauté' },
  { id: 'swipe', label: '💘 Swipe', description: 'Swipe & Match' },
  { id: 'chat', label: '💬 Chat régional', description: 'Discute avec ta région' },
  { id: 'stories', label: '📸 Stories', description: 'Partage ta Story' },
  { id: 'security', label: '🛡️ Sécurité', description: 'Profils vérifiés' },
  { id: 'credits', label: '💰 Crédits', description: 'Gagne des crédits' },
];

const AIStoryGenerator = ({ onImageGenerated }: AIStoryGeneratorProps) => {
  const [mode, setMode] = useState<'templates' | 'custom'>('templates');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [generatedFile, setGeneratedFile] = useState<File | null>(null);

  const generate = async () => {
    setIsGenerating(true);
    setPreviewUrl(null);

    try {
      const body: Record<string, string> = {};
      if (mode === 'templates' && selectedTemplate) {
        body.template_id = selectedTemplate;
      } else if (mode === 'custom' && customPrompt.trim()) {
        body.prompt = customPrompt.trim();
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

      // Convert base64 to File
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      const file = new File([blob], `ai-story-${Date.now()}.png`, { type: 'image/png' });

      setPreviewUrl(imageUrl);
      setGeneratedFile(file);
      toast.success('Image générée avec succès !');
    } catch (err: any) {
      console.error('AI generation error:', err);
      toast.error(err.message || 'Erreur lors de la génération');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleConfirm = () => {
    if (generatedFile) {
      onImageGenerated(generatedFile);
    }
  };

  const handleRetry = () => {
    setPreviewUrl(null);
    setGeneratedFile(null);
  };

  if (previewUrl) {
    return (
      <div className="space-y-3">
        <div className="relative rounded-2xl overflow-hidden bg-black">
          <img src={previewUrl} alt="AI Generated" className="w-full max-h-[50vh] object-contain" />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRetry} className="flex-1 gap-2">
            <RotateCcw className="w-4 h-4" />
            Régénérer
          </Button>
          <Button onClick={handleConfirm} className="flex-1 gap-2">
            <Check className="w-4 h-4" />
            Utiliser
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium text-primary">
        <Sparkles className="w-4 h-4" />
        Génération IA — Promo Gay Social
      </div>

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

      {mode === 'templates' ? (
        <div className="grid grid-cols-2 gap-2">
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
          placeholder="Décris l'image promo que tu veux créer...&#10;Ex: Une image festive avec des confettis arc-en-ciel et le texte 'Rejoins-nous !'"
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
            Générer l'image
          </>
        )}
      </Button>
    </div>
  );
};

export default AIStoryGenerator;
