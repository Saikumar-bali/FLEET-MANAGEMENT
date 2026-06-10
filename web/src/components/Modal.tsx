import { type ReactNode } from 'react';

type ModalProps = {
  isOpen: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  size?: 'medium' | 'large';
  children: ReactNode;
  footer?: ReactNode;
};

export function Modal({
  isOpen,
  title,
  description,
  onClose,
  size = 'medium',
  children,
  footer,
}: ModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className={`modal-panel modal-panel-${size}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <div>
            <h3 className="modal-title">{title}</h3>
            {description ? <p className="modal-copy">{description}</p> : null}
          </div>
          <button type="button" className="ghost-button" onClick={onClose}>
            Close
          </button>
        </header>
        <div className="modal-body">{children}</div>
        {footer ? <footer className="modal-footer">{footer}</footer> : null}
      </section>
    </div>
  );
}
