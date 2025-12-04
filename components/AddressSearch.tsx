"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Search, X, MapPin } from "lucide-react";

interface AddressSearchProps {
  onAddressSelect: (address: string, lat: number, lng: number) => void;
  initialAddress?: string;
}

interface Prediction {
  place_id: string;
  description: string;
}

export default function AddressSearch({
  onAddressSelect,
  initialAddress = "",
}: AddressSearchProps) {
  const [query, setQuery] = useState(initialAddress);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesService = useRef<google.maps.places.PlacesService | null>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (typeof google !== "undefined" && google.maps) {
      autocompleteService.current = new google.maps.places.AutocompleteService();
      const mapDiv = document.createElement("div");
      placesService.current = new google.maps.places.PlacesService(mapDiv);
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const searchPlaces = useCallback((input: string) => {
    if (!autocompleteService.current || input.length < 3) {
      setPredictions([]);
      return;
    }

    setIsLoading(true);

    autocompleteService.current.getPlacePredictions(
      {
        input,
        componentRestrictions: { country: "au" }, // Restrict to Australia
        types: ["address"],
      },
      (results, status) => {
        setIsLoading(false);
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
          setPredictions(results.slice(0, 5));
          setIsOpen(true);
        } else {
          setPredictions([]);
        }
      }
    );
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      searchPlaces(value);
    }, 300);
  };

  const handleSelectPlace = (prediction: Prediction) => {
    if (!placesService.current) return;

    setIsLoading(true);

    placesService.current.getDetails(
      {
        placeId: prediction.place_id,
        fields: ["formatted_address", "geometry"],
      },
      (place, status) => {
        setIsLoading(false);
        if (status === google.maps.places.PlacesServiceStatus.OK && place) {
          const address = place.formatted_address || prediction.description;
          const lat = place.geometry?.location?.lat() || 0;
          const lng = place.geometry?.location?.lng() || 0;

          setQuery(address);
          setIsOpen(false);
          setPredictions([]);
          onAddressSelect(address, lat, lng);
        }
      }
    );
  };

  const handleClear = () => {
    setQuery("");
    setPredictions([]);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-xl">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => predictions.length > 0 && setIsOpen(true)}
          placeholder="Enter property address..."
          className="w-full pl-12 pr-10 py-3 bg-white border border-gray-200 rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Predictions Dropdown */}
      {isOpen && predictions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
          {predictions.map((prediction) => (
            <button
              key={prediction.place_id}
              onClick={() => handleSelectPlace(prediction)}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-start gap-3 border-b border-gray-100 last:border-0 transition-colors"
            >
              <MapPin className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
              <span className="text-sm text-gray-700">{prediction.description}</span>
            </button>
          ))}
        </div>
      )}

      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute right-12 top-1/2 -translate-y-1/2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-500"></div>
        </div>
      )}
    </div>
  );
}
