import { getAdminCredential, getApiBase } from './credentials';

type ApiResult<T = unknown> = { ok: boolean; status: number; data: T | null };

async function apiRequest<T = unknown>(
  url: string,
  init?: RequestInit,
): Promise<ApiResult<T>> {
  const response = await fetch(url, init);
  const text = await response.text();
  let data: T | null = null;
  if (text) {
    try {
      data = JSON.parse(text) as T;
    } catch {
      data = null;
    }
  }
  return { ok: response.ok, status: response.status, data };
}

function ts(): string {
  return Date.now().toString();
}

export type E2ETestData = {
  vehicleId: string;
  vehicleNumber: string;
  driverId: string;
  driverName: string;
  tripId?: string;
  tripNumber?: string;
};

export async function createE2EVehicle(token: string): Promise<{ id: string; vehicleNumber: string }> {
  const apiBase = getApiBase();
  const vehicleNumber = `TEST-E2E-E2E-V-${ts()}`;
  const res = await apiRequest<{ data?: { id: string; vehicleNumber: string } }>(
    `${apiBase}/api/v1/vehicles`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ vehicleNumber, vehicleType: 'TRUCK', fuelType: 'DIESEL' }),
    },
  );
  if (!res.ok || !res.data?.data) {
    throw new Error(`Failed to create E2E vehicle: ${res.status}`);
  }
  return res.data.data;
}

export async function createE2EDriver(token: string): Promise<{ id: string; name: string }> {
  const apiBase = getApiBase();
  const name = `TEST-E2E-E2E-D-${ts()}`;
  const licenseNumber = `TEST-E2E-DL-${ts()}`;
  const mobile = `7${ts().slice(-9)}`;
  const res = await apiRequest<{ data?: { id: string; name: string } }>(
    `${apiBase}/api/v1/drivers`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, mobile, licenseNumber }),
    },
  );
  if (!res.ok || !res.data?.data) {
    throw new Error(`Failed to create E2E driver: ${res.status}`);
  }
  return res.data.data;
}

export async function createE2ETrip(
  token: string,
  vehicleId: string,
  driverId: string,
): Promise<{ id: string; tripNumber: string }> {
  const apiBase = getApiBase();
  const res = await apiRequest<{ data?: { id: string; tripNumber: string } }>(
    `${apiBase}/api/v1/trips`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tripType: 'DELIVERY',
        vehicleId,
        driverId,
        originName: 'Test Origin',
        destinationName: 'Test Destination',
      }),
    },
  );
  if (!res.ok || !res.data?.data) {
    throw new Error(`Failed to create E2E trip: ${res.status}`);
  }
  return res.data.data;
}

export async function cancelTrip(token: string, tripId: string): Promise<void> {
  const apiBase = getApiBase();
  await apiRequest(`${apiBase}/api/v1/trips/${tripId}/cancel`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes: 'E2E cleanup' }),
  });
}

export async function resetVehicleStatus(token: string, vehicleId: string): Promise<void> {
  const apiBase = getApiBase();
  await apiRequest(`${apiBase}/api/v1/vehicles/${vehicleId}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'AVAILABLE' }),
  });
}

export async function resetDriverStatus(token: string, driverId: string): Promise<void> {
  const apiBase = getApiBase();
  await apiRequest(`${apiBase}/api/v1/drivers/${driverId}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'AVAILABLE' }),
  });
}

export async function loginAsAdmin(): Promise<string> {
  const apiBase = getApiBase();
  const { identifier, password } = getAdminCredential();
  const res = await apiRequest<{ data?: { accessToken?: string } }>(
    `${apiBase}/api/v1/auth/login`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password }),
    },
  );
  const token = res.data?.data?.accessToken;
  if (!token) throw new Error('Admin login failed');
  return token;
}

export async function setupE2ETestData(): Promise<E2ETestData> {
  const token = await loginAsAdmin();
  const vehicle = await createE2EVehicle(token);
  const driver = await createE2EDriver(token);
  return {
    vehicleId: vehicle.id,
    vehicleNumber: vehicle.vehicleNumber,
    driverId: driver.id,
    driverName: driver.name,
  };
}

export async function cleanupE2ETestData(
  token: string,
  data: E2ETestData,
): Promise<void> {
  if (data.tripId) {
    try {
      const apiBase = getApiBase();
      const tripRes = await apiRequest<{ data?: { status: string } }>(
        `${apiBase}/api/v1/trips/${data.tripId}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (tripRes.data?.data?.status === 'STARTED') {
        await cancelTrip(token, data.tripId);
      }
    } catch { /* best effort */ }
  }
  try { await resetVehicleStatus(token, data.vehicleId); } catch { /* best effort */ }
  try { await resetDriverStatus(token, data.driverId); } catch { /* best effort */ }
}
