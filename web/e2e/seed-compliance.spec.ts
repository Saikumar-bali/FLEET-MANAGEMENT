import { test, expect, Page } from '@playwright/test';
import { loginAsRole } from './helpers/credentials';

async function wait(page: Page, ms = 1000) { await page.waitForTimeout(ms); }

function uid(): string {
  return Math.random().toString(36).substring(2, 6).toUpperCase();
}

type V = {
  vn: string; vt: string; brand: string; model: string; year: string; fuel: string; odo: string;
  chassis: string; engine: string; rc: string;
  insExp: string; fitExp: string; pucExp: string; permitExp: string; status: string;
  insurance: { pn: string; ins: string; pt: string; vf: string; vt2: string; prem: string };
  permit: { pn: string; pt: string; auth: string; vf: string; vt2: string; states: string };
  fitness: { cn: string; id: string; vf: string; vt2: string; center: string };
  puc: { cn: string; en: string; vf: string; vt2: string; center: string };
  roadTax: { rn: string; tt: string; amt: string; pf: string; pt2: string; state: string };
  fastag: { fid: string; bank: string; st: string; bal: string };
  gps: { did: string; imei: string; vendor: string; ais: string; st: string };
  doc: { ct: string; dn: string; vf: string; vt2: string; auth: string; notes: string };
};

const V: V[] = [
  {
    vn: 'MH12DE1234', vt: 'TRUCK', brand: 'Tata', model: 'Prima 2525.K', year: '2023', fuel: 'DIESEL', odo: '48500',
    chassis: 'MAT535417NZ409821', engine: 'TATA-2523-TURBO-0982', rc: 'MH12DE202300147',
    insExp: '2026-07-08', fitExp: '2027-03-15', pucExp: '2026-05-31', permitExp: '2027-03-31', status: 'AVAILABLE',
    insurance: { pn: 'ICL-MH-2025-4471', ins: 'ICICI Lombard General Insurance', pt: 'COMPREHENSIVE', vf: '2025-07-08T09:00', vt2: '2026-07-08T23:59', prem: '38500' },
    permit: { pn: 'NP-MH-2024-8812', pt: 'NATIONAL', auth: 'MH-12 RTO, Pune', vf: '2024-04-01T00:00', vt2: '2027-03-31T23:59', states: 'Maharashtra, Karnataka, Gujarat, Madhya Pradesh' },
    fitness: { cn: 'FIT-MH-2025-3344', id: '2025-03-15T10:00', vf: '2025-03-15T00:00', vt2: '2027-03-14T23:59', center: 'Pune RTO Inspection Center, Hadapsar' },
    puc: { cn: 'PUC-MH-2025-7721', en: 'BSVI', vf: '2025-06-01T08:00', vt2: '2026-05-31T23:59', center: 'Arogya PUC Center, Shivajinagar, Pune' },
    roadTax: { rn: 'RT-MH-2023-5501', tt: 'LIFETIME', amt: '22400', pf: '2023-06-01T00:00', pt2: '2038-06-01T00:00', state: 'Maharashtra' },
    fastag: { fid: 'HDFC-MH-2525001', bank: 'HDFC Bank', st: 'ACTIVE', bal: '12500' },
    gps: { did: 'AIS140-TVC-MH-001', imei: '860012345678901', vendor: 'VeCommercial Technologies', ais: 'true', st: 'ACTIVE' },
    doc: { ct: 'INSURANCE', dn: 'ICL-MH-2025-4471', vf: '2025-07-08T09:00', vt2: '2026-07-08T23:59', auth: 'ICICI Lombard General Insurance', notes: 'Comprehensive insurance for Tata Prima 2525.K' },
  },
  {
    vn: 'KA01AB5678', vt: 'TRUCK', brand: 'Ashok Leyland', model: 'Novo 1620', year: '2022', fuel: 'CNG', odo: '73200',
    chassis: 'AL1620BK2NZ55721', engine: 'H06-CNG-55721', rc: 'KA01AB202200893',
    insExp: '2025-11-19', fitExp: '2026-09-10', pucExp: '2025-05-31', permitExp: '2026-08-31', status: 'AVAILABLE',
    insurance: { pn: 'NIA-KA-2024-9932', ins: 'New India Assurance', pt: 'COMPREHENSIVE', vf: '2024-11-20T00:00', vt2: '2025-11-19T23:59', prem: '34200' },
    permit: { pn: 'SP-KA-2023-4455', pt: 'STATE', auth: 'KA-01 RTO, Bangalore Central', vf: '2023-09-01T00:00', vt2: '2026-08-31T23:59', states: 'Karnataka' },
    fitness: { cn: 'FIT-KA-2024-8812', id: '2024-09-10T11:00', vf: '2024-09-10T00:00', vt2: '2026-09-09T23:59', center: 'KA-01 RTO, Koramangala, Bangalore' },
    puc: { cn: 'PUC-KA-2024-3367', en: 'BSVI', vf: '2024-12-01T08:00', vt2: '2025-05-31T23:59', center: 'Green PUC Center, Indiranagar, Bangalore' },
    roadTax: { rn: 'RT-KA-2022-2201', tt: 'ANNUAL', amt: '18600', pf: '2025-04-01T00:00', pt2: '2026-03-31T23:59', state: 'Karnataka' },
    fastag: { fid: 'SBI-KA-1620002', bank: 'State Bank of India', st: 'ACTIVE', bal: '8750' },
    gps: { did: 'AIS140-ITC-KA-002', imei: '860098765432109', vendor: 'iTriangle Infotech', ais: 'true', st: 'ACTIVE' },
    doc: { ct: 'PUC', dn: 'PUC-KA-2024-3367', vf: '2024-12-01T08:00', vt2: '2025-05-31T23:59', auth: 'Karnataka State PUC Board', notes: 'PUC expired May 2025 - renewal pending' },
  },
  {
    vn: 'DL03CE9012', vt: 'BUS', brand: 'Eicher', model: 'Skyline 2070', year: '2024', fuel: 'DIESEL', odo: '18900',
    chassis: 'EICHER2070NZ88432', engine: 'E710-TURBO-88432', rc: 'DL03CE202400312',
    insExp: '2027-01-14', fitExp: '2027-01-20', pucExp: '2026-01-31', permitExp: '2029-05-31', status: 'AVAILABLE',
    insurance: { pn: 'HDFC-DL-2025-1123', ins: 'HDFC ERGO General Insurance', pt: 'COMPREHENSIVE', vf: '2025-01-15T00:00', vt2: '2027-01-14T23:59', prem: '42800' },
    permit: { pn: 'NP-DL-2024-7766', pt: 'NATIONAL', auth: 'DL-03 RTO, Sarai Kale Khan, Delhi', vf: '2024-06-01T00:00', vt2: '2029-05-31T23:59', states: 'Delhi, Haryana, Uttar Pradesh, Rajasthan, Punjab' },
    fitness: { cn: 'FIT-DL-2025-1101', id: '2025-01-20T09:30', vf: '2025-01-20T00:00', vt2: '2027-01-19T23:59', center: 'DL-03 RTO, Transport Nagar, Delhi' },
    puc: { cn: 'PUC-DL-2025-5502', en: 'BSVI', vf: '2025-02-01T08:00', vt2: '2026-01-31T23:59', center: 'Delhi Pollution Check Center, Lajpat Nagar' },
    roadTax: { rn: 'RT-DL-2024-8890', tt: 'LIFETIME', amt: '25000', pf: '2024-06-01T00:00', pt2: '2039-06-01T00:00', state: 'Delhi' },
    fastag: { fid: 'ICICI-DL-2070003', bank: 'ICICI Bank', st: 'ACTIVE', bal: '15200' },
    gps: { did: 'AIS140-TPG-DL-003', imei: '860056789012345', vendor: 'TopoGen Navigation', ais: 'true', st: 'ACTIVE' },
    doc: { ct: 'FITNESS', dn: 'FIT-DL-2025-1101', vf: '2025-01-20T00:00', vt2: '2027-01-19T23:59', auth: 'Delhi Transport Department', notes: 'Fitness certificate for Eicher Skyline 2070 bus' },
  },
  {
    vn: 'TN07FG3456', vt: 'TRUCK', brand: 'BharatBenz', model: '1617R', year: '2023', fuel: 'DIESEL', odo: '55800',
    chassis: 'MBAG1617NZ66412', engine: 'OM926-TURBO-66412', rc: 'TN07FG202300589',
    insExp: '2026-03-31', fitExp: '2026-08-15', pucExp: '2025-10-31', permitExp: '2026-06-30', status: 'AVAILABLE',
    insurance: { pn: 'BAJ-TN-2025-6654', ins: 'Bajaj Allianz General Insurance', pt: 'THIRD_PARTY', vf: '2025-04-01T00:00', vt2: '2026-03-31T23:59', prem: '28900' },
    permit: { pn: 'GC-TN-2024-3321', pt: 'GOODS_CARRIAGE', auth: 'TN-07 RTO, Tambaram, Chennai', vf: '2024-08-01T00:00', vt2: '2026-06-30T23:59', states: 'Tamil Nadu, Andhra Pradesh, Kerala, Karnataka' },
    fitness: { cn: 'FIT-TN-2024-9987', id: '2024-08-15T10:30', vf: '2024-08-15T00:00', vt2: '2026-08-14T23:59', center: 'TN-07 RTO, Tambaram, Chennai' },
    puc: { cn: 'PUC-TN-2025-2210', en: 'BSVI', vf: '2025-05-01T08:00', vt2: '2025-10-31T23:59', center: 'Madras PUC Center, T. Nagar, Chennai' },
    roadTax: { rn: 'RT-TN-2023-4410', tt: 'ANNUAL', amt: '14800', pf: '2025-04-01T00:00', pt2: '2026-03-31T23:59', state: 'Tamil Nadu' },
    fastag: { fid: 'HDFC-TN-1617004', bank: 'HDFC Bank', st: 'ACTIVE', bal: '6300' },
    gps: { did: 'AIS140-TVC-TN-004', imei: '860034567890123', vendor: 'VeCommercial Technologies', ais: 'true', st: 'ACTIVE' },
    doc: { ct: 'PERMIT', dn: 'GC-TN-2024-3321', vf: '2024-08-01T00:00', vt2: '2026-06-30T23:59', auth: 'TN-07 RTO, Tamil Nadu Transport Department', notes: 'Goods carriage permit for interstate operations' },
  },
  {
    vn: 'GJ05HI7890', vt: 'TANKER', brand: 'Mahindra', model: 'Blazo X 25', year: '2021', fuel: 'DIESEL', odo: '92400',
    chassis: 'MA1BLAZO2NZ11298', engine: 'MDI-71-TURBO-11298', rc: 'GJ05HI202100274',
    insExp: '2025-05-09', fitExp: '2025-04-05', pucExp: '2025-09-30', permitExp: '2026-09-30', status: 'INACTIVE',
    insurance: { pn: 'RGI-GJ-2024-7788', ins: 'Reliance General Insurance', pt: 'COMPREHENSIVE', vf: '2024-05-10T00:00', vt2: '2025-05-09T23:59', prem: '36700' },
    permit: { pn: 'SP-GJ-2023-1199', pt: 'STATE', auth: 'GJ-05 RTO, Ahmedabad', vf: '2023-10-01T00:00', vt2: '2026-09-30T23:59', states: 'Gujarat, Rajasthan, Madhya Pradesh' },
    fitness: { cn: 'FIT-GJ-2023-5543', id: '2023-10-05T11:00', vf: '2023-10-05T00:00', vt2: '2025-04-04T23:59', center: 'GJ-05 RTO, Naroda, Ahmedabad' },
    puc: { cn: 'PUC-GJ-2024-8831', en: 'BSIV', vf: '2024-10-01T08:00', vt2: '2025-09-30T23:59', center: 'Ahmedabad PUC Center, CG Road' },
    roadTax: { rn: 'RT-GJ-2021-3301', tt: 'LIFETIME', amt: '19500', pf: '2021-09-01T00:00', pt2: '2036-09-01T00:00', state: 'Gujarat' },
    fastag: { fid: 'SBI-GJ-2500005', bank: 'State Bank of India', st: 'BLACKLISTED', bal: '0' },
    gps: { did: 'AIS140-ITC-GJ-005', imei: '860078901234567', vendor: 'iTriangle Infotech', ais: 'false', st: 'INACTIVE' },
    doc: { ct: 'ROAD_TAX', dn: 'RT-GJ-2021-3301', vf: '2021-09-01T00:00', vt2: '2036-09-01T00:00', auth: 'Gujarat Transport Department', notes: 'Lifetime road tax receipt for Blazo X 25' },
  },
  {
    vn: 'MH14JK2468', vt: 'TRUCK', brand: 'Tata', model: 'Ultra E.1613', year: '2024', fuel: 'ELECTRIC', odo: '12300',
    chassis: 'TATAU1613NZ77421', engine: 'EV-MOTOR-77421', rc: 'MH14JK202400631',
    insExp: '2027-06-15', fitExp: '2027-08-20', pucExp: '2027-06-15', permitExp: '2029-06-30', status: 'AVAILABLE',
    insurance: { pn: 'ICL-MH-2025-5590', ins: 'ICICI Lombard General Insurance', pt: 'COMPREHENSIVE', vf: '2025-06-16T00:00', vt2: '2027-06-15T23:59', prem: '51200' },
    permit: { pn: 'NP-MH-2025-9901', pt: 'NATIONAL', auth: 'MH-14 RTO, Nashik', vf: '2025-01-01T00:00', vt2: '2029-06-30T23:59', states: 'Maharashtra, Gujarat, Karnataka, Goa' },
    fitness: { cn: 'FIT-MH-2025-6612', id: '2025-08-20T09:00', vf: '2025-08-20T00:00', vt2: '2027-08-19T23:59', center: 'MH-14 RTO, Satpur, Nashik' },
    puc: { cn: 'PUC-MH-2025-1188', en: 'BSVI', vf: '2025-06-16T08:00', vt2: '2027-06-15T23:59', center: 'Nashik EV Test Center, Ambad' },
    roadTax: { rn: 'RT-MH-2024-7710', tt: 'LIFETIME', amt: '28900', pf: '2024-09-01T00:00', pt2: '2039-09-01T00:00', state: 'Maharashtra' },
    fastag: { fid: 'HDFC-MH-1613006', bank: 'HDFC Bank', st: 'ACTIVE', bal: '18400' },
    gps: { did: 'AIS140-TVC-MH-006', imei: '860023456789012', vendor: 'VeCommercial Technologies', ais: 'true', st: 'ACTIVE' },
    doc: { ct: 'INSURANCE', dn: 'ICL-MH-2025-5590', vf: '2025-06-16T00:00', vt2: '2027-06-15T23:59', auth: 'ICICI Lombard General Insurance', notes: 'Comprehensive insurance for Tata Ultra E electric truck' },
  },
  {
    vn: 'UP32LM1357', vt: 'VAN', brand: 'Maruti Suzuki', model: 'Super Carry', year: '2023', fuel: 'CNG', odo: '34600',
    chassis: 'MSCAR1623NZ33198', engine: 'K12C-CNG-33198', rc: 'UP32LM202300418',
    insExp: '2026-04-22', fitExp: '2026-11-30', pucExp: '2025-12-31', permitExp: '2026-11-30', status: 'AVAILABLE',
    insurance: { pn: 'BAJ-UP-2025-3317', ins: 'Bajaj Allianz General Insurance', pt: 'THIRD_PARTY', vf: '2025-04-23T00:00', vt2: '2026-04-22T23:59', prem: '18700' },
    permit: { pn: 'SP-UP-2024-2201', pt: 'STATE', auth: 'UP-32 RTO, Lucknow', vf: '2024-12-01T00:00', vt2: '2026-11-30T23:59', states: 'Uttar Pradesh' },
    fitness: { cn: 'FIT-UP-2024-4456', id: '2024-11-30T10:30', vf: '2024-11-30T00:00', vt2: '2026-11-29T23:59', center: 'UP-32 RTO, Gomti Nagar, Lucknow' },
    puc: { cn: 'PUC-UP-2025-6677', en: 'BSVI', vf: '2025-06-01T08:00', vt2: '2025-12-31T23:59', center: 'Lucknow PUC Center, Hazratganj' },
    roadTax: { rn: 'RT-UP-2023-1189', tt: 'ANNUAL', amt: '9800', pf: '2025-04-01T00:00', pt2: '2026-03-31T23:59', state: 'Uttar Pradesh' },
    fastag: { fid: 'SBI-UP-01613007', bank: 'State Bank of India', st: 'ACTIVE', bal: '4200' },
    gps: { did: 'AIS140-ITC-UP-007', imei: '860045678901234', vendor: 'iTriangle Infotech', ais: 'true', st: 'ACTIVE' },
    doc: { ct: 'FITNESS', dn: 'FIT-UP-2024-4456', vf: '2024-11-30T00:00', vt2: '2026-11-29T23:59', auth: 'UP Transport Department', notes: 'Fitness certificate for Maruti Super Carry CNG van' },
  },
];

async function createVehicle(page: Page, v: V) {
  await page.goto('/vehicles/new');
  await page.waitForSelector('#vehicle-form');
  await page.getByLabel('Vehicle Number', { exact: false }).fill(v.vn);
  await page.getByLabel('Vehicle Type', { exact: false }).fill(v.vt);
  await page.getByLabel('Brand', { exact: false }).fill(v.brand);
  await page.getByLabel('Model', { exact: false }).fill(v.model);
  await page.getByLabel('Year', { exact: false }).fill(v.year);
  await page.getByLabel('Fuel Type', { exact: false }).selectOption(v.fuel);
  await page.getByLabel('Current Odometer', { exact: false }).fill(v.odo);
  await page.click('button[type="submit"]:has-text("Create Vehicle")');
  await page.waitForURL(/\/vehicles\/[a-z0-9]+$/, { timeout: 15000 });
  await page.waitForLoadState('networkidle');
}

async function clickTab(page: Page, label: string) {
  await page.click(`button.detail-tab:has-text("${label}")`);
  await wait(page, 1200);
}

async function sectionAdd(page: Page, title: string) {
  const div = page.locator('div.compliance-actions', { has: page.locator(`h5:text("${title}")`) });
  await div.scrollIntoViewIfNeeded();
  await div.locator('button:has-text("Add")').click();
  await wait(page, 500);
}

async function fillRegistration(page: Page, v: V) {
  await clickTab(page, 'Registration');
  await page.getByLabel('Chassis Number', { exact: false }).fill(v.chassis);
  await page.getByLabel('Engine Number', { exact: false }).fill(v.engine);
  await page.getByLabel('RC Number', { exact: false }).fill(v.rc);
  await page.click('button[type="submit"]:has-text("Save")');
  await wait(page, 1500);
}

async function fillExpiry(page: Page, v: V) {
  await clickTab(page, 'Expiry');
  await page.getByLabel('Insurance Expiry', { exact: false }).fill(v.insExp);
  await page.getByLabel('Fitness Expiry', { exact: false }).fill(v.fitExp);
  await page.getByLabel('Pollution Expiry', { exact: false }).fill(v.pucExp);
  await page.getByLabel('Permit Expiry', { exact: false }).fill(v.permitExp);
  await page.click('button[type="submit"]:has-text("Save")');
  await wait(page, 1500);
}

async function fillStatus(page: Page, status: string) {
  await clickTab(page, 'Status');
  await page.locator('.role-status-label select').selectOption(status);
  await page.click('button:has-text("Update Status")');
  await wait(page, 1500);
}

async function fillInsurance(page: Page, d: V['insurance']) {
  await sectionAdd(page, 'Insurance');
  const f = page.locator('form.compliance-form-card:visible');
  await f.locator('input').nth(0).fill(d.pn);
  await f.locator('input').nth(1).fill(d.ins);
  await f.locator('select').first().selectOption(d.pt);
  await f.locator('input[type="datetime-local"]').nth(0).fill(d.vf);
  await f.locator('input[type="datetime-local"]').nth(1).fill(d.vt2);
  await f.locator('input[type="number"]').fill(d.prem);
  await f.locator('button[type="submit"]:has-text("Create")').click();
  await wait(page, 1500);
}

async function fillPermit(page: Page, d: V['permit']) {
  await sectionAdd(page, 'Permits');
  const f = page.locator('form.compliance-form-card:visible');
  await f.locator('input').nth(0).fill(d.pn);
  await f.locator('select').first().selectOption(d.pt);
  await f.locator('input').nth(1).fill(d.auth);
  await f.locator('input[type="datetime-local"]').nth(0).fill(d.vf);
  await f.locator('input[type="datetime-local"]').nth(1).fill(d.vt2);
  await f.locator('input').last().fill(d.states);
  await f.locator('button[type="submit"]:has-text("Create")').click();
  await wait(page, 1500);
}

async function fillFitness(page: Page, d: V['fitness']) {
  await sectionAdd(page, 'Fitness');
  const f = page.locator('form.compliance-form-card:visible');
  await f.locator('input').nth(0).fill(d.cn);
  await f.locator('input[type="datetime-local"]').nth(0).fill(d.id);
  await f.locator('input').nth(2).fill(d.center);
  await f.locator('input[type="datetime-local"]').nth(1).fill(d.vf);
  await f.locator('input[type="datetime-local"]').nth(2).fill(d.vt2);
  await f.locator('button[type="submit"]:has-text("Create")').click();
  await wait(page, 1500);
}

async function fillPuc(page: Page, d: V['puc']) {
  await sectionAdd(page, 'PUC');
  const f = page.locator('form.compliance-form-card:visible');
  await f.locator('input').nth(0).fill(d.cn);
  await f.locator('select').first().selectOption(d.en);
  await f.locator('input').nth(1).fill(d.center);
  await f.locator('input[type="datetime-local"]').nth(0).fill(d.vf);
  await f.locator('input[type="datetime-local"]').nth(1).fill(d.vt2);
  await f.locator('button[type="submit"]:has-text("Create")').click();
  await wait(page, 1500);
}

async function fillRoadTax(page: Page, d: V['roadTax']) {
  await sectionAdd(page, 'Road Tax');
  const f = page.locator('form.compliance-form-card:visible');
  await f.locator('input').nth(0).fill(d.rn);
  await f.locator('select').first().selectOption(d.tt);
  await f.locator('input[type="number"]').fill(d.amt);
  await f.locator('input[type="datetime-local"]').nth(0).fill(d.pf);
  await f.locator('input[type="datetime-local"]').nth(1).fill(d.pt2);
  await f.locator('input').last().fill(d.state);
  await f.locator('button[type="submit"]:has-text("Create")').click();
  await wait(page, 1500);
}

async function fillFastag(page: Page, d: V['fastag']) {
  await sectionAdd(page, 'FASTag');
  const f = page.locator('form.compliance-form-card:visible');
  await f.locator('input').nth(0).fill(d.fid);
  await f.locator('input').nth(1).fill(d.bank);
  await f.locator('select').first().selectOption(d.st);
  await f.locator('input[type="number"]').fill(d.bal);
  await f.locator('button[type="submit"]:has-text("Save")').click();
  await wait(page, 1500);
}

async function fillGps(page: Page, d: V['gps']) {
  await sectionAdd(page, 'GPS');
  const f = page.locator('form.compliance-form-card:visible');
  await f.locator('input').nth(0).fill(d.did);
  await f.locator('input').nth(1).fill(d.imei);
  await f.locator('input').nth(2).fill(d.vendor);
  await f.locator('select').nth(0).selectOption(d.ais);
  await f.locator('select').nth(1).selectOption(d.st);
  await f.locator('button[type="submit"]:has-text("Save")').click();
  await wait(page, 1500);
}

async function fillDocument(page: Page, d: V['doc']) {
  await clickTab(page, 'Documents');
  await page.click('button:has-text("+ Add Document")');
  await wait(page, 500);
  const f = page.locator('form.compliance-form-card:visible');
  await f.locator('select').first().selectOption(d.ct);
  await f.locator('input').nth(0).fill(d.dn);
  await f.locator('input').nth(1).fill(d.auth);
  await f.locator('input[type="datetime-local"]').nth(0).fill(d.vf);
  await f.locator('input[type="datetime-local"]').nth(1).fill(d.vt2);
  await f.locator('input').last().fill(d.notes);
  await f.locator('button[type="submit"]:has-text("Create")').click();
  await wait(page, 1500);
}

function applySuffix(items: V[], s: string): V[] {
  return items.map((v) => ({
    ...v,
    vn: v.vn.slice(0, -4) + s,
    chassis: v.chassis.slice(0, -4) + s,
    engine: v.engine.slice(0, -4) + s,
    rc: v.rc.slice(0, -4) + s,
    insurance: { ...v.insurance, pn: v.insurance.pn.slice(0, -4) + s },
    permit: { ...v.permit, pn: v.permit.pn.slice(0, -4) + s },
    fitness: { ...v.fitness, cn: v.fitness.cn.slice(0, -4) + s },
    puc: { ...v.puc, cn: v.puc.cn.slice(0, -4) + s },
    roadTax: { ...v.roadTax, rn: v.roadTax.rn.slice(0, -4) + s },
    fastag: { ...v.fastag, fid: v.fastag.fid.slice(0, -4) + s },
    gps: { ...v.gps, did: v.gps.did.slice(0, -4) + s },
    doc: { ...v.doc, dn: v.doc.dn.slice(0, -4) + s },
  }));
}

test.describe('Seed: Indian Fleet Data', () => {
  test('Create 7 vehicles with Registration, Expiry, Compliance, Documents', async ({ page }) => {
    test.setTimeout(900_000);

    const loggedIn = await loginAsRole(page, 'admin');
    expect(loggedIn).toBe(true);
    await page.waitForLoadState('networkidle');

    const suffix = uid();
    const vehicles = applySuffix(V, suffix);
    console.log(`\n=== Run suffix: ${suffix} ===`);

    for (let i = 0; i < vehicles.length; i++) {
      const v = vehicles[i];
      console.log(`\n[${i + 1}/7] ${v.vn} | ${v.brand} ${v.model} | ${v.fuel}`);

      await createVehicle(page, v);
      console.log('  [OK] Vehicle created');

      await fillRegistration(page, v);
      console.log('  [OK] Registration');

      await fillExpiry(page, v);
      console.log('  [OK] Expiry dates');

      await fillStatus(page, v.status);
      console.log('  [OK] Status: ' + v.status);

      await clickTab(page, 'Compliance');
      await wait(page, 1500);

      await fillInsurance(page, v.insurance);
      console.log('  [OK] Insurance');

      await fillPermit(page, v.permit);
      console.log('  [OK] Permit');

      await fillFitness(page, v.fitness);
      console.log('  [OK] Fitness');

      await fillPuc(page, v.puc);
      console.log('  [OK] PUC');

      await fillRoadTax(page, v.roadTax);
      console.log('  [OK] Road Tax');

      await fillFastag(page, v.fastag);
      console.log('  [OK] FASTag');

      await fillGps(page, v.gps);
      console.log('  [OK] GPS');

      await fillDocument(page, v.doc);
      console.log('  [OK] Document');

      console.log(`[${i + 1}/7] ${v.vn} DONE`);
    }

    await page.goto('/compliance');
    await page.waitForLoadState('networkidle');
    console.log(`\n=== ALL 7 VEHICLES SEEDED (suffix: ${suffix}) ===`);
  });
});
