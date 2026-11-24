export type CutawayMode = 'full' | 'upper' | 'ground' | 'exploded';
export type FinishId = 'limestone' | 'cedar' | 'charcoal';
export type UnitSystem = 'imperial' | 'metric';

export interface RoomSpec {
  id: string;
  slug: string;
  name: string;
  floor: 'Ground Floor' | 'Upper Floor' | 'Outdoor' | 'Rooftop';
  areaSqFt: number;
  widthFt: number;
  lengthFt: number;
  ceilingFt: number;
  exposure: string;
  summary: string;
  highlights: string[];
  recommendedCutaway: CutawayMode;
  labelPos: [number, number, number];
  camPos: [number, number, number];
  camTarget: [number, number, number];
}

export interface FinishPreset {
  id: FinishId;
  name: string;
  shortLabel: string;
  swatchPrimary: string;
  swatchAccent: string;
  exteriorWall: number;
  accentCladding: number;
  roofTrim: number;
  windowFrame: number;
  woodTone: number;
}

export interface PropertyOverview {
  title: string;
  subtitle: string;
  address: string;
  price: number;
  totalSqFt: number;
  lotSqFt: number;
  beds: number;
  baths: number;
  garageSpaces: number;
  yearBuilt: number;
  architecturalStyle: string;
  annualTax: number;
  monthlyHoa: number;
  energyRating: string;
}

export const PROPERTY_OVERVIEW: PropertyOverview = {
  title: 'The Ridgeview Residence',
  subtitle: 'Architectural Hillside Villa with Infinity Pool',
  address: '418 Crestline Terrace, Pacific Palisades',
  price: 2450000,
  totalSqFt: 3480,
  lotSqFt: 9200,
  beds: 4,
  baths: 3.5,
  garageSpaces: 2,
  yearBuilt: 2026,
  architecturalStyle: 'Warm Coastal Modernism',
  annualTax: 26950,
  monthlyHoa: 285,
  energyRating: 'Net-Zero Ready · 9.6 kW Solar',
};

export const FINISH_PRESETS: FinishPreset[] = [
  {
    id: 'limestone',
    name: 'Warm Limestone & Oak',
    shortLabel: 'Limestone',
    swatchPrimary: '#e6dfd5',
    swatchAccent: '#b98b5b',
    exteriorWall: 0xe8e2d8,
    accentCladding: 0xc29768,
    roofTrim: 0x33373d,
    windowFrame: 0x26292e,
    woodTone: 0xb98b5c,
  },
  {
    id: 'cedar',
    name: 'Coastal Cedar & Plaster',
    shortLabel: 'Cedar',
    swatchPrimary: '#f2efe9',
    swatchAccent: '#9c663b',
    exteriorWall: 0xf0ede6,
    accentCladding: 0x9f6438,
    roofTrim: 0x463a31,
    windowFrame: 0x3a322c,
    woodTone: 0xa2663c,
  },
  {
    id: 'charcoal',
    name: 'Charcoal Slate & Walnut',
    shortLabel: 'Charcoal',
    swatchPrimary: '#474e57',
    swatchAccent: '#7d5a3c',
    exteriorWall: 0x4b525c,
    accentCladding: 0x7b583a,
    roofTrim: 0x1c2026,
    windowFrame: 0x181b20,
    woodTone: 0x7d5a3d,
  },
];

export const ROOMS: RoomSpec[] = [
  {
    id: 'living-room',
    slug: 'living-room',
    name: 'Living Pavilion',
    floor: 'Ground Floor',
    areaSqFt: 520,
    widthFt: 20,
    lengthFt: 26,
    ceilingFt: 11.5,
    exposure: 'South & West Glass',
    summary:
      'Open-concept main living pavilion anchored by a linear stone hearth and pocket glass walls that slide open to the pool terrace.',
    highlights: [
      '11.5 ft ceiling height with direct sightlines across the infinity pool',
      'Wide-plank European oak flooring and recessed architectural linear lighting',
    ],
    recommendedCutaway: 'ground',
    labelPos: [-3.2, 2.3, 1.5],
    camPos: [-11.5, 9.2, 11.8],
    camTarget: [-3.0, 1.2, 1.2],
  },
  {
    id: 'kitchen',
    slug: 'kitchen',
    name: "Chef's Kitchen & Dining",
    floor: 'Ground Floor',
    areaSqFt: 380,
    widthFt: 16,
    lengthFt: 24,
    ceilingFt: 10.5,
    exposure: 'East & South',
    summary:
      'Sculptural waterfall marble island seating three, paired with custom rift-cut oak cabinetry and an adjacent six-seat dining space.',
    highlights: [
      '11 ft honed Carrara marble island with integrated prep sink',
      'Direct step-out flow to the cedar pergola outdoor dining terrace',
    ],
    recommendedCutaway: 'ground',
    labelPos: [2.8, 2.3, -1.2],
    camPos: [11.2, 9.0, 9.5],
    camTarget: [2.6, 1.2, -1.0],
  },
  {
    id: 'primary-suite',
    slug: 'primary-suite',
    name: 'Primary Suite & Spa',
    floor: 'Upper Floor',
    areaSqFt: 440,
    widthFt: 18,
    lengthFt: 24.5,
    ceilingFt: 10,
    exposure: 'South-West Panoramic',
    summary:
      'Private cantilevered upper-level retreat featuring a king lounge zone, private glass balcony, soaking tub, and double marble vanity.',
    highlights: [
      'Private 140 sq ft cantilevered balcony overlooking the pool and hillside',
      'En-suite spa bath with freestanding soaking tub and walk-in rain shower',
    ],
    recommendedCutaway: 'upper',
    labelPos: [-3.4, 5.5, 0.8],
    camPos: [-12.5, 11.2, 10.8],
    camTarget: [-3.2, 4.3, 0.6],
  },
  {
    id: 'pool-deck',
    slug: 'pool-deck',
    name: 'Infinity Pool & Pergola',
    floor: 'Outdoor',
    areaSqFt: 610,
    widthFt: 18,
    lengthFt: 34,
    ceilingFt: 0,
    exposure: 'Full Southern Sun',
    summary:
      'Resort-grade travertine sun deck wrapping a heated infinity-edge lap pool, sun loungers, and a shaded cedar pergola dining lounge.',
    highlights: [
      'Heated 32 ft infinity lap pool with underwater evening illumination',
      'Architectural slatted cedar pergola filters harsh midday sun',
    ],
    recommendedCutaway: 'full',
    labelPos: [0.2, 1.4, 7.6],
    camPos: [11.8, 6.2, 16.5],
    camTarget: [0.0, 1.0, 6.0],
  },
  {
    id: 'home-office',
    slug: 'home-office',
    name: 'Garden Studio / 4th Bed',
    floor: 'Ground Floor',
    areaSqFt: 210,
    widthFt: 14,
    lengthFt: 15,
    ceilingFt: 10,
    exposure: 'North-West Garden',
    summary:
      'Quiet ground-floor executive studio with built-in floor-to-ceiling shelving and garden views; converts effortlessly to a 4th guest bedroom.',
    highlights: [
      'Acoustic privacy away from the main living and kitchen zones',
      'Adjacent to ground-floor powder room and separate side entry',
    ],
    recommendedCutaway: 'ground',
    labelPos: [-4.2, 2.3, -3.5],
    camPos: [-12.8, 8.8, -8.5],
    camTarget: [-4.0, 1.3, -3.2],
  },
  {
    id: 'rooftop-terrace',
    slug: 'rooftop-terrace',
    name: 'Sunset Viewing Deck',
    floor: 'Rooftop',
    areaSqFt: 340,
    widthFt: 16,
    lengthFt: 21,
    ceilingFt: 0,
    exposure: '360° Horizon Views',
    summary:
      'Elevated rooftop lounge terrace framed by frameless glass guardrails and adjacent to the concealed high-efficiency solar array.',
    highlights: [
      'Unobstructed sunset views above neighboring rooflines',
      'Pre-wired for outdoor fire feature and architectural step lighting',
    ],
    recommendedCutaway: 'full',
    labelPos: [-2.0, 8.1, 0.2],
    camPos: [-11.5, 13.5, 10.5],
    camTarget: [-1.8, 6.9, 0.0],
  },
];

export interface AdditionalSpaceRow {
  name: string;
  floor: string;
  widthFt: number;
  lengthFt: number;
  areaSqFt: number;
}

export const ALL_FLOOR_SPACES: AdditionalSpaceRow[] = [
  { name: 'Living Pavilion', floor: 'Ground', widthFt: 20, lengthFt: 26, areaSqFt: 520 },
  { name: "Chef's Kitchen & Dining", floor: 'Ground', widthFt: 16, lengthFt: 24, areaSqFt: 380 },
  { name: 'Garden Studio / 4th Bed', floor: 'Ground', widthFt: 14, lengthFt: 15, areaSqFt: 210 },
  { name: 'Entry Foyer & Powder Room', floor: 'Ground', widthFt: 12, lengthFt: 15, areaSqFt: 180 },
  { name: '2-Car EV Garage & Mudroom', floor: 'Ground', widthFt: 21, lengthFt: 22, areaSqFt: 460 },
  { name: 'Primary Suite & Spa Bath', floor: 'Upper', widthFt: 18, lengthFt: 24.5, areaSqFt: 440 },
  { name: 'Bedroom 2 (East View)', floor: 'Upper', widthFt: 14, lengthFt: 15, areaSqFt: 210 },
  { name: 'Bedroom 3 & En-Suite', floor: 'Upper', widthFt: 13.5, lengthFt: 15, areaSqFt: 205 },
  { name: 'Upper Gallery & Laundry', floor: 'Upper', widthFt: 14, lengthFt: 18, areaSqFt: 255 },
  { name: 'Covered Patio & Infinity Deck', floor: 'Outdoor', widthFt: 18, lengthFt: 34, areaSqFt: 610 },
  { name: 'Sunset Rooftop Deck', floor: 'Rooftop', widthFt: 16, lengthFt: 21, areaSqFt: 340 },
];

export const CAMERA_PRESETS = {
  overview: {
    pos: [18.5, 11.8, 19.5] as [number, number, number],
    target: [0, 2.5, 1.2] as [number, number, number],
  },
  floorplan: {
    pos: [0.5, 22.5, 13.8] as [number, number, number],
    target: [0, 1.6, 0.5] as [number, number, number],
  },
  exploded: {
    pos: [19.8, 14.5, 19.8] as [number, number, number],
    target: [0, 4.8, 0.4] as [number, number, number],
  },
  sunlight: {
    pos: [21.0, 12.6, 17.5] as [number, number, number],
    target: [0, 2.2, 1.8] as [number, number, number],
  },
};

export function formatArea(sqFt: number, unit: UnitSystem): string {
  if (unit === 'metric') {
    const sqM = Math.round(sqFt * 0.092903);
    return `${sqM.toLocaleString()} m²`;
  }
  return `${sqFt.toLocaleString()} sq ft`;
}

export function formatDimension(widthFt: number, lengthFt: number, unit: UnitSystem): string {
  if (unit === 'metric') {
    const w = (widthFt * 0.3048).toFixed(1);
    const l = (lengthFt * 0.3048).toFixed(1);
    return `${w} × ${l} m`;
  }
  return `${widthFt} × ${lengthFt} ft`;
}

export function formatHeight(ft: number, unit: UnitSystem): string {
  if (ft <= 0) return 'Open Air';
  if (unit === 'metric') {
    return `${(ft * 0.3048).toFixed(1)} m`;
  }
  return `${ft} ft`;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}
