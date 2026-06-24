import type { ReactNode } from 'react';

interface FormSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function FormSection({ title, description, children, className = '' }: FormSectionProps) {
  return (
    <fieldset className={`form-section ${className}`}>
      <div className="form-section-heading">
        <h4 className="form-section-title">{title}</h4>
        {description ? <p className="form-section-desc">{description}</p> : null}
      </div>
      <div className="form-section-content">
        {children}
      </div>
    </fieldset>
  );
}
