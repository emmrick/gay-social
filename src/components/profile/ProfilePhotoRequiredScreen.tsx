import { Camera, AlertTriangle, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import PhotoGalleryManager from './PhotoGalleryManager';

const ProfilePhotoRequiredScreen = () => {
  const { profile } = useAuth();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="bg-destructive/10 border-b border-destructive/20 px-4 py-3">
        <div className="flex items-center gap-2 text-destructive">
          <ShieldAlert className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-semibold">Photo de profil obligatoire</span>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-4 py-6 space-y-6">
        {/* Welcome */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Camera className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-xl font-bold">
            Bienvenue {profile?.username ?? ''} 👋
          </h1>
          <p className="text-muted-foreground text-sm">
            Pour accéder au site, vous devez ajouter au moins <strong>une photo de profil</strong>.
          </p>
        </div>

        {/* Rules */}
        <div className="bg-secondary/60 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Règles concernant les photos
          </div>
          <ul className="text-xs text-muted-foreground space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-destructive font-bold">✗</span>
              <span>Les photos d'écran noir, de paysages ou d'objets ne sont <strong>pas autorisées</strong>.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-destructive font-bold">✗</span>
              <span>Les photos de célébrités, logos ou images tirées d'internet sont <strong>interdites</strong>.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 font-bold">✓</span>
              <span>Votre photo doit vous représenter (visage, corps ou partie du corps).</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 font-bold">✓</span>
              <span>Les photos suggestives ou intimes sont autorisées — aucun jugement ici.</span>
            </li>
          </ul>
          <div className="border-t border-border pt-2 mt-2">
            <p className="text-xs text-destructive font-medium">
              ⚠️ Le non-respect de ces conditions entraînera la <strong>suspension ou le bannissement</strong> de votre compte.
            </p>
          </div>
        </div>

        {/* Info about blocking */}
        <div className="bg-primary/5 rounded-xl p-4">
          <p className="text-xs text-muted-foreground">
            💡 Les membres peuvent bloquer un profil s'ils ne sont pas intéressés — c'est normal et sans conséquence. Aucune remarque ou jugement n'est toléré sur le site.
          </p>
        </div>

        {/* Photo Gallery Manager */}
        <div className="border rounded-xl p-4 bg-card">
          <PhotoGalleryManager />
        </div>
      </div>
    </div>
  );
};

export default ProfilePhotoRequiredScreen;
