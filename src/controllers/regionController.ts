import { Request, Response } from 'express';
import asyncHandler from '../utils/asyncHandler';

// AWS Region coordinates and metadata
interface AWSRegion {
  name: string;
  value: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  description: string;
  latency?: number;
}

const AWS_REGIONS: AWSRegion[] = [
  {
    name: 'US East (N. Virginia)',
    value: 'us-east-1',
    coordinates: { lat: 38.9072, lng: -77.0369 },
    description: 'Most popular, lowest latency for US East Coast'
  },
  {
    name: 'US West (Oregon)',
    value: 'us-west-2',
    coordinates: { lat: 45.5152, lng: -122.6784 },
    description: 'Good for US West Coast, competitive pricing'
  },
  {
    name: 'Europe (Ireland)',
    value: 'eu-west-1',
    coordinates: { lat: 53.3498, lng: -6.2603 },
    description: 'Primary European region, good for EU compliance'
  },
  {
    name: 'Asia Pacific (Singapore)',
    value: 'ap-southeast-1',
    coordinates: { lat: 1.3521, lng: 103.8198 },
    description: 'Good for Asia-Pacific markets'
  },
  {
    name: 'Canada (Central)',
    value: 'ca-central-1',
    coordinates: { lat: 45.5017, lng: -73.5673 },
    description: 'Canadian region for data residency'
  },
  {
    name: 'Europe (Frankfurt)',
    value: 'eu-central-1',
    coordinates: { lat: 50.1109, lng: 8.6821 },
    description: 'Central Europe, good performance'
  },
  {
    name: 'Asia Pacific (Tokyo)',
    value: 'ap-northeast-1',
    coordinates: { lat: 35.6762, lng: 139.6503 },
    description: 'Japan region, good for Japanese market'
  },
  {
    name: 'South America (São Paulo)',
    value: 'sa-east-1',
    coordinates: { lat: -23.5505, lng: -46.6333 },
    description: 'South American region'
  },
  {
    name: 'Asia Pacific (Mumbai)',
    value: 'ap-south-1',
    coordinates: { lat: 19.0760, lng: 72.8777 },
    description: 'India region, good for Indian market'
  },
  {
    name: 'Europe (London)',
    value: 'eu-west-2',
    coordinates: { lat: 51.5074, lng: -0.1278 },
    description: 'UK region, good for UK compliance'
  },
  {
    name: 'US East (Ohio)',
    value: 'us-east-2',
    coordinates: { lat: 39.9612, lng: -82.9988 },
    description: 'US East Coast alternative'
  },
  {
    name: 'Asia Pacific (Sydney)',
    value: 'ap-southeast-2',
    coordinates: { lat: -33.8688, lng: 151.2093 },
    description: 'Australia region'
  }
];

// Calculate distance between two points using Haversine formula
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Find the nearest AWS region based on coordinates
function findNearestRegion(lat: number, lng: number): AWSRegion {
  let nearestRegion = AWS_REGIONS[0]; // Default to us-east-1
  let shortestDistance = Infinity;

  for (const region of AWS_REGIONS) {
    const distance = calculateDistance(lat, lng, region.coordinates.lat, region.coordinates.lng);
    if (distance < shortestDistance) {
      shortestDistance = distance;
      nearestRegion = region;
    }
  }

  return {
    ...nearestRegion,
    latency: Math.round(shortestDistance * 2) // Rough estimate: 2ms per 100km
  };
}

// Get nearest region based on coordinates
export const getNearestRegion = asyncHandler(async (req: Request, res: Response) => {
  const { lat, lng } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({ 
      error: "Latitude and longitude are required",
      example: "/api/region/nearest?lat=40.7128&lng=-74.0060"
    });
  }

  const latitude = parseFloat(lat as string);
  const longitude = parseFloat(lng as string);

  if (isNaN(latitude) || isNaN(longitude)) {
    return res.status(400).json({ 
      error: "Invalid latitude or longitude values" 
    });
  }

  if (latitude < -90 || latitude > 90) {
    return res.status(400).json({ 
      error: "Latitude must be between -90 and 90" 
    });
  }

  if (longitude < -180 || longitude > 180) {
    return res.status(400).json({ 
      error: "Longitude must be between -180 and 180" 
    });
  }

  const nearestRegion = findNearestRegion(latitude, longitude);
  const distance = calculateDistance(latitude, longitude, nearestRegion.coordinates.lat, nearestRegion.coordinates.lng);

  res.json({
    userLocation: { lat: latitude, lng: longitude },
    nearestRegion,
    distance: Math.round(distance),
    allRegions: AWS_REGIONS
  });
});

// Get all available regions
export const getAllRegions = asyncHandler(async (req: Request, res: Response) => {
  res.json({
    regions: AWS_REGIONS,
    total: AWS_REGIONS.length
  });
});

// Get region by value
export const getRegionByValue = asyncHandler(async (req: Request, res: Response) => {
  const { value } = req.params;

  const region = AWS_REGIONS.find(r => r.value === value);
  
  if (!region) {
    return res.status(404).json({ 
      error: "Region not found",
      availableRegions: AWS_REGIONS.map(r => r.value)
    });
  }

  res.json({ region });
}); 