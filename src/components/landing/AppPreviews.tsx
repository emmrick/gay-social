import { MapPin, ShieldCheck, Heart, X, MessageCircle, Camera, Send, Check, CheckCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import fakeProfile1 from '@/assets/fake-profile-1.jpg';
import fakeProfile2 from '@/assets/fake-profile-2.jpg';
import fakeProfile3 from '@/assets/fake-profile-3.jpg';
import fakeProfile4 from '@/assets/fake-profile-4.jpg';
import fakeProfile5 from '@/assets/fake-profile-5.jpg';
import fakeProfile6 from '@/assets/fake-profile-6.jpg';

const FAKE_PROFILES = [
  { name: 'Lucas', age: 25, city: 'Paris', photo: fakeProfile1, online: true, verified: true, position: 'Versatile', tribe: '✨ Twink' },
  { name: 'Karim', age: 30, city: 'Lyon', photo: fakeProfile2, online: true, verified: true, position: 'Actif', tribe: '💪 Jock' },
  { name: 'Antoine', age: 28, city: 'Bordeaux', photo: fakeProfile3, online: false, verified: true, position: 'Passif', tribe: '✨ Twink' },
  { name: 'Marc', age: 35, city: 'Marseille', photo: fakeProfile4, online: true, verified: true, position: 'Versatile', tribe: '🐻 Bear' },
  { name: 'Enzo', age: 22, city: 'Nantes', photo: fakeProfile5, online: true, verified: false, position: 'Passif', tribe: '✨ Twink' },
  { name: 'Bastien', age: 33, city: 'Toulouse', photo: fakeProfile6, online: false, verified: true, position: 'Actif', tribe: '🐻 Bear' },
];

/**
 * Realistic preview of the member grid (Home view)
 */
export const ProfileGridPreview = () => (
  <div className="bg-card rounded-2xl border border-border/50 overflow-hidden shadow-xl">
    {/* Header bar */}
    <div className="bg-card border-b border-border/50 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <MapPin className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">À proximité</span>
      </div>
      <span className="text-xs text-muted-foreground">6 en ligne</span>
    </div>

    {/* Grid */}
    <div className="grid grid-cols-2 gap-1.5 p-2">
      {FAKE_PROFILES.map((profile, i) => (
        <div key={i} className="relative rounded-xl overflow-hidden aspect-[3/4] group">
          <img
            src={profile.photo}
            alt={`Profil de ${profile.name}`}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          
          {/* Online indicator */}
          {profile.online && (
            <div className="absolute top-2 right-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500 ring-2 ring-black/30" />
              </span>
            </div>
          )}

          {/* Verified badge */}
          {profile.verified && (
            <div className="absolute top-2 left-2">
              <ShieldCheck className="w-4 h-4 text-blue-400 drop-shadow" />
            </div>
          )}

          {/* Info overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-2">
            <p className="text-white text-xs font-bold drop-shadow">
              {profile.name}, {profile.age}
            </p>
            <p className="text-white/70 text-[10px] flex items-center gap-1">
              <MapPin className="w-2.5 h-2.5" /> {profile.city}
            </p>
          </div>
        </div>
      ))}
    </div>
  </div>
);

/**
 * Realistic preview of the Swipe card
 */
export const SwipeCardPreview = () => (
  <div className="bg-card rounded-2xl border border-border/50 overflow-hidden shadow-xl">
    {/* Swipe card */}
    <div className="relative aspect-[3/4] overflow-hidden">
      <img
        src={fakeProfile1}
        alt="Profil swipe Lucas"
        className="w-full h-full object-cover"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

      {/* Profile info */}
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-white text-lg font-bold">Lucas, 25</h3>
          <ShieldCheck className="w-4 h-4 text-blue-400" />
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
          </span>
        </div>
        <p className="text-white/80 text-xs flex items-center gap-1 mb-2">
          <MapPin className="w-3 h-3" /> Paris · 2 km
        </p>
        <div className="flex gap-1.5 flex-wrap">
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/15 text-white/90 backdrop-blur-sm">↕️ Versatile</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/15 text-white/90 backdrop-blur-sm">✨ Twink</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/15 text-white/90 backdrop-blur-sm">💬 Discussion</span>
        </div>
      </div>

      {/* Like/Nope overlays (static decorative) */}
      <div className="absolute top-4 left-4 rotate-[-15deg] border-4 border-green-500 rounded-xl px-3 py-1 opacity-0 group-hover:opacity-60">
        <span className="text-green-500 text-lg font-black">LIKE</span>
      </div>
    </div>

    {/* Action buttons */}
    <div className="flex items-center justify-center gap-4 p-4 bg-card">
      <button className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center border border-destructive/20">
        <X className="w-6 h-6 text-destructive" />
      </button>
      <button className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/30">
        <Heart className="w-7 h-7 text-primary fill-primary" />
      </button>
      <button className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
        <MessageCircle className="w-6 h-6 text-blue-500" />
      </button>
    </div>
  </div>
);

/**
 * Realistic preview of a private chat conversation
 */
export const ChatPreview = () => (
  <div className="bg-card rounded-2xl border border-border/50 overflow-hidden shadow-xl">
    {/* Chat header */}
    <div className="bg-card border-b border-border/50 px-4 py-3 flex items-center gap-3">
      <div className="relative">
        <img src={fakeProfile2} alt="Karim" className="w-9 h-9 rounded-full object-cover" />
        <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500 ring-2 ring-card" />
        </span>
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-semibold text-foreground">Karim</p>
          <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
        </div>
        <p className="text-[10px] text-green-500">En ligne</p>
      </div>
      <Camera className="w-5 h-5 text-muted-foreground" />
    </div>

    {/* Messages */}
    <div className="p-3 space-y-3 min-h-[200px]">
      {/* Received */}
      <div className="flex gap-2 items-end max-w-[80%]">
        <img src={fakeProfile2} alt="" className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
        <div className="bg-secondary rounded-2xl rounded-bl-md px-3 py-2">
          <p className="text-xs text-foreground">Salut ! Tu es dans quel coin de Lyon ? 😊</p>
          <p className="text-[9px] text-muted-foreground mt-1">14:32</p>
        </div>
      </div>

      {/* Sent */}
      <div className="flex justify-end">
        <div className="bg-primary text-primary-foreground rounded-2xl rounded-br-md px-3 py-2 max-w-[80%]">
          <p className="text-xs">Hey ! Je suis vers Part-Dieu, et toi ?</p>
          <div className="flex items-center justify-end gap-1 mt-1">
            <p className="text-[9px] opacity-70">14:33</p>
            <CheckCheck className="w-3 h-3 opacity-70" />
          </div>
        </div>
      </div>

      {/* Received */}
      <div className="flex gap-2 items-end max-w-[80%]">
        <img src={fakeProfile2} alt="" className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
        <div className="bg-secondary rounded-2xl rounded-bl-md px-3 py-2">
          <p className="text-xs text-foreground">Croix-Rousse 😄 On est pas loin !</p>
          <p className="text-[9px] text-muted-foreground mt-1">14:34</p>
        </div>
      </div>

      {/* Ephemeral media hint */}
      <div className="flex justify-end">
        <div className="bg-primary/10 border border-primary/20 rounded-2xl rounded-br-md px-3 py-2 max-w-[80%] flex items-center gap-2">
          <Camera className="w-4 h-4 text-primary" />
          <div>
            <p className="text-xs text-foreground font-medium">📸 Photo éphémère</p>
            <p className="text-[9px] text-muted-foreground">Expire après consultation</p>
          </div>
        </div>
      </div>
    </div>

    {/* Input bar */}
    <div className="border-t border-border/50 px-3 py-2 flex items-center gap-2">
      <Camera className="w-5 h-5 text-muted-foreground" />
      <div className="flex-1 bg-secondary/50 rounded-full px-3 py-1.5">
        <p className="text-xs text-muted-foreground">Message...</p>
      </div>
      <Send className="w-5 h-5 text-primary" />
    </div>
  </div>
);
