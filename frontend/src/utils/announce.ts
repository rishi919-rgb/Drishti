/**
 * Announces a message to screen readers via an ARIA live region.
 * The live region element with id="drishti-live-region" must be present in the DOM
 * (it is rendered in App.tsx). If missing, it is created dynamically as a fallback.
 */
export function announce(
  message: string,
  priority: 'polite' | 'assertive' = 'polite'
): void {
  if (!message) return;

  let liveRegion = document.getElementById('drishti-live-region');

  if (!liveRegion) {
    // Fallback: create the live region dynamically
    const div = document.createElement('div');
    div.setAttribute('aria-live', priority);
    div.setAttribute('aria-atomic', 'true');
    div.className = 'sr-only';
    div.id = 'drishti-live-region';
    document.body.appendChild(div);
    liveRegion = div;
  } else {
    // Update the priority in case it changes between calls
    liveRegion.setAttribute('aria-live', priority);
  }

  // Clear first so the same message can be re-announced
  liveRegion.textContent = '';

  // Use a small timeout so the DOM mutation is picked up by screen readers
  setTimeout(() => {
    if (liveRegion) {
      liveRegion.textContent = message;
    }
  }, 50);
}
