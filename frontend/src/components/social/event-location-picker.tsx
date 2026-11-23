"use client";

import { useEffect, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import { Input } from "@/components/ui/input";

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

const MAPS_API_KEY = process.env.NEXT_PUBLIC_MAPS_API ?? "";
const DEFAULT_CENTER: [number, number] = [-14.2, -51.9];
const TILE_ATTRIBUTION = 'Powered by <a href="https://www.geoapify.com/" target="_blank">Geoapify</a> | © OpenStreetMap';

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
  const apiKey = MAPS_API_KEY;

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !apiKey) return;

    let active = true;
    let map: Leaflet.Map | null = null;
    let markers: Leaflet.LayerGroup | null = null;

    async function initializeMap() {
      const leaflet = await import("leaflet");
      if (!active || !container) return;

      map = leaflet.map(container, { scrollWheelZoom: false }).setView(DEFAULT_CENTER, 4);
      leaflet.tileLayer(
        `https://maps.geoapify.com/v1/tile/osm-bright/{z}/{x}/{y}.png?apiKey=${apiKey}`,
        { attribution: TILE_ATTRIBUTION, maxZoom: 20 },
      ).addTo(map);
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
  }, [apiKey]);

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
      popup.textContent = point.formatted;
      marker.bindPopup(popup);
    }
    if (validPoints.length === 1) {
      map.setView([validPoints[0].lat, validPoints[0].lon], 15);
    } else if (validPoints.length > 1) {
      map.fitBounds(leaflet.latLngBounds(validPoints.map((point): Leaflet.LatLngExpression => [point.lat, point.lon])), { padding: [24, 24] });
    }
  }, [mapReady, points]);

  if (!apiKey) {
    return <p className="rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">Configure MAPS_API para exibir o mapa.</p>;
  }

  return <div ref={containerRef} aria-label="Mapa do local do evento" role="region" className={`event-location-map h-56 w-full overflow-hidden rounded-xl border border-border bg-muted ${className}`} />;
}

export function EventLocationPicker({
  id,
  label,
  value,
  coordinates,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  coordinates: Pick<EventLocation, "lat" | "lon"> | null;
  onChange: (value: string, location: EventLocation | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const autocompleteRef = useRef<import("@geoapify/geocoder-autocomplete").GeocoderAutocomplete | null>(null);
  const selectedFormattedRef = useRef("");

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !MAPS_API_KEY) return;

    let active = true;
    let autocomplete: import("@geoapify/geocoder-autocomplete").GeocoderAutocomplete | null = null;
    async function initializeAutocomplete() {
      const { GeocoderAutocomplete } = await import("@geoapify/geocoder-autocomplete");
      if (!active || !container) return;

      autocomplete = new GeocoderAutocomplete(container, MAPS_API_KEY, {
        lang: "pt",
        filter: { countrycode: ["br"] },
        limit: 5,
        placeholder: "Busque um endereço ou local...",
        debounceDelay: 300,
      });
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
  }, [id, label]);

  useEffect(() => {
    const autocomplete = autocompleteRef.current;
    if (autocomplete && autocomplete.getValue() !== value) autocomplete.setValue(value);
  }, [value]);

  const mapPoints: EventMapPoint[] = coordinates
    ? [{ ...coordinates, formatted: value }]
    : [];

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-semibold">{label}</label>
      {MAPS_API_KEY ? (
        <div ref={containerRef} className="event-location-autocomplete" />
      ) : (
        <>
          <Input id={id} value={value} onChange={(event) => onChange(event.target.value, null)} autoComplete="off" maxLength={240} required placeholder="Digite o local do evento" />
          <p className="text-xs text-muted-foreground">Configure MAPS_API para ativar a busca de endereços.</p>
        </>
      )}
      {MAPS_API_KEY && <EventLocationMap points={mapPoints} />}
    </div>
  );
}
