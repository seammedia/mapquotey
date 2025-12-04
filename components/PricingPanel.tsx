"use client";

import { useState } from "react";
import { DrawnArea, ServiceType } from "@/types";
import { SERVICES, DEFAULT_MOBILIZATION_FEE, getServiceById } from "@/lib/services";
import { formatCurrency, formatArea } from "@/lib/calculations";
import {
  X,
  MapPin,
  Download,
  Trash2,
  ChevronDown,
  ChevronUp,
  Plus,
  Settings,
} from "lucide-react";

interface PricingPanelProps {
  areas: DrawnArea[];
  onUpdateArea: (areaId: string, updates: Partial<DrawnArea>) => void;
  onDeleteArea: (areaId: string) => void;
  onDownloadQuote: () => void;
  mobilizationFee: number;
  onMobilizationChange: (fee: number) => void;
}

export default function PricingPanel({
  areas,
  onUpdateArea,
  onDeleteArea,
  onDownloadQuote,
  mobilizationFee,
  onMobilizationChange,
}: PricingPanelProps) {
  const [expandedAreaId, setExpandedAreaId] = useState<string | null>(null);
  const [isMetric, setIsMetric] = useState(true);

  const calculateAreaPrice = (area: DrawnArea): number => {
    if (!area.serviceType) return 0;
    const service = getServiceById(area.serviceType);
    if (!service) return 0;

    if (area.pricePerUnit !== undefined) {
      return isMetric
        ? area.measurements.area * area.pricePerUnit
        : area.measurements.areaFt * area.pricePerUnit;
    }

    return isMetric
      ? area.measurements.area * service.pricePerSqM
      : area.measurements.areaFt * service.pricePerSqFt;
  };

  const subtotal = areas.reduce((sum, area) => sum + calculateAreaPrice(area), 0);
  const total = subtotal + mobilizationFee;

  const hasAreas = areas.length > 0;

  return (
    <div className="pricing-panel flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Pricing Details</h2>
          <button className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {!hasAreas ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <MapPin className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500 font-medium">No areas drawn yet</p>
            <p className="text-gray-400 text-sm mt-1">
              Click &quot;Start Area&quot; on the map to begin measuring a quote.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Unit Toggle */}
            <div className="flex items-center justify-end gap-2 mb-4">
              <span className={`text-xs ${isMetric ? "text-orange-600" : "text-gray-400"}`}>
                Metric
              </span>
              <button
                onClick={() => setIsMetric(!isMetric)}
                className={`relative w-10 h-5 rounded-full transition-colors ${
                  isMetric ? "bg-orange-500" : "bg-gray-300"
                }`}
              >
                <span
                  className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                    isMetric ? "left-0.5" : "left-5"
                  }`}
                />
              </button>
              <span className={`text-xs ${!isMetric ? "text-orange-600" : "text-gray-400"}`}>
                Imperial
              </span>
            </div>

            {/* Areas List */}
            {areas.map((area, index) => (
              <div
                key={area.id}
                className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden"
              >
                {/* Area Header */}
                <button
                  onClick={() =>
                    setExpandedAreaId(expandedAreaId === area.id ? null : area.id)
                  }
                  className="w-full p-3 flex items-center justify-between text-left hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                      <span className="text-orange-600 font-medium text-sm">
                        {index + 1}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">
                        {area.serviceType
                          ? getServiceById(area.serviceType)?.name || "Area"
                          : `Area ${index + 1}`}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatArea(
                          isMetric ? area.measurements.area : area.measurements.areaFt,
                          isMetric
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">
                      {formatCurrency(calculateAreaPrice(area))}
                    </span>
                    {expandedAreaId === area.id ? (
                      <ChevronUp className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </button>

                {/* Expanded Content */}
                {expandedAreaId === area.id && (
                  <div className="p-3 border-t border-gray-200 space-y-3">
                    {/* Service Selection */}
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Service Type
                      </label>
                      <select
                        value={area.serviceType || ""}
                        onChange={(e) =>
                          onUpdateArea(area.id, {
                            serviceType: e.target.value as ServiceType,
                            pricePerUnit: undefined,
                          })
                        }
                        className="w-full p-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      >
                        <option value="">Select service...</option>
                        {SERVICES.map((service) => (
                          <option key={service.id} value={service.id}>
                            {service.name} ({formatCurrency(service.pricePerSqM)}/m²)
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Custom Price Override */}
                    {area.serviceType && (
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          Custom Price per {isMetric ? "m²" : "ft²"} (optional)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                            $
                          </span>
                          <input
                            type="number"
                            value={area.pricePerUnit || ""}
                            onChange={(e) =>
                              onUpdateArea(area.id, {
                                pricePerUnit: e.target.value
                                  ? parseFloat(e.target.value)
                                  : undefined,
                              })
                            }
                            placeholder={
                              getServiceById(area.serviceType)?.pricePerSqM.toString() || "0"
                            }
                            className="w-full pl-7 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                          />
                        </div>
                      </div>
                    )}

                    {/* Measurements */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-white p-2 rounded border border-gray-100">
                        <span className="text-gray-500">Area</span>
                        <p className="font-medium text-gray-900">
                          {formatArea(
                            isMetric ? area.measurements.area : area.measurements.areaFt,
                            isMetric
                          )}
                        </p>
                      </div>
                      <div className="bg-white p-2 rounded border border-gray-100">
                        <span className="text-gray-500">Perimeter</span>
                        <p className="font-medium text-gray-900">
                          {isMetric
                            ? `${area.measurements.perimeter.toFixed(1)} m`
                            : `${area.measurements.perimeterFt.toFixed(1)} ft`}
                        </p>
                      </div>
                    </div>

                    {/* Delete Button */}
                    <button
                      onClick={() => onDeleteArea(area.id)}
                      className="w-full flex items-center justify-center gap-2 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete Area
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer - Pricing Summary */}
      <div className="border-t border-gray-200 p-4 bg-white">
        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Subtotal</span>
            <span className="text-gray-900">{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <div className="flex items-center gap-1">
              <span className="text-gray-500">Mobilization</span>
              <button
                onClick={() => {
                  const newFee = prompt(
                    "Enter mobilization fee:",
                    mobilizationFee.toString()
                  );
                  if (newFee !== null) {
                    onMobilizationChange(parseFloat(newFee) || 0);
                  }
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <Settings className="w-3 h-3" />
              </button>
            </div>
            <span className="text-gray-900">{formatCurrency(mobilizationFee)}</span>
          </div>
        </div>

        <div className="flex justify-between items-center mb-4">
          <span className="text-gray-900 font-semibold">TOTAL</span>
          <span className="text-2xl font-bold text-orange-500">
            {formatCurrency(total)}
          </span>
        </div>

        <button
          onClick={onDownloadQuote}
          disabled={!hasAreas}
          className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <Download className="w-5 h-5" />
          Download Quote & Map
        </button>
      </div>
    </div>
  );
}
