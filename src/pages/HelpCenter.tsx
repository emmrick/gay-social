import { useState, useMemo, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Search, X, BookOpen, ChevronRight, Shield, CreditCard, Users, MessageCircle, Settings, Sparkles, HelpCircle, Bell, Wrench, Scale, Heart, ThumbsUp, ThumbsDown, Send, Loader2, Home, Zap, Eye, Camera, Lock, Flag, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SEOHead from '@/components/seo/SEOHead';
import { STATIC_KNOWLEDGE } from '@/lib/helpChatbotEngine';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const CATEGORY_META: Record<string, { icon: React.ReactNode; color: string; bg: string; description: string }> = {
  'Général': { icon: <HelpCircle className="w-5 h-5" />, color: 'text-primary', bg: 'bg-primary/10', description: 'Informations générales sur Gay Social.' },
  'Accueil': { icon: <Home className="w-5 h-5" />, color: 'text-blue-500', bg: 'bg-blue-500/10', description: 'Page d\'accueil, proximité, favoris, visites et réactions.' },
  'Tween': { icon: <Zap className="w-5 h-5" />, color: 'text-orange-500', bg: 'bg-orange-500/10', description: 'Fil d\'actualité, publications, sondages et interactions.' },
  'Swipe': { icon: <Heart className="w-5 h-5" />, color: 'text-pink-500', bg: 'bg-pink-500/10', description: 'Découvrir des profils, likes et matchs.' },
  'Compte & Profil': { icon: <Users className="w-5 h-5" />, color: 'text-blue-500', bg: 'bg-blue-500/10', description: 'Inscription, profil, albums, paramètres et gestion de votre compte.' },
  'Vérification': { icon: <Shield className="w-5 h-5" />, color: 'text-emerald-500', bg: 'bg-emerald-500/10', description: 'Vérification d\'identité, documents et processus.' },
  'Messagerie': { icon: <MessageCircle className="w-5 h-5" />, color: 'text-violet-500', bg: 'bg-violet-500/10', description: 'Messages privés, groupes départementaux, archives et médias.' },
  'Crédits & Paiements': { icon: <CreditCard className="w-5 h-5" />, color: 'text-amber-500', bg: 'bg-amber-500/10', description: 'Système de crédits, achats et transactions.' },
  'Fonctionnalités': { icon: <Sparkles className="w-5 h-5" />, color: 'text-pink-500', bg: 'bg-pink-500/10', description: 'ChatBot, premium, et plus.' },
  'Sécurité': { icon: <Lock className="w-5 h-5" />, color: 'text-red-500', bg: 'bg-red-500/10', description: 'Code PIN, empreinte, protection, signalements et confidentialité.' },
  'Publicités': { icon: <Eye className="w-5 h-5" />, color: 'text-yellow-600', bg: 'bg-yellow-500/10', description: 'Publicités, abonnement sans pub et annonces.' },
  'Modération': { icon: <Flag className="w-5 h-5" />, color: 'text-red-600', bg: 'bg-red-500/10', description: 'Signalements, sanctions, vérification des photos et règles.' },
  'Notifications': { icon: <Bell className="w-5 h-5" />, color: 'text-cyan-500', bg: 'bg-cyan-500/10', description: 'Paramètres de notifications push et in-app.' },
  'Technique': { icon: <Wrench className="w-5 h-5" />, color: 'text-muted-foreground', bg: 'bg-muted/50', description: 'Problèmes techniques, bugs et compatibilité.' },
};

const getIconForCategory = (cat: string) => {
  return CATEGORY_META[cat] || { icon: <BookOpen className="w-5 h-5" />, color: 'text-primary', bg: 'bg-primary/10', description: 'Articles d\'aide.' };
};

const normalizeSearch = (text: string) =>
  text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, '');

const BoldRenderer = ({ text }: { text: string }) => {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} className="text-foreground font-semibold">{part.slice(2, -2)}</strong>;
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
};

// ─── Feedback Component ──────────────────────────────────────────────
const ArticleFeedback = ({ articleId, isStatic }: { articleId: string; isStatic: boolean }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showComment, setShowComment] = useState(false);
  const [comment, setComment] = useState('');

  const feedbackKey = isStatic ? 'static_article_id' : 'article_id';

  const { data: existingFeedback } = useQuery({
    queryKey: ['faq-feedback', articleId, user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const query = supabase
        .from('faq_feedback')
        .select('*')
        .eq('user_id', user.id);
      
      if (isStatic) {
        query.eq('static_article_id', articleId);
      } else {
        query.eq('article_id', articleId);
      }
      
      const { data } = await query.maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  const voteMutation = useMutation({
    mutationFn: async ({ vote, commentText }: { vote: 'up' | 'down'; commentText?: string }) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const payload: any = {
        user_id: user.id,
        vote,
        comment: commentText || null,
      };
      
      if (isStatic) {
        payload.static_article_id = articleId;
      } else {
        payload.article_id = articleId;
      }

      if (existingFeedback) {
        const { error } = await supabase
          .from('faq_feedback')
          .update({ vote, comment: commentText || null, updated_at: new Date().toISOString() })
          .eq('id', existingFeedback.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('faq_feedback')
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faq-feedback', articleId] });
      toast.success('Merci pour votre retour !');
      setShowComment(false);
      setComment('');
    },
    onError: () => {
      toast.error('Erreur lors de l\'envoi');
    },
  });

  const handleVote = (vote: 'up' | 'down') => {
    if (vote === 'down') {
      setShowComment(true);
    } else {
      voteMutation.mutate({ vote });
    }
  };

  const handleSubmitComment = () => {
    voteMutation.mutate({ vote: 'down', commentText: comment.trim() || undefined });
  };

  if (!user) return null;

  const currentVote = existingFeedback?.vote;

  return (
    <div className="mt-6 pt-4 border-t border-border">
      <p className="text-sm text-muted-foreground mb-3">Cet article vous a été utile ?</p>
      
      <div className="flex items-center gap-3 mb-3">
        <button
          onClick={() => handleVote('up')}
          disabled={voteMutation.isPending}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition-all active:scale-95",
            currentVote === 'up'
              ? "border-emerald-500 bg-emerald-500/10 text-emerald-600"
              : "border-border hover:border-emerald-500/50 hover:bg-emerald-500/5"
          )}
        >
          <ThumbsUp className="w-4 h-4" />
          Oui
        </button>
        <button
          onClick={() => handleVote('down')}
          disabled={voteMutation.isPending}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition-all active:scale-95",
            currentVote === 'down'
              ? "border-red-500 bg-red-500/10 text-red-600"
              : "border-border hover:border-red-500/50 hover:bg-red-500/5"
          )}
        >
          <ThumbsDown className="w-4 h-4" />
          Non
        </button>
      </div>

      <AnimatePresence>
        {showComment && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3"
          >
            <p className="text-xs text-muted-foreground">Comment pouvons-nous améliorer cet article ?</p>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Votre commentaire sera transmis à notre équipe..."
              className="resize-none text-sm"
              rows={3}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleSubmitComment}
                disabled={voteMutation.isPending}
                className="gap-1.5 rounded-full"
              >
                {voteMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                Envoyer
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => { setShowComment(false); setComment(''); }}
              >
                Annuler
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {currentVote && !showComment && (
        <p className="text-xs text-muted-foreground mt-2">
          ✅ Merci pour votre retour !
        </p>
      )}
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────
const HelpCenter = () => {
  const navigate = useNavigate();
  const { category } = useParams<{ category?: string }>();
  const [searchParams] = useSearchParams();
  const articleId = searchParams.get('article');
  const staticId = searchParams.get('static');
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

  // Combine DB articles + static knowledge for browsing
  const allEntries = useMemo(() => {
    const dbEntries = articles.map(a => ({ ...a, isStatic: false, link: undefined as string | undefined }));
    const staticEntries = STATIC_KNOWLEDGE.map(s => ({
      id: s.id,
      category: s.category,
      question: s.question,
      answer: s.answer,
      isStatic: true,
      link: s.link,
    }));
    // Deduplicate: if a DB article has the same question as a static one, keep DB
    const dbQuestions = new Set(articles.map(a => a.question.toLowerCase()));
    const filteredStatic = staticEntries.filter(s => !dbQuestions.has(s.question.toLowerCase()));
    return [...dbEntries, ...filteredStatic];
  }, [articles]);

  const categories = useMemo(() => {
    const cats = new Map<string, number>();
    allEntries.forEach(a => cats.set(a.category, (cats.get(a.category) || 0) + 1));
    return Array.from(cats.entries()).map(([name, count]) => ({ name, count }));
  }, [allEntries]);

  const filteredArticles = useMemo(() => {
    let filtered = allEntries;
    if (category) {
      const decodedCat = decodeURIComponent(category);
      filtered = filtered.filter(a => a.category === decodedCat);
    }
    if (searchQuery.trim()) {
      const q = normalizeSearch(searchQuery);
      const words = q.split(/\s+/).filter(w => w.length > 2);
      filtered = filtered.filter(a => {
        const nq = normalizeSearch(a.question);
        const na = normalizeSearch(a.answer);
        return words.some(w => nq.includes(w) || na.includes(w));
      });
    }
    return filtered;
  }, [allEntries, category, searchQuery]);

  // Find selected article (DB or static)
  const selectedEntry = useMemo(() => {
    if (articleId) return allEntries.find(a => a.id === articleId && !a.isStatic) || null;
    if (staticId) return allEntries.find(a => a.id === staticId && a.isStatic) || null;
    return null;
  }, [articleId, staticId, allEntries]);

  const decodedCategory = category ? decodeURIComponent(category) : null;

  // Article detail view
  if (selectedEntry) {
    const related = allEntries
      .filter(a => a.category === selectedEntry.category && a.id !== selectedEntry.id)
      .slice(0, 5);

    return (
      <>
        <SEOHead title={`${selectedEntry.question} - Aide Gay Social`} description={selectedEntry.answer.slice(0, 160)} />
        <div className="min-h-screen bg-background">
          <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
            <div className="container mx-auto px-4 py-4 flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">{selectedEntry.category}</p>
                <h1 className="font-display text-base font-bold truncate">{selectedEntry.question}</h1>
              </div>
            </div>
          </header>
          <div className="container mx-auto px-4 py-6 max-w-3xl">
            <div className="bg-card rounded-2xl border border-border p-6">
              <h2 className="font-display text-xl font-bold mb-4">{selectedEntry.question}</h2>
              <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground whitespace-pre-wrap leading-relaxed">
                <BoldRenderer text={selectedEntry.answer} />
              </div>

              {/* Action link */}
              {selectedEntry.link && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(selectedEntry.link!)}
                  className="mt-4 gap-2 rounded-full"
                >
                  <ChevronRight className="w-4 h-4" />
                  Accéder à la page
                </Button>
              )}

              {/* Feedback */}
              <ArticleFeedback
                articleId={selectedEntry.id}
                isStatic={selectedEntry.isStatic}
              />
            </div>

            {/* Related articles */}
            {related.length > 0 && (
              <div className="mt-6">
                <h3 className="font-semibold text-sm text-muted-foreground mb-3">Articles similaires</h3>
                <div className="space-y-2">
                  {related.map(a => (
                    <button
                      key={a.id}
                      onClick={() => navigate(`/aide?${a.isStatic ? 'static' : 'article'}=${a.id}`)}
                      className="w-full flex items-center justify-between p-3 rounded-xl bg-card border border-border hover:bg-muted/50 transition-colors text-left"
                    >
                      <span className="text-sm">{a.question}</span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}

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
                    onClick={() => navigate(`/aide?${article.isStatic ? 'static' : 'article'}=${article.id}`)}
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
        canonical="https://gaysocial.fr/help-center"
      />
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
          <div className="container mx-auto px-4 py-4 flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-display text-xl font-bold">Centre d'aide</h1>
              <p className="text-xs text-muted-foreground">{allEntries.length} articles disponibles</p>
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
                  onClick={() => navigate(`/aide?${article.isStatic ? 'static' : 'article'}=${article.id}`)}
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
