/**
 * useHaptic – wraps the Vibration API for tactile feedback on mobile devices.
 * Gracefully degrades to a no-op on devices that do not support vibration.
 */
export function useHaptic() {
  const vibrate = (pattern: number | number[] = 20) => {
    if (typeof window !== 'undefined' &&
        window.navigator &&
        typeof window.navigator.vibrate === 'function') {
      try {
        window.navigator.vibrate(pattern);
      } catch {
        // Silently swallow errors (e.g., permission denied in some browsers)
      }
    }
  };

  /** Short tap: single 20 ms pulse */
  const tap = () => vibrate(20);

  /** Confirm: two short pulses */
  const confirm = () => vibrate([30, 50, 30]);

  /** Error: one long buzz */
  const error = () => vibrate(80);

  /** Mode change: staircase pattern */
  const modeChange = () => vibrate([15, 30, 15]);

  return { vibrate, tap, confirm, error, modeChange };
}
