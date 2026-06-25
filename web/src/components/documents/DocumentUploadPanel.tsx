import { DocumentUploadDrawer } from './DocumentUploadDrawer';

type Props = {
  onSuccess: () => void;
  onCancel: () => void;
};

export function DocumentUploadPanel({ onSuccess, onCancel }: Props) {
  return <DocumentUploadDrawer open={true} onClose={onCancel} onSuccess={onSuccess} />;
}
