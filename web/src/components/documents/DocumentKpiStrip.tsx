type KpiItem = {
  label: string;
  value: number | string;
  variant?: 'default' | 'accent' | 'success' | 'warning' | 'danger';
};

type Props = {
  items: KpiItem[];
  onCardClick?: (item: KpiItem) => void;
};

export function DocumentKpiStrip({ items, onCardClick }: Props) {
  return (
    <div className="doc-kpi-strip">
      {items.map((item, i) => (
        <button
          key={i}
          className={`doc-kpi-card doc-kpi-${item.variant || 'default'}`}
          onClick={() => onCardClick?.(item)}
          type="button"
        >
          <span className="doc-kpi-value">{item.value}</span>
          <span className="doc-kpi-label">{item.label}</span>
        </button>
      ))}
    </div>
  );
}
