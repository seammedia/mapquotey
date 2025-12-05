"use client";

import { useCallback, useRef, useState, useEffect, useMemo, forwardRef, useImperativeHandle } from "react";
import { GoogleMap, useJsApiLoader, DrawingManager } from "@react-google-maps/api";
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
  const polygonsRef = useRef<Map<string, google.maps.Polygon>>(new Map());
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);

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
    setMapReady(true);
    console.log("Map loaded and ready");
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

  // Manage native Google Maps polygons for better control over styling
  useEffect(() => {
    console.log("Polygon effect triggered:", { mapReady, isLoaded, areasCount: areas.length, mapRefExists: !!mapRef.current });

    if (!mapRef.current || !isLoaded || !mapReady) {
      console.log("Skipping polygon creation - map not ready");
      return;
    }

    const map = mapRef.current;

    console.log("Processing", areas.length, "areas for polygon creation");

    // Get current polygon IDs
    const currentAreaIds = new Set(areas.map(a => a.id));

    // Remove polygons that no longer exist
    polygonsRef.current.forEach((polygon, id) => {
      if (!currentAreaIds.has(id)) {
        polygon.setMap(null);
        polygonsRef.current.delete(id);
        console.log(`Removed polygon ${id}`);
      }
    });

    // Add or update polygons
    areas.forEach((area) => {
      const isSelected = selectedAreaId === area.id;
      const color = getAreaColor(area.id, isSelected);

      console.log(`Processing area ${area.id}:`, {
        color,
        pointsCount: area.points.length,
        firstPoint: area.points[0],
        existingPolygon: polygonsRef.current.has(area.id)
      });

      let polygon = polygonsRef.current.get(area.id);

      if (!polygon) {
        // Create new polygon with high visibility settings
        polygon = new google.maps.Polygon({
          paths: area.points.map(p => ({ lat: p.lat, lng: p.lng })),
          map: map,
          fillColor: color,
          fillOpacity: 0.5,
          strokeColor: "#ffffff",
          strokeWeight: 4,
          strokeOpacity: 1,
          zIndex: 9999,
          clickable: true,
          visible: true,
          geodesic: true,
        });

        // Force the polygon onto the map
        polygon.setMap(map);

        // Verify the polygon was added to the map
        const assignedMap = polygon.getMap();
        console.log(`Polygon created, map assigned:`, assignedMap === map, "Map exists:", !!assignedMap);

        // Add click listener
        polygon.addListener("click", () => {
          setSelectedAreaId(prev => prev === area.id ? null : area.id);
        });

        polygonsRef.current.set(area.id, polygon);
        console.log(`Created polygon ${area.id} with color ${color}, bounds:`, polygon.getPath()?.getArray());
      } else {
        // Update existing polygon options
        polygon.setOptions({
          fillColor: color,
          fillOpacity: isSelected ? 0.5 : 0.4,
          strokeColor: isSelected ? "#ffffff" : color,
          strokeWeight: isSelected ? 4 : 3,
          strokeOpacity: 1,
          zIndex: isSelected ? 9999 : 1000,
        });

        // Ensure it's on the map
        if (!polygon.getMap()) {
          polygon.setMap(map);
        }

        // Update path
        polygon.setPath(area.points.map(p => ({ lat: p.lat, lng: p.lng })));
      }
    });

    console.log("Total polygons after processing:", polygonsRef.current.size);

    // Cleanup function
    return () => {
      // Don't remove polygons on cleanup - they should persist
    };

  }, [areas, selectedAreaId, isLoaded, mapReady]);

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

      {/* Polygons are rendered via native Google Maps API in useEffect for better color control */}
    </GoogleMap>
  );
});

MapView.displayName = "MapView";

export default MapView;
