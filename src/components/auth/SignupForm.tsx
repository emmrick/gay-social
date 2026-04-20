import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, Lock, Eye, EyeOff, Loader2, User, Calendar, Heart, ShieldCheck } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { signupSchema, SignupFormData } from '@/lib/validations/auth';
import AccountTypeSelector from './AccountTypeSelector';
import RegionSelect from './RegionSelect';
import ReferralCodeInput from './ReferralCodeInput';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

interface SignupFormProps {
  onSubmit: (data: SignupFormData) => Promise<void>;
  isLoading: boolean;
  defaultReferralCode?: string;
  showCoupleInvite?: boolean;
}

const SignupForm = ({ onSubmit, isLoading, defaultReferralCode = '', showCoupleInvite = false }: SignupFormProps) => {
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: '',
      password: '',
      username: '',
      age: undefined as any,
      region: '',
      accountType: 'solo',
      username2: '',
      age2: undefined as any,
      referralCode: defaultReferralCode,
      acceptTerms: false as any,
    },
  });

  const accountType = form.watch('accountType');

  return (
    <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
      <p className="text-muted-foreground text-sm text-center mb-6">Rejoins la communauté</p>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Account type */}
          {!showCoupleInvite && (
            <AccountTypeSelector
              value={accountType}
              onChange={(v) => form.setValue('accountType', v)}
            />
          )}

          {/* Email */}
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm text-muted-foreground">Email</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input {...field} type="email" placeholder="ton@email.com" className="pl-10 h-11 bg-secondary/50 border-border/50 rounded-xl focus:bg-secondary transition-colors" />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Password */}
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm text-muted-foreground">Mot de passe</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      {...field}
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      className="pl-10 pr-10 h-11 bg-secondary/50 border-border/50 rounded-xl focus:bg-secondary transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Profile 1 header for couple */}
          {accountType === 'couple' && (
            <div className="flex items-center gap-2 pt-2">
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-xs font-bold text-primary">1</span>
              </div>
              <span className="text-sm font-medium text-primary">Profil principal</span>
            </div>
          )}

          {/* Username */}
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm text-muted-foreground">
                  {accountType === 'couple' ? 'Pseudo (Profil 1)' : 'Pseudo'}
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input {...field} type="text" placeholder="TonPseudo" className="pl-10 h-11 bg-secondary/50 border-border/50 rounded-xl focus:bg-secondary transition-colors" />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Age */}
          <FormField
            control={form.control}
            name="age"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm text-muted-foreground">
                  {accountType === 'couple' ? 'Âge (Profil 1)' : 'Âge (18 ans minimum)'}
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      {...field}
                      type="number"
                      placeholder="18"
                      min={18}
                      max={99}
                      onChange={(e) => field.onChange(e.target.value === '' ? '' : Number(e.target.value))}
                      value={field.value ?? ''}
                      className="pl-10 h-11 bg-secondary/50 border-border/50 rounded-xl focus:bg-secondary transition-colors"
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Partner fields */}
          {accountType === 'couple' && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-4">
              <div className="flex items-center gap-2 pt-2">
                <div className="w-6 h-6 rounded-full bg-accent/80 flex items-center justify-center">
                  <span className="text-xs font-bold text-accent-foreground">2</span>
                </div>
                <span className="text-sm font-medium">Profil partenaire</span>
                <Heart className="w-4 h-4 text-primary ml-auto" />
              </div>

              <FormField
                control={form.control}
                name="username2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm text-muted-foreground">Pseudo (Profil 2)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input {...field} type="text" placeholder="PseudoPartenaire" className="pl-10 h-11 bg-secondary/50 border-border/50 rounded-xl focus:bg-secondary transition-colors" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="age2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm text-muted-foreground">Âge (Profil 2)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          {...field}
                          type="number"
                          placeholder="18"
                          min={18}
                          max={99}
                          onChange={(e) => field.onChange(e.target.value === '' ? '' : Number(e.target.value))}
                          value={field.value ?? ''}
                          className="pl-10 h-11 bg-secondary/50 border-border/50 rounded-xl focus:bg-secondary transition-colors"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </motion.div>
          )}

          {/* Region */}
          <FormField
            control={form.control}
            name="region"
            render={({ field, fieldState }) => (
              <FormItem>
                <RegionSelect value={field.value} onChange={field.onChange} error={fieldState.error?.message} />
              </FormItem>
            )}
          />

          {/* Referral Code */}
          <FormField
            control={form.control}
            name="referralCode"
            render={({ field }) => (
              <FormItem>
                <ReferralCodeInput value={field.value ?? ''} onChange={field.onChange} />
              </FormItem>
            )}
          />

          {/* Conditions obligatoires */}
          <FormField
            control={form.control}
            name="acceptTerms"
            render={({ field }) => (
              <FormItem>
                <div className="rounded-xl border border-border/60 bg-secondary/30 p-3">
                  <div className="flex items-start gap-3">
                    <FormControl>
                      <Checkbox
                        id="acceptTerms"
                        checked={!!field.value}
                        onCheckedChange={(v) => field.onChange(v === true)}
                        className="mt-0.5"
                      />
                    </FormControl>
                    <div className="flex-1 min-w-0">
                      <label
                        htmlFor="acceptTerms"
                        className="text-xs leading-relaxed text-foreground/90 cursor-pointer block"
                      >
                        <span className="inline-flex items-center gap-1 font-semibold">
                          <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                          Je certifie avoir au moins 18 ans
                        </span>{' '}
                        et j'accepte les{' '}
                        <Link to="/legal" target="_blank" className="text-primary font-semibold underline underline-offset-2">
                          Conditions Générales d'Utilisation
                        </Link>
                        , les{' '}
                        <Link to="/regles" target="_blank" className="text-primary font-semibold underline underline-offset-2">
                          Règles de conduite
                        </Link>
                        , la{' '}
                        <Link to="/legal" target="_blank" className="text-primary font-semibold underline underline-offset-2">
                          Politique de confidentialité
                        </Link>{' '}
                        et l'utilisation des cookies.
                      </label>
                    </div>
                  </div>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Submit */}
          <Button type="submit" variant="hero" size="lg" className="w-full h-12 rounded-xl mt-2" disabled={isLoading}>
            {isLoading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Création...</>
            ) : accountType === 'couple' ? (
              <><Heart className="w-4 h-4 mr-1" /> Créer notre compte couple</>
            ) : (
              'Créer mon compte'
            )}
          </Button>
        </form>
      </Form>
    </motion.div>
  );
};

export default SignupForm;
