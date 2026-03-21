import { useState, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Search, X, BookOpen, ChevronRight, Shield, CreditCard, Users, MessageCircle, Settings, Sparkles, HelpCircle, Bell, Wrench, Scale, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SEOHead from '@/components/seo/SEOHead';

const CATEGORY_META: Record<string, { icon: React.ReactNode; color: string; bg: string; description: string }> = {
  'Compte & Profil': { icon: <Users className="w-5 h-5" />, color: 'text-blue-500', bg: 'bg-blue-500/10', description: 'Inscription, profil, paramètres et gestion de votre compte.' },
  'Vérification': { icon: <Shield className="w-5 h-5" />, color: 'text-emerald-500', bg: 'bg-emerald-500/10', description: 'Vérification d\'identité, documents et processus.' },
  'Messagerie': { icon: <MessageCircle className="w-5 h-5" />, color: 'text-violet-500', bg: 'bg-violet-500/10', description: 'Chat, messages privés, groupes et médias éphémères.' },
  'Crédits & Paiements': { icon: <CreditCard className="w-5 h-5" />, color: 'text-amber-500', bg: 'bg-amber-500/10', description: 'Système de crédits, achats et transactions.' },
  'Fonctionnalités': { icon: <Sparkles className="w-5 h-5" />, color: 'text-pink-500', bg: 'bg-pink-500/10', description: 'Swipe, favoris, stories, albums et plus.' },
  'Sécurité': { icon: <Shield className="w-5 h-5" />, color: 'text-red-500', bg: 'bg-red-500/10', description: 'Protection, signalements, blocage et confidentialité.' },
  'Notifications': { icon: <Bell className="w-5 h-5" />, color: 'text-cyan-500', bg: 'bg-cyan-500/10', description: 'Paramètres de notifications push et in-app.' },
  'Technique': { icon: <Wrench className="w-5 h-5" />, color: 'text-muted-foreground', bg: 'bg-muted/50', description: 'Problèmes techniques, bugs et compatibilité.' },
};

const getIconForCategory = (cat: string) => {
  return CATEGORY_META[cat] || { icon: <BookOpen className="w-5 h-5" />, color: 'text-primary', bg: 'bg-primary/10', description: 'Articles d\'aide.' };
};

const normalize = (text: string) =>
  text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, '');

const HelpCenter = () => {
  const navigate = useNavigate();
  const { category } = useParams<{ category?: string }>();
  const [searchParams] = useSearchParams();
  const articleId = searchParams.get('article');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: articles = [], isLoading } = useQuery({
    queryKey: ['help-center-articles'],
    queryFn: async () => {
      const { data } = await supabase
        .from('faq_articles')
        .select('*')
        .eq('is_published', true)
        .order('display_order', { ascending: true });
      return data || [];
    },
  });

  const categories = useMemo(() => {
    const cats = new Map<string, number>();
    articles.forEach(a => cats.set(a.category, (cats.get(a.category) || 0) + 1));
    return Array.from(cats.entries()).map(([name, count]) => ({ name, count }));
  }, [articles]);

  const filteredArticles = useMemo(() => {
    let filtered = articles;
    if (category) {
      const decodedCat = decodeURIComponent(category);
      filtered = filtered.filter(a => a.category === decodedCat);
    }
    if (searchQuery.trim()) {
      const q = normalize(searchQuery);
      const words = q.split(/\s+/).filter(w => w.length > 2);
      filtered = filtered.filter(a => {
        const nq = normalize(a.question);
        const na = normalize(a.answer);
        return words.some(w => nq.includes(w) || na.includes(w));
      });
    }
    return filtered;
  }, [articles, category, searchQuery]);

  const selectedArticle = articleId ? articles.find(a => a.id === articleId) : null;
  const decodedCategory = category ? decodeURIComponent(category) : null;

  // Article detail view
  if (selectedArticle) {
    return (
      <>
        <SEOHead title={`${selectedArticle.question} - Aide Gay Social`} description={selectedArticle.answer.slice(0, 160)} />
        <div className="min-h-screen bg-background">
          <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
            <div className="container mx-auto px-4 py-4 flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">{selectedArticle.category}</p>
                <h1 className="font-display text-base font-bold truncate">{selectedArticle.question}</h1>
              </div>
            </div>
          </header>
          <div className="container mx-auto px-4 py-6 max-w-3xl">
            <div className="bg-card rounded-2xl border border-border p-6">
              <h2 className="font-display text-xl font-bold mb-4">{selectedArticle.question}</h2>
              <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground whitespace-pre-wrap">
                {selectedArticle.answer.split(/(\*\*[^*]+\*\*)/).map((part, i) => {
                  if (part.startsWith('**') && part.endsWith('**')) {
                    return <strong key={i} className="text-foreground font-semibold">{part.slice(2, -2)}</strong>;
                  }
                  return <span key={i}>{part}</span>;
                })}
              </div>
            </div>

            {/* Related articles in same category */}
            {(() => {
              const related = articles.filter(a => a.category === selectedArticle.category && a.id !== selectedArticle.id).slice(0, 5);
              if (related.length === 0) return null;
              return (
                <div className="mt-6">
                  <h3 className="font-semibold text-sm text-muted-foreground mb-3">Articles similaires</h3>
                  <div className="space-y-2">
                    {related.map(a => (
                      <button
                        key={a.id}
                        onClick={() => navigate(`/aide?article=${a.id}`)}
                        className="w-full flex items-center justify-between p-3 rounded-xl bg-card border border-border hover:bg-muted/50 transition-colors text-left"
                      >
                        <span className="text-sm">{a.question}</span>
                        <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Quick links */}
            <div className="mt-6 flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate('/regles')}>
                <Scale className="w-4 h-4 mr-1" /> Règles
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate('/legal')}>
                <Shield className="w-4 h-4 mr-1" /> Mentions légales
              </Button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Category articles list
  if (decodedCategory) {
    const meta = getIconForCategory(decodedCategory);
    return (
      <>
        <SEOHead title={`${decodedCategory} - Aide Gay Social`} description={meta.description} />
        <div className="min-h-screen bg-background">
          <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
            <div className="container mx-auto px-4 py-4 flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate('/aide')}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg ${meta.bg} flex items-center justify-center ${meta.color}`}>
                  {meta.icon}
                </div>
                <h1 className="font-display text-lg font-bold">{decodedCategory}</h1>
              </div>
            </div>
          </header>

          <div className="container mx-auto px-4 py-4 max-w-3xl">
            <p className="text-sm text-muted-foreground mb-4">{meta.description}</p>
            
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher dans cette catégorie..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-10 rounded-xl"
              />
              {searchQuery && (
                <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8" onClick={() => setSearchQuery('')}>
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>

            {filteredArticles.length === 0 ? (
              <div className="text-center py-12">
                <Search className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">Aucun article trouvé</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredArticles.map((article, i) => (
                  <motion.button
                    key={article.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    onClick={() => navigate(`/aide?article=${article.id}`)}
                    className="w-full flex items-center justify-between p-4 rounded-xl bg-card border border-border hover:bg-muted/50 transition-colors text-left"
                  >
                    <div className="min-w-0 pr-3">
                      <p className="font-medium text-sm">{article.question}</p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{article.answer.slice(0, 120)}...</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  </motion.button>
                ))}
              </div>
            )}
          </div>
        </div>
      </>
    );
  }

  // Hub view - all categories
  return (
    <>
      <SEOHead
        title="Centre d'aide - Gay Social"
        description="Trouvez des réponses à vos questions sur Gay Social. FAQ, règles, et assistance."
        canonical="https://gay-connect.fr/help-center"
      />
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
          <div className="container mx-auto px-4 py-4 flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-display text-xl font-bold">Centre d'aide</h1>
              <p className="text-xs text-muted-foreground">{articles.length} articles disponibles</p>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-4 max-w-3xl">
          {/* Global search */}
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Rechercher un article d'aide..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 pr-12 h-12 text-base rounded-2xl bg-card border-border"
            />
            {searchQuery && (
              <Button variant="ghost" size="icon" className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8" onClick={() => setSearchQuery('')}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* Search results */}
          {searchQuery.trim() ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground mb-3">{filteredArticles.length} résultat{filteredArticles.length !== 1 ? 's' : ''}</p>
              {filteredArticles.map(article => (
                <button
                  key={article.id}
                  onClick={() => navigate(`/aide?article=${article.id}`)}
                  className="w-full flex items-center justify-between p-4 rounded-xl bg-card border border-border hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="min-w-0 pr-3">
                    <p className="text-xs text-muted-foreground">{article.category}</p>
                    <p className="font-medium text-sm">{article.question}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                </button>
              ))}
            </div>
          ) : (
            <>
              {/* Quick links */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                <button
                  onClick={() => navigate('/guide')}
                  className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-primary/5 border border-primary/20 hover:bg-primary/10 transition-colors"
                >
                  <BookOpen className="w-5 h-5 text-primary" />
                  <div className="text-center">
                    <p className="font-semibold text-xs">Guide</p>
                    <p className="text-[10px] text-muted-foreground">Utilisation</p>
                  </div>
                </button>
                <button
                  onClick={() => navigate('/regles')}
                  className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-muted/50 border border-border hover:bg-muted transition-colors"
                >
                  <Heart className="w-5 h-5 text-pink-500" />
                  <div className="text-center">
                    <p className="font-semibold text-xs">Règles</p>
                    <p className="text-[10px] text-muted-foreground">Conduite</p>
                  </div>
                </button>
                <button
                  onClick={() => navigate('/legal')}
                  className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-muted/50 border border-border hover:bg-muted transition-colors"
                >
                  <Scale className="w-5 h-5 text-muted-foreground" />
                  <div className="text-center">
                    <p className="font-semibold text-xs">Légal</p>
                    <p className="text-[10px] text-muted-foreground">CGU, RGPD</p>
                  </div>
                </button>
              </div>

              {/* Categories grid */}
              <h2 className="font-semibold text-sm text-muted-foreground mb-3">Catégories</h2>
              <div className="space-y-3">
                {categories.map(({ name, count }, i) => {
                  const meta = getIconForCategory(name);
                  return (
                    <motion.button
                      key={name}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      onClick={() => navigate(`/aide/${encodeURIComponent(name)}`)}
                      className="w-full flex items-center gap-4 p-4 rounded-2xl bg-card border border-border hover:bg-muted/50 transition-colors text-left"
                    >
                      <div className={`w-10 h-10 rounded-xl ${meta.bg} flex items-center justify-center ${meta.color} flex-shrink-0`}>
                        {meta.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">{name}</p>
                        <p className="text-xs text-muted-foreground">{count} article{count > 1 ? 's' : ''}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    </motion.button>
                  );
                })}
              </div>

              {/* Contact support button */}
              <div className="mt-6 p-4 rounded-2xl bg-primary/5 border border-primary/20 text-center">
                <p className="text-sm text-muted-foreground mb-3">Vous ne trouvez pas la réponse ?</p>
                <Button onClick={() => navigate('/aide/chat')} className="gap-2">
                  <MessageCircle className="w-4 h-4" />
                  Contacter le support
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default HelpCenter;
