import { useParams, Link, useNavigate } from 'react-router-dom';
import { useChatRoom } from '@/hooks/useChatRooms';
import { useRegionMemberCount } from '@/hooks/useRegionMemberCounts';
import { useProfilesByRegion } from '@/hooks/useProfiles';
import SEOHead from '@/components/seo/SEOHead';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Users, MessageCircle, ArrowLeft, Shield, Star, AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { isUserTrulyOnline } from '@/hooks/useOnlineStatus';

const DEPARTMENTS: Record<string, { name: string; description: string }> = {
  '01': { name: 'Ain', description: 'Bourg-en-Bresse et environs' },
  '02': { name: 'Aisne', description: 'Laon, Saint-Quentin, Soissons' },
  '03': { name: 'Allier', description: 'Moulins, Vichy, Montluçon' },
  '04': { name: 'Alpes-de-Haute-Provence', description: 'Digne-les-Bains, Manosque' },
  '05': { name: 'Hautes-Alpes', description: 'Gap, Briançon' },
  '06': { name: 'Alpes-Maritimes', description: 'Nice, Cannes, Antibes, Grasse' },
  '07': { name: 'Ardèche', description: 'Privas, Aubenas, Annonay' },
  '08': { name: 'Ardennes', description: 'Charleville-Mézières, Sedan' },
  '09': { name: 'Ariège', description: 'Foix, Pamiers, Saint-Girons' },
  '10': { name: 'Aube', description: 'Troyes, Romilly-sur-Seine' },
  '11': { name: 'Aude', description: 'Carcassonne, Narbonne' },
  '12': { name: 'Aveyron', description: 'Rodez, Millau, Villefranche' },
  '13': { name: 'Bouches-du-Rhône', description: 'Marseille, Aix-en-Provence' },
  '14': { name: 'Calvados', description: 'Caen, Lisieux, Bayeux' },
  '15': { name: 'Cantal', description: 'Aurillac, Saint-Flour' },
  '16': { name: 'Charente', description: 'Angoulême, Cognac' },
  '17': { name: 'Charente-Maritime', description: 'La Rochelle, Rochefort, Saintes' },
  '18': { name: 'Cher', description: 'Bourges, Vierzon' },
  '19': { name: 'Corrèze', description: 'Tulle, Brive-la-Gaillarde' },
  '2A': { name: 'Corse-du-Sud', description: 'Ajaccio, Porto-Vecchio' },
  '2B': { name: 'Haute-Corse', description: 'Bastia, Corte' },
  '21': { name: 'Côte-d\'Or', description: 'Dijon, Beaune' },
  '22': { name: 'Côtes-d\'Armor', description: 'Saint-Brieuc, Lannion, Dinan' },
  '23': { name: 'Creuse', description: 'Guéret, Aubusson' },
  '24': { name: 'Dordogne', description: 'Périgueux, Bergerac, Sarlat' },
  '25': { name: 'Doubs', description: 'Besançon, Montbéliard, Pontarlier' },
  '26': { name: 'Drôme', description: 'Valence, Montélimar, Romans' },
  '27': { name: 'Eure', description: 'Évreux, Vernon, Louviers' },
  '28': { name: 'Eure-et-Loir', description: 'Chartres, Dreux' },
  '29': { name: 'Finistère', description: 'Brest, Quimper, Morlaix' },
  '30': { name: 'Gard', description: 'Nîmes, Alès, Beaucaire' },
  '31': { name: 'Haute-Garonne', description: 'Toulouse et agglomération' },
  '32': { name: 'Gers', description: 'Auch, Condom' },
  '33': { name: 'Gironde', description: 'Bordeaux et agglomération' },
  '34': { name: 'Hérault', description: 'Montpellier, Béziers, Sète' },
  '35': { name: 'Ille-et-Vilaine', description: 'Rennes, Saint-Malo, Fougères' },
  '36': { name: 'Indre', description: 'Châteauroux, Issoudun' },
  '37': { name: 'Indre-et-Loire', description: 'Tours, Amboise, Chinon' },
  '38': { name: 'Isère', description: 'Grenoble, Vienne, Bourgoin' },
  '39': { name: 'Jura', description: 'Lons-le-Saunier, Dole' },
  '40': { name: 'Landes', description: 'Mont-de-Marsan, Dax' },
  '41': { name: 'Loir-et-Cher', description: 'Blois, Vendôme, Romorantin' },
  '42': { name: 'Loire', description: 'Saint-Étienne, Roanne, Montbrison' },
  '43': { name: 'Haute-Loire', description: 'Le Puy-en-Velay, Yssingeaux' },
  '44': { name: 'Loire-Atlantique', description: 'Nantes, Saint-Nazaire' },
  '45': { name: 'Loiret', description: 'Orléans, Montargis, Pithiviers' },
  '46': { name: 'Lot', description: 'Cahors, Figeac' },
  '47': { name: 'Lot-et-Garonne', description: 'Agen, Villeneuve-sur-Lot' },
  '48': { name: 'Lozère', description: 'Mende, Florac' },
  '49': { name: 'Maine-et-Loire', description: 'Angers, Cholet, Saumur' },
  '50': { name: 'Manche', description: 'Saint-Lô, Cherbourg, Granville' },
  '51': { name: 'Marne', description: 'Reims, Châlons-en-Champagne, Épernay' },
  '52': { name: 'Haute-Marne', description: 'Chaumont, Saint-Dizier, Langres' },
  '53': { name: 'Mayenne', description: 'Laval, Château-Gontier' },
  '54': { name: 'Meurthe-et-Moselle', description: 'Nancy, Lunéville, Toul' },
  '55': { name: 'Meuse', description: 'Bar-le-Duc, Verdun' },
  '56': { name: 'Morbihan', description: 'Vannes, Lorient, Pontivy' },
  '57': { name: 'Moselle', description: 'Metz, Thionville, Forbach' },
  '58': { name: 'Nièvre', description: 'Nevers, Cosne-Cours-sur-Loire' },
  '59': { name: 'Nord', description: 'Lille, Dunkerque, Valenciennes, Douai' },
  '60': { name: 'Oise', description: 'Beauvais, Compiègne, Senlis' },
  '61': { name: 'Orne', description: 'Alençon, Flers, Argentan' },
  '62': { name: 'Pas-de-Calais', description: 'Arras, Calais, Boulogne, Lens' },
  '63': { name: 'Puy-de-Dôme', description: 'Clermont-Ferrand et agglomération' },
  '64': { name: 'Pyrénées-Atlantiques', description: 'Pau, Bayonne, Biarritz' },
  '65': { name: 'Hautes-Pyrénées', description: 'Tarbes, Lourdes, Bagnères' },
  '66': { name: 'Pyrénées-Orientales', description: 'Perpignan, Céret' },
  '67': { name: 'Bas-Rhin', description: 'Strasbourg, Haguenau, Sélestat' },
  '68': { name: 'Haut-Rhin', description: 'Mulhouse, Colmar, Saint-Louis' },
  '69': { name: 'Rhône', description: 'Lyon et agglomération' },
  '70': { name: 'Haute-Saône', description: 'Vesoul, Lure, Luxeuil' },
  '71': { name: 'Saône-et-Loire', description: 'Mâcon, Chalon-sur-Saône, Le Creusot' },
  '72': { name: 'Sarthe', description: 'Le Mans, La Flèche' },
  '73': { name: 'Savoie', description: 'Chambéry, Aix-les-Bains, Albertville' },
  '74': { name: 'Haute-Savoie', description: 'Annecy, Thonon, Chamonix' },
  '75': { name: 'Paris', description: 'Paris et Île-de-France' },
  '76': { name: 'Seine-Maritime', description: 'Rouen, Le Havre, Dieppe' },
  '77': { name: 'Seine-et-Marne', description: 'Melun, Meaux, Fontainebleau' },
  '78': { name: 'Yvelines', description: 'Versailles, Saint-Germain-en-Laye' },
  '79': { name: 'Deux-Sèvres', description: 'Niort, Bressuire, Parthenay' },
  '80': { name: 'Somme', description: 'Amiens, Abbeville, Péronne' },
  '81': { name: 'Tarn', description: 'Albi, Castres, Gaillac' },
  '82': { name: 'Tarn-et-Garonne', description: 'Montauban, Castelsarrasin' },
  '83': { name: 'Var', description: 'Toulon, Fréjus, Draguignan' },
  '84': { name: 'Vaucluse', description: 'Avignon, Carpentras, Orange' },
  '85': { name: 'Vendée', description: 'La Roche-sur-Yon, Les Sables-d\'Olonne' },
  '86': { name: 'Vienne', description: 'Poitiers, Châtellerault' },
  '87': { name: 'Haute-Vienne', description: 'Limoges, Saint-Junien' },
  '88': { name: 'Vosges', description: 'Épinal, Saint-Dié, Remiremont' },
  '89': { name: 'Yonne', description: 'Auxerre, Sens, Joigny' },
  '90': { name: 'Territoire de Belfort', description: 'Belfort et environs' },
  '91': { name: 'Essonne', description: 'Évry, Corbeil, Massy' },
  '92': { name: 'Hauts-de-Seine', description: 'Nanterre, Boulogne, Levallois' },
  '93': { name: 'Seine-Saint-Denis', description: 'Bobigny, Saint-Denis, Montreuil' },
  '94': { name: 'Val-de-Marne', description: 'Créteil, Vincennes, Vitry' },
  '95': { name: 'Val-d\'Oise', description: 'Pontoise, Argenteuil, Sarcelles' },
  '971': { name: 'Guadeloupe', description: 'Pointe-à-Pitre, Basse-Terre' },
  '972': { name: 'Martinique', description: 'Fort-de-France, Le Lamentin' },
  '973': { name: 'Guyane', description: 'Cayenne, Kourou' },
  '974': { name: 'La Réunion', description: 'Saint-Denis, Saint-Pierre' },
  '976': { name: 'Mayotte', description: 'Mamoudzou, Dzaoudzi' },
};

const RegionPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  
  // Extract code from slug (e.g. "75-paris" -> "75")
  const regionCode = slug?.split('-')[0] || '';
  const dept = DEPARTMENTS[regionCode];
  
  const { data: room, isLoading: roomLoading } = useChatRoom(regionCode);
  const { total, online, isLoading: countsLoading } = useRegionMemberCount(regionCode);
  const { data: profiles, isLoading: profilesLoading } = useProfilesByRegion(regionCode);
  
  const regionName = room?.region_name || dept?.name || regionCode;
  const pageTitle = `Gay Connect ${regionCode} ${regionName} - Rencontres & Chat Gay`;
  const pageDescription = `Rejoins la communauté gay du ${regionCode} ${regionName}. ${dept?.description || ''} Chat de groupe, échanges privés, profils vérifiés. ${total > 0 ? `${total} membres inscrits.` : ''} +18 ans.`;
  const canonical = `https://gay-connect.lovable.app/region/${slug}`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: pageTitle,
    description: pageDescription,
    url: canonical,
    isPartOf: { '@type': 'WebSite', name: 'Gay Connect', url: 'https://gay-connect.lovable.app' },
    about: {
      '@type': 'Place',
      name: `${regionCode} - ${regionName}`,
      address: { '@type': 'PostalAddress', addressCountry: 'FR', addressRegion: regionName },
    },
  };

  if (!dept && !roomLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">Région introuvable</h1>
          <p className="text-muted-foreground">Ce département n'existe pas.</p>
          <Button variant="outline" asChild>
            <Link to="/regions">Voir toutes les régions</Link>
          </Button>
        </div>
      </div>
    );
  }

  // Show first 12 profiles blurred
  const previewProfiles = profiles?.slice(0, 12) || [];

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
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/regions">
                <MapPin className="w-4 h-4 mr-1" />
                Régions
              </Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/auth">S'inscrire</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative py-16 md:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-radial from-primary/15 via-transparent to-transparent" />
        <div className="container max-w-5xl mx-auto px-4 relative z-10">
          <Link to="/regions" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors mb-6">
            <ArrowLeft className="w-4 h-4" />
            Toutes les régions
          </Link>

          <div className="flex items-start gap-6">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center font-display font-bold text-2xl text-white shadow-lg flex-shrink-0">
              {regionCode}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="font-display text-3xl md:text-5xl font-bold text-foreground mb-2">
                {regionName}
              </h1>
              {dept?.description && (
                <p className="text-lg text-muted-foreground mb-4">{dept.description}</p>
              )}
              <div className="flex flex-wrap gap-4 text-sm">
                {countsLoading ? (
                  <Skeleton className="w-32 h-5" />
                ) : (
                  <>
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Users className="w-4 h-4" />
                      <strong className="text-foreground">{total}</strong> membres inscrits
                    </span>
                    {online > 0 && (
                      <span className="flex items-center gap-1.5 text-green-500">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <strong>{online}</strong> en ligne
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container max-w-5xl mx-auto px-4 pb-16 space-y-12">
        {/* Blurred Profile Previews */}
        <section>
          <h2 className="font-display text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Membres du {regionCode}
          </h2>
          
          {profilesLoading ? (
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-xl" />
              ))}
            </div>
          ) : previewProfiles.length > 0 ? (
            <div className="relative">
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {previewProfiles.map((profile) => (
                  <div key={profile.id} className="relative aspect-square rounded-xl overflow-hidden bg-secondary border border-border group">
                    {profile.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt=""
                        className="w-full h-full object-cover blur-lg scale-110"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                        <Users className="w-8 h-8 text-muted-foreground/50" />
                      </div>
                    )}
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-background/40 flex items-end p-2">
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center">
                          <Shield className="w-3 h-3 text-muted-foreground" />
                        </div>
                        <span className="text-xs font-medium text-foreground truncate">
                          {profile.username}
                        </span>
                        {isUserTrulyOnline(profile) && (
                          <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {/* "See more" overlay */}
              {total > 12 && (
                <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-background to-transparent flex items-end justify-center pb-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/auth">
                      Voir les {total} membres
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Sois le premier à rejoindre le {regionCode} !</p>
              </CardContent>
            </Card>
          )}
        </section>

        {/* Features */}
        <section>
          <h2 className="font-display text-xl font-semibold text-foreground mb-4">
            Pourquoi rejoindre le groupe {regionCode} ?
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            <Card className="border-border/50">
              <CardContent className="pt-6 text-center space-y-2">
                <MessageCircle className="w-8 h-8 text-primary mx-auto" />
                <h3 className="font-semibold text-foreground">Chat de groupe</h3>
                <p className="text-sm text-muted-foreground">
                  Discute avec les membres du {regionCode} en temps réel.
                </p>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="pt-6 text-center space-y-2">
                <Shield className="w-8 h-8 text-primary mx-auto" />
                <h3 className="font-semibold text-foreground">Profils vérifiés</h3>
                <p className="text-sm text-muted-foreground">
                  Vérification d'identité pour un espace sécurisé.
                </p>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="pt-6 text-center space-y-2">
                <Star className="w-8 h-8 text-primary mx-auto" />
                <h3 className="font-semibold text-foreground">Échanges privés</h3>
                <p className="text-sm text-muted-foreground">
                  Photos, vidéos et messages éphémères en toute discrétion.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* CTA */}
        <section className="text-center py-8">
          <h2 className="font-display text-2xl font-bold text-foreground mb-3">
            Prêt à rejoindre le {regionCode} ?
          </h2>
          <p className="text-muted-foreground mb-6">Inscription gratuite, accès immédiat au chat de ta région.</p>
          <Button variant="hero" size="xl" onClick={() => navigate('/auth')}>
            <MessageCircle className="w-5 h-5" />
            Rejoindre maintenant
          </Button>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6 bg-card/50">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-center gap-4 text-sm text-muted-foreground">
          <span>© 2025 Gay Connect</span>
          <Link to="/legal" className="hover:text-primary transition-colors">Mentions légales</Link>
          <Link to="/about" className="hover:text-primary transition-colors">À propos</Link>
          <Link to="/regions" className="hover:text-primary transition-colors">Toutes les régions</Link>
          <span className="flex items-center gap-1">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            +18 ans
          </span>
        </div>
      </footer>
    </div>
  );
};

export default RegionPage;
