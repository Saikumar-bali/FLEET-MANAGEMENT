export type ExtractedField = {
  value: string | number | null;
  confidence: number;
  source: string;
};

export type ExtractionResult = {
  extractedFields: {
    fuelStationName: ExtractedField;
    billNumber: ExtractedField;
    fuelDate: ExtractedField;
    totalAmount: ExtractedField;
    quantityLiters: ExtractedField;
    pricePerLiter: ExtractedField;
    vehicleNumber: ExtractedField;
    gstin: ExtractedField;
    paymentMode: ExtractedField;
  };
  overallConfidence: number;
  rawText: string | null;
  needsReview: boolean;
  warnings: string[];
};

export type ExtractionProvider = 'disabled' | 'mock' | 'ocr';

function getProvider(): ExtractionProvider {
  const val = (process.env.RECEIPT_EXTRACTION_PROVIDER || 'disabled').toLowerCase();
  if (val === 'mock' || val === 'ocr') return val;
  return 'disabled';
}

function mockExtract(): ExtractionResult {
  return {
    extractedFields: {
      fuelStationName: { value: 'Mock Fuel Station', confidence: 0.85, source: 'mock-ocr' },
      billNumber: { value: `BILL-${Date.now().toString(36).toUpperCase()}`, confidence: 0.90, source: 'mock-ocr' },
      fuelDate: { value: new Date().toISOString().slice(0, 10), confidence: 0.95, source: 'mock-ocr' },
      totalAmount: { value: 4500.00, confidence: 0.88, source: 'mock-ocr' },
      quantityLiters: { value: 55.2, confidence: 0.82, source: 'mock-ocr' },
      pricePerLiter: { value: 81.52, confidence: 0.80, source: 'mock-ocr' },
      vehicleNumber: { value: null, confidence: 0.0, source: 'mock-ocr' },
      gstin: { value: null, confidence: 0.0, source: 'mock-ocr' },
      paymentMode: { value: 'CASH', confidence: 0.70, source: 'mock-ocr' },
    },
    overallConfidence: 0.78,
    rawText: 'MOCK EXTRACTION — This is simulated receipt data for testing purposes only. No real data has been extracted.',
    needsReview: true,
    warnings: ['Mock provider used — values are simulated', 'Always review extracted data before confirming'],
  };
}

export async function extractFromReceipt(
  _storageKey: string,
  _mimeType: string,
): Promise<ExtractionResult> {
  const provider = getProvider();

  if (provider === 'disabled') {
    return {
      extractedFields: {
        fuelStationName: { value: null, confidence: 0, source: 'disabled' },
        billNumber: { value: null, confidence: 0, source: 'disabled' },
        fuelDate: { value: null, confidence: 0, source: 'disabled' },
        totalAmount: { value: null, confidence: 0, source: 'disabled' },
        quantityLiters: { value: null, confidence: 0, source: 'disabled' },
        pricePerLiter: { value: null, confidence: 0, source: 'disabled' },
        vehicleNumber: { value: null, confidence: 0, source: 'disabled' },
        gstin: { value: null, confidence: 0, source: 'disabled' },
        paymentMode: { value: null, confidence: 0, source: 'disabled' },
      },
      overallConfidence: 0,
      rawText: null,
      needsReview: true,
      warnings: ['Extraction provider is disabled — no data extracted'],
    };
  }

  if (provider === 'mock') {
    return mockExtract();
  }

  return {
    extractedFields: {
      fuelStationName: { value: null, confidence: 0, source: 'ocr-not-implemented' },
      billNumber: { value: null, confidence: 0, source: 'ocr-not-implemented' },
      fuelDate: { value: null, confidence: 0, source: 'ocr-not-implemented' },
      totalAmount: { value: null, confidence: 0, source: 'ocr-not-implemented' },
      quantityLiters: { value: null, confidence: 0, source: 'ocr-not-implemented' },
      pricePerLiter: { value: null, confidence: 0, source: 'ocr-not-implemented' },
      vehicleNumber: { value: null, confidence: 0, source: 'ocr-not-implemented' },
      gstin: { value: null, confidence: 0, source: 'ocr-not-implemented' },
      paymentMode: { value: null, confidence: 0, source: 'ocr-not-implemented' },
    },
    overallConfidence: 0,
    rawText: null,
    needsReview: true,
    warnings: ['OCR provider not yet implemented — configure RECEIPT_EXTRACTION_PROVIDER=mock for testing'],
  };
}
