import { DocumentPreviewDrawer } from './DocumentPreviewDrawer';
import type { DocumentRecord } from '../../types/auth';

type Props = {
  document: DocumentRecord | null;
  onClose: () => void;
};

export function DocumentPreviewModal({ document: doc, onClose }: Props) {
  return <DocumentPreviewDrawer document={doc} open={!!doc} onClose={onClose} />;
}
