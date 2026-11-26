import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Text field binding that never lets an external write (draft restore, server
 * hydration, device autosave churn) overwrite what the user is typing.
 *
 * While the field is focused the local value is authoritative. When it is not
 * focused it follows the external value. On blur any difference is committed.
 */
export function useFocusSafeText(
  externalValue: string,
  commit: (next: string) => void,
): {
  value: string;
  onChange: (event: { target: { value: string } }) => void;
  onFocus: () => void;
  onBlur: () => void;
} {
  const [local, setLocal] = useState(externalValue);
  const focused = useRef(false);
  const localRef = useRef(externalValue);
  const commitRef = useRef(commit);
  commitRef.current = commit;

  useEffect(() => {
    if (focused.current) return;
    if (externalValue !== localRef.current) {
      localRef.current = externalValue;
      setLocal(externalValue);
    }
  }, [externalValue]);

  const onChange = useCallback((event: { target: { value: string } }) => {
    const next = event.target.value;
    localRef.current = next;
    setLocal(next);
    commitRef.current(next);
  }, []);

  const onFocus = useCallback(() => {
    focused.current = true;
  }, []);

  const onBlur = useCallback(() => {
    focused.current = false;
    commitRef.current(localRef.current);
  }, []);

  return { value: local, onChange, onFocus, onBlur };
}
