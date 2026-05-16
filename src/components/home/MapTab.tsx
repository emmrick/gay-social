import { useEffect, useMemo, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import useGeolocation from '@/hooks/useGeolocation';
import { useNearbyProfiles } from '@/hooks/useNearbyProfiles';
import { getSignedAvatarUrl } from '@/hooks/useAvatarUrl';
import GeolocationGate from './GeolocationGate';
import { Loader2, LocateFixed, RefreshCw, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MapTabProps {
  onViewProfile?: (userId: string) => void;
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

const buildAvatarIcon = (url: string | null, label?: string, opts?: { isSelf?: boolean; isOnline?: boolean }) => {
  const isSelf = !!opts?.isSelf;
  const isOnline = !!opts?.isOnline;
  const ring = isSelf ? 'hsl(var(--accent))' : 'hsl(var(--primary))';
  const size = isSelf ? 40 : 36;
  const safeUrl = url ? url.replace(/'/g, "%27") : null;
  const bg = safeUrl
    ? `background-image:url('${safeUrl}');background-size:cover;background-position:center;`
    : `background:linear-gradient(135deg,hsl(var(--primary)/.7),hsl(var(--accent)/.7));`;

  const dot = isOnline && !isSelf
    ? `<span style="position:absolute;right:-1px;bottom:-1px;width:11px;height:11px;border-radius:9999px;background:#22c55e;border:2px solid hsl(var(--background));box-shadow:0 0 0 1px rgba(0,0,0,.15);"></span>`
    : '';

  const pulse = isSelf
    ? `<span style="position:absolute;width:${size + 14}px;height:${size + 14}px;border-radius:9999px;border:2px solid hsl(var(--accent)/.55);animation:gs-pulse 2s ease-out infinite;top:-7px;"></span>`
    : '';

  const name = label
    ? `<span style="margin-top:5px;max-width:90px;padding:2px 7px;border-radius:9999px;background:hsl(var(--background)/.95);color:hsl(var(--foreground));font:700 10px/1.15 'Plus Jakarta Sans',system-ui,sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;box-shadow:0 2px 8px rgba(0,0,0,.3);backdrop-filter:blur(8px);border:1px solid hsl(var(--border)/.4);">${escapeHtml(label)}</span>`
    : '';

  const totalH = size + (label ? 22 : 0) + 8;
  const w = Math.max(size, 90);

  return L.divIcon({
    className: 'gs-map-marker',
    html: `<div style="position:relative;display:flex;flex-direction:column;align-items:center;">
      ${pulse}
      <div style="position:relative;width:${size}px;height:${size}px;border-radius:9999px;border:2.5px solid ${ring};box-shadow:0 4px 14px rgba(0,0,0,.4),0 0 0 2px hsl(var(--background));${bg}">
        ${dot}
      </div>
      <span style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:7px solid ${ring};margin-top:-1px;filter:drop-shadow(0 2px 2px rgba(0,0,0,.3));"></span>
      ${name}
    </div>`,
    iconSize: [w, totalH],
    iconAnchor: [w / 2, size + 8],
    popupAnchor: [0, -(size + 6)],
  });
};

const InvalidateOnMount = () => {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 100);
    return () => clearTimeout(t);
  }, [map]);
  return null;
};

const MapController = ({
  lat,
  lng,
  onMapReady,
}: {
  lat: number;
  lng: number;
  onMapReady: (m: L.Map) => void;
}) => {
  const map = useMap();
  const centeredRef = useRef(false);

  useEffect(() => {
    onMapReady(map);
  }, [map, onMapReady]);

  // Centre par défaut sur la position de l'utilisateur avec un rayon visible ~15 km.
  useEffect(() => {
    if (centeredRef.current) return;
    if (lat == null || lng == null) return;
    try {
      // 15 km de rayon autour de l'utilisateur → bounds carré ~30 km
      const circle = L.latLng(lat, lng).toBounds(15000 * 2);
      map.fitBounds(circle, { padding: [20, 20], maxZoom: 13 });
      centeredRef.current = true;
    } catch {
      map.setView([lat, lng], 12);
      centeredRef.current = true;
    }
  }, [lat, lng, map]);

  return null;
};


const MapTab = ({ onViewProfile }: MapTabProps) => {
  const { latitude, longitude, loading, error, permissionState, requestLocation } = useGeolocation();
  const { data: profiles = [], isLoading, isFetching, refetch } = useNearbyProfiles(latitude, longitude, 50);
  const mapRef = useRef<L.Map | null>(null);
  const [signedAvatars, setSignedAvatars] = useState<Map<string, string>>(new Map());

  const userIds = useMemo(() => profiles.map((p: any) => p.user_id), [profiles]);
  const userIdsKey = userIds.join(',');

  const { data: coords = [] } = useQuery({
    queryKey: ['nearby-profile-coords', userIdsKey],
    enabled: userIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_profile_map_coords' as any, {
        _user_ids: userIds,
      });
      if (error) {
        console.error('[MapTab] coords RPC error', error);
        return [];
      }
      return (data ?? []) as Array<{ user_id: string; latitude: number; longitude: number }>;
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

  // Resolve signed URLs for visible avatars
  useEffect(() => {
    let cancelled = false;
    const toResolve = markers
      .map((m) => m.avatar_url as string | null)
      .filter((u): u is string => !!u && !signedAvatars.has(u));
    if (toResolve.length === 0) return;
    (async () => {
      const entries = await Promise.all(
        toResolve.map(async (u) => [u, (await getSignedAvatarUrl(u)) ?? u] as const),
      );
      if (cancelled) return;
      setSignedAvatars((prev) => {
        const next = new Map(prev);
        for (const [k, v] of entries) next.set(k, v);
        return next;
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [markers, signedAvatars]);

  const recenter = () => {
    if (mapRef.current && hasLocation) {
      mapRef.current.setView([latitude!, longitude!], 13, { animate: true });
    }
  };

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
    <div className="relative w-full h-[calc(100dvh-260px)] min-h-[420px] rounded-2xl overflow-hidden border border-border/40 shadow-lg bg-muted/30">
      {/* Top badges */}
      <div className="absolute top-3 left-3 z-[500] flex items-center gap-2">
        <div className="bg-card/90 backdrop-blur-md rounded-full px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 shadow-md border border-border/40">
          <Users className="w-3.5 h-3.5 text-primary" />
          <span>{markers.length}</span>
          <span className="text-muted-foreground font-medium">à proximité</span>
        </div>
        {(isLoading || isFetching) && (
          <div className="bg-card/90 backdrop-blur-md rounded-full px-2.5 py-1.5 shadow-md border border-border/40">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
          </div>
        )}
      </div>

      {/* Right action stack */}
      <div className="absolute top-3 right-3 z-[500] flex flex-col gap-2">
        <Button
          size="icon"
          variant="secondary"
          className="h-9 w-9 rounded-full shadow-md bg-card/95 backdrop-blur-md border border-border/40 hover:bg-card"
          onClick={recenter}
          aria-label="Recentrer sur ma position"
        >
          <LocateFixed className="w-4 h-4 text-primary" />
        </Button>
        <Button
          size="icon"
          variant="secondary"
          className="h-9 w-9 rounded-full shadow-md bg-card/95 backdrop-blur-md border border-border/40 hover:bg-card"
          onClick={() => {
            void requestLocation(true);
            void refetch();
          }}
          aria-label="Actualiser"
        >
          <RefreshCw className={`w-4 h-4 text-primary ${isFetching ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <MapContainer
        center={[latitude!, longitude!]}
        zoom={13}
        scrollWheelZoom
        zoomControl={false}
        style={{ height: '100%', width: '100%' }}
        preferCanvas
      >
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />
        <InvalidateOnMount />
        <MapController
          lat={latitude!}
          lng={longitude!}
          
          onMapReady={(m) => {
            mapRef.current = m;
          }}
        />

        {/* Self accuracy ring */}
        <Circle
          center={[latitude!, longitude!]}
          radius={300}
          pathOptions={{
            color: 'hsl(var(--accent))',
            fillColor: 'hsl(var(--accent))',
            fillOpacity: 0.08,
            weight: 1,
          }}
        />

        <Marker position={[latitude!, longitude!]} icon={buildAvatarIcon(null, 'Toi', { isSelf: true })}>
          <Popup>Ta position</Popup>
        </Marker>

        {markers.map((p: any) => {
          const signed = p.avatar_url ? signedAvatars.get(p.avatar_url) ?? null : null;
          return (
            <Marker
              key={p.user_id}
              position={[p.latitude, p.longitude]}
              icon={buildAvatarIcon(signed, p.username, { isOnline: p.is_online })}
              eventHandlers={{
                click: () => onViewProfile?.(p.user_id),
              }}
            >
              <Popup>
                <button
                  onClick={() => onViewProfile?.(p.user_id)}
                  className="flex items-center gap-2.5 min-w-[160px] text-left"
                >
                  {signed ? (
                    <img src={signed} alt={p.username} className="w-11 h-11 rounded-full object-cover border-2 border-primary/40" />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary/40 to-accent/40" />
                  )}
                  <div className="flex-1">
                    <div className="font-bold text-sm">{p.username}</div>
                    <div className="flex items-center gap-1.5 text-xs opacity-70 mt-0.5">
                      {p.is_online && (
                        <span className="inline-flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> En ligne
                        </span>
                      )}
                      {p.distance_km != null && (
                        <span>{p.distance_km < 1 ? `${Math.round(p.distance_km * 1000)} m` : `${p.distance_km.toFixed(1)} km`}</span>
                      )}
                    </div>
                  </div>
                </button>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};

export default MapTab;
