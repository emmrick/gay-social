import { useState } from 'react';
import { Wrench, HardHat, Settings, LogIn, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MaintenanceScreenProps {
  message?: string | null;
  onStaffLogin?: () => void;
}

const MaintenanceScreen = ({ message, onStaffLogin }: MaintenanceScreenProps) => {
  const [showLogin, setShowLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      // Check if user is admin or moderator
      const userId = data.user?.id;
      if (!userId) throw new Error('Connexion échouée');

      const [adminRes, modRes] = await Promise.all([
        supabase.rpc('has_role', { _user_id: userId, _role: 'admin' }),
        supabase.rpc('has_role', { _user_id: userId, _role: 'moderator' }),
      ]);

      if (adminRes.data === true || modRes.data === true) {
        toast.success('Connexion staff réussie');
        onStaffLogin?.();
        // Force reload to re-evaluate the guard
        window.location.reload();
      } else {
        toast.error('Accès réservé aux administrateurs et modérateurs');
        await supabase.auth.signOut();
      }
    } catch (err: any) {
      toast.error(err.message || 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 overflow-hidden relative">
      {/* Animated background elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-64 h-64 rounded-full bg-primary/5"
            initial={{ 
              x: Math.random() * 100 - 50 + '%', 
              y: Math.random() * 100 - 50 + '%',
              scale: 0.5,
              opacity: 0 
            }}
            animate={{ 
              x: [
                Math.random() * 80 + '%',
                Math.random() * 80 + '%',
                Math.random() * 80 + '%',
              ],
              y: [
                Math.random() * 80 + '%',
                Math.random() * 80 + '%',
                Math.random() * 80 + '%',
              ],
              scale: [0.5, 1.2, 0.8],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{ 
              duration: 12 + i * 3, 
              repeat: Infinity, 
              ease: 'easeInOut' 
            }}
          />
        ))}
      </div>

      <div className="relative z-10 text-center max-w-lg space-y-8">
        {/* Animated icon cluster */}
        <div className="relative w-32 h-32 mx-auto">
          <motion.div
            className="absolute inset-0 rounded-full bg-primary/10"
            animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.2, 0.5] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute inset-2 rounded-full bg-primary/20"
            animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0.3, 0.6] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
          />
          <motion.div 
            className="absolute inset-0 flex items-center justify-center"
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          >
            <div className="w-20 h-20 rounded-full bg-primary/30 flex items-center justify-center backdrop-blur-sm">
              <Wrench className="w-10 h-10 text-primary" />
            </div>
          </motion.div>

          {/* Orbiting icons */}
          <motion.div
            className="absolute"
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
            style={{ top: '-8px', left: '50%', marginLeft: '-12px' }}
          >
            <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
              <Settings className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
          </motion.div>
          <motion.div
            className="absolute"
            animate={{ rotate: -360 }}
            transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
            style={{ bottom: '-4px', right: '0px' }}
          >
            <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
              <HardHat className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
          </motion.div>
        </div>

        {/* Title with staggered animation */}
        <motion.div
          className="space-y-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <h1 className="text-3xl font-bold text-foreground">
            Maintenance en cours
          </h1>
          <motion.div
            className="h-1 w-16 mx-auto rounded-full bg-primary"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.8, delay: 0.5 }}
          />
        </motion.div>

        <motion.div
          className="space-y-4"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <p className="text-muted-foreground text-lg leading-relaxed">
            Votre site <span className="font-semibold text-primary">Gay Connect</span> est actuellement en maintenance pour travaux et amélioration.
          </p>
          <p className="text-muted-foreground">
            Merci de revenir dans quelques heures pour profiter de vos services.
          </p>
          {message && message !== 'Le site est en maintenance. Veuillez réessayer plus tard.' && (
            <p className="text-sm text-muted-foreground/80 italic border-l-2 border-primary/30 pl-3 mt-2">
              {message}
            </p>
          )}
        </motion.div>

        {/* Animated progress dots */}
        <motion.div
          className="flex items-center justify-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2.5 h-2.5 rounded-full bg-primary/40"
              animate={{ 
                scale: [1, 1.5, 1], 
                opacity: [0.4, 1, 0.4],
                backgroundColor: ['hsl(var(--primary) / 0.4)', 'hsl(var(--primary))', 'hsl(var(--primary) / 0.4)']
              }}
              transition={{ 
                duration: 1.5, 
                repeat: Infinity, 
                delay: i * 0.3,
                ease: 'easeInOut'
              }}
            />
          ))}
        </motion.div>

        {/* Staff login section */}
        <motion.div
          className="pt-6 border-t border-border/50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
        >
          {!showLogin ? (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground/60 hover:text-muted-foreground text-xs gap-1.5"
              onClick={() => setShowLogin(true)}
            >
              <LogIn className="w-3.5 h-3.5" />
              Accès administrateur
            </Button>
          ) : (
            <motion.form
              onSubmit={handleLogin}
              className="max-w-xs mx-auto space-y-3"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              transition={{ duration: 0.3 }}
            >
              <div className="space-y-1.5 text-left">
                <Label htmlFor="staff-email" className="text-xs text-muted-foreground">Email</Label>
                <Input
                  id="staff-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  required
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5 text-left">
                <Label htmlFor="staff-password" className="text-xs text-muted-foreground">Mot de passe</Label>
                <Input
                  id="staff-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="h-9 text-sm"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowLogin(false)}
                  className="flex-1 text-xs"
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={loading}
                  className="flex-1 text-xs gap-1.5"
                >
                  {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogIn className="w-3.5 h-3.5" />}
                  Se connecter
                </Button>
              </div>
            </motion.form>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default MaintenanceScreen;
