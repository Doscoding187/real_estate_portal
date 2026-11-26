import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Text field binding that never lets an external write (draft restore, server
 * hydration, device autosave churn) overwrite what the user is typing.
 *
 * Once the user has typed since focusing, the local value is authoritative. Until then (and
 * when not focused) the field follows the external value. On blur, only typed text is committed.
 */
export function useFocusSafeText(
  externalValue: string,
  commit: (next: string) => void,
  options: { debounceMs?: number } = {},
): {
  value: string;
  onChange: (event: { target: { value: string } }) => void;
  onFocus: () => void;
  onBlur: () => void;
} {
  const [local, setLocal] = useState(externalValue);
  const focused = useRef(false);
  // True once the user has typed since focusing; only then is the local value protected.
  const dirty = useRef(false);
  const localRef = useRef(externalValue);
  const commitRef = useRef(commit);
  commitRef.current = commit;
  const debounceMs = options.debounceMs ?? 0;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef(false);

  const flush = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (pending.current) {
      pending.current = false;
      commitRef.current(localRef.current);
    }
  }, []);

  // Never lose typed text if the field unmounts (step change) before the debounce fires.
  useEffect(() => flush, [flush]);

  useEffect(() => {
    if (focused.current && dirty.current) return;
    if (externalValue !== localRef.current) {
      localRef.current = externalValue;
      setLocal(externalValue);
    }
  }, [externalValue]);

  const onChange = useCallback((event: { target: { value: string } }) => {
    const next = event.target.value;
    dirty.current = true;
    localRef.current = next;
    setLocal(next);
    if (debounceMs > 0) {
      // Per-keystroke store writes re-render the whole wizard and persist the whole draft;
      // keystrokes stay local and the store follows once typing pauses.
      pending.current = true;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, debounceMs);
    } else {
      commitRef.current(next);
    }
  }, [debounceMs, flush]);

  const onFocus = useCallback(() => {
    focused.current = true;
    dirty.current = false;
  }, []);

  const onBlur = useCallback(() => {
    const wasDirty = dirty.current;
    focused.current = false;
    dirty.current = false;
    if (wasDirty) {
      pending.current = false;
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
      }
      commitRef.current(localRef.current);
    }
  }, []);

  return { value: local, onChange, onFocus, onBlur };
}
