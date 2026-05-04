import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 30;

interface ProximityResult {
    proximityShops: boolean;
    proximityTransport: boolean;
    transportTypes: string[];
    lat: number;
    lon: number;
}

// Overpass node/way type → transport category
const TRANSPORT_TYPE_MAP: Record<string, string> = {
    bus_stop: 'Bus',
    bus_station: 'Bus',
    station: 'Train',
    railway_station: 'Train',
    halt: 'Train',
    tram_stop: 'Bus',
    subway_entrance: 'Tube',
    subway_station: 'Tube',
    light_rail: 'DLR',
    monorail: 'DLR',
};

async function geocodePostcode(postcode: string): Promise<{ lat: number; lon: number } | null> {
    const encoded = encodeURIComponent(postcode.trim());
    const url = `https://nominatim.openstreetmap.org/search?q=${encoded}&countrycodes=gb&format=json&limit=1`;

    const res = await fetch(url, {
        headers: { 'User-Agent': 'Rightision-OT/1.0 (occupational-therapy-assessment)' },
        signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return null;
    const data = await res.json();
    if (!data.length) return null;
    return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
}

async function queryOverpass(lat: number, lon: number, radius = 100): Promise<{ shops: boolean; transportTypes: string[] }> {
    const query = `
[out:json][timeout:15];
(
  node["shop"](around:${radius},${lat},${lon});
  node["amenity"="convenience"](around:${radius},${lat},${lon});
  node["amenity"="supermarket"](around:${radius},${lat},${lon});
  node["highway"="bus_stop"](around:${radius},${lat},${lon});
  node["railway"="station"](around:${radius},${lat},${lon});
  node["railway"="halt"](around:${radius},${lat},${lon});
  node["railway"="tram_stop"](around:${radius},${lat},${lon});
  node["railway"="subway_entrance"](around:${radius},${lat},${lon});
  node["public_transport"="stop_position"](around:${radius},${lat},${lon});
  node["public_transport"="station"](around:${radius},${lat},${lon});
);
out tags;
    `.trim();

    const res = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`,
        signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) return { shops: false, transportTypes: [] };

    const data = await res.json();
    const elements: any[] = data.elements || [];

    let shops = false;
    const transportTypeSet = new Set<string>();

    for (const el of elements) {
        const tags = el.tags || {};

        // Shops
        if (tags.shop || tags.amenity === 'convenience' || tags.amenity === 'supermarket') {
            shops = true;
        }

        // Transport
        if (tags.highway === 'bus_stop' || tags.public_transport === 'stop_position') {
            transportTypeSet.add('Bus');
        }
        if (tags.railway === 'station' || tags.railway === 'halt') {
            // Check if it's tube/DLR/train
            const network = (tags.network || '').toLowerCase();
            const operator = (tags.operator || '').toLowerCase();
            const name = (tags.name || '').toLowerCase();
            if (network.includes('dlr') || operator.includes('dlr') || name.includes('dlr')) {
                transportTypeSet.add('DLR');
            } else if (network.includes('london underground') || network.includes('tube') || operator.includes('tfl') || tags['station'] === 'subway') {
                transportTypeSet.add('Tube');
            } else {
                transportTypeSet.add('Train');
            }
        }
        if (tags.railway === 'tram_stop') {
            transportTypeSet.add('Bus'); // Tram mapped to Bus for London context
        }
        if (tags.railway === 'subway_entrance') {
            transportTypeSet.add('Tube');
        }

        const mappedType = TRANSPORT_TYPE_MAP[tags['public_transport:version'] || ''];
        if (mappedType) transportTypeSet.add(mappedType);
    }

    return { shops, transportTypes: Array.from(transportTypeSet) };
}

export async function POST(req: NextRequest) {
    try {
        const { postcode, street } = await req.json();

        if (!postcode) {
            return NextResponse.json({ error: 'Postcode is required' }, { status: 400 });
        }

        const coords = await geocodePostcode(postcode);
        if (!coords) {
            return NextResponse.json(
                { error: `Could not geocode postcode: ${postcode}` },
                { status: 422 }
            );
        }

        const { shops, transportTypes } = await queryOverpass(coords.lat, coords.lon);

        const result: ProximityResult = {
            proximityShops: shops,
            proximityTransport: transportTypes.length > 0,
            transportTypes,
            lat: coords.lat,
            lon: coords.lon,
        };

        return NextResponse.json(result);
    } catch (error) {
        console.error('[Proximity API] Error:', error);
        return NextResponse.json({ error: 'Failed to calculate proximity' }, { status: 500 });
    }
}
