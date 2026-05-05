import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import useGeolocation from '@/hooks/useGeolocation';
import { useNearbyProfiles } from '@/hooks/useNearbyProfiles';
import GeolocationGate from './GeolocationGate';
import { Loader2 } from 'lucide-react';

interface MapTabProps {
  onViewProfile?: (userId: string) => void;
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

const buildAvatarIcon = (url: string | null, label?: string, opts?: { isSelf?: boolean; isOnline?: boolean }) => {
  const isSelf = !!opts?.isSelf;
  const isOnline = !!opts?.isOnline;
  const ring = isSelf ? 'hsl(var(--accent))' : 'hsl(var(--primary))';
  const size = isSelf ? 38 : 34;
  const bg = url
    ? `background-image:url('${url}');background-size:cover;background-position:center;`
    : `background:linear-gradient(135deg,hsl(var(--primary)/.6),hsl(var(--accent)/.6));`;

  const dot = isOnline
    ? `<span style="position:absolute;right:-2px;bottom:-2px;width:10px;height:10px;border-radius:9999px;background:#22c55e;border:2px solid hsl(var(--background));"></span>`
    : '';

  const pulse = isSelf
    ? `<span style="position:absolute;inset:-6px;border-radius:9999px;border:2px solid hsl(var(--accent)/.5);animation:gs-pulse 2s ease-out infinite;"></span>`
    : '';

  const name = label
    ? `<span style="margin-top:4px;max-width:80px;padding:2px 6px;border-radius:9999px;background:hsl(var(--background)/.92);color:hsl(var(--foreground));font:600 10px/1.1 'Plus Jakarta Sans',system-ui,sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;box-shadow:0 2px 6px rgba(0,0,0,.25);backdrop-filter:blur(6px);">${escapeHtml(label)}</span>`
    : '';

  const totalH = size + (label ? 20 : 0) + 6;

  return L.divIcon({
    className: 'gs-map-marker',
    html: `<div style="position:relative;display:flex;flex-direction:column;align-items:center;transform:translateY(-2px);">
      ${pulse}
      <div style="position:relative;width:${size}px;height:${size}px;border-radius:9999px;border:2.5px solid ${ring};box-shadow:0 4px 14px rgba(0,0,0,.35),0 0 0 2px hsl(var(--background));${bg}">
        ${dot}
      </div>
      <span style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:6px solid ${ring};margin-top:-1px;filter:drop-shadow(0 2px 2px rgba(0,0,0,.25));"></span>
      ${name}
    </div>`,
    iconSize: [Math.max(size, 84), totalH],
    iconAnchor: [Math.max(size, 84) / 2, size + 6],
    popupAnchor: [0, -(size + 4)],
  });
};

const Recenter = ({ lat, lng }: { lat: number; lng: number }) => {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], map.getZoom());
  }, [lat, lng, map]);
  return null;
};

const MapTab = ({ onViewProfile }: MapTabProps) => {
  const { latitude, longitude, loading, error, permissionState, requestLocation } = useGeolocation();
  const { data: profiles = [], isLoading } = useNearbyProfiles(latitude, longitude, 50);

  const userIds = useMemo(() => profiles.map((p: any) => p.user_id), [profiles]);

  const { data: coords = [] } = useQuery({
    queryKey: ['nearby-profile-coords', userIds.join(',')],
    enabled: userIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('user_id, latitude, longitude')
        .in('user_id', userIds);
      return data ?? [];
    },
    staleTime: 60000,
  });

  const hasLocation = latitude != null && longitude != null;

  const markers = useMemo(() => {
    const coordMap = new Map(coords.map((c: any) => [c.user_id, c]));
    return profiles
      .map((p: any) => {
        const c = coordMap.get(p.user_id) as any;
        return c?.latitude != null && c?.longitude != null
          ? { ...p, latitude: c.latitude, longitude: c.longitude }
          : null;
      })
      .filter(Boolean) as any[];
  }, [profiles, coords]);

  if (!hasLocation) {
    return (
      <GeolocationGate
        permissionState={permissionState}
        loading={loading}
        error={error}
        onRequest={() => requestLocation(true)}
      />
    );
  }

  return (
    <div className="relative w-full h-[70vh] rounded-2xl overflow-hidden border border-border/40 shadow-lg">
      {isLoading && (
        <div className="absolute top-3 right-3 z-[500] bg-card/90 backdrop-blur rounded-full px-3 py-1.5 text-xs flex items-center gap-1.5 shadow">
          <Loader2 className="w-3 h-3 animate-spin" /> Chargement…
        </div>
      )}
      <MapContainer
        center={[latitude!, longitude!]}
        zoom={13}
        scrollWheelZoom
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Recenter lat={latitude!} lng={longitude!} />

        <Marker position={[latitude!, longitude!]} icon={buildAvatarIcon(null, 'Toi', { isSelf: true })}>
          <Popup>Toi</Popup>
        </Marker>

        {markers.map((p: any) => (
          <Marker
            key={p.user_id}
            position={[p.latitude, p.longitude]}
            icon={buildAvatarIcon(p.avatar_url, p.username, { isOnline: p.is_online })}
            eventHandlers={{
              click: () => onViewProfile?.(p.user_id),
            }}
          >
            <Popup>
              <div className="flex items-center gap-2">
                {p.avatar_url && (
                  <img src={p.avatar_url} alt={p.username} className="w-10 h-10 rounded-full object-cover" />
                )}
                <div>
                  <div className="font-bold text-sm">{p.username}</div>
                  {p.distance_km != null && (
                    <div className="text-xs opacity-70">{p.distance_km.toFixed(1)} km</div>
                  )}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default MapTab;
