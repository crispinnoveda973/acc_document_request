import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Button, Modal } from '../components/ui';

/*
 * Replacement for window.confirm().
 * Native confirm() is silently blocked inside sandboxed previews / iframes (it returns false),
 * which makes buttons such as "Cancel request" look like they do nothing.
 *
 *   const confirm = useConfirm();
 *   if (await confirm({ title, message, confirmText, danger, withReason })) { ... }
 *   // with withReason: true it resolves to { reason } or false
 */
const Ctx = createContext(null);
export const useConfirm = () => useContext(Ctx);

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);
  const [reason, setReason] = useState('');
  const resolver = useRef(null);

  const confirm = useCallback((opts) => new Promise((resolve) => {
    resolver.current = resolve; setReason(''); setState(opts);
  }), []);

  const close = (value) => { resolver.current?.(value); setState(null); };

  return (
    <Ctx.Provider value={confirm}>
      {children}
      <Modal open={!!state} onClose={() => close(false)} title={state?.title || 'Are you sure?'}
        footer={<>
          <Button variant="secondary" onClick={() => close(false)}>{state?.cancelText || 'No, keep it'}</Button>
          <Button variant={state?.danger ? 'danger' : 'primary'} onClick={() => close(state?.withReason ? { reason: reason.trim() } : true)}>
            {state?.confirmText || 'Yes, continue'}
          </Button>
        </>}>
        <p>{state?.message}</p>
        {state?.withReason && (
          <textarea rows="3" maxLength="300" placeholder="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)}
            className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20" />
        )}
      </Modal>
    </Ctx.Provider>
  );
}
