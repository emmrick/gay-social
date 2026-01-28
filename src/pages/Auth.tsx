import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useChatRooms } from '@/hooks/useChatRooms';
import { ArrowLeft, Mail, Lock, User, MapPin, Loader2, Eye, EyeOff, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [region, setRegion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const { data: rooms, isLoading: roomsLoading } = useChatRooms();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) throw error;
        toast.success('Connexion réussie !');
        navigate('/');
      } else {
        if (!username || !region) {
          toast.error('Veuillez remplir tous les champs');
          setIsLoading(false);
          return;
        }
        const { error } = await signUp(email, password, username, region);
        if (error) throw error;
        toast.success('Compte créé avec succès !');
        navigate('/');
      }
    } catch (error: any) {
      toast.error(error.message || 'Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="p-4 border-b border-border/50">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="h-9 w-9">
          <ArrowLeft className="w-5 h-5" />
        </Button>
      </header>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm animate-fade-in">
          {/* Logo */}
          <div className="text-center mb-8">
            <h1 className="font-display text-3xl font-bold gradient-text mb-2">
              GayConnect
            </h1>
            <p className="text-muted-foreground text-sm">
              {isLogin ? 'Bon retour parmi nous !' : 'Rejoins la communauté'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm text-muted-foreground">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="ton@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-11 bg-secondary/50 border-border/50 rounded-xl focus:bg-secondary transition-colors"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm text-muted-foreground">Mot de passe</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 h-11 bg-secondary/50 border-border/50 rounded-xl focus:bg-secondary transition-colors"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Signup fields */}
            {!isLogin && (
              <div className="space-y-4 animate-fade-in">
                {/* Username */}
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-sm text-muted-foreground">Pseudo</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="username"
                      type="text"
                      placeholder="TonPseudo"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="pl-10 h-11 bg-secondary/50 border-border/50 rounded-xl focus:bg-secondary transition-colors"
                      required
                    />
                  </div>
                </div>

                {/* Region */}
                <div className="space-y-2">
                  <Label htmlFor="region" className="text-sm text-muted-foreground">Région</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
                    <select
                      id="region"
                      value={region}
                      onChange={(e) => setRegion(e.target.value)}
                      className={cn(
                        "w-full pl-10 pr-10 h-11 rounded-xl appearance-none cursor-pointer",
                        "bg-secondary/50 border border-border/50 text-foreground",
                        "focus:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring",
                        "transition-colors",
                        !region && "text-muted-foreground"
                      )}
                      required
                    >
                      <option value="">Choisis ta région</option>
                      {roomsLoading ? (
                        <option disabled>Chargement...</option>
                      ) : (
                        rooms?.map((room) => (
                          <option key={room.id} value={room.region_code}>
                            {room.region_code} - {room.region_name}
                          </option>
                        ))
                      )}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
              </div>
            )}

            {/* Submit button */}
            <Button 
              type="submit" 
              variant="hero" 
              size="lg" 
              className="w-full h-12 rounded-xl mt-6"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Chargement...
                </>
              ) : isLogin ? (
                'Se connecter'
              ) : (
                'Créer mon compte'
              )}
            </Button>
          </form>

          {/* Toggle */}
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {isLogin ? (
                <>Pas encore de compte ? <span className="text-primary font-medium">Inscris-toi</span></>
              ) : (
                <>Déjà un compte ? <span className="text-primary font-medium">Connecte-toi</span></>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
