import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

/* ================================================================== */
/*  Snackbar (Toast-style notification)                                */
/*  Usage: const { showSnackbar } = useSnackbar();                     */
/*         showSnackbar('Data tersimpan', 'success');                  */
/* ================================================================== */

type SnackbarType = 'success' | 'error' | 'warning' | 'info';

interface SnackbarItem {
  id: number;
  message: string;
  type: SnackbarType;
  exiting?: boolean;
}

interface SnackbarContextValue {
  showSnackbar: (message: string, type?: SnackbarType) => void;
}

const SnackbarContext = createContext<SnackbarContextValue>({ showSnackbar: () => {} });

export function useSnackbar() {
  return useContext(SnackbarContext);
}

export function SnackbarProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<SnackbarItem[]>([]);
  const idRef = useRef(0);

  const removeItem = useCallback((id: number) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const showSnackbar = useCallback((message: string, type: SnackbarType = 'info') => {
    const id = ++idRef.current;
    setItems((prev) => [...prev, { id, message, type }]);

    // Auto-dismiss after 3.5s
    setTimeout(() => {
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, exiting: true } : i)));
      setTimeout(() => removeItem(id), 260);
    }, 3500);
  }, [removeItem]);

  return (
    <SnackbarContext.Provider value={{ showSnackbar }}>
      {children}
      <div className="snackbar-container">
        {items.map((item) => (
          <div
            key={item.id}
            className={`snackbar ${item.type}${item.exiting ? ' snackbar-exit' : ''}`}
            onClick={() => {
              setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, exiting: true } : i)));
              setTimeout(() => removeItem(item.id), 260);
            }}
          >
            <span className="mat-icon">
              {item.type === 'success' ? 'check_circle' :
               item.type === 'error' ? 'error' :
               item.type === 'warning' ? 'warning' : 'info'}
            </span>
            <span>{item.message}</span>
          </div>
        ))}
      </div>
    </SnackbarContext.Provider>
  );
}

export default SnackbarProvider;
