import type { ReactNode } from 'react';

type FormSectionProps = {
  title: string;
  description?: string;
  children: ReactNode;
};

export function FormSection({ title, description, children }: FormSectionProps) {
  return (
    <section className="form-section">
      <div className="form-section-heading">
        <h4>{title}</h4>
        {description ? <p>{description}</p> : null}
      </div>
      <div className="form-section-content">{children}</div>
    </section>
  );
}
