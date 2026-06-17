import React, { useEffect, useRef } from 'react';

/* ================================================================== */
/*  Bottom Sheet — Android-style modal dari bawah                      */
/*  Usage:                                                             */
/*    <BottomSheet open={show} onClose={() => setShow(false)}>        */
/*      <h3>Judul</h3>                                                 */
/*      <p>Content</p>                                                */
/*    </BottomSheet>                                                   */
/* ================================================================== */

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export default function BottomSheet({ open, onClose, title, children }: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);

  // Close on escape key
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  // Prevent body scroll when open
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
    <>
      {/* Overlay */}
      <div className="bottom-sheet-overlay" onClick={onClose} />

      {/* Sheet */}
      <div className="bottom-sheet" ref={sheetRef}>
        <div className="bottom-sheet-handle" />
        {title && (
          <div className="bottom-sheet-header">
            <span>{title}</span>
            <button
              onClick={onClose}
              style={{
                background: 'none', border: 'none', padding: 8,
                borderRadius: '50%', cursor: 'pointer', color: '#666',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
              className="ripple"
            >
              <span className="mat-icon">close</span>
            </button>
          </div>
        )}
        <div className="bottom-sheet-body">
          {children}
        </div>
      </div>
    </>
  );
}
