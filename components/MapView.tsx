"use client";

import { useCallback, useRef, useState, useEffect, useMemo, forwardRef, useImperativeHandle } from "react";
import { GoogleMap, useJsApiLoader, DrawingManager, useGoogleMap } from "@react-google-maps/api";
import { DrawnArea, LatLng } from "@/types";
import { getMeasurements } from "@/lib/calculations";

// Feature type colors for AI-detected areas
const featureColors: Record<string, string> = {
  lawn: "#22c55e",
  roof: "#ef4444",
  driveway: "#6b7280",
  pool: "#3b82f6",
  deck: "#a855f7",
  patio: "#f59e0b",
  fence: "#78716c",
  garden: "#84cc16",
};

const getAreaColor = (areaId: string): string => {
  // Check if the ID starts with a known feature type
  const parts = areaId.split("-");
  if (parts.length >= 1) {
    const featureType = parts[0];
    if (featureColors[featureType]) {
      return featureColors[featureType];
    }
  }
  // Fallback to orange for generic areas
  return "#f97316";
};

const libraries: ("places" | "drawing" | "geometry")[] = ["places", "drawing", "geometry"];

const mapContainerStyle = {
  width: "100%",
  height: "100%",
};

const defaultCenter = {
  lat: -37.8136,
  lng: 144.9631,
};

interface MapViewProps {
  center?: LatLng;
  zoom?: number;
  onAreasChange: (areas: DrawnArea[]) => void;
  areas: DrawnArea[];
  isDrawing: boolean;
  drawingMode: "area" | "trail";
  showTopography: boolean;
  showPropertyBoundaries: boolean;
}

export interface MapViewRef {
  getMap: () => google.maps.Map | null;
  getBounds: () => google.maps.LatLngBounds | null;
}

// Child component that uses useGoogleMap hook to get the REAL current map
function PolygonRenderer({
  areas,
  selectedAreaId,
  onSelect
}: {
  areas: DrawnArea[];
  selectedAreaId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const map = useGoogleMap(); // This hook gets the map from GoogleMap's context
  const polygonsRef = useRef<google.maps.Polygon[]>([]);

  useEffect(() => {
    if (!map) {
      console.log("PolygonRenderer: No map from useGoogleMap hook");
      return;
    }

    // Clear all existing polygons
    polygonsRef.current.forEach(p => {
      p.setMap(null);
    });
    polygonsRef.current = [];

    // Create fresh polygons (only for enabled areas)
    areas.forEach((area, idx) => {
      if (!area.points || area.points.length < 3) {
        console.warn(`Invalid area ${area.id}, skipping`);
        return;
      }

      // Skip disabled areas
      if (area.enabled === false) {
        return;
      }

      const color = getAreaColor(area.id);
      const isSelected = selectedAreaId === area.id;

      const polygon = new google.maps.Polygon({
        paths: area.points.map(p => ({ lat: p.lat, lng: p.lng })),
        strokeColor: isSelected ? "#ffffff" : color,
        strokeOpacity: 1,
        strokeWeight: isSelected ? 4 : 3,
        fillColor: color,
        fillOpacity: isSelected ? 0.7 : 0.5,
        zIndex: isSelected ? 9999 : 1000,
        clickable: true,
        map: map,
      });

      polygon.addListener("click", () => {
        onSelect(selectedAreaId === area.id ? null : area.id);
      });

      polygonsRef.current.push(polygon);
    });

    // Cleanup
    return () => {
      polygonsRef.current.forEach(p => p.setMap(null));
    };
  }, [map, areas, selectedAreaId, onSelect]);

  return null;
}

const MapView = forwardRef<MapViewRef, MapViewProps>(({
  center,
  zoom = 18,
  onAreasChange,
  areas,
  isDrawing,
  drawingMode,
  showTopography,
}, ref) => {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries,
  });

  const mapRef = useRef<google.maps.Map | null>(null);
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);

  useImperativeHandle(ref, () => ({
    getMap: () => mapRef.current,
    getBounds: () => mapRef.current?.getBounds() || null,
  }));

  const mapOptions = useMemo(() => {
    if (!isLoaded) return {};
    return {
      mapTypeId: showTopography ? "terrain" : "satellite",
      mapTypeControl: true,
      mapTypeControlOptions: {
        position: google.maps.ControlPosition.TOP_RIGHT,
      },
      streetViewControl: true,
      fullscreenControl: false,
      zoomControl: true,
      zoomControlOptions: {
        position: google.maps.ControlPosition.LEFT_BOTTOM,
      },
    };
  }, [isLoaded, showTopography]);

  const onLoad = useCallback((map: google.maps.Map) => {
    console.log("=== GoogleMap onLoad callback ===");
    mapRef.current = map;
    // Expose for debugging
    if (typeof window !== 'undefined') {
      (window as any).__mapQuoteyMap = map;
    }
  }, []);

  const onPolygonComplete = useCallback(
    (polygon: google.maps.Polygon) => {
      const path = polygon.getPath();
      const points: LatLng[] = [];

      for (let i = 0; i < path.getLength(); i++) {
        const point = path.getAt(i);
        points.push({ lat: point.lat(), lng: point.lng() });
      }

      const measurements = getMeasurements(points);

      const newArea: DrawnArea = {
        id: `area-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: drawingMode,
        points,
        measurements,
      };

      onAreasChange([...areas, newArea]);
      polygon.setMap(null);
    },
    [areas, drawingMode, onAreasChange]
  );

  const onPolylineComplete = useCallback(
    (polyline: google.maps.Polyline) => {
      const path = polyline.getPath();
      const points: LatLng[] = [];

      for (let i = 0; i < path.getLength(); i++) {
        const point = path.getAt(i);
        points.push({ lat: point.lat(), lng: point.lng() });
      }

      const measurements = getMeasurements(points);

      const newArea: DrawnArea = {
        id: `trail-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: "trail",
        points,
        measurements,
      };

      onAreasChange([...areas, newArea]);
      polyline.setMap(null);
    },
    [areas, onAreasChange]
  );

  useEffect(() => {
    if (mapRef.current && center) {
      mapRef.current.panTo(center);
      mapRef.current.setZoom(zoom);
    }
  }, [center, zoom]);

  const handleSelect = useCallback((id: string | null) => {
    setSelectedAreaId(id);
  }, []);

  if (loadError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <div className="text-center p-8">
          <p className="text-red-500 font-medium">Error loading Google Maps</p>
          <p className="text-gray-500 text-sm mt-2">Please check your API key configuration</p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      center={center || defaultCenter}
      zoom={zoom}
      onLoad={onLoad}
      options={mapOptions}
    >
      {isDrawing && (
        <DrawingManager
          onPolygonComplete={onPolygonComplete}
          onPolylineComplete={onPolylineComplete}
          options={{
            drawingMode:
              drawingMode === "area"
                ? google.maps.drawing.OverlayType.POLYGON
                : google.maps.drawing.OverlayType.POLYLINE,
            drawingControl: false,
            polygonOptions: {
              fillColor: "#f97316",
              fillOpacity: 0.3,
              strokeColor: "#f97316",
              strokeWeight: 2,
              editable: true,
              draggable: false,
            },
            polylineOptions: {
              strokeColor: "#f97316",
              strokeWeight: 3,
              editable: true,
              draggable: false,
            },
          }}
        />
      )}

      {/* Use child component with useGoogleMap hook for correct map reference */}
      {areas.length > 0 && (
        <PolygonRenderer
          areas={areas}
          selectedAreaId={selectedAreaId}
          onSelect={handleSelect}
        />
      )}
    </GoogleMap>
  );
});

MapView.displayName = "MapView";

export default MapView;
