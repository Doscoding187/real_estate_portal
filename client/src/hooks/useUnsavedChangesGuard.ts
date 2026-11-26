import { useEffect } from 'react';

export const UNSAVED_CHANGES_MESSAGE =
  'You have changes that have not been saved yet. Leave anyway?';

/**
 * Warns before leaving while `dirty` is true:
 * - closing / reloading the tab or leaving the site (beforeunload)
 * - clicking an in-app link (route change), which the router would otherwise
 *   follow without any chance to stop
 */
export function useUnsavedChangesGuard(dirty: boolean, message = UNSAVED_CHANGES_MESSAGE) {
  useEffect(() => {
    if (!dirty) return;

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Required by some browsers to show the native prompt.
      event.returnValue = '';
    };

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest?.('a[href]') as
        | HTMLAnchorElement
        | null;
      if (!anchor) return;
      if (anchor.target && anchor.target !== '_self') return;
      if (anchor.hasAttribute('download')) return;
      const href = anchor.getAttribute('href') ?? '';
      if (href.startsWith('#')) return;
      let url: URL;
      try {
        url = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) {
        return;
      }
      if (!window.confirm(message)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('click', onClick, true);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('click', onClick, true);
    };
  }, [dirty, message]);
}
