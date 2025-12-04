import { ServiceConfig, ServiceType } from "@/types";

export const SERVICES: ServiceConfig[] = [
  {
    id: "lawn_care",
    name: "Lawn Care",
    pricePerSqM: 2.5,
    pricePerSqFt: 0.23,
    unit: "sqm",
    icon: "Leaf",
  },
  {
    id: "pressure_washing",
    name: "Pressure Washing",
    pricePerSqM: 8,
    pricePerSqFt: 0.74,
    unit: "sqm",
    icon: "Droplets",
  },
  {
    id: "concreting",
    name: "Concreting",
    pricePerSqM: 85,
    pricePerSqFt: 7.9,
    unit: "sqm",
    icon: "Square",
  },
  {
    id: "decking",
    name: "Decking",
    pricePerSqM: 250,
    pricePerSqFt: 23.23,
    unit: "sqm",
    icon: "Grid3x3",
  },
  {
    id: "roofing",
    name: "Roofing",
    pricePerSqM: 65,
    pricePerSqFt: 6.04,
    unit: "sqm",
    icon: "Home",
  },
  {
    id: "fencing",
    name: "Fencing",
    pricePerSqM: 120,
    pricePerSqFt: 11.15,
    unit: "linear_m",
    icon: "Fence",
  },
  {
    id: "landscaping",
    name: "Landscaping",
    pricePerSqM: 45,
    pricePerSqFt: 4.18,
    unit: "sqm",
    icon: "TreePine",
  },
  {
    id: "paving",
    name: "Paving",
    pricePerSqM: 75,
    pricePerSqFt: 6.97,
    unit: "sqm",
    icon: "LayoutGrid",
  },
  {
    id: "pool_area",
    name: "Pool Area",
    pricePerSqM: 150,
    pricePerSqFt: 13.94,
    unit: "sqm",
    icon: "Waves",
  },
  {
    id: "custom",
    name: "Custom Service",
    pricePerSqM: 0,
    pricePerSqFt: 0,
    unit: "sqm",
    icon: "Settings",
  },
];

export function getServiceById(id: ServiceType): ServiceConfig | undefined {
  return SERVICES.find((s) => s.id === id);
}

export function calculatePrice(
  area: number,
  service: ServiceConfig,
  isMetric: boolean = true
): number {
  if (isMetric) {
    return area * service.pricePerSqM;
  }
  return area * service.pricePerSqFt;
}

export const DEFAULT_MOBILIZATION_FEE = 200;
