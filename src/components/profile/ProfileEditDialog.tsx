import { useState, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Camera, Loader2, User, ChevronDown } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import PhotoGalleryManager from './PhotoGalleryManager';

interface ProfileEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Options pour les champs
const SEXUAL_POSITIONS = [
  { value: 'actif', label: 'Actif (Top)' },
  { value: 'passif', label: 'Passif (Bottom)' },
  { value: 'versatile', label: 'Versatile' },
  { value: 'vers_top', label: 'Versatile Top' },
  { value: 'vers_bottom', label: 'Versatile Bottom' },
  { value: 'side', label: 'Side' },
  { value: 'no_answer', label: 'Ne souhaite pas répondre' },
];

const LOOKING_FOR_OPTIONS = [
  { value: 'plan_cul', label: 'Plan cul' },
  { value: 'plan_regulier', label: 'Plan régulier' },
  { value: 'relation', label: 'Relation' },
  { value: 'amitie', label: 'Amitié' },
  { value: 'discussion', label: 'Discussion' },
  { value: 'webcam', label: 'Webcam' },
  { value: 'groupe', label: 'Plan à plusieurs' },
];

const BODY_TYPES = [
  { value: 'mince', label: 'Mince' },
  { value: 'moyen', label: 'Moyen' },
  { value: 'muscle', label: 'Musclé' },
  { value: 'costaud', label: 'Costaud' },
  { value: 'gros', label: 'Gros' },
  { value: 'sportif', label: 'Sportif' },
];

const ETHNICITIES = [
  { value: 'europeen', label: 'Européen' },
  { value: 'africain', label: 'Africain' },
  { value: 'maghrebin', label: 'Maghrébin' },
  { value: 'asiatique', label: 'Asiatique' },
  { value: 'latino', label: 'Latino' },
  { value: 'metis', label: 'Métis' },
  { value: 'autre', label: 'Autre' },
];

const RELATIONSHIP_STATUS = [
  { value: 'celibataire', label: 'Célibataire' },
  { value: 'en_couple', label: 'En couple' },
  { value: 'marie', label: 'Marié' },
  { value: 'couple_ouvert', label: 'Couple ouvert' },
  { value: 'complique', label: 'C\'est compliqué' },
];

const TRIBES = [
  { value: 'bear', label: 'Bear' },
  { value: 'twink', label: 'Twink' },
  { value: 'otter', label: 'Otter' },
  { value: 'daddy', label: 'Daddy' },
  { value: 'jock', label: 'Jock' },
  { value: 'cub', label: 'Cub' },
  { value: 'chub', label: 'Chub' },
  { value: 'geek', label: 'Geek' },
  { value: 'leather', label: 'Leather' },
  { value: 'drag', label: 'Drag' },
];

const ENDOWMENT_OPTIONS = [
  { value: 'small', label: 'Petit' },
  { value: 'average', label: 'Moyen' },
  { value: 'large', label: 'Grand' },
  { value: 'xl', label: 'XL' },
];

const HIV_STATUS_OPTIONS = [
  { value: 'negatif', label: 'Négatif' },
  { value: 'positif', label: 'Positif' },
  { value: 'positif_indetectable', label: 'Positif indétectable' },
  { value: 'prep', label: 'Sous PrEP' },
  { value: 'ne_sait_pas', label: 'Ne sait pas' },
  { value: 'no_answer', label: 'Ne souhaite pas répondre' },
];

const ProfileEditDialog = ({ open, onOpenChange }: ProfileEditDialogProps) => {
  const { user, profile, updateProfile } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Basic info
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [bio, setBio] = useState('');
  const [age, setAge] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  
  // Physical attributes
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [bodyType, setBodyType] = useState('');
  const [ethnicity, setEthnicity] = useState('');
  const [endowment, setEndowment] = useState('');
  
  // Sexual preferences
  const [sexualPosition, setSexualPosition] = useState('');
  const [lookingFor, setLookingFor] = useState<string[]>([]);
  const [tribes, setTribes] = useState<string[]>([]);
  
  // Status & privacy
  const [relationshipStatus, setRelationshipStatus] = useState('');
  const [hivStatus, setHivStatus] = useState('');
  const [acceptsNsfw, setAcceptsNsfw] = useState(true);
  const [showFace, setShowFace] = useState(true);
  // Birthday
  const [birthDate, setBirthDate] = useState('');
  const [showBirthday, setShowBirthday] = useState(true);
  
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Reset form when dialog opens
  useEffect(() => {
    if (open && profile) {
      setUsername(profile.username || '');
      setFirstName((profile as any).first_name || '');
      setLastName((profile as any).last_name || '');
      setPhoneNumber((profile as any).phone_number || '');
      setBio(profile.bio || '');
      setAge(profile.age?.toString() || '');
      setAvatarPreview(profile.avatar_url || null);
      setAvatarFile(null);
      
      // Extended fields - need to fetch from profile
      setHeight((profile as any).height?.toString() || '');
      setWeight((profile as any).weight?.toString() || '');
      setBodyType((profile as any).body_type || '');
      setEthnicity((profile as any).ethnicity || '');
      setEndowment((profile as any).endowment || '');
      setSexualPosition((profile as any).sexual_position || '');
      setLookingFor((profile as any).looking_for || []);
      setTribes((profile as any).tribes || []);
      setRelationshipStatus((profile as any).relationship_status || '');
      setHivStatus((profile as any).hiv_status || '');
      setAcceptsNsfw((profile as any).accepts_nsfw !== false);
      setShowFace((profile as any).show_face !== false);
      setBirthDate((profile as any).birth_date || '');
      setShowBirthday((profile as any).show_birthday !== false);
    }
  }, [open, profile]);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Type de fichier invalide',
        description: 'Veuillez sélectionner une image (JPG, PNG, etc.)',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Fichier trop volumineux',
        description: 'La taille maximale est de 5 Mo',
        variant: 'destructive',
      });
      return;
    }

    setAvatarFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const toggleArrayValue = (array: string[], value: string, setter: (arr: string[]) => void) => {
    if (array.includes(value)) {
      setter(array.filter(v => v !== value));
    } else {
      setter([...array, value]);
    }
  };

  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarFile || !user) return profile?.avatar_url || null;

    setIsUploading(true);
    try {
      const fileExt = avatarFile.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      if (profile?.avatar_url) {
        const oldPath = profile.avatar_url.split('/').slice(-2).join('/');
        await supabase.storage.from('avatars').remove([oldPath]);
      }

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, avatarFile, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Add cache-busting parameter to force browser to reload the image
      return `${publicUrl}?t=${Date.now()}`;
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({
        title: 'Erreur',
        description: "Impossible d'uploader l'avatar",
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    if (!username.trim()) {
      toast({
        title: 'Erreur',
        description: 'Le nom d\'utilisateur est requis',
        variant: 'destructive',
      });
      return;
    }

    if (username.length > 30) {
      toast({
        title: 'Erreur',
        description: 'Le nom ne peut pas dépasser 30 caractères',
        variant: 'destructive',
      });
      return;
    }

    const ageNum = age ? parseInt(age, 10) : null;
    if (age && (isNaN(ageNum!) || ageNum! < 18 || ageNum! > 99)) {
      toast({
        title: 'Erreur',
        description: 'L\'âge doit être entre 18 et 99 ans',
        variant: 'destructive',
      });
      return;
    }

    const heightNum = height ? parseInt(height, 10) : null;
    if (height && (isNaN(heightNum!) || heightNum! < 100 || heightNum! > 250)) {
      toast({
        title: 'Erreur',
        description: 'La taille doit être entre 100 et 250 cm',
        variant: 'destructive',
      });
      return;
    }

    const weightNum = weight ? parseInt(weight, 10) : null;
    if (weight && (isNaN(weightNum!) || weightNum! < 30 || weightNum! > 300)) {
      toast({
        title: 'Erreur',
        description: 'Le poids doit être entre 30 et 300 kg',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      let avatarUrl = profile?.avatar_url;
      if (avatarFile) {
        avatarUrl = await uploadAvatar();
      }

      const { error } = await updateProfile({
        username: username.trim(),
        first_name: firstName.trim() || null,
        last_name: lastName.trim() || null,
        phone_number: phoneNumber.trim() || null,
        bio: bio.trim() || null,
        age: ageNum,
        avatar_url: avatarUrl,
        height: heightNum,
        weight: weightNum,
        body_type: bodyType || null,
        ethnicity: ethnicity || null,
        endowment: endowment || null,
        sexual_position: sexualPosition || null,
        looking_for: lookingFor.length > 0 ? lookingFor : null,
        tribes: tribes.length > 0 ? tribes : null,
        relationship_status: relationshipStatus || null,
        hiv_status: hivStatus || null,
        accepts_nsfw: acceptsNsfw,
        show_face: showFace,
        birth_date: birthDate || null,
        show_birthday: showBirthday,
      } as any);

      if (error) throw error;

      // Invalidate all caches that display profile data
      queryClient.invalidateQueries({ queryKey: ['private-conversations'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      queryClient.invalidateQueries({ queryKey: ['nearby-profiles'] });

      toast({
        title: 'Profil mis à jour',
        description: 'Vos modifications ont été enregistrées',
      });

      onOpenChange(false);
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de sauvegarder les modifications',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const SectionCard = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={cn("rounded-xl border border-border/50 bg-card/50 p-4 space-y-3", className)}>
      {children}
    </div>
  );

  const SectionTitle = ({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) => (
    <div className="flex items-center gap-2 text-sm font-semibold text-foreground mb-1">
      {icon}
      {children}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] max-h-[85vh] p-0 gap-0 overflow-hidden rounded-2xl border-border/50">
        {/* Header */}
        <div className="relative px-5 pt-5 pb-3">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-xl font-bold tracking-tight">Modifier le profil</DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm">
              Complète ton profil pour plus de visibilité
            </DialogDescription>
          </DialogHeader>
        </div>

        <Tabs defaultValue="photos" className="flex flex-col min-h-0 flex-1">
          <div className="px-5">
            <TabsList className="grid grid-cols-5 w-full h-9 rounded-lg bg-muted/60 p-0.5">
              <TabsTrigger value="photos" className="text-[11px] rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">📷</TabsTrigger>
              <TabsTrigger value="basic" className="text-[11px] rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">Profil</TabsTrigger>
              <TabsTrigger value="physical" className="text-[11px] rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">Physique</TabsTrigger>
              <TabsTrigger value="preferences" className="text-[11px] rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">Préfs</TabsTrigger>
              <TabsTrigger value="privacy" className="text-[11px] rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">🔒</TabsTrigger>
            </TabsList>
          </div>

          <div className="overflow-y-auto overscroll-contain" style={{ maxHeight: '55vh' }}>
            <div className="px-5 py-4">
              {/* Photos Tab */}
              <TabsContent value="photos" className="mt-0 focus-visible:outline-none">
                <PhotoGalleryManager />
              </TabsContent>

              {/* Basic Info Tab */}
              <TabsContent value="basic" className="mt-0 space-y-4 focus-visible:outline-none">
                <SectionCard>
                  <SectionTitle icon={<User className="w-4 h-4 text-primary" />}>Identité</SectionTitle>
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="username" className="text-xs text-muted-foreground">Pseudo *</Label>
                      <Input
                        id="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Ton pseudo"
                        maxLength={30}
                        className="h-9 bg-background/80"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="firstName" className="text-xs text-muted-foreground">Prénom</Label>
                        <Input
                          id="firstName"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          placeholder="Ton prénom"
                          maxLength={50}
                          className="h-9 bg-background/80"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="lastName" className="text-xs text-muted-foreground">Nom</Label>
                        <Input
                          id="lastName"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          placeholder="Ton nom"
                          maxLength={50}
                          className="h-9 bg-background/80"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="age" className="text-xs text-muted-foreground">Âge *</Label>
                        <Input
                          id="age"
                          type="number"
                          value={age}
                          onChange={(e) => setAge(e.target.value)}
                          placeholder="18-99"
                          min={18}
                          max={99}
                          className="h-9 bg-background/80"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Situation</Label>
                        <Select value={relationshipStatus} onValueChange={setRelationshipStatus}>
                          <SelectTrigger className="h-9 bg-background/80">
                            <SelectValue placeholder="Choisir" />
                          </SelectTrigger>
                          <SelectContent>
                            {RELATIONSHIP_STATUS.map(opt => (
                              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </SectionCard>

                <SectionCard>
                  <SectionTitle icon={<span className="text-base">📱</span>}>Contact</SectionTitle>
                  <div className="space-y-1.5">
                    <Label htmlFor="phoneNumber" className="text-xs text-muted-foreground">Téléphone</Label>
                    <Input
                      id="phoneNumber"
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+33 6 12 34 56 78"
                      maxLength={20}
                      className="h-9 bg-background/80"
                    />
                    <p className="text-[10px] text-muted-foreground/70">
                      Requis pour la vérification lors du contact support.
                    </p>
                  </div>
                </SectionCard>

                <SectionCard>
                  <SectionTitle icon={<span className="text-base">✍️</span>}>Bio</SectionTitle>
                  <div className="space-y-1.5">
                    <Textarea
                      id="bio"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Décris-toi en quelques mots..."
                      maxLength={200}
                      rows={3}
                      className="bg-background/80 resize-none"
                    />
                    <p className="text-[10px] text-muted-foreground/70 text-right">{bio.length}/200</p>
                  </div>
                </SectionCard>

                <SectionCard>
                  <SectionTitle icon={<span className="text-base">🎂</span>}>Date de naissance</SectionTitle>
                  <Input
                    id="birthDate"
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    max={new Date(new Date().getFullYear() - 18, new Date().getMonth(), new Date().getDate()).toISOString().split('T')[0]}
                    className="h-9 bg-background/80"
                  />
                  <p className="text-[10px] text-muted-foreground/70">
                    Signe astrologique et anniversaire
                  </p>
                </SectionCard>
              </TabsContent>

              {/* Physical Tab */}
              <TabsContent value="physical" className="mt-0 space-y-4 focus-visible:outline-none">
                <SectionCard>
                  <SectionTitle icon={<span className="text-base">📏</span>}>Mensurations</SectionTitle>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="height" className="text-xs text-muted-foreground">Taille (cm)</Label>
                      <Input
                        id="height"
                        type="number"
                        value={height}
                        onChange={(e) => setHeight(e.target.value)}
                        placeholder="175"
                        min={100}
                        max={250}
                        className="h-9 bg-background/80"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="weight" className="text-xs text-muted-foreground">Poids (kg)</Label>
                      <Input
                        id="weight"
                        type="number"
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                        placeholder="75"
                        min={30}
                        max={300}
                        className="h-9 bg-background/80"
                      />
                    </div>
                  </div>
                </SectionCard>

                <SectionCard>
                  <SectionTitle icon={<span className="text-base">💪</span>}>Apparence</SectionTitle>
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Corpulence</Label>
                      <Select value={bodyType} onValueChange={setBodyType}>
                        <SelectTrigger className="h-9 bg-background/80">
                          <SelectValue placeholder="Sélectionner" />
                        </SelectTrigger>
                        <SelectContent>
                          {BODY_TYPES.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Origine</Label>
                      <Select value={ethnicity} onValueChange={setEthnicity}>
                        <SelectTrigger className="h-9 bg-background/80">
                          <SelectValue placeholder="Sélectionner" />
                        </SelectTrigger>
                        <SelectContent>
                          {ETHNICITIES.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Attribut 🍆</Label>
                      <Select value={endowment} onValueChange={setEndowment}>
                        <SelectTrigger className="h-9 bg-background/80">
                          <SelectValue placeholder="Sélectionner" />
                        </SelectTrigger>
                        <SelectContent>
                          {ENDOWMENT_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </SectionCard>

                <SectionCard>
                  <SectionTitle icon={<span className="text-base">🏷️</span>}>Tribes / Style</SectionTitle>
                  <div className="flex flex-wrap gap-1.5">
                    {TRIBES.map(tribe => (
                      <Badge
                        key={tribe.value}
                        variant={tribes.includes(tribe.value) ? 'default' : 'outline'}
                        className={cn(
                          'cursor-pointer transition-all text-xs px-2.5 py-1 rounded-full',
                          tribes.includes(tribe.value)
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'hover:bg-secondary/80 border-border/60'
                        )}
                        onClick={() => toggleArrayValue(tribes, tribe.value, setTribes)}
                      >
                        {tribe.label}
                      </Badge>
                    ))}
                  </div>
                </SectionCard>
              </TabsContent>

              {/* Preferences Tab */}
              <TabsContent value="preferences" className="mt-0 space-y-4 focus-visible:outline-none">
                <SectionCard>
                  <SectionTitle icon={<span className="text-base">⚡</span>}>Position sexuelle</SectionTitle>
                  <Select value={sexualPosition} onValueChange={setSexualPosition}>
                    <SelectTrigger className="h-9 bg-background/80">
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      {SEXUAL_POSITIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </SectionCard>

                <SectionCard>
                  <SectionTitle icon={<span className="text-base">🔍</span>}>Je cherche</SectionTitle>
                  <div className="flex flex-wrap gap-1.5">
                    {LOOKING_FOR_OPTIONS.map(opt => (
                      <Badge
                        key={opt.value}
                        variant={lookingFor.includes(opt.value) ? 'default' : 'outline'}
                        className={cn(
                          'cursor-pointer transition-all text-xs px-2.5 py-1 rounded-full',
                          lookingFor.includes(opt.value)
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'hover:bg-secondary/80 border-border/60'
                        )}
                        onClick={() => toggleArrayValue(lookingFor, opt.value, setLookingFor)}
                      >
                        {opt.label}
                      </Badge>
                    ))}
                  </div>
                </SectionCard>

                <SectionCard>
                  <SectionTitle icon={<span className="text-base">🩺</span>}>Statut VIH</SectionTitle>
                  <Select value={hivStatus} onValueChange={setHivStatus}>
                    <SelectTrigger className="h-9 bg-background/80">
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      {HIV_STATUS_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground/70">
                    Cette information reste privée jusqu'à ce que tu la partages
                  </p>
                </SectionCard>
              </TabsContent>

              {/* Privacy Tab */}
              <TabsContent value="privacy" className="mt-0 space-y-3 focus-visible:outline-none">
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-card border border-border/50 shadow-sm">
                  <div className="space-y-0.5 pr-3">
                    <Label className="text-sm font-medium">Contenu NSFW</Label>
                    <p className="text-xs text-muted-foreground">
                      Recevoir et partager du contenu adulte
                    </p>
                  </div>
                  <Switch checked={acceptsNsfw} onCheckedChange={setAcceptsNsfw} />
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl bg-card border border-border/50 shadow-sm">
                  <div className="space-y-0.5 pr-3">
                    <Label className="text-sm font-medium">Montrer mon visage</Label>
                    <p className="text-xs text-muted-foreground">
                      Afficher ta photo publiquement
                    </p>
                  </div>
                  <Switch checked={showFace} onCheckedChange={setShowFace} />
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl bg-card border border-border/50 shadow-sm">
                  <div className="space-y-0.5 pr-3">
                    <Label className="text-sm font-medium">Afficher mon anniversaire</Label>
                    <p className="text-xs text-muted-foreground">
                      Les autres verront ta date d'anniversaire
                    </p>
                  </div>
                  <Switch checked={showBirthday} onCheckedChange={setShowBirthday} />
                </div>

                <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/15">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    🔒 Tes informations de santé et préférences ne sont visibles que par les personnes avec qui tu choisis de les partager.
                  </p>
                </div>
              </TabsContent>
            </div>
          </div>
        </Tabs>

        <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-border/50 bg-muted/30">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="text-muted-foreground">
            Annuler
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isSaving || isUploading} className="min-w-[120px]">
            {isSaving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                Enregistrement...
              </>
            ) : (
              'Enregistrer'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileEditDialog;
