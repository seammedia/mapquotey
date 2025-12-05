# MapQuotey - Virtual Site Survey & Quoting Platform

A web-based platform that allows trades and services to enter client addresses and pull Google Maps aerial imagery to determine measurements for virtual site surveys and generate professional quotes.

## Features

- **PIN Authentication**: Secure access with master PIN (default: 1991)
- **Address Search**: Google Places autocomplete for Australian addresses
- **Aerial Imagery**: Satellite view from Google Maps for property measurement
- **Quick-Add Area Types**: Pre-configured buttons for common area types:
  - Roof (red)
  - Grass/Lawn (green)
  - Concrete/Driveway (gray)
  - Pool (blue)
  - Fence (stone)
  - Garden (lime)
  - Deck (purple)
  - Patio (amber)
- **Drawing Tools**:
  - Area tool for measuring surfaces (lawns, roofs, driveways)
  - Trail tool for measuring linear features (fencing, edging)
- **Color-Coded Polygons**: Each area type has a distinct color on the map
- **Checkbox Toggles**: Enable/disable areas in pricing calculations
- **Real-time Measurements**: Automatic calculation of area (m² and ft²) and perimeter
- **Service Pricing**: Pre-configured pricing for common services
- **Projects Panel**: Save and load projects by address (localStorage)
- **Photo Upload**: Add site photos for 3D imagery reference
- **Quote Generation**: Download professional PDF quotes with map snapshot
- **Metric/Imperial Toggle**: Switch between measurement units
- **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Maps**: @react-google-maps/api
- **PDF Generation**: jsPDF + html2canvas
- **Icons**: Lucide React
- **Storage**: localStorage (Supabase-ready)

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Google Maps API Key with the following APIs enabled:
  - Maps JavaScript API
  - Places API
  - Drawing Library

### Installation

1. Clone the repository:
```bash
cd /Volumes/PortableSSD/Projects/MapQuotey/mapquotey-app
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.local.example .env.local
```

4. Add your Google Maps API key to `.env.local`:
```
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key_here
```

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

### Default Login PIN

The master PIN is: **1991**

## Usage Guide

### 1. Login
Enter the 4-digit PIN to access the dashboard.

### 2. Search Address
Use the search bar to find a property by address. The map will automatically zoom to the selected location.

### 3. Draw Areas
1. Click a quick-add button (Roof, Grass, Concrete, etc.) on the right side
2. Click on the map to place polygon points
3. Close the shape to complete the area
4. The area automatically gets the correct color and service type
5. Use the checkbox to toggle areas on/off in calculations

### 4. Configure Pricing
1. Expand an area in the Pricing Panel
2. Optionally change the service type
3. Optionally override the price per unit
4. View calculated total

### 5. Save Projects
1. Click "Save" in the Projects panel to save current work
2. Projects are stored by address
3. Click any saved project to reload it with all areas

### 6. Add Photos
Click the camera icon to upload site photos for reference.

### 7. Download Quote
Click "Download Quote & Map" to generate a PDF with:
- Property address
- Map screenshot
- Itemized pricing breakdown
- Total cost

## Project Structure

```
mapquotey-app/
├── app/
│   ├── api/
│   │   └── detect/           # AI detection API (deprecated)
│   ├── globals.css           # Global styles
│   ├── layout.tsx            # Root layout
│   └── page.tsx              # Home page
├── components/
│   ├── AddressSearch.tsx     # Google Places autocomplete
│   ├── AutoDetect.tsx        # AI auto-detection (deprecated)
│   ├── Dashboard.tsx         # Main dashboard component
│   ├── LoginForm.tsx         # PIN authentication form
│   ├── MapControls.tsx       # Map control buttons
│   ├── MapView.tsx           # Google Maps component
│   ├── PhotoUpload.tsx       # Photo upload component
│   ├── PricingPanel.tsx      # Pricing sidebar with checkboxes
│   ├── ProjectsPanel.tsx     # Projects save/load sidebar
│   └── QuickAddButtons.tsx   # Area type quick-add buttons
├── context/
│   └── AuthContext.tsx       # Authentication state
├── lib/
│   ├── calculations.ts       # Area/distance calculations
│   └── services.ts           # Service configurations
├── types/
│   └── index.ts              # TypeScript interfaces
└── README.md
```

## Configuration

### Changing the Master PIN

Edit `context/AuthContext.tsx`:
```typescript
const MASTER_PIN = "1991"; // Change this value
```

### Adding New Services

Edit `lib/services.ts` to add or modify service types:
```typescript
{
  id: "new_service",
  name: "New Service",
  pricePerSqM: 100,
  pricePerSqFt: 9.29,
  unit: "sqm",
  icon: "IconName",
}
```

### Changing Default Mobilization Fee

Edit `lib/services.ts`:
```typescript
export const DEFAULT_MOBILIZATION_FEE = 200; // Change this value
```

### Adding New Area Types

Edit `components/QuickAddButtons.tsx` to add new area types:
```typescript
const areaTypes = [
  { id: "roof", label: "Roof", icon: Home, color: "#ef4444" },
  // Add new types here
];
```

Also update `components/MapView.tsx` featureColors and `components/PricingPanel.tsx` areaColors.

## API Key Setup

### Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable the following APIs:
   - Maps JavaScript API
   - Places API
4. Create credentials (API Key)
5. Restrict the key to your domains for production

### API Key Restrictions (Recommended)

For production, restrict your API key:
- **Application restrictions**: HTTP referrers
- **Website restrictions**: Add your domain(s)
- **API restrictions**: Select only required APIs

## Learnings & Technical Notes

### Google Maps Polygon Rendering with React

**Problem**: Polygons created via native `google.maps.Polygon` API were attaching to stale map references when using `@react-google-maps/api`.

**Symptoms**:
- Polygons showed as "created" in console with correct coordinates
- `polygon.getMap()` returned a map object
- But polygons were invisible on the actual displayed map

**Root Cause**: The `<GoogleMap>` component can internally recreate its map instance on prop changes (center, zoom, options). When this happens, the `onLoad` callback doesn't fire again, leaving `mapRef` pointing to an old/unmounted map instance.

**Solution**: Use the `useGoogleMap()` hook inside a child component of `<GoogleMap>`. This hook retrieves the map instance directly from React context, ensuring you always have the current map:

```typescript
function PolygonRenderer({ areas }) {
  const map = useGoogleMap(); // Always gets current map from context

  useEffect(() => {
    if (!map) return;
    // Create polygons with map instance from hook
    areas.forEach(area => {
      new google.maps.Polygon({
        paths: area.points,
        map: map, // Guaranteed to be the visible map
      });
    });
  }, [map, areas]);
}
```

**Key Insight**: The `DrawingManager` component works because it's a React component child of `<GoogleMap>` that automatically gets the correct map via context. Manual polygon creation needs the same pattern.

### Map Bounds and Coordinate Transformation

**Problem**: When capturing map screenshots for AI analysis, the `mapBounds` prop could become stale if passed at render time rather than fetched fresh.

**Solution**: Always get bounds directly from `mapRef.getBounds()` at the moment you need them, not from props:

```typescript
const handleDetect = async () => {
  // Get FRESH bounds at detection time
  const currentBounds = mapRef.getBounds();
  // NOT: mapBounds prop which may be stale
};
```

### AI Auto-Detection Limitations

**Attempted**: Using GPT-4 Vision to detect property features (roof, lawn, driveway, etc.) and return percentage-based bounding boxes.

**Problems Encountered**:
1. Vision models aren't designed for precise bounding box coordinates
2. Coordinate transformation from image percentages to lat/lng is complex due to:
   - Mercator projection distortion
   - Image capture dimensions vs map bounds mismatch
   - Google Maps UI elements in captured images
3. Features have irregular shapes that don't fit rectangles well
4. Consistent alignment across different zoom levels and locations is impractical

**Decision**: Removed AI auto-detection in favor of manual quick-add buttons. Manual drawing is more accurate and gives users precise control.

**Lesson**: AI vision is good for classification ("this property has a pool") but not for precise spatial placement. For accurate measurements, manual drawing is superior.

### Coordinate Calculations

The app uses the **Haversine formula** for accurate distance calculations on Earth's curved surface. For area calculations, it uses a local planar approximation with the **Shoelace formula**.

### Color-Coded Area Types

Areas are identified by their ID prefix (e.g., "roof-123456"). The `getAreaColor()` function extracts the type and returns the corresponding color:

```typescript
const getAreaColor = (areaId: string): string => {
  const parts = areaId.split("-");
  const featureType = parts[0];
  return featureColors[featureType] || "#f97316";
};
```

### localStorage for Projects

Projects are saved to localStorage with the structure:
```typescript
interface Project {
  id: string;
  address: string;
  center: LatLng;
  zoom: number;
  areas: DrawnArea[];
  createdAt: string;
  updatedAt: string;
}
```

This allows offline persistence but doesn't sync across devices. Ready for Supabase upgrade.

### PDF Generation

Uses `html2canvas` to capture the map as an image, then `jsPDF` to create a professional quote document. The capture process may be slow on complex maps.

### Authentication

Simple PIN-based auth stores state in localStorage. For production, consider implementing proper session management and server-side validation.

## Future Improvements

- [ ] Supabase integration for cloud project storage
- [ ] User accounts with database storage
- [ ] Multiple user roles (admin, estimator)
- [ ] Quote history and management
- [ ] Customer database integration
- [ ] Street View integration for eye-level measurements
- [ ] Email quotes directly to customers
- [ ] Mobile app version
- [ ] Offline support with sync
- [ ] Property boundary overlay from cadastral data
- [ ] Undo/redo for drawing operations

## Troubleshooting

### Map not loading
- Check that your API key is correctly set in `.env.local`
- Verify the required APIs are enabled in Google Cloud Console
- Check browser console for error messages

### Polygons not showing
- Check console for "PolygonRenderer: No map from useGoogleMap hook"
- Ensure areas have valid points (at least 3 coordinates)
- Verify area.enabled !== false

### Drawing not working
- Ensure you clicked a quick-add button before drawing
- Try refreshing the page if the drawing mode is stuck

### PDF generation fails
- Check browser console for errors
- Ensure the map has fully loaded before downloading

### Projects not saving
- Check browser's localStorage is not full or disabled
- Look for errors in console

## Deployment

### Vercel (Recommended)

```bash
npx vercel --prod
```

Ensure environment variables are set in Vercel dashboard:
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`

## License

Private - For authorized use only.

## Support

For issues or feature requests, contact the development team.
