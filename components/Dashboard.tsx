"use client";

import { useState, useRef, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { DrawnArea, LatLng, PhotoUpload as PhotoUploadType } from "@/types";
import { DEFAULT_MOBILIZATION_FEE, getServiceById } from "@/lib/services";
import { formatCurrency, formatArea } from "@/lib/calculations";
import AddressSearch from "./AddressSearch";
import MapView, { MapViewRef } from "./MapView";
import MapControls from "./MapControls";
import PricingPanel from "./PricingPanel";
import PhotoUploadComponent from "./PhotoUpload";
import AutoDetect from "./AutoDetect";
import { LogOut, Image, X, Menu } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export default function Dashboard() {
  const { logout } = useAuth();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapViewRef = useRef<MapViewRef>(null);

  // Map state
  const [mapCenter, setMapCenter] = useState<LatLng | undefined>(undefined);
  const [mapZoom, setMapZoom] = useState(18);
  const [currentAddress, setCurrentAddress] = useState("");

  // Drawing state
  const [areas, setAreas] = useState<DrawnArea[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingMode, setDrawingMode] = useState<"area" | "trail">("area");

  // View state
  const [showTopography, setShowTopography] = useState(false);
  const [showPropertyBoundaries, setShowPropertyBoundaries] = useState(true);
  const [showPhotosPanel, setShowPhotosPanel] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Photos state
  const [photos, setPhotos] = useState<PhotoUploadType[]>([]);

  // Pricing state
  const [mobilizationFee, setMobilizationFee] = useState(DEFAULT_MOBILIZATION_FEE);

  const handleAddressSelect = useCallback(
    (address: string, lat: number, lng: number) => {
      setCurrentAddress(address);
      setMapCenter({ lat, lng });
      setMapZoom(19);
    },
    []
  );

  const handleUpdateArea = useCallback(
    (areaId: string, updates: Partial<DrawnArea>) => {
      setAreas((prev) =>
        prev.map((area) => (area.id === areaId ? { ...area, ...updates } : area))
      );
    },
    []
  );

  const handleDeleteArea = useCallback((areaId: string) => {
    setAreas((prev) => prev.filter((area) => area.id !== areaId));
  }, []);

  const handleClearAllAreas = useCallback(() => {
    if (confirm("Are you sure you want to clear all areas?")) {
      setAreas([]);
    }
  }, []);

  const handleStartDrawing = useCallback((mode: "area" | "trail") => {
    setDrawingMode(mode);
    setIsDrawing(true);
  }, []);

  const handleStopDrawing = useCallback(() => {
    setIsDrawing(false);
  }, []);

  const handleAreasDetected = useCallback((detectedAreas: DrawnArea[]) => {
    setAreas(detectedAreas);
  }, []);

  const calculateTotal = useCallback(() => {
    const subtotal = areas.reduce((sum, area) => {
      if (!area.serviceType) return sum;
      const service = getServiceById(area.serviceType);
      if (!service) return sum;

      const price = area.pricePerUnit !== undefined
        ? area.measurements.area * area.pricePerUnit
        : area.measurements.area * service.pricePerSqM;

      return sum + price;
    }, 0);

    return subtotal + mobilizationFee;
  }, [areas, mobilizationFee]);

  const handleDownloadQuote = useCallback(async () => {
    if (!mapContainerRef.current) return;

    try {
      // Create PDF
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;

      // Header
      pdf.setFontSize(24);
      pdf.setTextColor(249, 115, 22); // Orange
      pdf.text("MapQuotey", margin, margin + 10);

      pdf.setFontSize(12);
      pdf.setTextColor(100, 100, 100);
      pdf.text("Virtual Site Survey Quote", margin, margin + 18);

      // Date
      pdf.setFontSize(10);
      pdf.text(
        `Generated: ${new Date().toLocaleDateString("en-AU", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })}`,
        pageWidth - margin - 50,
        margin + 10
      );

      // Address
      if (currentAddress) {
        pdf.setFontSize(11);
        pdf.setTextColor(50, 50, 50);
        pdf.text("Property Address:", margin, margin + 35);
        pdf.setFontSize(10);
        pdf.setTextColor(100, 100, 100);
        const addressLines = pdf.splitTextToSize(currentAddress, pageWidth - margin * 2);
        pdf.text(addressLines, margin, margin + 42);
      }

      // Capture map
      const canvas = await html2canvas(mapContainerRef.current, {
        useCORS: true,
        scale: 2,
        logging: false,
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.8);
      const imgWidth = pageWidth - margin * 2;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, "JPEG", margin, margin + 55, imgWidth, Math.min(imgHeight, 100));

      // Areas breakdown
      let yPos = margin + 165;

      pdf.setFontSize(14);
      pdf.setTextColor(50, 50, 50);
      pdf.text("Quote Breakdown", margin, yPos);
      yPos += 10;

      pdf.setFontSize(10);
      areas.forEach((area, index) => {
        const service = area.serviceType ? getServiceById(area.serviceType) : null;
        const serviceName = service?.name || `Area ${index + 1}`;
        const areaSize = formatArea(area.measurements.area, true);

        let price = 0;
        if (service) {
          price = area.pricePerUnit !== undefined
            ? area.measurements.area * area.pricePerUnit
            : area.measurements.area * service.pricePerSqM;
        }

        pdf.setTextColor(80, 80, 80);
        pdf.text(`${index + 1}. ${serviceName}`, margin, yPos);
        pdf.text(areaSize, margin + 80, yPos);
        pdf.text(formatCurrency(price), pageWidth - margin - 30, yPos);
        yPos += 7;
      });

      // Totals
      yPos += 5;
      pdf.setDrawColor(200, 200, 200);
      pdf.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 8;

      const subtotal = areas.reduce((sum, area) => {
        if (!area.serviceType) return sum;
        const service = getServiceById(area.serviceType);
        if (!service) return sum;
        return sum + (area.pricePerUnit !== undefined
          ? area.measurements.area * area.pricePerUnit
          : area.measurements.area * service.pricePerSqM);
      }, 0);

      pdf.text("Subtotal:", margin, yPos);
      pdf.text(formatCurrency(subtotal), pageWidth - margin - 30, yPos);
      yPos += 7;

      pdf.text("Mobilization:", margin, yPos);
      pdf.text(formatCurrency(mobilizationFee), pageWidth - margin - 30, yPos);
      yPos += 10;

      pdf.setFontSize(14);
      pdf.setTextColor(249, 115, 22);
      pdf.text("TOTAL:", margin, yPos);
      pdf.text(formatCurrency(calculateTotal()), pageWidth - margin - 30, yPos);

      // Footer
      pdf.setFontSize(8);
      pdf.setTextColor(150, 150, 150);
      pdf.text(
        "This quote is an estimate based on aerial imagery measurements.",
        margin,
        pageHeight - 10
      );

      // Save
      const filename = currentAddress
        ? `quote-${currentAddress.split(",")[0].replace(/\s+/g, "-").toLowerCase()}.pdf`
        : `quote-${Date.now()}.pdf`;

      pdf.save(filename);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Error generating PDF. Please try again.");
    }
  }, [areas, currentAddress, mobilizationFee, calculateTotal]);

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between z-20">
        <div className="flex items-center gap-4">
          <button
            className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
            onClick={() => setShowMobileMenu(!showMobileMenu)}
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">
            <span className="text-orange-500">Map</span>Quotey
          </h1>
        </div>

        {/* Address Search - Center */}
        <div className="hidden md:flex flex-1 justify-center px-8">
          <AddressSearch
            onAddressSelect={handleAddressSelect}
            initialAddress={currentAddress}
          />
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPhotosPanel(!showPhotosPanel)}
            className={`p-2 rounded-lg transition-colors relative ${
              showPhotosPanel
                ? "bg-orange-100 text-orange-600"
                : "hover:bg-gray-100 text-gray-600"
            }`}
            title="Site Photos"
          >
            <Image className="w-5 h-5" />
            {photos.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                {photos.length}
              </span>
            )}
          </button>
          <button
            onClick={logout}
            className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Mobile Address Search */}
      <div className="md:hidden px-4 py-2 bg-white border-b border-gray-200">
        <AddressSearch
          onAddressSelect={handleAddressSelect}
          initialAddress={currentAddress}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Map Area */}
        <div className="flex-1 relative" ref={mapContainerRef}>
          <MapView
            ref={mapViewRef}
            center={mapCenter}
            zoom={mapZoom}
            areas={areas}
            onAreasChange={setAreas}
            isDrawing={isDrawing}
            drawingMode={drawingMode}
            showTopography={showTopography}
            showPropertyBoundaries={showPropertyBoundaries}
          />

          {/* Map Controls */}
          <MapControls
            showTopography={showTopography}
            onToggleTopography={() => setShowTopography(!showTopography)}
            showPropertyBoundaries={showPropertyBoundaries}
            onTogglePropertyBoundaries={() =>
              setShowPropertyBoundaries(!showPropertyBoundaries)
            }
            isDrawing={isDrawing}
            drawingMode={drawingMode}
            onStartDrawing={handleStartDrawing}
            onStopDrawing={handleStopDrawing}
            onClearAllAreas={handleClearAllAreas}
            hasAreas={areas.length > 0}
          />

          {/* AI Auto-Detect Button - positioned below Google Maps controls */}
          <div className="absolute top-20 right-4 z-10">
            <AutoDetect
              mapRef={mapViewRef.current?.getMap() || null}
              mapBounds={mapViewRef.current?.getBounds() || null}
              onAreasDetected={handleAreasDetected}
              existingAreas={areas}
            />
          </div>
        </div>

        {/* Photos Panel (Slide-out) */}
        {showPhotosPanel && (
          <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Site Photos</h2>
              <button
                onClick={() => setShowPhotosPanel(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <PhotoUploadComponent photos={photos} onPhotosChange={setPhotos} />
            </div>
          </div>
        )}

        {/* Pricing Panel */}
        <div className="hidden lg:block">
          <PricingPanel
            areas={areas}
            onUpdateArea={handleUpdateArea}
            onDeleteArea={handleDeleteArea}
            onDownloadQuote={handleDownloadQuote}
            mobilizationFee={mobilizationFee}
            onMobilizationChange={setMobilizationFee}
          />
        </div>
      </div>

      {/* Mobile Pricing Summary */}
      <div className="lg:hidden bg-white border-t border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">
              {areas.length} area{areas.length !== 1 ? "s" : ""} drawn
            </p>
            <p className="text-xl font-bold text-orange-500">
              {formatCurrency(calculateTotal())}
            </p>
          </div>
          <button
            onClick={handleDownloadQuote}
            disabled={areas.length === 0}
            className="bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white font-medium py-2 px-4 rounded-lg"
          >
            Download Quote
          </button>
        </div>
      </div>
    </div>
  );
}
