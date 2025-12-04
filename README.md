# MapQuotey - Virtual Site Survey & Quoting Platform

A web-based platform that allows trades and services to enter client addresses and pull Google Maps aerial imagery to determine measurements for virtual site surveys and generate professional quotes.

## Features

- **PIN Authentication**: Secure access with master PIN (default: 1991)
- **Address Search**: Google Places autocomplete for Australian addresses
- **Aerial Imagery**: Satellite view from Google Maps for property measurement
- **Drawing Tools**:
  - Area tool for measuring surfaces (lawns, roofs, driveways)
  - Trail tool for measuring linear features (fencing, edging)
- **Real-time Measurements**: Automatic calculation of area (m² and ft²) and perimeter
- **Service Pricing**: Pre-configured pricing for common services:
  - Lawn Care
  - Pressure Washing
  - Concreting
  - Decking
  - Roofing
  - Fencing
  - Landscaping
  - Paving
  - Pool Area
  - Custom Service
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
1. Click "Start Area" to begin drawing
2. Click on the map to place polygon points
3. Close the shape to complete the area
4. The measurement will appear in the Pricing Panel

### 4. Configure Pricing
1. Expand an area in the Pricing Panel
2. Select a service type from the dropdown
3. Optionally override the price per unit
4. View calculated total

### 5. Add Photos
Click the camera icon to upload site photos for reference.

### 6. Download Quote
Click "Download Quote & Map" to generate a PDF with:
- Property address
- Map screenshot
- Itemized pricing breakdown
- Total cost

## Project Structure

```
mapquotey-app/
├── app/
│   ├── globals.css          # Global styles
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Home page
├── components/
│   ├── AddressSearch.tsx    # Google Places autocomplete
│   ├── Dashboard.tsx        # Main dashboard component
│   ├── LoginForm.tsx        # PIN authentication form
│   ├── MapControls.tsx      # Map control buttons
│   ├── MapView.tsx          # Google Maps component
│   ├── PhotoUpload.tsx      # Photo upload component
│   └── PricingPanel.tsx     # Pricing sidebar
├── context/
│   └── AuthContext.tsx      # Authentication state
├── lib/
│   ├── calculations.ts      # Area/distance calculations
│   └── services.ts          # Service configurations
├── types/
│   └── index.ts             # TypeScript interfaces
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

## Learnings & Notes

### Coordinate Calculations

The app uses the **Haversine formula** for accurate distance calculations on Earth's curved surface. For area calculations, it uses a local planar approximation with the **Shoelace formula**.

### Drawing on Maps

Google Maps Drawing Manager handles polygon creation. The app converts the Google Maps path objects to simple lat/lng arrays for storage and recalculation.

### PDF Generation

Uses `html2canvas` to capture the map as an image, then `jsPDF` to create a professional quote document. The capture process may be slow on complex maps.

### Authentication

Simple PIN-based auth stores state in localStorage. For production, consider implementing proper session management and server-side validation.

## Future Improvements

- [ ] User accounts with database storage
- [ ] Multiple user roles (admin, estimator)
- [ ] Quote history and management
- [ ] Customer database integration
- [ ] Street View integration for eye-level measurements
- [ ] 3D photogrammetry from uploaded images
- [ ] Email quotes directly to customers
- [ ] Mobile app version
- [ ] Offline support
- [ ] Property boundary overlay from cadastral data

## Troubleshooting

### Map not loading
- Check that your API key is correctly set in `.env.local`
- Verify the required APIs are enabled in Google Cloud Console
- Check browser console for error messages

### Drawing not working
- Ensure you clicked "Start Area" before drawing
- Try refreshing the page if the drawing mode is stuck

### PDF generation fails
- Check browser console for errors
- Ensure the map has fully loaded before downloading

## License

Private - For authorized use only.

## Support

For issues or feature requests, contact the development team.
