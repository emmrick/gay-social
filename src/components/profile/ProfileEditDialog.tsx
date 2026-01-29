import { useState, useRef, useEffect } from 'react';
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
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Basic info
  const [username, setUsername] = useState('');
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
  
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Reset form when dialog opens
  useEffect(() => {
    if (open && profile) {
      setUsername(profile.username || '');
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

      return publicUrl;
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
      } as any);

      if (error) throw error;

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle>Modifier le profil</DialogTitle>
          <DialogDescription>
            Complete ton profil pour plus de visibilité
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="photos" className="flex-1">
          <TabsList className="grid grid-cols-5 mx-6">
            <TabsTrigger value="photos" className="text-xs">Photos</TabsTrigger>
            <TabsTrigger value="basic" className="text-xs">Profil</TabsTrigger>
            <TabsTrigger value="physical" className="text-xs">Physique</TabsTrigger>
            <TabsTrigger value="preferences" className="text-xs">Préfs</TabsTrigger>
            <TabsTrigger value="privacy" className="text-xs">Vie privée</TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[400px] px-6">
            {/* Photos Tab */}
            <TabsContent value="photos" className="mt-4 pb-4">
              <PhotoGalleryManager />
            </TabsContent>

            {/* Basic Info Tab */}
            <TabsContent value="basic" className="space-y-4 mt-4 pb-4">

              <div className="space-y-2">
                <Label htmlFor="username">Pseudo *</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Ton pseudo"
                  maxLength={30}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="age">Âge *</Label>
                  <Input
                    id="age"
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="18-99"
                    min={18}
                    max={99}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Situation</Label>
                  <Select value={relationshipStatus} onValueChange={setRelationshipStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      {RELATIONSHIP_STATUS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Décris-toi en quelques mots..."
                  maxLength={200}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground text-right">{bio.length}/200</p>
              </div>
            </TabsContent>

            {/* Physical Tab */}
            <TabsContent value="physical" className="space-y-4 mt-4 pb-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="height">Taille (cm)</Label>
                  <Input
                    id="height"
                    type="number"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    placeholder="175"
                    min={100}
                    max={250}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="weight">Poids (kg)</Label>
                  <Input
                    id="weight"
                    type="number"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="75"
                    min={30}
                    max={300}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Corpulence</Label>
                <Select value={bodyType} onValueChange={setBodyType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    {BODY_TYPES.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Origine</Label>
                <Select value={ethnicity} onValueChange={setEthnicity}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    {ETHNICITIES.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Attribut 🍆</Label>
                <Select value={endowment} onValueChange={setEndowment}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    {ENDOWMENT_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tribes / Style</Label>
                <div className="flex flex-wrap gap-2">
                  {TRIBES.map(tribe => (
                    <Badge
                      key={tribe.value}
                      variant={tribes.includes(tribe.value) ? 'default' : 'outline'}
                      className={cn(
                        'cursor-pointer transition-all',
                        tribes.includes(tribe.value) && 'bg-primary'
                      )}
                      onClick={() => toggleArrayValue(tribes, tribe.value, setTribes)}
                    >
                      {tribe.label}
                    </Badge>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Preferences Tab */}
            <TabsContent value="preferences" className="space-y-4 mt-4 pb-4">
              <div className="space-y-2">
                <Label>Position sexuelle</Label>
                <Select value={sexualPosition} onValueChange={setSexualPosition}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    {SEXUAL_POSITIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Je cherche</Label>
                <div className="flex flex-wrap gap-2">
                  {LOOKING_FOR_OPTIONS.map(opt => (
                    <Badge
                      key={opt.value}
                      variant={lookingFor.includes(opt.value) ? 'default' : 'outline'}
                      className={cn(
                        'cursor-pointer transition-all',
                        lookingFor.includes(opt.value) && 'bg-primary'
                      )}
                      onClick={() => toggleArrayValue(lookingFor, opt.value, setLookingFor)}
                    >
                      {opt.label}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Statut VIH</Label>
                <Select value={hivStatus} onValueChange={setHivStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    {HIV_STATUS_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Cette information reste privée jusqu'à ce que tu la partages
                </p>
              </div>
            </TabsContent>

            {/* Privacy Tab */}
            <TabsContent value="privacy" className="space-y-4 mt-4 pb-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/50">
                <div className="space-y-0.5">
                  <Label>Contenu NSFW</Label>
                  <p className="text-sm text-muted-foreground">
                    Recevoir et partager du contenu adulte
                  </p>
                </div>
                <Switch checked={acceptsNsfw} onCheckedChange={setAcceptsNsfw} />
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/50">
                <div className="space-y-0.5">
                  <Label>Montrer mon visage</Label>
                  <p className="text-sm text-muted-foreground">
                    Afficher ta photo de profil publiquement
                  </p>
                </div>
                <Switch checked={showFace} onCheckedChange={setShowFace} />
              </div>

              <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
                <p className="text-sm text-muted-foreground">
                  🔒 Tes informations de santé et préférences ne sont visibles que par les personnes avec qui tu choisis de les partager.
                </p>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <DialogFooter className="px-6 pb-6 pt-2 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={isSaving || isUploading}>
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enregistrement...
              </>
            ) : (
              'Enregistrer'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileEditDialog;
