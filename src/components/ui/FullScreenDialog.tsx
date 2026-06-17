import React, { useEffect, useRef } from 'react';

interface FullScreenDialogProps {
  open: boolean;
  title: string;
  onClose: () => void;
  onSave?: () => void;
  saveLabel?: string;
  children: React.ReactNode;
  disableSave?: boolean;
}

export default function FullScreenDialog({
  open,
  title,
  onClose,
  onSave,
  saveLabel = 'Simpan',
  children,
  disableSave = false,
}: FullScreenDialogProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fullscreen-dialog-overlay">
      {/* App Bar */}
      <div className="dialog-appbar">
        <h2>{title}</h2>
        <div className="dialog-appbar-actions">
          {onSave && (
            <button
              onClick={onSave}
              disabled={disableSave}
              style={{ opacity: disableSave ? 0.4 : 1, fontWeight: 700, fontSize: '0.95rem', padding: '0 12px' }}
            >
              {saveLabel}
            </button>
          )}
          <button onClick={onClose}>
            <span className="mat-icon">close</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="dialog-content" ref={contentRef}>
        {children}
      </div>
    </div>
  );
}
