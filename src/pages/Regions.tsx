import { Link } from 'react-router-dom';
import { useChatRooms } from '@/hooks/useChatRooms';
import { useRegionMemberCounts } from '@/hooks/useRegionMemberCounts';
import SEOHead from '@/components/seo/SEOHead';
import { Button } from '@/components/ui/button';
import { MapPin, Users, ArrowRight, Loader2, AlertTriangle, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const Regions = () => {
  const { data: rooms, isLoading } = useChatRooms();
  const { data: counts } = useRegionMemberCounts();

  const pageTitle = 'Rencontre Gay par Département - Tchat Gay Local | Gay Connect';
  const pageDescription = 'Trouve des hommes gay près de chez toi. 101 départements, tchat gay gratuit, plan gay local, profils vérifiés. Le site de rencontre gay n°1 en France. +18 ans.';
  const canonical = 'https://gay-connect.lovable.app/regions';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: pageTitle,
    description: pageDescription,
    url: canonical,
    isPartOf: { '@type': 'WebSite', name: 'Gay Connect', url: 'https://gay-connect.lovable.app' },
    numberOfItems: rooms?.length || 101,
  };

  const slugify = (code: string, name: string) =>
    `${code}-${name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/-+$/g, '')}`;

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title={pageTitle} description={pageDescription} canonical={canonical} jsonLd={jsonLd} />

      {/* 18+ Banner */}
      <div className="bg-destructive/90 text-destructive-foreground py-2 px-4 text-center text-sm">
        <span className="flex items-center justify-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          Site réservé aux adultes (+18 ans)
        </span>
      </div>

      {/* Nav */}
      <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-30">
        <div className="container max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="font-display font-bold text-xl gradient-text">Gay Connect</Link>
          <Button size="sm" asChild>
            <Link to="/auth">S'inscrire</Link>
          </Button>
        </div>
      </nav>

      {/* Header */}
      <header className="py-12 md:py-16">
        <div className="container max-w-5xl mx-auto px-4 text-center">
          <h1 className="font-display text-3xl md:text-5xl font-bold text-foreground mb-4">
            Rencontres gay par <span className="gradient-text">département</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Choisis ton département pour rejoindre la communauté gay locale. Chat de groupe, profils vérifiés et échanges privés.
          </p>
        </div>
      </header>

      {/* Content */}
      <main className="container max-w-5xl mx-auto px-4 pb-16">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {rooms?.map((room) => {
              const regionCounts = counts?.[room.region_code];
              const total = regionCounts?.total || 0;
              const online = regionCounts?.online || 0;
              const slug = slugify(room.region_code, room.region_name);

              return (
                <Link
                  key={room.id}
                  to={`/region/${slug}`}
                  className={cn(
                    "relative overflow-hidden rounded-xl p-4 transition-all duration-300 group",
                    "bg-secondary/50 border border-border/50",
                    "hover:bg-secondary hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
                  )}
                >
                  {online > 0 && (
                    <div className="absolute top-3 right-3">
                      <span className="flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                      </span>
                    </div>
                  )}

                  <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center font-display font-bold text-white text-sm shadow-md mb-3">
                    {room.region_code}
                  </div>

                  <h2 className="font-semibold text-foreground mb-1.5 text-sm line-clamp-1 group-hover:text-primary transition-colors">
                    {room.region_name}
                  </h2>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Users className="w-3.5 h-3.5" />
                      {online > 0 ? (
                        <span className="text-green-500 font-medium">{online} en ligne</span>
                      ) : total > 0 ? (
                        <span>{total} membres</span>
                      ) : (
                        <span>Rejoindre</span>
                      )}
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>

      {/* CTA */}
      <section className="py-12 bg-secondary/30 border-t border-border">
        <div className="container max-w-3xl mx-auto px-4 text-center">
          <h2 className="font-display text-2xl font-bold text-foreground mb-3">
            Rejoins Gay Connect gratuitement
          </h2>
          <p className="text-muted-foreground mb-6">
            Inscription en 30 secondes. Accède au chat de ta région immédiatement.
          </p>
          <Button variant="hero" size="xl" asChild>
            <Link to="/auth">
              <MessageCircle className="w-5 h-5" />
              Créer mon profil
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-6 bg-card/50">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-center gap-4 text-sm text-muted-foreground">
          <span>© 2025 Gay Connect</span>
          <Link to="/legal" className="hover:text-primary transition-colors">Mentions légales</Link>
          <Link to="/about" className="hover:text-primary transition-colors">À propos</Link>
          <span className="flex items-center gap-1">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            +18 ans
          </span>
        </div>
      </footer>
    </div>
  );
};

export default Regions;
