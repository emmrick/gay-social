import { useState, useRef } from 'react';
import { Camera, Loader2, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface ProfileEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ProfileEditDialog = ({ open, onOpenChange }: ProfileEditDialogProps) => {
  const { user, profile, updateProfile } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [username, setUsername] = useState(profile?.username || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [age, setAge] = useState<string>(profile?.age?.toString() || '');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile?.avatar_url || null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Reset form when dialog opens
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setUsername(profile?.username || '');
      setBio(profile?.bio || '');
      setAge(profile?.age?.toString() || '');
      setAvatarPreview(profile?.avatar_url || null);
      setAvatarFile(null);
    }
    onOpenChange(isOpen);
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Type de fichier invalide',
        description: 'Veuillez sélectionner une image (JPG, PNG, etc.)',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Fichier trop volumineux',
        description: 'La taille maximale est de 5 Mo',
        variant: 'destructive',
      });
      return;
    }

    setAvatarFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarFile || !user) return profile?.avatar_url || null;

    setIsUploading(true);
    try {
      const fileExt = avatarFile.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      // Delete old avatar if exists
      if (profile?.avatar_url) {
        const oldPath = profile.avatar_url.split('/').slice(-2).join('/');
        await supabase.storage.from('avatars').remove([oldPath]);
      }

      // Upload new avatar
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, avatarFile, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
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
        description: 'Le nom d\'utilisateur ne peut pas dépasser 30 caractères',
        variant: 'destructive',
      });
      return;
    }

    if (bio && bio.length > 200) {
      toast({
        title: 'Erreur',
        description: 'La bio ne peut pas dépasser 200 caractères',
        variant: 'destructive',
      });
      return;
    }

    const ageNum = age ? parseInt(age, 10) : null;
    if (age && (isNaN(ageNum!) || ageNum! < 18 || ageNum! > 99)) {
      toast({
        title: 'Erreur',
        description: 'L\'âge doit être compris entre 18 et 99 ans',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      // Upload avatar if changed
      let avatarUrl = profile?.avatar_url;
      if (avatarFile) {
        avatarUrl = await uploadAvatar();
      }

      // Update profile
      const ageValue = age ? parseInt(age, 10) : null;
      const { error } = await updateProfile({
        username: username.trim(),
        bio: bio.trim() || null,
        age: ageValue,
        avatar_url: avatarUrl,
      });

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
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Modifier le profil</DialogTitle>
          <DialogDescription>
            Personnalisez votre profil pour vous démarquer
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-4">
            <button
              type="button"
              onClick={handleAvatarClick}
              className="relative group"
              disabled={isUploading}
            >
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-3xl font-bold overflow-hidden">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-10 h-10" />
                )}
              </div>
              <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                {isUploading ? (
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                ) : (
                  <Camera className="w-6 h-6 text-white" />
                )}
              </div>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <p className="text-xs text-muted-foreground">
              Cliquez pour changer votre avatar
            </p>
          </div>

          {/* Username */}
          <div className="space-y-2">
            <Label htmlFor="username">Nom d'utilisateur</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Votre pseudo"
              maxLength={30}
            />
            <p className="text-xs text-muted-foreground text-right">
              {username.length}/30
            </p>
          </div>

          {/* Age */}
          <div className="space-y-2">
            <Label htmlFor="age">Âge</Label>
            <Input
              id="age"
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="Votre âge"
              min={18}
              max={99}
            />
            <p className="text-xs text-muted-foreground">
              Minimum 18 ans
            </p>
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Parlez de vous..."
              maxLength={200}
              rows={3}
            />
            <p className="text-xs text-muted-foreground text-right">
              {bio.length}/200
            </p>
          </div>
        </div>

        <DialogFooter>
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
