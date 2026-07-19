export const API_BASE_URL = (import.meta.env?.VITE_API_BASE_URL as string) || 'http://localhost:3000';

// Submit GeoJSON feature to backend /farmer/submit
export async function submitFarmerRecord(geojson: any): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/farmer/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ geojson }),
  });

  // Backend sometimes returns 200 even on handled errors; try to parse JSON
  try {
    return await res.json();
  } catch {
    return { success: res.ok };
  }
}

export async function getFarmerStatus(hash: string): Promise<{ status: string; reason?: string }> {
  const res = await fetch(`${API_BASE_URL}/farmer/status?hash=${encodeURIComponent(hash)}`);
  return res.json();
}
