const BASE = process.env.BACKEND_URL || 'http://localhost:4000';
let TOKEN = '';

async function api(method: string, path: string, body?: Record<string, unknown>) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (TOKEN) headers['Authorization'] = `Bearer ${TOKEN}`;
  const res = await fetch(`${BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  let data: any = null;
  if (text) try { data = JSON.parse(text); } catch { data = null; }
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${data?.message || text}`);
  return data?.data ?? data;
}

async function login() {
  const admin = process.env.ADMIN_USERNAME || 'admin';
  const pass = process.env.ADMIN_PASSWORD || '';
  if (!pass) throw new Error('ADMIN_PASSWORD environment variable is required');
  const data = await api('POST', '/api/v1/auth/login', { identifier: admin, password: pass });
  TOKEN = data.accessToken;
  console.log(`  ✓ Logged in as ${admin}`);
}

let created: Record<string, any> = {};

async function seedAssetCategories() {
  console.log('\nAsset Categories');
  const existing = await api('GET', '/api/v1/assets/categories');
  const existingItems = Array.isArray(existing) ? existing : (existing?.items || []);
  const existingKeys = new Map(existingItems.map((c: any) => [c.key, c.id]));
  const cats = [
    { name: 'Safety Equipment', key: 'safety_equipment', description: 'Helmets, reflective vests, fire extinguishers, first aid kits' },
    { name: 'Tools & Equipment', key: 'tools_equipment', description: 'Spanners, jacks, diagnostic tools, tool boxes' },
    { name: 'Electronics', key: 'electronics', description: 'GPS trackers, dashcams, tablets, OBD scanners' },
    { name: 'Consumables', key: 'consumables', description: 'Oil filters, brake pads, bulbs, fuses' },
    { name: 'Documentation', key: 'documentation', description: 'Logbooks, permits, certificates, manuals' },
  ];
  for (const c of cats) {
    if (existingKeys.has(c.key)) {
      created[c.key] = existingKeys.get(c.key);
      console.log(`  ✓ ${c.name} (exists)`);
    } else {
      const r = await api('POST', '/api/v1/assets/categories', c);
      created[c.key] = r.id;
      console.log(`  ✓ ${c.name}`);
    }
  }
}

async function seedAssets() {
  console.log('\nAssets');
  const existing = await api('GET', '/api/v1/assets');
  const existingItems = Array.isArray(existing) ? existing : (existing?.items || []);
  const existingByCode = new Map(existingItems.map((a: any) => [a.assetCode, a.id]));
  const assets = [
    { assetCode: 'ASSET-001', name: 'Fire Extinguisher 5kg', assetCategoryId: created.safety_equipment, serialNumber: 'FE-2024-001', purchaseAmount: 3500, purchaseDate: '2024-01-15T00:00:00.000Z', notes: 'ABC dry chemical, BIS certified' },
    { assetCode: 'ASSET-002', name: 'First Aid Kit Premium', assetCategoryId: created.safety_equipment, serialNumber: 'FA-2024-002', purchaseAmount: 2800, purchaseDate: '2024-02-10T00:00:00.000Z', notes: 'ISI certified, 50-item kit' },
    { assetCode: 'ASSET-003', name: 'Hydraulic Jack 3 Ton', assetCategoryId: created.tools_equipment, serialNumber: 'HJ-2023-003', purchaseAmount: 8500, purchaseDate: '2023-06-20T00:00:00.000Z', notes: 'Heavy duty floor jack' },
    { assetCode: 'ASSET-004', name: 'Reflective Vest Set (5)', assetCategoryId: created.safety_equipment, serialNumber: 'RV-2024-004', purchaseAmount: 1200, purchaseDate: '2024-03-01T00:00:00.000Z', notes: 'Hi-vis orange vests, AIS-140 compliant' },
    { assetCode: 'ASSET-005', name: 'Dashcam 4K Front+Rear', assetCategoryId: created.electronics, serialNumber: 'DC-2024-005', purchaseAmount: 12000, purchaseDate: '2024-04-15T00:00:00.000Z', notes: 'Night vision, GPS overlay' },
    { assetCode: 'ASSET-006', name: 'OBD2 Diagnostic Scanner', assetCategoryId: created.electronics, serialNumber: 'OB-2023-006', purchaseAmount: 6500, purchaseDate: '2023-09-10T00:00:00.000Z', notes: 'Bluetooth scanner' },
    { assetCode: 'ASSET-007', name: 'LED Warning Light Bar', assetCategoryId: created.safety_equipment, serialNumber: 'LW-2024-007', purchaseAmount: 4200, purchaseDate: '2024-05-20T00:00:00.000Z', notes: 'Magnetic mount amber strobe' },
    { assetCode: 'ASSET-008', name: 'Tool Box Complete Set', assetCategoryId: created.tools_equipment, serialNumber: 'TB-2023-008', purchaseAmount: 15000, purchaseDate: '2023-08-15T00:00:00.000Z', notes: '86-piece mechanic set' },
    { assetCode: 'ASSET-009', name: 'Mobile Tablet Mount', assetCategoryId: created.electronics, serialNumber: 'MT-2024-009', purchaseAmount: 3200, purchaseDate: '2024-06-01T00:00:00.000Z', notes: 'Dashboard mount for driver tablets' },
    { assetCode: 'ASSET-010', name: 'Tire Pressure Gauge Digital', assetCategoryId: created.tools_equipment, serialNumber: 'TP-2024-010', purchaseAmount: 1800, purchaseDate: '2024-07-10T00:00:00.000Z', notes: 'Digital gauge, 0-150 PSI' },
  ];
  for (const a of assets) {
    if (existingByCode.has(a.assetCode)) {
      console.log(`  ✓ ${a.name} (exists)`);
    } else {
      await api('POST', '/api/v1/assets', a);
      console.log(`  ✓ ${a.name}`);
    }
  }
}

async function seedDrivers() {
  console.log('\nDrivers');
  const existing = await api('GET', '/api/v1/drivers');
  const existingItems = Array.isArray(existing) ? existing : (existing?.items || []);
  const existingByName = new Map(existingItems.map((d: any) => [d.name, d.id]));
  const drivers = [
    { name: 'Rajesh Kumar Singh', mobile: '9876543210', alternateMobile: '9812345678', address: '12 Shivaji Nagar, Pune, Maharashtra 411005', emergencyContact: '9823456789', licenseNumber: 'MH-DL-2019-445512', licenseExpiry: '2029-08-15T00:00:00.000Z', experienceYears: 8 },
    { name: 'Mohammed Irfan Patel', mobile: '9988776655', alternateMobile: '9900112233', address: '45 Koramangala, Bangalore, Karnataka 560034', emergencyContact: '9911223344', licenseNumber: 'KA-TR-2020-778812', licenseExpiry: '2030-03-22T00:00:00.000Z', experienceYears: 6 },
    { name: 'Suresh Babu Nair', mobile: '9123456789', alternateMobile: '9234567890', address: '78 Connaught Place, New Delhi 110001', emergencyContact: '9112233445', licenseNumber: 'DL-TC-2018-334499', licenseExpiry: '2028-12-10T00:00:00.000Z', experienceYears: 10 },
    { name: 'Arun Prasad Verma', mobile: '9345678901', alternateMobile: '9456789012', address: '23 T. Nagar, Chennai, Tamil Nadu 600017', emergencyContact: '9334455667', licenseNumber: 'TN-MV-2021-556677', licenseExpiry: '2031-06-30T00:00:00.000Z', experienceYears: 5 },
    { name: 'Vikramjeet Singh Rathore', mobile: '9567890123', alternateMobile: '9678901234', address: '56 Navrangpura, Ahmedabad, Gujarat 380009', emergencyContact: '9556677889', licenseNumber: 'GJ-DR-2019-889900', licenseExpiry: '2029-11-25T00:00:00.000Z', experienceYears: 7 },
    { name: 'Anil Kumar Yadav', mobile: '9789012345', alternateMobile: '9890123456', address: '89 Gomti Nagar, Lucknow, UP 226010', emergencyContact: '9778899001', licenseNumber: 'UP-TC-2022-112233', licenseExpiry: '2032-04-18T00:00:00.000Z', experienceYears: 4 },
  ];
  for (const d of drivers) {
    if (existingByName.has(d.name)) {
      created[`driver_${d.name.split(' ')[0].toLowerCase()}`] = existingByName.get(d.name);
      console.log(`  ✓ ${d.name} (exists)`);
    } else {
      const r = await api('POST', '/api/v1/drivers', d);
      created[`driver_${d.name.split(' ')[0].toLowerCase()}`] = r.id;
      console.log(`  ✓ ${d.name}`);
    }
  }
}

async function seedVehicles() {
  console.log('\nVehicles');
  const existing = await api('GET', '/api/v1/vehicles');
  const existingItems = Array.isArray(existing) ? existing : (existing?.items || []);
  const existingByNumber = new Map(existingItems.map((v: any) => [v.vehicleNumber, v.id]));
  const vehicles = [
    { vehicleNumber: 'MH12DE1234', vehicleType: 'TRUCK', brand: 'Tata', model: 'Prima 2525.K', year: 2023, fuelType: 'DIESEL', chassisNumber: 'MAT535417NZ409821', engineNumber: 'TATA-2523-TURBO-0982', currentOdometer: 48500, status: 'AVAILABLE' },
    { vehicleNumber: 'KA01AB5678', vehicleType: 'TRUCK', brand: 'Ashok Leyland', model: 'Novo 1620', year: 2022, fuelType: 'CNG', chassisNumber: 'AL1620BK2NZ55721', engineNumber: 'H06-CNG-55721', currentOdometer: 73200, status: 'AVAILABLE' },
    { vehicleNumber: 'DL03CE9012', vehicleType: 'BUS', brand: 'Eicher', model: 'Skyline 2070', year: 2024, fuelType: 'DIESEL', chassisNumber: 'EICHER2070NZ88432', engineNumber: 'E710-TURBO-88432', currentOdometer: 18900, status: 'AVAILABLE' },
    { vehicleNumber: 'TN07FG3456', vehicleType: 'TRUCK', brand: 'BharatBenz', model: '1617R', year: 2023, fuelType: 'DIESEL', chassisNumber: 'MBAG1617NZ66412', engineNumber: 'OM926-TURBO-66412', currentOdometer: 55800, status: 'AVAILABLE' },
    { vehicleNumber: 'GJ05HI7890', vehicleType: 'TANKER', brand: 'Mahindra', model: 'Blazo X 25', year: 2021, fuelType: 'DIESEL', chassisNumber: 'MA1BLAZO2NZ11298', engineNumber: 'MDI-71-TURBO-11298', currentOdometer: 92400, status: 'INACTIVE' },
    { vehicleNumber: 'MH14JK2468', vehicleType: 'TRUCK', brand: 'Tata', model: 'Ultra E.1613', year: 2024, fuelType: 'ELECTRIC', chassisNumber: 'TATAU1613NZ77421', engineNumber: 'EV-MOTOR-77421', currentOdometer: 12300, status: 'AVAILABLE' },
    { vehicleNumber: 'UP32LM1357', vehicleType: 'VAN', brand: 'Maruti Suzuki', model: 'Super Carry', year: 2023, fuelType: 'CNG', chassisNumber: 'MSCAR1623NZ33198', engineNumber: 'K12C-CNG-33198', currentOdometer: 34600, status: 'AVAILABLE' },
  ];
  for (const v of vehicles) {
    if (existingByNumber.has(v.vehicleNumber)) {
      created[`vehicle_${v.vehicleNumber.slice(0, 6).toLowerCase()}`] = existingByNumber.get(v.vehicleNumber);
      console.log(`  ✓ ${v.brand} ${v.model} (${v.vehicleNumber}) (exists)`);
    } else {
      const r = await api('POST', '/api/v1/vehicles', v);
      created[`vehicle_${v.vehicleNumber.slice(0, 6).toLowerCase()}`] = r.id;
      console.log(`  ✓ ${v.brand} ${v.model} (${v.vehicleNumber})`);
    }
  }
}

async function seedCompliance() {
  console.log('\nVehicle Compliance');
  const vMap: Record<string, string> = {
    MH12DE: created.vehicle_mh12de,
    KA01AB: created.vehicle_ka01ab,
    DL03CE: created.vehicle_dl03ce,
    TN07FG: created.vehicle_tn07fg,
    GJ05HI: created.vehicle_gj05hi,
    MH14JK: created.vehicle_mh14jk,
    UP32LM: created.vehicle_up32lm,
  };

  const compliance = [
    { prefix: 'MH12DE', reg: { registrationNumber: 'MH12DE202300147', ownerName: 'Fleet Management Pvt Ltd', rtoCode: 'MH12', rtoName: 'Pune RTO' }, insurance: { policyNumber: 'ICL-MH-2025-4471', insurerName: 'ICICI Lombard General Insurance', policyType: 'COMPREHENSIVE', validFrom: '2025-07-08T09:00:00.000Z', validTo: '2026-07-08T23:59:00.000Z', premiumAmount: 38500 }, permit: { permitNumber: 'NP-MH-2024-8812', permitType: 'NATIONAL', issuingAuthority: 'MH-12 RTO, Pune', coveredStates: 'Maharashtra, Karnataka, Gujarat, Madhya Pradesh', validFrom: '2024-04-01T00:00:00.000Z', validTo: '2027-03-31T23:59:00.000Z' }, fitness: { certificateNumber: 'FIT-MH-2025-3344', inspectionDate: '2025-03-15T10:00:00.000Z', validFrom: '2025-03-15T00:00:00.000Z', validTo: '2027-03-14T23:59:00.000Z', inspectionCenter: 'Pune RTO Inspection Center, Hadapsar' }, puc: { certificateNumber: 'PUC-MH-2025-7721', emissionNorm: 'BSVI', validFrom: '2025-06-01T08:00:00.000Z', validTo: '2026-05-31T23:59:00.000Z', testingCenter: 'Arogya PUC Center, Shivajinagar, Pune' }, roadTax: { taxReceiptNumber: 'RT-MH-2023-5501', taxType: 'LIFETIME', amount: 22400, paidFrom: '2023-06-01T00:00:00.000Z', paidTo: '2038-06-01T00:00:00.000Z', issuingState: 'Maharashtra' }, fastag: { fastagId: 'HDFC-MH-2525001', issuerBank: 'HDFC Bank', status: 'ACTIVE', lastKnownBalance: 12500 }, gps: { deviceId: 'AIS140-TVC-MH-001', imei: '860012345678901', vendorName: 'VeCommercial Technologies', ais140Certified: true, status: 'ACTIVE' } },
    { prefix: 'KA01AB', reg: { registrationNumber: 'KA01AB202200893', ownerName: 'Fleet Management Pvt Ltd', rtoCode: 'KA01', rtoName: 'Bangalore Central RTO' }, insurance: { policyNumber: 'NIA-KA-2024-9932', insurerName: 'New India Assurance', policyType: 'COMPREHENSIVE', validFrom: '2024-11-20T00:00:00.000Z', validTo: '2025-11-19T23:59:00.000Z', premiumAmount: 34200 }, permit: { permitNumber: 'SP-KA-2023-4455', permitType: 'STATE', issuingAuthority: 'KA-01 RTO, Bangalore Central', coveredStates: 'Karnataka', validFrom: '2023-09-01T00:00:00.000Z', validTo: '2026-08-31T23:59:00.000Z' }, fitness: { certificateNumber: 'FIT-KA-2024-8812', inspectionDate: '2024-09-10T11:00:00.000Z', validFrom: '2024-09-10T00:00:00.000Z', validTo: '2026-09-09T23:59:00.000Z', inspectionCenter: 'KA-01 RTO, Koramangala, Bangalore' }, puc: { certificateNumber: 'PUC-KA-2024-3367', emissionNorm: 'BSVI', validFrom: '2024-12-01T08:00:00.000Z', validTo: '2025-05-31T23:59:00.000Z', testingCenter: 'Green PUC Center, Indiranagar, Bangalore' }, roadTax: { taxReceiptNumber: 'RT-KA-2022-2201', taxType: 'ANNUAL', amount: 18600, paidFrom: '2025-04-01T00:00:00.000Z', paidTo: '2026-03-31T23:59:00.000Z', issuingState: 'Karnataka' }, fastag: { fastagId: 'SBI-KA-1620002', issuerBank: 'State Bank of India', status: 'ACTIVE', lastKnownBalance: 8750 }, gps: { deviceId: 'AIS140-ITC-KA-002', imei: '860098765432109', vendorName: 'iTriangle Infotech', ais140Certified: true, status: 'ACTIVE' } },
    { prefix: 'DL03CE', reg: { registrationNumber: 'DL03CE202400312', ownerName: 'Fleet Management Pvt Ltd', rtoCode: 'DL03', rtoName: 'Sarai Kale Khan RTO, Delhi' }, insurance: { policyNumber: 'HDFC-DL-2025-1123', insurerName: 'HDFC ERGO General Insurance', policyType: 'COMPREHENSIVE', validFrom: '2025-01-15T00:00:00.000Z', validTo: '2027-01-14T23:59:00.000Z', premiumAmount: 42800 }, permit: { permitNumber: 'NP-DL-2024-7766', permitType: 'NATIONAL', issuingAuthority: 'DL-03 RTO, Sarai Kale Khan, Delhi', coveredStates: 'Delhi, Haryana, Uttar Pradesh, Rajasthan, Punjab', validFrom: '2024-06-01T00:00:00.000Z', validTo: '2029-05-31T23:59:00.000Z' }, fitness: { certificateNumber: 'FIT-DL-2025-1101', inspectionDate: '2025-01-20T09:30:00.000Z', validFrom: '2025-01-20T00:00:00.000Z', validTo: '2027-01-19T23:59:00.000Z', inspectionCenter: 'DL-03 RTO, Transport Nagar, Delhi' }, puc: { certificateNumber: 'PUC-DL-2025-5502', emissionNorm: 'BSVI', validFrom: '2025-02-01T08:00:00.000Z', validTo: '2026-01-31T23:59:00.000Z', testingCenter: 'Delhi Pollution Check Center, Lajpat Nagar' }, roadTax: { taxReceiptNumber: 'RT-DL-2024-8890', taxType: 'LIFETIME', amount: 25000, paidFrom: '2024-06-01T00:00:00.000Z', paidTo: '2039-06-01T00:00:00.000Z', issuingState: 'Delhi' }, fastag: { fastagId: 'ICICI-DL-2070003', issuerBank: 'ICICI Bank', status: 'ACTIVE', lastKnownBalance: 15200 }, gps: { deviceId: 'AIS140-TPG-DL-003', imei: '860056789012345', vendorName: 'TopoGen Navigation', ais140Certified: true, status: 'ACTIVE' } },
    { prefix: 'TN07FG', reg: { registrationNumber: 'TN07FG202300589', ownerName: 'Fleet Management Pvt Ltd', rtoCode: 'TN07', rtoName: 'Tambaram RTO, Chennai' }, insurance: { policyNumber: 'BAJ-TN-2025-6654', insurerName: 'Bajaj Allianz General Insurance', policyType: 'THIRD_PARTY', validFrom: '2025-04-01T00:00:00.000Z', validTo: '2026-03-31T23:59:00.000Z', premiumAmount: 28900 }, permit: { permitNumber: 'GC-TN-2024-3321', permitType: 'GOODS_CARRIAGE', issuingAuthority: 'TN-07 RTO, Tambaram, Chennai', coveredStates: 'Tamil Nadu, Andhra Pradesh, Kerala, Karnataka', validFrom: '2024-08-01T00:00:00.000Z', validTo: '2026-06-30T23:59:00.000Z' }, fitness: { certificateNumber: 'FIT-TN-2024-9987', inspectionDate: '2024-08-15T10:30:00.000Z', validFrom: '2024-08-15T00:00:00.000Z', validTo: '2026-08-14T23:59:00.000Z', inspectionCenter: 'TN-07 RTO, Tambaram, Chennai' }, puc: { certificateNumber: 'PUC-TN-2025-2210', emissionNorm: 'BSVI', validFrom: '2025-05-01T08:00:00.000Z', validTo: '2025-10-31T23:59:00.000Z', testingCenter: 'Madras PUC Center, T. Nagar, Chennai' }, roadTax: { taxReceiptNumber: 'RT-TN-2023-4410', taxType: 'ANNUAL', amount: 14800, paidFrom: '2025-04-01T00:00:00.000Z', paidTo: '2026-03-31T23:59:00.000Z', issuingState: 'Tamil Nadu' }, fastag: { fastagId: 'HDFC-TN-1617004', issuerBank: 'HDFC Bank', status: 'ACTIVE', lastKnownBalance: 6300 }, gps: { deviceId: 'AIS140-TVC-TN-004', imei: '860034567890123', vendorName: 'VeCommercial Technologies', ais140Certified: true, status: 'ACTIVE' } },
    { prefix: 'GJ05HI', reg: { registrationNumber: 'GJ05HI202100274', ownerName: 'Fleet Management Pvt Ltd', rtoCode: 'GJ05', rtoName: 'Ahmedabad RTO' }, insurance: { policyNumber: 'RGI-GJ-2024-7788', insurerName: 'Reliance General Insurance', policyType: 'COMPREHENSIVE', validFrom: '2024-05-10T00:00:00.000Z', validTo: '2025-05-09T23:59:00.000Z', premiumAmount: 36700 }, permit: { permitNumber: 'SP-GJ-2023-1199', permitType: 'STATE', issuingAuthority: 'GJ-05 RTO, Ahmedabad', coveredStates: 'Gujarat, Rajasthan, Madhya Pradesh', validFrom: '2023-10-01T00:00:00.000Z', validTo: '2026-09-30T23:59:00.000Z' }, fitness: { certificateNumber: 'FIT-GJ-2023-5543', inspectionDate: '2023-10-05T11:00:00.000Z', validFrom: '2023-10-05T00:00:00.000Z', validTo: '2025-04-04T23:59:00.000Z', inspectionCenter: 'GJ-05 RTO, Naroda, Ahmedabad' }, puc: { certificateNumber: 'PUC-GJ-2024-8831', emissionNorm: 'BSIV', validFrom: '2024-10-01T08:00:00.000Z', validTo: '2025-09-30T23:59:00.000Z', testingCenter: 'Ahmedabad PUC Center, CG Road' }, roadTax: { taxReceiptNumber: 'RT-GJ-2021-3301', taxType: 'LIFETIME', amount: 19500, paidFrom: '2021-09-01T00:00:00.000Z', paidTo: '2036-09-01T00:00:00.000Z', issuingState: 'Gujarat' }, fastag: { fastagId: 'SBI-GJ-2500005', issuerBank: 'State Bank of India', status: 'BLACKLISTED', lastKnownBalance: 0 }, gps: { deviceId: 'AIS140-ITC-GJ-005', imei: '860078901234567', vendorName: 'iTriangle Infotech', ais140Certified: false, status: 'INACTIVE' } },
    { prefix: 'MH14JK', reg: { registrationNumber: 'MH14JK202400631', ownerName: 'Fleet Management Pvt Ltd', rtoCode: 'MH14', rtoName: 'Nashik RTO' }, insurance: { policyNumber: 'ICL-MH-2025-5590', insurerName: 'ICICI Lombard General Insurance', policyType: 'COMPREHENSIVE', validFrom: '2025-06-16T00:00:00.000Z', validTo: '2027-06-15T23:59:00.000Z', premiumAmount: 51200 }, permit: { permitNumber: 'NP-MH-2025-9901', permitType: 'NATIONAL', issuingAuthority: 'MH-14 RTO, Nashik', coveredStates: 'Maharashtra, Gujarat, Karnataka, Goa', validFrom: '2025-01-01T00:00:00.000Z', validTo: '2029-06-30T23:59:00.000Z' }, fitness: { certificateNumber: 'FIT-MH-2025-6612', inspectionDate: '2025-08-20T09:00:00.000Z', validFrom: '2025-08-20T00:00:00.000Z', validTo: '2027-08-19T23:59:00.000Z', inspectionCenter: 'MH-14 RTO, Satpur, Nashik' }, puc: { certificateNumber: 'PUC-MH-2025-1188', emissionNorm: 'BSVI', validFrom: '2025-06-16T08:00:00.000Z', validTo: '2027-06-15T23:59:00.000Z', testingCenter: 'Nashik EV Test Center, Ambad' }, roadTax: { taxReceiptNumber: 'RT-MH-2024-7710', taxType: 'LIFETIME', amount: 28900, paidFrom: '2024-09-01T00:00:00.000Z', paidTo: '2039-09-01T00:00:00.000Z', issuingState: 'Maharashtra' }, fastag: { fastagId: 'HDFC-MH-1613006', issuerBank: 'HDFC Bank', status: 'ACTIVE', lastKnownBalance: 18400 }, gps: { deviceId: 'AIS140-TVC-MH-006', imei: '860023456789012', vendorName: 'VeCommercial Technologies', ais140Certified: true, status: 'ACTIVE' } },
    { prefix: 'UP32LM', reg: { registrationNumber: 'UP32LM202300418', ownerName: 'Fleet Management Pvt Ltd', rtoCode: 'UP32', rtoName: 'Lucknow RTO' }, insurance: { policyNumber: 'BAJ-UP-2025-3317', insurerName: 'Bajaj Allianz General Insurance', policyType: 'THIRD_PARTY', validFrom: '2025-04-23T00:00:00.000Z', validTo: '2026-04-22T23:59:00.000Z', premiumAmount: 18700 }, permit: { permitNumber: 'SP-UP-2024-2201', permitType: 'STATE', issuingAuthority: 'UP-32 RTO, Lucknow', coveredStates: 'Uttar Pradesh', validFrom: '2024-12-01T00:00:00.000Z', validTo: '2026-11-30T23:59:00.000Z' }, fitness: { certificateNumber: 'FIT-UP-2024-4456', inspectionDate: '2024-11-30T10:30:00.000Z', validFrom: '2024-11-30T00:00:00.000Z', validTo: '2026-11-29T23:59:00.000Z', inspectionCenter: 'UP-32 RTO, Gomti Nagar, Lucknow' }, puc: { certificateNumber: 'PUC-UP-2025-6677', emissionNorm: 'BSVI', validFrom: '2025-06-01T08:00:00.000Z', validTo: '2025-12-31T23:59:00.000Z', testingCenter: 'Lucknow PUC Center, Hazratganj' }, roadTax: { taxReceiptNumber: 'RT-UP-2023-1189', taxType: 'ANNUAL', amount: 9800, paidFrom: '2025-04-01T00:00:00.000Z', paidTo: '2026-03-31T23:59:00.000Z', issuingState: 'Uttar Pradesh' }, fastag: { fastagId: 'SBI-UP-01613007', issuerBank: 'State Bank of India', status: 'ACTIVE', lastKnownBalance: 4200 }, gps: { deviceId: 'AIS140-ITC-UP-007', imei: '860045678901234', vendorName: 'iTriangle Infotech', ais140Certified: true, status: 'ACTIVE' } },
  ];

  for (const c of compliance) {
    const vid = vMap[c.prefix];
    if (!vid) { console.log(`  ⚠ Vehicle ${c.prefix} not found, skipping`); continue; }
    await api('PUT', `/api/v1/vehicle/${vid}/compliance/registration`, c.reg);
    await api('POST', `/api/v1/vehicle/${vid}/compliance/insurance`, c.insurance);
    await api('POST', `/api/v1/vehicle/${vid}/compliance/permits`, c.permit);
    await api('POST', `/api/v1/vehicle/${vid}/compliance/fitness`, c.fitness);
    await api('POST', `/api/v1/vehicle/${vid}/compliance/puc`, c.puc);
    await api('POST', `/api/v1/vehicle/${vid}/compliance/road-tax`, c.roadTax);
    await api('PUT', `/api/v1/vehicle/${vid}/compliance/fastag`, c.fastag);
    await api('PUT', `/api/v1/vehicle/${vid}/compliance/gps-device`, c.gps);
    console.log(`  ✓ ${c.prefix} compliance complete`);
  }
}

async function seedTrips() {
  console.log('\nTrips');
  const v = (p: string) => created[`vehicle_${p.toLowerCase()}`];
  const d = (p: string) => created[`driver_${p.toLowerCase()}`];
  const trips = [
    { tripType: 'DELIVERY', vehicleId: v('MH12DE'), driverId: d('Rajesh'), originName: 'Pune', destinationName: 'Mumbai (JNPT Port)', originAddress: 'Pune MIDC, Bhosari', destinationAddress: 'JNPT Port, Nhava Sheva, Navi Mumbai', plannedStartAt: '2025-06-20T06:00:00.000Z', plannedEndAt: '2025-06-20T11:00:00.000Z', purpose: 'Industrial equipment delivery to JNPT port', notes: 'Fragile cargo, handle with care' },
    { tripType: 'TRANSFER', vehicleId: v('KA01AB'), driverId: d('Mohammed'), originName: 'Bangalore', destinationName: 'Mysore', originAddress: 'Bangalore BMTC Depot, Hebbal', destinationAddress: 'Mysore City Bus Stand', plannedStartAt: '2025-06-21T08:00:00.000Z', plannedEndAt: '2025-06-21T11:30:00.000Z', purpose: 'Vehicle transfer to Bangalore depot', notes: 'Driver exchange at Mysore rest stop' },
    { tripType: 'PICKUP', vehicleId: v('DL03CE'), driverId: d('Suresh'), assistantDriverId: d('Arun'), originName: 'Delhi', destinationName: 'Jaipur', originAddress: 'Okhla Industrial Area, Delhi', destinationAddress: 'Sitapura Industrial Area, Jaipur', plannedStartAt: '2025-06-22T05:30:00.000Z', plannedEndAt: '2025-06-22T12:00:00.000Z', purpose: 'Raw material pickup from Jaipur supplier', notes: 'Pickup authorization letter attached' },
    { tripType: 'SERVICE', vehicleId: v('TN07FG'), driverId: d('Arun'), originName: 'Chennai', destinationName: 'Coimbatore', originAddress: 'Chennai Port Area', destinationAddress: 'Peelamedu, Coimbatore', plannedStartAt: '2025-06-23T04:00:00.000Z', plannedEndAt: '2025-06-23T12:00:00.000Z', purpose: 'Service call to Coimbatore client', notes: 'Spare parts loaded, client contact: Ramesh 98765xxxxx' },
    { tripType: 'DELIVERY', vehicleId: v('GJ05HI'), driverId: d('Vikramjeet'), originName: 'Ahmedabad', destinationName: 'Rajkot', originAddress: 'Naroda GIDC, Ahmedabad', destinationAddress: 'Reliance Refinery, Jamnagar Road, Rajkot', plannedStartAt: '2025-06-19T07:00:00.000Z', plannedEndAt: '2025-06-19T14:00:00.000Z', purpose: 'Chemical tanker delivery to Rajkot refinery', notes: 'Hazmat documentation ready, speed limit 60km/h' },
    { tripType: 'INTERNAL', vehicleId: v('MH14JK'), driverId: d('Rajesh'), originName: 'Nashik', destinationName: 'Pune', originAddress: 'Nashik MIDC, Ambad', destinationAddress: 'Pune IT Park, Hinjewadi', plannedStartAt: '2025-06-20T09:00:00.000Z', plannedEndAt: '2025-06-20T14:00:00.000Z', purpose: 'Nashik to Pune office transfer', notes: 'Zero emission route preferred' },
    { tripType: 'TRANSFER', vehicleId: v('UP32LM'), driverId: d('Anil'), originName: 'Lucknow', destinationName: 'Kanpur', originAddress: 'Aminabad Market Area, Lucknow', destinationAddress: 'Kanpur Central, Gumti No. 5', plannedStartAt: '2025-06-21T10:00:00.000Z', plannedEndAt: '2025-06-21T14:00:00.000Z', purpose: 'Lucknow to Kanpur parts transfer', notes: 'Small parcel, quick turnaround expected' },
    { tripType: 'DELIVERY', vehicleId: v('MH12DE'), driverId: d('Rajesh'), assistantDriverId: d('Suresh'), originName: 'Mumbai', destinationName: 'Nagpur', originAddress: 'Mumbai APMC Market, Vashi', destinationAddress: 'MIHAN SEZ, Nagpur', plannedStartAt: '2025-06-25T04:00:00.000Z', plannedEndAt: '2025-06-25T20:00:00.000Z', purpose: 'Electronics delivery to Nagpur warehouse', notes: 'High-value cargo, GPS tracking mandatory' },
  ];
  for (const t of trips) {
    try {
      const r = await api('POST', '/api/v1/trips', t);
      console.log(`  ✓ ${t.originName} → ${t.destinationName} (${t.tripType})`);
    } catch (e: any) {
      console.log(`  ⚠ ${t.originName} → ${t.destinationName}: ${e.message.split('→')[1]?.trim() || e.message}`);
    }
  }
}

async function seedFuel() {
  console.log('\nFuel Entries');
  const v = (p: string) => created[`vehicle_${p.toLowerCase()}`];
  const entries = [
    { vehicleId: v('MH12DE'), fuelDate: '2025-06-01T08:00:00.000Z', fuelType: 'DIESEL', quantityLiters: 120, pricePerLiter: 92.50, stationName: 'HP Petrol Pump, Pune-Mumbai Highway', receiptNumber: 'HP-PUN-2025-4401', notes: 'Full tank, long haul to Mumbai' },
    { vehicleId: v('KA01AB'), fuelDate: '2025-06-03T09:00:00.000Z', fuelType: 'CNG', quantityLiters: 25, pricePerLiter: 78.00, stationName: 'BP CNG Station, Koramangala, Bangalore', receiptNumber: 'BP-BLR-2025-3312', notes: 'CNG refill before Mysore trip' },
    { vehicleId: v('DL03CE'), fuelDate: '2025-06-05T07:00:00.000Z', fuelType: 'DIESEL', quantityLiters: 85, pricePerLiter: 89.75, stationName: 'IOCL Depot, Mathura Road, Delhi', receiptNumber: 'IOC-DEL-2025-7721', notes: 'Refuel for Jaipur trip' },
    { vehicleId: v('TN07FG'), fuelDate: '2025-06-07T06:00:00.000Z', fuelType: 'DIESEL', quantityLiters: 150, pricePerLiter: 94.20, stationName: 'HP Petrol Pump, GST Road, Chennai', receiptNumber: 'HP-CHN-2025-5533', notes: 'Heavy load Chennai to Coimbatore' },
    { vehicleId: v('GJ05HI'), fuelDate: '2025-06-02T08:00:00.000Z', fuelType: 'DIESEL', quantityLiters: 200, pricePerLiter: 91.80, stationName: 'Reliance Petrol Pump, SG Highway, Ahmedabad', receiptNumber: 'RIL-AMD-2025-2218', notes: 'Tanker refuel, full capacity' },
    { vehicleId: v('MH14JK'), fuelDate: '2025-06-08T10:00:00.000Z', fuelType: 'ELECTRIC', quantityLiters: 50, pricePerLiter: 8.50, stationName: 'Tata Power Charging Station, Nashik', receiptNumber: 'TP-NAS-2025-1102', notes: 'Charged to 95%, 50kWh consumed' },
    { vehicleId: v('UP32LM'), fuelDate: '2025-06-04T09:00:00.000Z', fuelType: 'CNG', quantityLiters: 18, pricePerLiter: 76.50, stationName: 'Indane CNG Station, Hazratganj, Lucknow', receiptNumber: 'IOL-LKN-2025-4405', notes: 'Quick CNG fill before city delivery' },
    { vehicleId: v('MH12DE'), fuelDate: '2025-06-15T08:00:00.000Z', fuelType: 'DIESEL', quantityLiters: 110, pricePerLiter: 93.00, stationName: 'Shell Station, Baner Road, Pune', receiptNumber: 'SHL-PUN-2025-8809', notes: 'Return trip from Mumbai' },
    { vehicleId: v('DL03CE'), fuelDate: '2025-06-18T07:00:00.000Z', fuelType: 'DIESEL', quantityLiters: 95, pricePerLiter: 90.25, stationName: 'BP Petrol Pump, Tonk Road, Jaipur', receiptNumber: 'BP-JAI-2025-6614', notes: 'Refuel during Delhi-Jaipur return' },
    { vehicleId: v('KA01AB'), fuelDate: '2025-06-20T09:00:00.000Z', fuelType: 'CNG', quantityLiters: 28, pricePerLiter: 79.00, stationName: 'HP CNG Station, Electronic City, Bangalore', receiptNumber: 'HP-BLR-2025-9921', notes: 'CNG refill after Mysore run' },
  ];
  for (const e of entries) {
    try {
      await api('POST', '/api/v1/fuel', e);
      console.log(`  ✓ ${e.stationName.split(',')[0]}`);
    } catch (err: any) {
      console.log(`  ⚠ ${e.stationName.split(',')[0]}: ${err.message.split('→')[1]?.trim() || err.message}`);
    }
  }
}

async function seedExpenses() {
  console.log('\nExpenses');
  const v = (p: string) => created[`vehicle_${p.toLowerCase()}`];
  const entries = [
    { vehicleId: v('MH12DE'), expenseDate: '2025-06-01T10:00:00.000Z', category: 'Toll', amount: 850, vendor: 'NHAI FASTag Pune-Mumbai', receiptNumber: 'TOLL-2025-0601-PUN', notes: 'Pune-Mumbai expressway toll' },
    { vehicleId: v('KA01AB'), expenseDate: '2025-06-03T12:00:00.000Z', category: 'Parking', amount: 200, vendor: 'Orion Mall Parking, Bangalore', receiptNumber: 'PRK-2025-0603-BLR', notes: 'Delivery drop parking charge' },
    { vehicleId: v('DL03CE'), expenseDate: '2025-06-05T10:00:00.000Z', category: 'Toll', amount: 1200, vendor: 'NHAI FASTag Delhi-Jaipur', receiptNumber: 'TOLL-2025-0605-DEL', notes: 'Delhi-Jaipur highway toll (round trip)' },
    { vehicleId: v('TN07FG'), expenseDate: '2025-06-07T11:00:00.000Z', category: 'Insurance', amount: 38500, vendor: 'ICICI Lombard General Insurance', receiptNumber: 'INS-TN-2025-ANNUAL', notes: 'Annual comprehensive insurance renewal' },
    { vehicleId: v('GJ05HI'), expenseDate: '2025-06-02T14:00:00.000Z', category: 'Fine', amount: 2000, vendor: 'Gujarat Traffic Police', receiptNumber: 'CHALLAN-GJ-2025-0602', notes: 'Overloading fine near Rajkot' },
    { vehicleId: v('MH14JK'), expenseDate: '2025-06-08T12:00:00.000Z', category: 'Charging', amount: 425, vendor: 'Tata Power Charging, Nashik', receiptNumber: 'CHG-MH-2025-0608', notes: 'Fast charge 50kWh for Pune trip' },
    { vehicleId: v('UP32LM'), expenseDate: '2025-06-04T12:00:00.000Z', category: 'Toll', amount: 650, vendor: 'NHAI FASTag Lucknow-Kanpur', receiptNumber: 'TOLL-2025-0604-UP', notes: 'Lucknow-Kanpur expressway toll' },
    { vehicleId: v('MH12DE'), expenseDate: '2025-06-10T10:00:00.000Z', category: 'Wash', amount: 500, vendor: 'Hero Car Wash, Pune', receiptNumber: 'WASH-2025-0610-PUN', notes: 'Full exterior + interior wash' },
    { vehicleId: v('DL03CE'), expenseDate: '2025-06-12T10:00:00.000Z', category: 'Permit', amount: 5000, vendor: 'Delhi Transport Department', receiptNumber: 'PERM-DL-2025-NP', notes: 'National permit renewal fee' },
    { vehicleId: v('KA01AB'), expenseDate: '2025-06-15T10:00:00.000Z', category: 'Service', amount: 12500, vendor: 'Ashok Leyland ASC, Bangalore', receiptNumber: 'SVC-KA-2025-0615', notes: 'Scheduled 75,000 km service' },
  ];
  for (const e of entries) {
    try {
      await api('POST', '/api/v1/expenses', e);
      console.log(`  ✓ ${e.category} - ${e.vendor}`);
    } catch (err: any) {
      console.log(`  ⚠ ${e.category} - ${e.vendor}: ${err.message.split('→')[1]?.trim() || err.message}`);
    }
  }
}

async function seedMaintenance() {
  console.log('\nMaintenance');
  const v = (p: string) => created[`vehicle_${p.toLowerCase()}`];
  const entries = [
    { vehicleId: v('MH12DE'), requestDate: '2025-06-10T09:00:00.000Z', category: 'Engine', priority: 'HIGH', estimatedCost: 25000, description: 'Engine oil change + filter replacement at 48,000 km service interval. Oil pressure light intermittently on.', notes: 'Use Castrol CRB 15W40, OEM filters' },
    { vehicleId: v('KA01AB'), requestDate: '2025-06-12T09:00:00.000Z', category: 'Brake', priority: 'MEDIUM', estimatedCost: 8000, description: 'Front brake pad replacement, squealing noise during braking at low speeds.', notes: 'Check disc rotor condition as well' },
    { vehicleId: v('DL03CE'), requestDate: '2025-06-15T09:00:00.000Z', category: 'Tire', priority: 'LOW', estimatedCost: 45000, description: 'Full tire replacement (6 tires) - worn tread, approaching minimum depth at 18,900 km.', notes: 'Apollo Endurace HL, size 295/90R20.5' },
    { vehicleId: v('TN07FG'), requestDate: '2025-06-08T09:00:00.000Z', category: 'Electrical', priority: 'CRITICAL', estimatedCost: 15000, description: 'Alternator failure, battery draining completely after overnight parking. Vehicle stranded twice this week.', notes: 'Urgent - vehicle cannot be deployed until fixed' },
    { vehicleId: v('GJ05HI'), requestDate: '2025-06-05T09:00:00.000Z', category: 'Suspension', priority: 'HIGH', estimatedCost: 35000, description: 'Front shock absorber replacement, rough ride reported by driver. Visible oil leak on left side.', notes: 'Replace both front shocks as preventive measure' },
    { vehicleId: v('MH14JK'), requestDate: '2025-06-20T09:00:00.000Z', category: 'Battery', priority: 'MEDIUM', estimatedCost: 85000, description: 'EV battery health check requested. Current capacity at 85%, range reduced by approximately 15%.', notes: 'Schedule with Tata EV service center, Nashik' },
  ];
  for (const e of entries) {
    try {
      await api('POST', '/api/v1/maintenance', e);
      console.log(`  ✓ ${e.category} - ${e.priority}`);
    } catch (err: any) {
      console.log(`  ⚠ ${e.category} - ${e.priority}: ${err.message.split('→')[1]?.trim() || err.message}`);
    }
  }
}

async function seedRepairs() {
  console.log('\nRepairs');
  const v = (p: string) => created[`vehicle_${p.toLowerCase()}`];
  const entries = [
    { vehicleId: v('MH12DE'), repairDate: '2025-05-20T09:00:00.000Z', category: 'Body', provider: 'Tata Authorized Service, Pune', description: 'Front bumper repair after minor collision at parking lot. Dent removal and repaint required.', estimatedCost: 18000, actualCost: 16500, invoiceNumber: 'TATA-PUN-2025-0520', notes: 'Insurance claim processed, deductible paid' },
    { vehicleId: v('KA01AB'), repairDate: '2025-05-15T09:00:00.000Z', category: 'Engine', provider: 'Ashok Leyland ASC, Bangalore', description: 'Turbocharger overhaul at 73,000 km. Loss of power and black smoke under load.', estimatedCost: 42000, actualCost: 39800, invoiceNumber: 'AL-BLR-2025-0515', notes: 'Genuine turbo kit replaced, 6-month warranty' },
    { vehicleId: v('DL03CE'), repairDate: '2025-05-25T09:00:00.000Z', category: 'AC', provider: 'Delhi AC Works, Karol Bagh', description: 'AC compressor replacement, cabin cooling completely stopped. Refrigerant leak detected.', estimatedCost: 12000, actualCost: 11200, invoiceNumber: 'ACW-DEL-2025-0525', notes: 'New compressor + receiver drier + gas refill' },
    { vehicleId: v('TN07FG'), repairDate: '2025-06-01T09:00:00.000Z', category: 'Brake', provider: 'BharatBenz Service Center, Chennai', description: 'Rear brake drum machining + shoe replacement. Excessive braking distance reported.', estimatedCost: 9500, actualCost: 9200, invoiceNumber: 'BB-CHN-2025-0601', notes: 'Drums resurfaced, new shoes fitted, brake fluid topped' },
    { vehicleId: v('GJ05HI'), repairDate: '2025-04-10T09:00:00.000Z', category: 'Electrical', provider: 'Auto Electric Works, Ahmedabad', description: 'Wiring harness repair, right indicator and headlight malfunction. Rodent damage suspected.', estimatedCost: 7500, actualCost: 7000, invoiceNumber: 'AEW-AMD-2025-0410', notes: 'Harness repaired, protective conduit added' },
    { vehicleId: v('UP32LM'), repairDate: '2025-05-30T09:00:00.000Z', category: 'Body', provider: 'Maruti Authorized Workshop, Lucknow', description: 'Left side mirror replacement + door dent repair from loading dock incident.', estimatedCost: 5500, actualCost: 5200, invoiceNumber: 'MS-LKN-2025-0530', notes: 'OEM mirror fitted, dent pulled and painted' },
  ];
  for (const e of entries) {
    try {
      await api('POST', '/api/v1/repairs', e);
      console.log(`  ✓ ${e.category} - ${e.provider}`);
    } catch (err: any) {
      console.log(`  ⚠ ${e.category} - ${e.provider}: ${err.message.split('→')[1]?.trim() || err.message}`);
    }
  }
}

async function main() {
  console.log('\n🌱 API Seed — Realistic Fleet Data\n');
  console.log('─'.repeat(50));

  await login();
  await seedAssetCategories();
  await seedAssets();
  await seedDrivers();
  await seedVehicles();
  await seedCompliance();
  await seedTrips();
  await seedFuel();
  await seedExpenses();
  await seedMaintenance();
  await seedRepairs();

  console.log('\n' + '─'.repeat(50));
  console.log('✅ Seed complete!\n');
  process.exit(0);
}

main().catch(async (err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
