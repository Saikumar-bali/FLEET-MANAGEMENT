import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { createDriverFuel, getMyDriverTrips, getMyDriverVehicles, uploadDriverFuelReceipt } from '../../services/api';
import type { DriverPortalTrip, DriverPortalVehicle, ReceiptExtractionResult } from '../../types/auth';
import { PageHeader } from '../../components/PageHeader';

const AMOUNT_CHIPS = [1000, 2000, 5000, 10000];

export function DriverFuelCreatePage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [vehicles, setVehicles] = useState<DriverPortalVehicle[]>([]);
  const [trips, setTrips] = useState<DriverPortalTrip[]>([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    vehicleId: '',
    tripId: '',
    totalAmount: '',
    quantityLiters: '',
    fuelDate: '',
    stationName: '',
    paymentMode: '',
    paymentSource: 'STAFF_WALLET',
    notes: '',
  });
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
  const [extraction, setExtraction] = useState<ReceiptExtractionResult | null>(null);
  const [useExtracted, setUseExtracted] = useState(false);

  useEffect(() => {
    if (!auth.accessToken) return;
    setVehiclesLoading(true);
    getMyDriverVehicles(auth.accessToken).then((res) => {
      const list = res.data.vehicles || (Array.isArray(res.data) ? res.data : []);
      setVehicles(list);
      if (list.length === 1) setForm((f) => ({ ...f, vehicleId: list[0].id }));
    }).finally(() => setVehiclesLoading(false));
    getMyDriverTrips(auth.accessToken, { page: 1, limit: 50 }).then((res) => setTrips(res.data?.items || []));
  }, [auth.accessToken]);

  const calculatedPricePerLiter = form.totalAmount && form.quantityLiters
    ? (Number(form.totalAmount) / Number(form.quantityLiters)).toFixed(2)
    : null;

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setReceiptFile(file);
    setReceiptPreview(URL.createObjectURL(file));
    setExtraction(null);
    setUseExtracted(false);
  }

  async function handleUploadAndExtract() {
    if (!auth.accessToken || !receiptFile) return;
    setIsUploadingReceipt(true);
    setError(null);
    try {
      const res = await uploadDriverFuelReceipt(auth.accessToken, receiptFile, {
        vehicleId: form.vehicleId,
        ...(form.tripId ? { tripId: form.tripId } : {}),
        fuelDate: form.fuelDate,
        stationName: form.stationName,
        paymentMode: form.paymentMode,
        notes: form.notes,
      });
      setExtraction(res.data.extraction);
    } catch (err: any) {
      setError(err.message || 'Failed to upload receipt');
    } finally {
      setIsUploadingReceipt(false);
    }
  }

  function applyExtraction() {
    if (!extraction) return;
    const f = extraction.extractedFields;
    setForm(prev => ({
      ...prev,
      totalAmount: f.totalAmount.value ? String(f.totalAmount.value) : prev.totalAmount,
      quantityLiters: f.quantityLiters.value ? String(f.quantityLiters.value) : prev.quantityLiters,
      stationName: f.fuelStationName.value ? String(f.fuelStationName.value) : prev.stationName,
      fuelDate: f.fuelDate.value ? String(f.fuelDate.value).slice(0, 10) : prev.fuelDate,
      paymentMode: f.paymentMode.value ? String(f.paymentMode.value) : prev.paymentMode,
    }));
    setUseExtracted(true);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.accessToken) return;
    setSubmitting(true);
    setError(null);
    try {
      await createDriverFuel(auth.accessToken, {
        vehicleId: form.vehicleId,
        tripId: form.tripId || undefined,
        totalAmount: Number(form.totalAmount),
        quantityLiters: form.quantityLiters ? Number(form.quantityLiters) : undefined,
        fuelDate: form.fuelDate || undefined,
        stationName: form.stationName || undefined,
        paymentMode: form.paymentMode || undefined,
        paymentSource: form.paymentSource,
        notes: form.notes || undefined,
      });
      navigate('/driver-portal/fuel');
    } catch (err: any) {
      setError(err.message || 'Failed to create fuel entry');
    } finally {
      setSubmitting(false);
    }
  };

  const hasVehicles = vehicles.length > 0;
  const currentVehicle = vehicles.find(v => v.isCurrent);

  return (
    <section className="page-content">
      <PageHeader eyebrow="Driver Portal" title="Quick Fuel Entry" description="Log fuel for your vehicle." />

      {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}

      {!hasVehicles && !vehiclesLoading ? (
        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
          <h3 style={{ margin: '0 0 0.5rem' }}>No vehicle assigned</h3>
          <p style={{ color: 'var(--color-text-secondary)' }}>
            No vehicle is assigned to your driver profile. Ask your admin to assign a vehicle before logging fuel.
          </p>
        </div>
      ) : (
        <form className="stack-form" onSubmit={handleSubmit}>
          {currentVehicle && (
            <div className="card" style={{ padding: '1rem', fontSize: '0.85rem' }}>
              Current vehicle: <strong>{currentVehicle.vehicleNumber}</strong> ({currentVehicle.vehicleType})
            </div>
          )}

          <div className="form-two-column">
            <label>
              <span className="field-label">Vehicle *</span>
              <select value={form.vehicleId} onChange={(e) => setForm({ ...form, vehicleId: e.target.value })} required>
                <option value="">Select vehicle</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>{v.vehicleNumber} ({v.vehicleType}){v.isCurrent ? ' — Current' : ''}</option>
                ))}
              </select>
            </label>
            <label>
              <span className="field-label">Date</span>
              <input type="date" value={form.fuelDate}
                onChange={(e) => setForm({ ...form, fuelDate: e.target.value })} />
            </label>
          </div>

          <div className="fuel-amount-section">
            <label>
              <span className="field-label">Amount (₹) *</span>
              <input type="number" step="0.01" min="0" className="fuel-amount-input"
                value={form.totalAmount}
                onChange={(e) => setForm({ ...form, totalAmount: e.target.value })}
                placeholder="e.g. 2500" required />
            </label>
            <div className="fuel-amount-chips">
              {AMOUNT_CHIPS.map(amt => (
                <button key={amt} type="button"
                  className={`fuel-amount-chip ${Number(form.totalAmount) === amt ? 'fuel-amount-chip-active' : ''}`}
                  onClick={() => setForm({ ...form, totalAmount: String(amt) })}>
                  ₹{amt >= 1000 ? `${amt / 1000}K` : amt}
                </button>
              ))}
            </div>
          </div>

          <div className="form-two-column">
            <label>
              <span className="field-label">Liters (optional)</span>
              <input type="number" step="0.01" min="0" value={form.quantityLiters}
                onChange={(e) => setForm({ ...form, quantityLiters: e.target.value })}
                placeholder="e.g. 50" />
              {calculatedPricePerLiter && (
                <small style={{ color: 'var(--color-text-secondary)' }}>Rate: ₹{calculatedPricePerLiter}/L</small>
              )}
            </label>
            <label>
              <span className="field-label">Fuel Station (optional)</span>
              <input type="text" value={form.stationName}
                onChange={(e) => setForm({ ...form, stationName: e.target.value })}
                placeholder="e.g. HP Petrol Pump" />
            </label>
          </div>

          <div className="form-two-column">
            <label>
              <span className="field-label">Trip *</span>
              <select value={form.tripId} onChange={(e) => setForm({ ...form, tripId: e.target.value })} required={form.paymentSource === 'STAFF_WALLET'}>
                <option value="">Select active trip</option>
                {trips.filter((trip) => !['COMPLETED', 'CANCELLED'].includes(trip.status)).map((trip) => <option key={trip.id} value={trip.id}>{trip.tripNumber} — {trip.originName} → {trip.destinationName}</option>)}
              </select>
            </label>
            <label>
              <span className="field-label">Payment Mode (optional)</span>
              <select value={form.paymentMode} onChange={(e) => setForm({ ...form, paymentMode: e.target.value })}>
                <option value="">Select</option>
                <option value="CASH">Cash</option>
                <option value="CARD">Card</option>
                <option value="UPI">UPI</option>
                <option value="CREDIT">Credit</option>
              </select>
            </label>
            <label>
              <span className="field-label">Paid using *</span>
              <select value={form.paymentSource} onChange={(e) => setForm({ ...form, paymentSource: e.target.value })}>
                <option value="STAFF_WALLET">Trip allowance / staff wallet</option>
                <option value="PERSONAL_MONEY">My personal money — reimburse me</option>
                <option value="COMPANY_ACCOUNT">Company paid directly</option>
                <option value="CORPORATE_CARD">Corporate card</option>
                <option value="VENDOR_CREDIT">Vendor credit</option>
              </select>
            </label>
            <label>
              <span className="field-label">Notes (optional)</span>
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Optional notes" />
            </label>
          </div>

          {/* Bill Photo Upload */}
          <div className="fuel-receipt-upload">
            <span className="field-label">Bill Photo (optional)</span>
            <label className="fuel-receipt-dropzone" htmlFor="fuel-receipt-input">
              {receiptPreview ? (
                <img src={receiptPreview} alt="Receipt preview" className="fuel-receipt-preview" />
              ) : (
                <div className="fuel-receipt-placeholder">
                  <span className="fuel-receipt-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                    </svg>
                  </span>
                  <span>Tap to upload receipt</span>
                </div>
              )}
              <input id="fuel-receipt-input" type="file" ref={fileInputRef} accept="image/*,.pdf"
                className="fuel-receipt-file-input" onChange={handleFileSelect} />
            </label>
            {receiptFile && !extraction && (
              <button type="button" className="primary-button" onClick={handleUploadAndExtract} disabled={isUploadingReceipt}>
                {isUploadingReceipt ? 'Uploading...' : 'Upload & Extract'}
              </button>
            )}
          </div>

          {isUploadingReceipt && <div className="fuel-extraction-status">Extracting data from receipt...</div>}

          {extraction && (
            <div className="fuel-extraction-panel">
              <div className="fuel-extraction-header">Receipt Extraction Results</div>
              {/* lgtm[js/dom-text-reinterpreted-as-html] React JSX auto-escapes text content; String() wrapping adds defense-in-depth */}
              <div className="fuel-extraction-fields">
                {extraction.extractedFields.totalAmount.value && (
                  <span className="fuel-extraction-field">Amount: ₹{String(extraction.extractedFields.totalAmount.value)}</span>
                )}
                {extraction.extractedFields.quantityLiters.value && (
                  <span className="fuel-extraction-field">Qty: {String(extraction.extractedFields.quantityLiters.value)}L</span>
                )}
                {extraction.extractedFields.fuelStationName.value && (
                  <span className="fuel-extraction-field">Station: {String(extraction.extractedFields.fuelStationName.value)}</span>
                )}
                {extraction.extractedFields.fuelDate.value && (
                  <span className="fuel-extraction-field">Date: {String(extraction.extractedFields.fuelDate.value).slice(0, 10)}</span>
                )}
                {extraction.extractedFields.paymentMode.value && (
                  <span className="fuel-extraction-field">Payment: {String(extraction.extractedFields.paymentMode.value)}</span>
                )}
              </div>
              {extraction.needsReview && <div className="fuel-extraction-note">Review recommended — extracted values may need correction.</div>}
              {!useExtracted ? (
                <button type="button" className="primary-button" style={{ justifySelf: 'start' }} onClick={applyExtraction}>
                  Apply to form
                </button>
              ) : (
                <div className="fuel-extraction-note" style={{ color: 'var(--color-success)' }}>Values applied to form above.</div>
              )}
            </div>
          )}

          <div className="action-panel">
            <button type="submit" className="primary-button fuel-submit-btn" disabled={submitting || !form.vehicleId || !form.totalAmount || (form.paymentSource === 'STAFF_WALLET' && !form.tripId)}>
              {submitting ? 'Saving...' : 'Save Fuel Entry'}
            </button>
            <button type="button" className="secondary-button" onClick={() => navigate('/driver-portal/fuel')}>Cancel</button>
          </div>
        </form>
      )}
    </section>
  );
}
