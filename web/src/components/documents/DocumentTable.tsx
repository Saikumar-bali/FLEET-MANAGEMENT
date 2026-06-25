import { DocumentTypeIcon } from './DocumentTypeIcon';
import { DocumentVerificationBadge } from './DocumentVerificationBadge';
import { DocumentExpiryBadge } from './DocumentExpiryBadge';
import { DocumentActionsMenu } from './DocumentActionsMenu';
import type { DocumentRecord } from '../../types/auth';

type Props = {
  documents: DocumentRecord[];
  onView: (doc: DocumentRecord) => void;
  onDownload: (doc: DocumentRecord) => void;
  onArchive?: (doc: DocumentRecord) => void;
  onDelete?: (doc: DocumentRecord) => void;
  onVerify?: (doc: DocumentRecord, status: string) => void;
  canArchive?: boolean;
  canDelete?: boolean;
  canVerify?: boolean;
};

function formatFileSize(bytes: number | null) {
  if (!bytes) return '--';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return '--';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDocType(type: string): string {
  const map: Record<string, string> = {
    VEHICLE_RC: 'RC',
    VEHICLE_INSURANCE: 'Insurance',
    VEHICLE_PERMIT: 'Permit',
    VEHICLE_FITNESS: 'Fitness',
    VEHICLE_PUC: 'PUC',
    ROAD_TAX: 'Road Tax',
    FASTAG: 'FASTAG',
    AIS140_GPS: 'AIS140 GPS',
    DRIVER_LICENSE: 'License',
    DRIVER_ID_PROOF: 'ID Proof',
    TRIP_POD: 'POD',
    TRIP_CHALLAN: 'Challan',
    TRIP_LR: 'LR',
    TRIP_EWAY_BILL: 'E-Way Bill',
    CUSTOMER_PO: 'PO',
    INVOICE: 'Invoice',
    PAYMENT_PROOF: 'Payment Proof',
    FUEL_BILL: 'Fuel Bill',
    EXPENSE_BILL: 'Expense Bill',
    MAINTENANCE_BILL: 'Maintenance Bill',
    REPAIR_BILL: 'Repair Bill',
    VENDOR_DOCUMENT: 'Vendor Doc',
    CUSTOMER_DOCUMENT: 'Customer Doc',
    GENERAL: 'General',
  };
  return map[type] || type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function getLinkedLabel(doc: DocumentRecord) {
  if (doc.vehicle) return doc.vehicle.vehicleNumber;
  if (doc.driver) return doc.driver.name;
  if (doc.trip) return doc.trip.tripNumber;
  if (doc.customer) return doc.customer.name;
  if (doc.vendor) return doc.vendor.name;
  return '--';
}

export function DocumentTable({ documents, onView, onDownload, onArchive, onDelete, onVerify, canArchive, canDelete, canVerify }: Props) {
  return (
    <div className="doc-table-wrap">
      <div className="doc-table-scroll">
      <table className="doc-table">
        <thead>
          <tr>
            <th className="doc-th-doc">Document</th>
            <th className="doc-th-type">Type</th>
            <th className="doc-th-cat">Category</th>
            <th className="doc-th-linked">Linked To</th>
            <th className="doc-th-verify">Verification</th>
            <th className="doc-th-expiry">Expiry</th>
            <th className="doc-th-uploaded">Uploaded</th>
            <th className="doc-th-size">Size</th>
            <th className="doc-th-actions">Actions</th>
          </tr>
        </thead>
        <tbody>
          {documents.map((doc) => (
            <tr key={doc.id} className="doc-tr" onClick={() => onView(doc)}>
              <td className="doc-td-doc">
                <div className="doc-td-doc-inner">
                  <DocumentTypeIcon mimeType={doc.mimeType} className="doc-td-icon" />
                  <div className="doc-td-doc-text">
                    <span className="doc-td-title">{doc.title}</span>
                    <span className="doc-td-sub">{doc.documentNumber || doc.originalFileName}</span>
                  </div>
                </div>
              </td>
              <td className="doc-td-type">
                <span className="doc-type-pill">{formatDocType(doc.documentType)}</span>
              </td>
              <td className="doc-td-cat">
                <span className="doc-cat-pill">{doc.documentCategory}</span>
              </td>
              <td className="doc-td-linked">{getLinkedLabel(doc)}</td>
              <td className="doc-td-verify"><DocumentVerificationBadge status={doc.verificationStatus} /></td>
              <td className="doc-td-expiry">
                <DocumentExpiryBadge expiryDate={doc.expiryDate} />
                {!doc.expiryDate && <span className="doc-no-expiry">--</span>}
              </td>
              <td className="doc-td-uploaded">{formatDate(doc.createdAt)}</td>
              <td className="doc-td-size">{formatFileSize(doc.fileSizeBytes)}</td>
              <td className="doc-td-actions" onClick={(e) => e.stopPropagation()}>
                <DocumentActionsMenu
                  document={doc}
                  onView={onView}
                  onDownload={onDownload}
                  onArchive={onArchive}
                  onDelete={onDelete}
                  onVerify={onVerify}
                  canArchive={canArchive}
                  canDelete={canDelete}
                  canVerify={canVerify}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
