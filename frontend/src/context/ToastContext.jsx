import { createContext, useCallback, useContext, useState } from 'react';

const ToastContext = createContext(null);
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);

  const push = useCallback((message, type = 'success') => {
    const id = Math.random();
    setItems((i) => [...i, { id, message, type }]);
    setTimeout(() => setItems((i) => i.filter((x) => x.id !== id)), type === 'info' ? 7000 : 4000);
  }, []);

  const color = { error: 'bg-red-600 text-white', info: 'bg-gold-500 text-brand-900', success: 'bg-brand-700 text-white' };

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="fixed right-4 top-4 z-[70] w-80 max-w-[90vw] space-y-2">
        {items.map((t) => (
          <div key={t.id} className={`pop rounded-xl px-4 py-3 text-sm font-medium shadow-lg ${color[t.type] || color.success}`}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
