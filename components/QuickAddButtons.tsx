"use client";

import { Home, TreeDeciduous, Car, Droplets, Fence, Flower2, Square } from "lucide-react";

interface QuickAddButtonsProps {
  onSelectType: (type: string) => void;
  isDrawing: boolean;
  currentDrawingType: string | null;
}

const areaTypes = [
  { id: "roof", label: "Roof", icon: Home, color: "#ef4444" },
  { id: "lawn", label: "Grass", icon: TreeDeciduous, color: "#22c55e" },
  { id: "driveway", label: "Concrete", icon: Car, color: "#6b7280" },
  { id: "pool", label: "Pool", icon: Droplets, color: "#3b82f6" },
  { id: "fence", label: "Fence", icon: Fence, color: "#78716c" },
  { id: "garden", label: "Garden", icon: Flower2, color: "#84cc16" },
  { id: "deck", label: "Deck", icon: Square, color: "#a855f7" },
  { id: "patio", label: "Patio", icon: Square, color: "#f59e0b" },
];

export default function QuickAddButtons({
  onSelectType,
  isDrawing,
  currentDrawingType,
}: QuickAddButtonsProps) {
  return (
    <div className="bg-white rounded-lg shadow-lg p-3 w-[140px]">
      <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
        Add Area
      </p>
      <div className="flex flex-col gap-1">
        {areaTypes.map((type) => {
          const Icon = type.icon;
          const isActive = isDrawing && currentDrawingType === type.id;

          return (
            <button
              key={type.id}
              onClick={() => onSelectType(type.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                isActive
                  ? "ring-2 ring-offset-1"
                  : "hover:bg-gray-50"
              }`}
              style={{
                backgroundColor: isActive ? `${type.color}15` : undefined,
                color: isActive ? type.color : "#374151",
                borderColor: isActive ? type.color : undefined,
                ringColor: isActive ? type.color : undefined,
              }}
            >
              <Icon
                className="w-4 h-4"
                style={{ color: type.color }}
              />
              <span>{type.label}</span>
            </button>
          );
        })}
      </div>
      {isDrawing && (
        <p className="text-xs text-gray-500 mt-2 text-center">
          Click on map to draw
        </p>
      )}
    </div>
  );
}

export { areaTypes };
