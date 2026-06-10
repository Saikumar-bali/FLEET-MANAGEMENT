import type { ReactNode } from 'react';

type PageHeaderProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
};

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="section-header" style={{ marginBottom: '1.5rem' }}>
      <div>
        <p className="eyebrow">{description ?? ''}</p>
        <h2 className="page-title" style={{ margin: 0 }}>{title}</h2>
      </div>
      {actions ? <div className="button-row">{actions}</div> : null}
    </div>
  );
}
