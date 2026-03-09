import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Search, User, Loader2, FileUser } from 'lucide-react';
import ClientDossierPanel from './ClientDossierPanel';

interface ClientDossierSearchProps {
  onOpenUserDossier?: (userId: string) => void;
}

const ClientDossierSearch = ({ onOpenUserDossier }: ClientDossierSearchProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [results, setResults] = useState<any[]>([]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const q = searchQuery.trim();
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, username, first_name, last_name, avatar_url, age, region, phone_number, is_verified')
        .or(`username.ilike.%${q}%,first_name.ilike.%${q}%,last_name.ilike.%${q}%,phone_number.ilike.%${q}%`)
        .limit(20);
      
      if (error) throw error;
      setResults(data || []);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setSearching(false);
    }
  };

  const handleSelectUser = (userId: string) => {
    if (onOpenUserDossier) {
      onOpenUserDossier(userId);
    } else {
      setSelectedUserId(userId);
    }
  };

  if (selectedUserId) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setSelectedUserId(null)} className="gap-1.5">
          ← Retour à la recherche
        </Button>
        <ClientDossierPanel userId={selectedUserId} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <FileUser className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Dossier client</h2>
          <p className="text-sm text-muted-foreground">Recherchez un membre pour accéder à son dossier complet</p>
        </div>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} className="flex gap-2">
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Rechercher par nom, pseudo ou téléphone..."
          className="flex-1"
          maxLength={100}
        />
        <Button type="submit" disabled={!searchQuery.trim() || searching} className="gap-1.5">
          {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          Rechercher
        </Button>
      </form>

      {results.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{results.length} résultat(s)</p>
          {results.map((profile) => (
            <Card 
              key={profile.user_id} 
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => handleSelectUser(profile.user_id)}
            >
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {profile.avatar_url ? (
                      <img src={profile.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <User className="w-4 h-4 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{profile.username}</p>
                    <p className="text-xs text-muted-foreground">
                      {profile.first_name} {profile.last_name} · {profile.age ? `${profile.age} ans` : ''} · {profile.region}
                    </p>
                  </div>
                  {profile.is_verified && (
                    <span className="text-xs text-green-600">✓ Vérifié</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {results.length === 0 && searchQuery && !searching && (
        <div className="text-center py-12 text-muted-foreground">
          <User className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p>Aucun résultat trouvé</p>
        </div>
      )}
    </div>
  );
};

export default ClientDossierSearch;
