export interface LatLng {
  lat: number;
  lng: number;
}

export interface DrawnArea {
  id: string;
  type: "area" | "trail";
  points: LatLng[];
  measurements: AreaMeasurements;
  serviceType?: ServiceType;
  pricePerUnit?: number;
  enabled?: boolean; // Whether to include this area in calculations (default: true)
}

export interface AreaMeasurements {
  area: number; // in square meters
  perimeter: number; // in meters
  areaFt: number; // in square feet
  perimeterFt: number; // in feet
}

export type ServiceType =
  | "lawn_care"
  | "pressure_washing"
  | "concreting"
  | "decking"
  | "roofing"
  | "fencing"
  | "landscaping"
  | "paving"
  | "pool_area"
  | "custom";

export interface ServiceConfig {
  id: ServiceType;
  name: string;
  pricePerSqM: number;
  pricePerSqFt: number;
  unit: "sqm" | "sqft" | "linear_m" | "linear_ft";
  icon: string;
}

export interface Quote {
  id: string;
  address: string;
  areas: DrawnArea[];
  subtotal: number;
  mobilization: number;
  total: number;
  createdAt: Date;
  clientName?: string;
  clientEmail?: string;
  notes?: string;
}

export interface PhotoUpload {
  id: string;
  file: File;
  preview: string;
  description?: string;
  uploadedAt: Date;
}
