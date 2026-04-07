import { useEffect, useRef, useState, useCallback } from 'react';
import { X } from 'lucide-react';
import { useGenerateStore } from '../store/useGenerateStore';

const AUTO_DISMISS_MS = 8000;
const TRANSITION_MS = 300;

export function ErrorToast() {
  const status = useGenerateStore((s) => s.status);
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    setVisible(false);
    // After transition, clear the error status
    dismissTimerRef.current = setTimeout(() => {
      dismissTimerRef.current = null;
      const current = useGenerateStore.getState().status;
      if (current.kind === 'error') {
        useGenerateStore.setState({ status: { kind: 'idle' } });
      }
    }, TRANSITION_MS);
  }, []);

  useEffect(() => {
    if (status.kind === 'error') {
      const msg = status.message;
      requestAnimationFrame(() => {
        setMessage(msg);
        setVisible(true);
      });

      const timer = setTimeout(dismiss, AUTO_DISMISS_MS);
      return () => clearTimeout(timer);
    }
  }, [status, dismiss]);

  // Cleanup dismiss transition timer on unmount
  useEffect(() => {
    return () => {
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
      }
    };
  }, []);

  if (status.kind !== 'error') return null;

  return (
    <div
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${
        visible
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 -translate-y-3'
      }`}
    >
      <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-bg-card border border-error/30 shadow-lg max-w-md">
        <p className="text-sm text-text flex-1">{message}</p>
        <button
          onClick={dismiss}
          className="text-text-muted hover:text-text transition-colors flex-shrink-0"
          aria-label="Dismiss"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
