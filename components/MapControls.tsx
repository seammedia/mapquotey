"use client";

import {
  Mountain,
  MapPin,
  Trash2,
  Pencil,
  Route,
} from "lucide-react";

interface MapControlsProps {
  showTopography: boolean;
  onToggleTopography: () => void;
  showPropertyBoundaries: boolean;
  onTogglePropertyBoundaries: () => void;
  isDrawing: boolean;
  drawingMode: "area" | "trail";
  onStartDrawing: (mode: "area" | "trail") => void;
  onStopDrawing: () => void;
  onClearAllAreas: () => void;
  hasAreas: boolean;
}

export default function MapControls({
  showTopography,
  onToggleTopography,
  showPropertyBoundaries,
  onTogglePropertyBoundaries,
  isDrawing,
  drawingMode,
  onStartDrawing,
  onStopDrawing,
  onClearAllAreas,
  hasAreas,
}: MapControlsProps) {
  return (
    <>
      {/* Top Left Controls */}
      <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
        <button
          onClick={onToggleTopography}
          className={`control-btn ${showTopography ? "active" : ""}`}
        >
          <Mountain className="w-4 h-4" />
          {showTopography ? "Hide Topography" : "Show Topography"}
        </button>

        <button
          onClick={onTogglePropertyBoundaries}
          className={`control-btn ${showPropertyBoundaries ? "" : "active"}`}
        >
          <MapPin className="w-4 h-4" />
          {showPropertyBoundaries ? "Hide Property Boundaries" : "Show Property Boundaries"}
        </button>
      </div>

      {/* Bottom Left Controls */}
      <div className="absolute bottom-4 left-4 flex flex-col gap-2 z-10">
        {hasAreas && (
          <button
            onClick={onClearAllAreas}
            className="control-btn flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Clear All Areas
          </button>
        )}

        {/* Drawing Mode Toggle */}
        <div className="bg-white rounded-lg border border-gray-200 p-1 flex">
          <button
            onClick={() => onStartDrawing("area")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              isDrawing && drawingMode === "area"
                ? "bg-orange-500 text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            Area
          </button>
          <button
            onClick={() => onStartDrawing("trail")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              isDrawing && drawingMode === "trail"
                ? "bg-orange-500 text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            Trail
          </button>
        </div>

        {/* Start/Stop Drawing Button */}
        {isDrawing ? (
          <button onClick={onStopDrawing} className="control-btn active">
            <Pencil className="w-4 h-4" />
            Stop Drawing
          </button>
        ) : (
          <button
            onClick={() => onStartDrawing("area")}
            className="control-btn primary"
          >
            <Pencil className="w-4 h-4" />
            Start Area
          </button>
        )}
      </div>
    </>
  );
}
