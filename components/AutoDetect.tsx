"use client";

import { useState } from "react";
import { Sparkles, Loader2, Check, AlertCircle, X, Wand2 } from "lucide-react";
import { DrawnArea, ServiceType, LatLng } from "@/types";
import { getMeasurements } from "@/lib/calculations";

interface DetectedFeature {
  type: "lawn" | "roof" | "driveway" | "pool" | "deck" | "patio" | "fence" | "garden";
  confidence: number;
  description: string;
  estimatedArea: number;
  bounds: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
  color?: string;
}

interface DetectionResult {
  features: DetectedFeature[];
  propertyAnalysis: string;
  recommendations: string[];
}

interface AutoDetectProps {
  mapRef: google.maps.Map | null;
  mapBounds: google.maps.LatLngBounds | null;
  onAreasDetected: (areas: DrawnArea[]) => void;
  existingAreas: DrawnArea[];
}

const featureToService: Record<string, ServiceType> = {
  lawn: "lawn_care",
  roof: "roofing",
  driveway: "pressure_washing",
  pool: "pool_area",
  deck: "decking",
  patio: "paving",
  fence: "fencing",
  garden: "landscaping",
};

// Export colors so MapView can use them
export const featureColors: Record<string, string> = {
  lawn: "#22c55e",      // Green
  roof: "#ef4444",      // Red
  driveway: "#6b7280",  // Gray
  pool: "#3b82f6",      // Blue
  deck: "#a855f7",      // Purple
  patio: "#f59e0b",     // Amber
  fence: "#78716c",     // Stone
  garden: "#84cc16",    // Lime
};

export default function AutoDetect({
  mapRef,
  mapBounds,
  onAreasDetected,
  existingAreas,
}: AutoDetectProps) {
  const [isDetecting, setIsDetecting] = useState(false);
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedFeatures, setSelectedFeatures] = useState<Set<number>>(new Set());
  const [showResults, setShowResults] = useState(false);

  const captureMapImage = async (): Promise<string | null> => {
    if (!mapRef) return null;

    const mapDiv = mapRef.getDiv();
    const html2canvas = (await import("html2canvas")).default;

    try {
      const canvas = await html2canvas(mapDiv, {
        useCORS: true,
        allowTaint: true,
        scale: 1,
        logging: false,
        backgroundColor: null,
      });

      return canvas.toDataURL("image/png");
    } catch (err) {
      console.error("Failed to capture map:", err);
      return null;
    }
  };

  const boundsToPolygon = (
    bounds: DetectedFeature["bounds"],
    mapBounds: google.maps.LatLngBounds
  ): LatLng[] => {
    const ne = mapBounds.getNorthEast();
    const sw = mapBounds.getSouthWest();
    const center = mapBounds.getCenter();

    const latRange = ne.lat() - sw.lat();
    const lngRange = ne.lng() - sw.lng();

    // The bounds are percentages relative to the image (0-100)
    // We need to convert to lat/lng coordinates
    // The image covers the full map bounds, so we map percentage to coordinates

    // Calculate the actual lat/lng from percentage bounds
    // Top of image = north (higher lat), left of image = west (lower lng)
    const top = ne.lat() - (bounds.top / 100) * latRange;
    const bottom = ne.lat() - ((bounds.top + bounds.height) / 100) * latRange;
    const left = sw.lng() + (bounds.left / 100) * lngRange;
    const right = sw.lng() + ((bounds.left + bounds.width) / 100) * lngRange;

    // Create polygon points (clockwise)
    return [
      { lat: top, lng: left },
      { lat: top, lng: right },
      { lat: bottom, lng: right },
      { lat: bottom, lng: left },
    ];
  };

  const handleDetect = async () => {
    if (!mapRef || !mapBounds) {
      setError("Map not ready. Please wait for the map to load.");
      return;
    }

    setIsDetecting(true);
    setError(null);
    setResult(null);

    try {
      const imageBase64 = await captureMapImage();

      if (!imageBase64) {
        throw new Error("Failed to capture map image");
      }

      const center = mapBounds.getCenter();
      const zoom = mapRef.getZoom() || 19;

      const response = await fetch("/api/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64,
          mapBounds: {
            center: { lat: center.lat(), lng: center.lng() },
            ne: { lat: mapBounds.getNorthEast().lat(), lng: mapBounds.getNorthEast().lng() },
            sw: { lat: mapBounds.getSouthWest().lat(), lng: mapBounds.getSouthWest().lng() },
          },
          zoomLevel: zoom,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Detection failed");
      }

      const data: DetectionResult = await response.json();
      setResult(data);
      setShowResults(true);

      // Auto-select high confidence features
      const highConfidence = new Set<number>();
      data.features.forEach((f, i) => {
        if (f.confidence >= 0.7) {
          highConfidence.add(i);
        }
      });
      setSelectedFeatures(highConfidence);

    } catch (err) {
      setError(err instanceof Error ? err.message : "Detection failed");
    } finally {
      setIsDetecting(false);
    }
  };

  const toggleFeature = (index: number) => {
    const newSelected = new Set(selectedFeatures);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedFeatures(newSelected);
  };

  const applySelectedFeatures = () => {
    if (!result || !mapBounds) return;

    const newAreas: DrawnArea[] = [];

    result.features.forEach((feature, index) => {
      if (!selectedFeatures.has(index)) return;

      const points = boundsToPolygon(feature.bounds, mapBounds);
      const measurements = getMeasurements(points);

      // Use the AI-estimated area instead of calculated (more accurate)
      measurements.area = feature.estimatedArea;
      measurements.areaFt = feature.estimatedArea * 10.7639;

      // Store the feature type in the ID for color coding
      const area: DrawnArea = {
        id: `ai-${feature.type}-${Date.now()}-${index}`,
        type: "area",
        points,
        measurements,
        serviceType: featureToService[feature.type],
      };

      newAreas.push(area);
    });

    onAreasDetected([...existingAreas, ...newAreas]);
    setShowResults(false);
    setResult(null);
  };

  return (
    <>
      {/* Auto-Detect Button - More visible */}
      <button
        onClick={handleDetect}
        disabled={isDetecting}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium shadow-lg transition-all ${
          isDetecting
            ? "bg-gray-400 cursor-wait"
            : "bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white shadow-violet-500/30 hover:shadow-violet-500/50"
        }`}
      >
        {isDetecting ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Analyzing...</span>
          </>
        ) : (
          <>
            <Wand2 className="w-5 h-5" />
            <span>AI Auto-Detect</span>
          </>
        )}
      </button>

      {/* Error Message */}
      {error && (
        <div className="absolute top-20 left-4 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg flex items-center gap-2 z-20 shadow-lg">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">{error}</span>
          <button onClick={() => setError(null)} className="ml-2">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Results Modal */}
      {showResults && result && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-violet-600 to-fuchsia-600">
              <div>
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  AI Detection Results
                </h2>
                <p className="text-sm text-white/80 mt-1">
                  {result.features.length} features detected on center property
                </p>
              </div>
              <button
                onClick={() => setShowResults(false)}
                className="text-white/80 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Property Analysis */}
            <div className="p-4 bg-gray-50 border-b border-gray-200">
              <p className="text-sm text-gray-700">{result.propertyAnalysis}</p>
            </div>

            {/* Color Legend */}
            <div className="px-4 pt-3 pb-2 border-b border-gray-100">
              <p className="text-xs text-gray-500 mb-2">Feature Colors on Map:</p>
              <div className="flex flex-wrap gap-3">
                {Object.entries(featureColors).map(([type, color]) => (
                  <div key={type} className="flex items-center gap-1.5">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-xs text-gray-600 capitalize">{type}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Features List */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-3">
                {result.features.map((feature, index) => (
                  <button
                    key={index}
                    onClick={() => toggleFeature(index)}
                    className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                      selectedFeatures.has(index)
                        ? "border-violet-500 bg-violet-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div
                          className="w-5 h-5 rounded mt-0.5 border-2 border-white shadow"
                          style={{ backgroundColor: featureColors[feature.type] }}
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900 capitalize">
                              {feature.type.replace("_", " ")}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              feature.confidence >= 0.9
                                ? "bg-green-100 text-green-700"
                                : feature.confidence >= 0.7
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-gray-100 text-gray-600"
                            }`}>
                              {Math.round(feature.confidence * 100)}% confident
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 mt-1">
                            {feature.description}
                          </p>
                          <p className="text-sm font-medium text-gray-700 mt-1">
                            ~{feature.estimatedArea} m²
                          </p>
                        </div>
                      </div>
                      <div
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                          selectedFeatures.has(index)
                            ? "bg-violet-500 border-violet-500"
                            : "border-gray-300"
                        }`}
                      >
                        {selectedFeatures.has(index) && (
                          <Check className="w-4 h-4 text-white" />
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Recommendations */}
              {result.recommendations.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">
                    Recommendations
                  </h3>
                  <ul className="space-y-1">
                    {result.recommendations.map((rec, i) => (
                      <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                        <span className="text-violet-500">•</span>
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
              <p className="text-sm text-gray-500">
                {selectedFeatures.size} of {result.features.length} selected
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowResults(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={applySelectedFeatures}
                  disabled={selectedFeatures.size === 0}
                  className="px-4 py-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 disabled:from-gray-300 disabled:to-gray-300 text-white rounded-lg transition-all flex items-center gap-2 shadow-md"
                >
                  <Check className="w-4 h-4" />
                  Add {selectedFeatures.size} Areas
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
