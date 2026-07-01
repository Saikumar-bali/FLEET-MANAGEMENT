import { FormEvent, useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { createFuelEntry, getVehicles, uploadDocument, extractReceipt } from '../../services/api';
import type { VehicleRecord } from '../../types/auth';

type Props = {
  onSuccess?: () => void;
  onCancel?: () => void;
  defaultVehicleId?: string;
  defaultDriverId?: string;
};

const AMOUNT_CHIPS = [5000, 10000, 12000, 15000, 20000];

export function FuelQuickEntryForm({ onSuccess, onCancel, defaultVehicleId, defaultDriverId }: Props) {
  const auth = useAuth();
  const { showToast } = useToast();

  const [entryMode, setEntryMode] = useState<'QUICK_AMOUNT' | 'FULL_DETAILS'>('QUICK_AMOUNT');
  const [vehicles, setVehicles] = useState<VehicleRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const [vehicleId, setVehicleId] = useState(defaultVehicleId || '');
  const [fuelDate, setFuelDate] = useState(new Date().toISOString().slice(0, 10));
  const [odometer, setOdometer] = useState('');
  const [fuelType, setFuelType] = useState('DIESEL');
  const [totalAmount, setTotalAmount] = useState('');
  const [quantityLiters, setQuantityLiters] = useState('');
  const [pricePerLiter, setPricePerLiter] = useState('');
  const [stationName, setStationName] = useState('');
  const [paymentMode, setPaymentMode] = useState('');
  const [notes, setNotes] = useState('');

  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractionResult, setExtractionResult] = useState<any>(null);

  useEffect(() => {
    if (!auth.accessToken) return;
    getVehicles(auth.accessToken, { limit: 100 }).then(r => setVehicles(r.data.items));
  }, [auth.accessToken]);

  useEffect(() => {
    if (defaultVehicleId && vehicles.length > 0) {
      setVehicleId(defaultVehicleId);
    }
  }, [defaultVehicleId, vehicles]);

  const computedTotal = entryMode === 'FULL_DETAILS' && quantityLiters && pricePerLiter
    ? (Number(quantityLiters) * Number(pricePerLiter)).toFixed(2)
    : null;

  function handleChipClick(amount: number) {
    setTotalAmount(String(amount));
  }

  async function handleReceiptUpload(file: File) {
    setReceiptFile(file);
    const url = URL.createObjectURL(file);
    setReceiptPreview(url);

    if (auth.accessToken) {
      setExtracting(true);
      try {
        const formData = new FormData();
        formData.append('file', file);
        const uploadRes = await uploadDocument(auth.accessToken, formData);
        if (uploadRes.data?.storageKey) {
          const res = await extractReceipt(auth.accessToken, {
            storageKey: uploadRes.data.storageKey,
            mimeType: file.type,
          });
          if (res.data) {
            setExtractionResult(res.data);
            const fields = res.data.extractedFields;
            if (fields?.totalAmount?.value) setTotalAmount(String(fields.totalAmount.value));
            if (fields?.quantityLiters?.value) setQuantityLiters(String(fields.quantityLiters.value));
            if (fields?.pricePerLiter?.value) setPricePerLiter(String(fields.pricePerLiter.value));
            if (fields?.fuelStationName?.value) setStationName(fields.fuelStationName.value);
            if (fields?.paymentMode?.value) setPaymentMode(fields.paymentMode.value);
            showToast('Receipt extracted — review suggestions below', 'success');
          }
        }
      } catch {
        showToast('Extraction unavailable — enter values manually', 'warning');
      } finally {
        setExtracting(false);
      }
    }
  }

  function handleReceiptInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleReceiptUpload(file);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!auth.accessToken) return;
    setLoading(true);
    try {
      const payload: Record<string, any> = {
        vehicleId,
        fuelDate: new Date(fuelDate).toISOString(),
        fuelType,
        odometerReading: odometer ? Number(odometer) : undefined,
        stationName: stationName || undefined,
        notes: notes || undefined,
        entryMode,
        paymentMode: paymentMode || undefined,
      };

      if (entryMode === 'QUICK_AMOUNT') {
        payload.totalAmount = Number(totalAmount);
      } else {
        payload.quantityLiters = Number(quantityLiters);
        payload.pricePerLiter = Number(pricePerLiter);
      }

      const res = await createFuelEntry(auth.accessToken, payload);

      if (receiptFile && res.data?.id) {
        try {
          const formData = new FormData();
          formData.append('file', receiptFile);
          formData.append('title', `Fuel Receipt - ${fuelDate}`);
          formData.append('documentType', 'FUEL_BILL');
          formData.append('documentCategory', 'FINANCE');
          formData.append('fuelEntryId', res.data.id);
          if (vehicleId) formData.append('vehicleId', vehicleId);
          if (defaultDriverId) formData.append('driverId', defaultDriverId);
          await uploadDocument(auth.accessToken, formData);
        } catch {
          showToast('Receipt upload failed — fuel entry saved', 'warning');
        }
      }

      showToast('Fuel entry created successfully', 'success');
      onSuccess?.();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to create fuel entry', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fuel-quick-form">
      <form className="stack-form" onSubmit={handleSubmit}>
        <div className="fuel-mode-toggle">
          <button
            type="button"
            className={`fuel-mode-btn ${entryMode === 'QUICK_AMOUNT' ? 'fuel-mode-btn-active' : ''}`}
            onClick={() => setEntryMode('QUICK_AMOUNT')}
          >
            Quick Amount
          </button>
          <button
            type="button"
            className={`fuel-mode-btn ${entryMode === 'FULL_DETAILS' ? 'fuel-mode-btn-active' : ''}`}
            onClick={() => setEntryMode('FULL_DETAILS')}
          >
            Full Details
          </button>
        </div>

        <div className="form-two-column">
          <label>
            <span className="field-label">Vehicle *</span>
            <select required value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
              <option value="">Select vehicle</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>{v.vehicleNumber}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="field-label">Date *</span>
            <input required type="date" value={fuelDate} onChange={(e) => setFuelDate(e.target.value)} />
          </label>
        </div>

        <div className="form-two-column">
          <label>
            <span className="field-label">Odometer (km)</span>
            <input type="number" min="0" step="1" placeholder="e.g. 45230" value={odometer} onChange={(e) => setOdometer(e.target.value)} />
          </label>
          <label>
            <span className="field-label">Fuel Type *</span>
            <select required value={fuelType} onChange={(e) => setFuelType(e.target.value)}>
              <option value="DIESEL">Diesel</option>
              <option value="PETROL">Petrol</option>
              <option value="CNG">CNG</option>
              <option value="ELECTRIC">Electric</option>
              <option value="LPG">LPG</option>
            </select>
          </label>
        </div>

        {entryMode === 'QUICK_AMOUNT' ? (
          <div className="fuel-amount-section">
            <label>
              <span className="field-label">Total Amount (₹) *</span>
              <input
                required
                type="number"
                min="1"
                step="1"
                placeholder="Enter amount"
                className="fuel-amount-input"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
              />
            </label>
            <div className="fuel-amount-chips">
              {AMOUNT_CHIPS.map((amount) => (
                <button
                  key={amount}
                  type="button"
                  className={`fuel-amount-chip ${totalAmount === String(amount) ? 'fuel-amount-chip-active' : ''}`}
                  onClick={() => handleChipClick(amount)}
                >
                  ₹{amount >= 1000 ? `${amount / 1000}K` : amount}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="form-three-column">
            <label>
              <span className="field-label">Quantity (L) *</span>
              <input required type="number" min="0.001" step="0.001" placeholder="Litres" value={quantityLiters} onChange={(e) => setQuantityLiters(e.target.value)} />
            </label>
            <label>
              <span className="field-label">Price / Litre (₹) *</span>
              <input required type="number" min="0.01" step="0.01" placeholder="₹/L" value={pricePerLiter} onChange={(e) => setPricePerLiter(e.target.value)} />
            </label>
            <label>
              <span className="field-label">Total (₹)</span>
              <input
                type="text"
                readOnly
                className="fuel-computed-total"
                value={computedTotal ? `₹ ${computedTotal}` : '—'}
              />
            </label>
          </div>
        )}

        <div className="form-two-column">
          <label>
            <span className="field-label">Station Name</span>
            <input type="text" placeholder="Optional" value={stationName} onChange={(e) => setStationName(e.target.value)} />
          </label>
          <label>
            <span className="field-label">Payment Mode</span>
            <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)}>
              <option value="">Select</option>
              <option value="CASH">Cash</option>
              <option value="UPI">UPI</option>
              <option value="CARD">Card</option>
              <option value="CREDIT">Credit</option>
            </select>
          </label>
        </div>

        <div className="fuel-receipt-upload">
          <span className="field-label">Receipt</span>
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
            <input
              id="fuel-receipt-input"
              type="file"
              accept="image/*,.pdf"
              className="fuel-receipt-file-input"
              onChange={handleReceiptInputChange}
            />
          </label>
          {extracting && <div className="fuel-extraction-status">Extracting data from receipt...</div>}
        </div>

        {extractionResult && !extracting && (
          <div className="fuel-extraction-panel">
            <div className="fuel-extraction-header">Receipt Extraction Results</div>
            <div className="fuel-extraction-fields">
              {extractionResult.extractedFields?.totalAmount?.value && (
                <span className="fuel-extraction-field">Amount: ₹{extractionResult.extractedFields.totalAmount.value}</span>
              )}
              {extractionResult.extractedFields?.quantityLiters?.value && (
                <span className="fuel-extraction-field">Qty: {extractionResult.extractedFields.quantityLiters.value}L</span>
              )}
              {extractionResult.extractedFields?.pricePerLiter?.value && (
                <span className="fuel-extraction-field">Price/L: ₹{extractionResult.extractedFields.pricePerLiter.value}</span>
              )}
              {extractionResult.extractedFields?.fuelStationName?.value && (
                <span className="fuel-extraction-field">Station: {extractionResult.extractedFields.fuelStationName.value}</span>
              )}
              {extractionResult.extractedFields?.paymentMode?.value && (
                <span className="fuel-extraction-field">Payment: {extractionResult.extractedFields.paymentMode.value}</span>
              )}
            </div>
            <div className="fuel-extraction-note">Values auto-filled above. Review and adjust as needed.</div>
          </div>
        )}

        <label>
          <span className="field-label">Notes</span>
          <textarea placeholder="Optional notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>

        <div className="action-panel">
          <button className="primary-button fuel-submit-btn" type="submit" disabled={loading}>
            {loading ? 'Saving...' : 'Save Fuel Entry'}
          </button>
          <button className="secondary-button" type="button" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
