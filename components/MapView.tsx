"use client";

import { useCallback, useRef, useState, useEffect, useMemo, forwardRef, useImperativeHandle } from "react";
import { GoogleMap, useJsApiLoader, DrawingManager, Polygon } from "@react-google-maps/api";
import { DrawnArea, LatLng } from "@/types";
import { getMeasurements } from "@/lib/calculations";

// Feature type colors for AI-detected areas
const featureColors: Record<string, string> = {
  lawn: "#22c55e",      // Green
  roof: "#ef4444",      // Red
  driveway: "#6b7280",  // Gray
  pool: "#3b82f6",      // Blue
  deck: "#a855f7",      // Purple
  patio: "#f59e0b",     // Amber
  fence: "#78716c",     // Stone
  garden: "#84cc16",    // Lime
};

// Get color for an area based on its ID (AI areas have format: ai-{type}-{timestamp}-{index})
const getAreaColor = (areaId: string, isSelected: boolean): string => {
  if (areaId.startsWith("ai-")) {
    const parts = areaId.split("-");
    if (parts.length >= 2) {
      const featureType = parts[1];
      if (featureColors[featureType]) {
        return featureColors[featureType];
      }
    }
    return "#a855f7"; // Default purple for AI areas
  }
  return isSelected ? "#ea580c" : "#f97316"; // Orange for manual areas
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
  const drawingManagerRef = useRef<google.maps.drawing.DrawingManager | null>(null);
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);

  // Expose map methods to parent
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
    mapRef.current = map;
  }, []);

  const onDrawingManagerLoad = useCallback(
    (drawingManager: google.maps.drawing.DrawingManager) => {
      drawingManagerRef.current = drawingManager;
    },
    []
  );

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

      // Remove the temporary polygon (we'll render our own)
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

      // Remove the temporary polyline
      polyline.setMap(null);
    },
    [areas, onAreasChange]
  );

  const handleAreaClick = (areaId: string) => {
    setSelectedAreaId(areaId === selectedAreaId ? null : areaId);
  };

  // Update map type based on topography toggle
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setMapTypeId(showTopography ? "terrain" : "satellite");
    }
  }, [showTopography]);

  // Pan to center when it changes
  useEffect(() => {
    if (mapRef.current && center) {
      mapRef.current.panTo(center);
      mapRef.current.setZoom(zoom);
    }
  }, [center, zoom]);

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
      {/* Drawing Manager */}
      {isDrawing && (
        <DrawingManager
          onLoad={onDrawingManagerLoad}
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

      {/* Render saved areas */}
      {areas.map((area) => {
        const isSelected = selectedAreaId === area.id;
        const color = getAreaColor(area.id, isSelected);

        console.log(`Rendering polygon ${area.id} with color ${color}:`, area.points);

        return (
          <Polygon
            key={area.id}
            paths={area.points}
            options={{
              fillColor: color,
              fillOpacity: isSelected ? 0.6 : 0.4,
              strokeColor: color,
              strokeWeight: isSelected ? 4 : 2,
              strokeOpacity: 1,
              clickable: true,
            }}
            onClick={() => handleAreaClick(area.id)}
          />
        );
      })}
    </GoogleMap>
  );
});

MapView.displayName = "MapView";

export default MapView;
