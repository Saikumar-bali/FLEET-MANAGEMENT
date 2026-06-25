type Props = {
  mimeType: string | null;
  className?: string;
};

export function DocumentTypeIcon({ mimeType, className = '' }: Props) {
  const size = className.includes('w-8') || className.includes('h-8') ? 32 : className.includes('w-5') || className.includes('h-5') ? 20 : 24;
  const viewBox = '0 0 24 24';
  const fill = 'none';
  const stroke = 'currentColor';
  const strokeWidth = 1.5;

  if (mimeType === 'application/pdf') {
    return (
      <svg width={size} height={size} viewBox={viewBox} fill={fill} stroke={stroke} strokeWidth={strokeWidth} className={className}>
        <path d="M7 2h10a2 2 0 012 2v16a2 2 0 01-2 2H7a2 2 0 01-2-2V4a2 2 0 012-2z" />
        <path d="M9 12h6M9 8h6M9 16h4" strokeLinecap="round" />
        <text x="12" y="20" textAnchor="middle" fontSize="5" fill={stroke} stroke="none" fontWeight="bold">PDF</text>
      </svg>
    );
  }

  if (mimeType?.startsWith('image/')) {
    return (
      <svg width={size} height={size} viewBox={viewBox} fill={fill} stroke={stroke} strokeWidth={strokeWidth} className={className}>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <path d="M21 15l-5-5L5 21" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  return (
    <svg width={size} height={size} viewBox={viewBox} fill={fill} stroke={stroke} strokeWidth={strokeWidth} className={className}>
      <path d="M7 2h10a2 2 0 012 2v16a2 2 0 01-2 2H7a2 2 0 01-2-2V4a2 2 0 012-2z" />
      <path d="M9 12h6M9 8h6" strokeLinecap="round" />
    </svg>
  );
}
