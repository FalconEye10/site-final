import { useEffect } from 'react';

let lockCount = 0;
let originalOverflow = '';
let originalOverscroll = '';

/**
 * Custom React hook to prevent body background scrolling when a modal / drawer / dialog is open.
 * Uses a reference counter to safely support multiple/stacked open dialogs.
 */
export function useBodyScrollLock(isLocked: boolean = true) {
  useEffect(() => {
    if (!isLocked) return;

    if (lockCount === 0) {
      originalOverflow = document.body.style.overflow;
      originalOverscroll = document.body.style.overscrollBehavior;
      document.body.style.overflow = 'hidden';
      document.body.style.overscrollBehavior = 'none';
    }
    lockCount++;

    return () => {
      lockCount--;
      if (lockCount <= 0) {
        lockCount = 0;
        document.body.style.overflow = originalOverflow || '';
        document.body.style.overscrollBehavior = originalOverscroll || '';
      }
    };
  }, [isLocked]);
}
