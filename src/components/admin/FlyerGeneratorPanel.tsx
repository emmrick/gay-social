import { useState, useRef, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Download, Printer, Palette, Type, Eye, RefreshCw, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface FlyerConfig {
  title: string;
  slogan: string;
  description: string;
  siteUrl: string;
  promoCode: string;
  bgColor: string;
  accentColor: string;
  textColor: string;
  showPromoCode: boolean;
}

const defaultConfig: FlyerConfig = {
  title: 'GayConnect',
  slogan: 'Connecte-toi. Rencontre. Vis.',
  description: 'La communauté gay francophone #1. Rejoins des milliers de membres près de chez toi !',
  siteUrl: 'https://gay-connect.lovable.app',
  promoCode: 'FLYER2025',
  bgColor: '#1a1025',
  accentColor: '#9b59b6',
  textColor: '#ffffff',
  showPromoCode: true,
};

const SingleFlyer = ({ config, index }: { config: FlyerConfig; index: number }) => {
  const promoCode = config.showPromoCode
    ? config.promoCode + (index > 0 ? `-${String(index).padStart(2, '0')}` : '')
    : '';

  const qrUrl = config.showPromoCode
    ? `${config.siteUrl}?promo=${promoCode}`
    : config.siteUrl;

  return (
    <div
      className="relative overflow-hidden flex flex-col items-center justify-between p-4"
      style={{
        backgroundColor: config.bgColor,
        color: config.textColor,
        width: '100%',
        height: '100%',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* Decorative accent circles */}
      <div
        className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-20"
        style={{ backgroundColor: config.accentColor }}
      />
      <div
        className="absolute -bottom-4 -left-4 w-16 h-16 rounded-full opacity-15"
        style={{ backgroundColor: config.accentColor }}
      />

      {/* Top: Title + Slogan */}
      <div className="text-center z-10 space-y-1">
        <h3
          className="font-extrabold text-lg leading-tight tracking-tight"
          style={{ color: config.accentColor }}
        >
          {config.title}
        </h3>
        <p className="text-[10px] font-medium opacity-90 italic">{config.slogan}</p>
      </div>

      {/* Middle: QR Code */}
      <div className="z-10 bg-white rounded-xl p-2 shadow-lg">
        <QRCodeSVG
          value={qrUrl}
          size={80}
          bgColor="#ffffff"
          fgColor={config.bgColor}
          level="M"
        />
      </div>

      {/* Bottom: Description + Promo */}
      <div className="text-center z-10 space-y-1.5">
        <p className="text-[8px] leading-tight opacity-80 max-w-[160px] mx-auto">
          {config.description}
        </p>
        {config.showPromoCode && promoCode && (
          <div
            className="inline-block px-3 py-1 rounded-full text-[9px] font-bold tracking-wider"
            style={{
              backgroundColor: config.accentColor,
              color: config.textColor,
            }}
          >
            CODE : {promoCode}
          </div>
        )}
        <p className="text-[7px] opacity-60">{config.siteUrl.replace('https://', '')}</p>
      </div>
    </div>
  );
};

const FlyerGeneratorPanel = () => {
  const { user } = useAuth();
  const [config, setConfig] = useState<FlyerConfig>(defaultConfig);
  const [isGenerating, setIsGenerating] = useState(false);
  const [codesCreated, setCodesCreated] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const updateConfig = useCallback((key: keyof FlyerConfig, value: string | boolean) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Save promo codes to database before PDF generation
  const savePromoCodesToDB = async () => {
    if (!config.showPromoCode || !user) return;

    const codes: string[] = [];
    for (let i = 1; i <= 6; i++) {
      codes.push(config.promoCode + `-${String(i).padStart(2, '0')}`);
    }

    // Insert codes that don't already exist
    for (const code of codes) {
      const { error } = await supabase
        .from('flyer_promo_codes')
        .upsert(
          { code: code.toUpperCase(), credits_amount: 30, max_uses: 1, created_by: user.id },
          { onConflict: 'code' }
        );
      if (error) {
        console.error('Error saving promo code:', code, error);
      }
    }

    setCodesCreated(true);
    toast.success(`${codes.length} codes promo créés en base (30 crédits chacun, usage unique)`);
  };

  const generatePDF = async () => {
    setIsGenerating(true);

    try {
      // Save promo codes to DB first
      if (config.showPromoCode) {
        await savePromoCodesToDB();
      }

      // A4 landscape: 297mm x 210mm → use fixed pixel dims for off-screen render
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pdfW = 297;
      const pdfH = 210;
      const cols = 3;
      const rows = 2;
      const cellW = pdfW / cols;
      const cellH = pdfH / rows;

      // Fixed pixel size per flyer for consistent rendering
      const flyerPxW = 400;
      const flyerPxH = 560;

      for (let i = 0; i < 6; i++) {
        // Create an off-screen container with fixed pixel dimensions
        const offscreen = document.createElement('div');
        offscreen.style.position = 'fixed';
        offscreen.style.left = '-9999px';
        offscreen.style.top = '0';
        offscreen.style.width = `${flyerPxW}px`;
        offscreen.style.height = `${flyerPxH}px`;
        offscreen.style.overflow = 'hidden';
        document.body.appendChild(offscreen);

        // Render the flyer into it using React
        const { createRoot } = await import('react-dom/client');
        const root = createRoot(offscreen);

        await new Promise<void>((resolve) => {
          root.render(
            <div style={{ width: flyerPxW, height: flyerPxH }}>
              <SingleFlyer config={config} index={i + 1} />
            </div>
          );
          // Wait for render
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        });

        const canvas = await html2canvas(offscreen, {
          scale: 3,
          useCORS: true,
          backgroundColor: null,
          logging: false,
          width: flyerPxW,
          height: flyerPxH,
        });

        const imgData = canvas.toDataURL('image/png');
        const col = i % cols;
        const row = Math.floor(i / cols);
        pdf.addImage(imgData, 'PNG', col * cellW, row * cellH, cellW, cellH);

        root.unmount();
        document.body.removeChild(offscreen);
      }

      pdf.save(`flyers-${config.title.toLowerCase().replace(/\s+/g, '-')}.pdf`);
      toast.success('PDF généré avec succès !');
    } catch (err) {
      console.error('PDF generation error:', err);
      toast.error('Erreur lors de la génération du PDF');
    } finally {
      setIsGenerating(false);
    }
  };

  const randomizePromoCodes = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'GC-';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    updateConfig('promoCode', code);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Printer className="w-5 h-5" />
          <h2 className="text-lg font-semibold">Générateur de flyers</h2>
        </div>
        <Button onClick={generatePDF} disabled={isGenerating} className="gap-2">
          <Download className="w-4 h-4" />
          {isGenerating ? 'Génération...' : 'Télécharger PDF'}
        </Button>
      </div>

      <Tabs defaultValue="edit" className="w-full">
        <TabsList className="grid grid-cols-2 w-full max-w-xs">
          <TabsTrigger value="edit" className="gap-1.5 text-xs">
            <Palette className="w-3.5 h-3.5" /> Personnaliser
          </TabsTrigger>
          <TabsTrigger value="preview" className="gap-1.5 text-xs">
            <Eye className="w-3.5 h-3.5" /> Aperçu
          </TabsTrigger>
        </TabsList>

        {/* Edit Tab */}
        <TabsContent value="edit" className="mt-4">
          <ScrollArea className="h-[calc(100dvh-280px)]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pr-2">
              {/* Textes */}
              <Card className="p-4 space-y-4">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Type className="w-4 h-4" /> Textes
                </h3>
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">Titre</Label>
                    <Input
                      value={config.title}
                      onChange={(e) => updateConfig('title', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Slogan</Label>
                    <Input
                      value={config.slogan}
                      onChange={(e) => updateConfig('slogan', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Description</Label>
                    <Textarea
                      value={config.description}
                      onChange={(e) => updateConfig('description', e.target.value)}
                      className="mt-1 min-h-[60px]"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">URL du site</Label>
                    <Input
                      value={config.siteUrl}
                      onChange={(e) => updateConfig('siteUrl', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
              </Card>

              {/* Couleurs */}
              <Card className="p-4 space-y-4">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Palette className="w-4 h-4" /> Couleurs & Code promo
                </h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs">Fond</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="color"
                          value={config.bgColor}
                          onChange={(e) => updateConfig('bgColor', e.target.value)}
                          className="w-8 h-8 rounded cursor-pointer border-0"
                        />
                        <Input
                          value={config.bgColor}
                          onChange={(e) => updateConfig('bgColor', e.target.value)}
                          className="text-xs flex-1"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">Accent</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="color"
                          value={config.accentColor}
                          onChange={(e) => updateConfig('accentColor', e.target.value)}
                          className="w-8 h-8 rounded cursor-pointer border-0"
                        />
                        <Input
                          value={config.accentColor}
                          onChange={(e) => updateConfig('accentColor', e.target.value)}
                          className="text-xs flex-1"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">Texte</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="color"
                          value={config.textColor}
                          onChange={(e) => updateConfig('textColor', e.target.value)}
                          className="w-8 h-8 rounded cursor-pointer border-0"
                        />
                        <Input
                          value={config.textColor}
                          onChange={(e) => updateConfig('textColor', e.target.value)}
                          className="text-xs flex-1"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.showPromoCode}
                        onChange={(e) => updateConfig('showPromoCode', e.target.checked)}
                        className="rounded"
                      />
                      Afficher code promo
                    </label>
                  </div>

                  {config.showPromoCode && (
                    <div>
                      <Label className="text-xs">Code promo de base</Label>
                      <div className="flex gap-2 mt-1">
                        <Input
                          value={config.promoCode}
                          onChange={(e) => updateConfig('promoCode', e.target.value.toUpperCase())}
                          className="flex-1"
                          placeholder="FLYER2025"
                        />
                        <Button variant="outline" size="icon" onClick={randomizePromoCodes} title="Générer un code aléatoire">
                          <RefreshCw className="w-4 h-4" />
                        </Button>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Chaque flyer aura un suffixe unique (ex: {config.promoCode}-01, {config.promoCode}-02…)
                      </p>
                      <Badge variant="outline" className="mt-2 text-[10px] gap-1">
                        <Database className="w-3 h-3" />
                        30 crédits offerts • 1 usage par utilisateur
                      </Badge>
                    </div>
                  )}
                </div>
              </Card>

              {/* Single preview */}
              <Card className="p-4 md:col-span-2">
                <h3 className="font-semibold text-sm mb-3">Aperçu d'un flyer</h3>
                <div className="flex justify-center">
                  <div className="w-[200px] h-[280px] rounded-xl overflow-hidden shadow-xl border border-border">
                    <SingleFlyer config={config} index={1} />
                  </div>
                </div>
              </Card>
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Preview Tab - Full A4 landscape with 6 flyers */}
        <TabsContent value="preview" className="mt-4">
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Aperçu de la feuille A4 paysage avec 6 flyers (3 colonnes × 2 lignes). Le PDF sera généré à haute résolution.
            </p>

            <div className="flex justify-center">
              <div
                className="border border-border rounded-lg shadow-lg overflow-hidden bg-white"
                style={{ width: '100%', maxWidth: '842px', aspectRatio: '297 / 210' }}
              >
                {/* This is the printable area */}
                <div
                  ref={printRef}
                  className="w-full h-full grid grid-cols-3 grid-rows-2"
                  style={{ aspectRatio: '297 / 210' }}
                >
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} data-flyer className="border border-gray-200" style={{ overflow: 'hidden' }}>
                      <SingleFlyer config={config} index={i + 1} />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-center">
              <Button onClick={generatePDF} disabled={isGenerating} size="lg" className="gap-2">
                <Download className="w-5 h-5" />
                {isGenerating ? 'Génération en cours...' : 'Télécharger le PDF'}
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FlyerGeneratorPanel;
