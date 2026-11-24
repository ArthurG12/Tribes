"use client";

import { useEffect, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import { LoaderCircle, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { googleMapsSearchUrl } from "@/lib/event-maps";

export interface EventLocation {
  lat: number;
  lon: number;
  formatted: string;
}

export interface EventMapPoint {
  id?: string;
  lat: number;
  lon: number;
  formatted: string;
}

const DEFAULT_CENTER: [number, number] = [-14.2, -51.9];
let mapsApiKeyRequest: Promise<string> | null = null;

async function requestMapsApiKey() {
  if (!mapsApiKeyRequest) {
    mapsApiKeyRequest = fetch("/api/maps-config", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("Não foi possível carregar a configuração dos mapas.");
        return response.json() as Promise<{ apiKey?: unknown }>;
      })
      .then((configuration) => typeof configuration.apiKey === "string" ? configuration.apiKey : "")
      .catch((error: unknown) => {
        mapsApiKeyRequest = null;
        throw error;
      });
  }
  return mapsApiKeyRequest;
}

export function useMapsApiKey() {
  const [apiKey, setApiKey] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void requestMapsApiKey()
      .then((key) => { if (active) setApiKey(key); })
      .catch(() => { if (active) setApiKey(""); });
    return () => { active = false; };
  }, []);

  return apiKey;
}

function isValidPoint(point: EventMapPoint) {
  return Number.isFinite(point.lat) && point.lat >= -90 && point.lat <= 90 &&
    Number.isFinite(point.lon) && point.lon >= -180 && point.lon <= 180;
}

function markerIcon(leaflet: typeof import("leaflet")) {
  return leaflet.divIcon({
    className: "tribes-map-marker",
    html: '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="42" viewBox="0 0 32 42" aria-hidden="true"><path fill="#dc4b38" stroke="#fff" stroke-width="2" d="M16 1C7.72 1 1 7.72 1 16c0 11.25 15 25 15 25s15-13.75 15-25C31 7.72 24.28 1 16 1Z"/><circle cx="16" cy="16" r="5" fill="#fff"/></svg>',
    iconSize: [32, 42],
    iconAnchor: [16, 41],
    popupAnchor: [0, -38],
  });
}

export function EventLocationMap({ points, className = "" }: { points: EventMapPoint[]; className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const markersRef = useRef<Leaflet.LayerGroup | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const mapsApiKey = useMapsApiKey();

  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapsApiKey === null || mapsApiKey === "") return;
    const apiKey: string = mapsApiKey;

    let active = true;
    let map: Leaflet.Map | null = null;
    let markers: Leaflet.LayerGroup | null = null;

    async function initializeMap() {
      const leaflet = await import("leaflet");
      if (!active || !container) return;

      map = leaflet.map(container, {
        zoomControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
        touchZoom: false,
      }).setView(DEFAULT_CENTER, 4);
      leaflet.tileLayer(`https://maps.geoapify.com/v1/tile/osm-bright/{z}/{x}/{y}.png?apiKey=${encodeURIComponent(apiKey)}`, {
        attribution: 'Powered by <a href="https://www.geoapify.com/" target="_blank" rel="noreferrer">Geoapify</a> | <a href="https://openmaptiles.org/" target="_blank" rel="noreferrer">© OpenMapTiles</a> | <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a>',
        maxZoom: 20,
      }).addTo(map);
      markers = leaflet.layerGroup().addTo(map);
      leafletRef.current = leaflet;
      mapRef.current = map;
      markersRef.current = markers;
      setMapReady(true);
    }

    void initializeMap();
    return () => {
      active = false;
      leafletRef.current = null;
      mapRef.current = null;
      markersRef.current = null;
      map?.remove();
    };
  }, [mapsApiKey]);

  useEffect(() => {
    const map = mapRef.current;
    const markers = markersRef.current;
    const leaflet = leafletRef.current;
    if (!map || !markers || !leaflet || !mapReady) return;

    markers.clearLayers();
    const validPoints = points.filter(isValidPoint);
    for (const point of validPoints) {
      const marker = leaflet.marker([point.lat, point.lon], { icon: markerIcon(leaflet) }).addTo(markers);
      const popup = document.createElement("div");
      const location = document.createElement("p");
      location.textContent = point.formatted;
      const mapsLink = document.createElement("a");
      mapsLink.href = googleMapsSearchUrl({ location: point.formatted, lat: point.lat, lon: point.lon });
      mapsLink.target = "_blank";
      mapsLink.rel = "noopener noreferrer";
      mapsLink.textContent = "Abrir no Google Maps";
      popup.append(location, mapsLink);
      marker.bindPopup(popup);
    }
    if (validPoints.length === 1) {
      map.setView([validPoints[0].lat, validPoints[0].lon], 15);
    } else if (validPoints.length > 1) {
      map.fitBounds(leaflet.latLngBounds(validPoints.map((point): Leaflet.LatLngExpression => [point.lat, point.lon])), { padding: [24, 24] });
    }
  }, [mapReady, points]);

  return (
    <div className={`relative isolate h-56 w-full overflow-hidden rounded-xl border border-border bg-muted ${className}`}>
      {mapsApiKey ? (
        <div ref={containerRef} aria-label="Mapa de localização dos eventos" role="region" className="event-location-map h-full w-full" />
      ) : (
        <p className="flex h-full items-center justify-center px-4 text-center text-sm text-muted-foreground">
          {mapsApiKey === null ? "Carregando mapa…" : "Configure MAPS_API para exibir o mapa."}
        </p>
      )}
    </div>
  );
}

export function EventLocationPicker({
  id,
  label,
  value,
  coordinates,
  onChange,
  className = "",
}: {
  id: string;
  label: string;
  value: string;
  coordinates: Pick<EventLocation, "lat" | "lon"> | null;
  onChange: (value: string, location: EventLocation | null) => void;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const autocompleteRef = useRef<import("@geoapify/geocoder-autocomplete").GeocoderAutocomplete | null>(null);
  const selectedFormattedRef = useRef("");
  const proximityRef = useRef<{ lat: number; lon: number } | null>(null);
  const mapsApiKey = useMapsApiKey();
  const [locating, setLocating] = useState(false);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [locationError, setLocationError] = useState("");

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setLocationError("Este navegador não oferece acesso à localização.");
      return;
    }

    setLocating(true);
    setLocationError("");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const proximity = { lat: coords.latitude, lon: coords.longitude };
        proximityRef.current = proximity;
        const autocomplete = autocompleteRef.current;
        if (autocomplete) {
          autocomplete.addBiasByProximity(proximity);
          if (autocomplete.getValue().trim()) autocomplete.open();
        }
        setLocationEnabled(true);
        setLocating(false);
      },
      () => {
        setLocationError("Não foi possível acessar sua localização. Verifique a permissão do navegador e tente novamente.");
        setLocating(false);
      },
      { enableHighAccuracy: false, maximumAge: 300_000, timeout: 10_000 },
    );
  }

  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapsApiKey === null || mapsApiKey === "") return;
    const apiKey = mapsApiKey;

    let active = true;
    let autocomplete: import("@geoapify/geocoder-autocomplete").GeocoderAutocomplete | null = null;
    async function initializeAutocomplete() {
      const { GeocoderAutocomplete } = await import("@geoapify/geocoder-autocomplete");
      if (!active || !container) return;

      autocomplete = new GeocoderAutocomplete(container, apiKey, {
        lang: "pt",
        filter: { countrycode: ["br"] },
        limit: 5,
        placeholder: "Busque um endereço ou local...",
        debounceDelay: 300,
      });
      if (proximityRef.current) autocomplete.addBiasByProximity(proximityRef.current);
      autocompleteRef.current = autocomplete;
      autocomplete.setValue(value);
      const input = container.querySelector<HTMLInputElement>("input");
      if (input) {
        input.id = id;
        input.required = true;
        input.maxLength = 240;
        input.setAttribute("aria-label", label);
        input.setAttribute("autocomplete", "off");
      }

      autocomplete.on("input", () => {
        const typedValue = autocomplete?.getValue() ?? "";
        if (typedValue !== selectedFormattedRef.current) {
          selectedFormattedRef.current = "";
          onChange(typedValue, null);
        }
      });
      autocomplete.on("clear", () => {
        selectedFormattedRef.current = "";
        onChange("", null);
      });
      autocomplete.on("select", (feature: { properties?: { lat?: number; lon?: number; formatted?: string } } | null) => {
        const properties = feature?.properties;
        const lat = properties?.lat;
        const lon = properties?.lon;
        const formatted = properties?.formatted?.trim() ?? "";
        if (!formatted || typeof lat !== "number" || !Number.isFinite(lat) || typeof lon !== "number" || !Number.isFinite(lon)) {
          selectedFormattedRef.current = "";
          onChange(autocomplete?.getValue() ?? "", null);
          return;
        }
        selectedFormattedRef.current = formatted;
        onChange(formatted, { lat, lon, formatted });
      });
    }

    void initializeAutocomplete();
    return () => {
      active = false;
      autocomplete?.destroy();
      if (autocompleteRef.current === autocomplete) autocompleteRef.current = null;
    };
    // The widget is initialized once per mounted field; subsequent values are synchronized below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, label, mapsApiKey]);

  useEffect(() => {
    const autocomplete = autocompleteRef.current;
    if (autocomplete && autocomplete.getValue() !== value) autocomplete.setValue(value);
  }, [value]);

  const mapPoints: EventMapPoint[] = coordinates
    ? [{ ...coordinates, formatted: value }]
    : [];

  return (
    <div className={`min-w-0 space-y-2 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <label htmlFor={id} className="text-sm font-semibold">{label}</label>
        {mapsApiKey && <button
          type="button"
          onClick={useCurrentLocation}
          disabled={locating}
          className="inline-flex min-h-8 items-center gap-1.5 rounded-md px-2 text-xs font-semibold text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
        >
          {locating ? <LoaderCircle className="size-3.5 animate-spin" /> : <MapPin className="size-3.5" />}
          {locating ? "Localizando…" : "Usar minha localização"}
        </button>}
      </div>
      {mapsApiKey ? (
        <div ref={containerRef} className="event-location-autocomplete" />
      ) : (
        <>
          <Input id={id} value={value} onChange={(event) => onChange(event.target.value, null)} autoComplete="off" maxLength={240} required placeholder="Digite o local do evento" />
          {mapsApiKey === "" && <p className="text-xs text-muted-foreground">Configure MAPS_API para ativar a busca de endereços.</p>}
        </>
      )}
      {locationEnabled && <p role="status" className="text-xs text-muted-foreground">Sugestões priorizadas perto de você.</p>}
      {locationError && <p role="status" className="text-xs text-destructive">{locationError}</p>}
      {coordinates && <EventLocationMap points={mapPoints} />}
    </div>
  );
}
