import type { AssetAssignmentRecord, AssetHolderSummary } from '../types/auth';

export function formatAssetHolderSummary(holder: AssetHolderSummary | null | undefined) {
  if (!holder) {
    return 'Unassigned';
  }

  return holder.secondary ? `${holder.label} (${holder.secondary})` : holder.label;
}

export function formatAssignmentHolder(assignment: AssetAssignmentRecord | null | undefined) {
  if (!assignment) {
    return 'Unassigned';
  }

  return formatAssetHolderSummary(assignment.holder);
}
