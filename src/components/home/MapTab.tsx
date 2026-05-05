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

const buildAvatarIcon = (url: string | null, isSelf = false) => {
  const ring = isSelf ? 'hsl(var(--accent))' : 'hsl(var(--primary))';
  const bg = url
    ? `background-image:url('${url}');background-size:cover;background-position:center;`
    : 'background:hsl(var(--muted));';
  return L.divIcon({
    className: 'gs-map-marker',
    html: `<div style="width:42px;height:42px;border-radius:9999px;border:3px solid ${ring};box-shadow:0 4px 12px rgba(0,0,0,.3);${bg}"></div>`,
    iconSize: [42, 42],
    iconAnchor: [21, 21],
    popupAnchor: [0, -22],
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

        <Marker position={[latitude!, longitude!]} icon={buildAvatarIcon(null, true)}>
          <Popup>Toi</Popup>
        </Marker>

        {markers.map((p: any) => (
          <Marker
            key={p.user_id}
            position={[p.latitude, p.longitude]}
            icon={buildAvatarIcon(p.avatar_url)}
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
