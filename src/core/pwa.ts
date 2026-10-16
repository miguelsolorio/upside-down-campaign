// Registers public/sw.js, which makes the page installable as an app and playable offline. Only in a production build:
// the dev server serves source files that change under it, and a worker would keep showing the old ones.

export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  const start = async (): Promise<void> => {
    await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`);
    const worker = (await navigator.serviceWorker.ready).active;
    // Hand the worker what this visit already loaded, since it only sees the requests made after it takes over.
    worker?.postMessage({ keep: [new URL('./', location.href).href, ...performance.getEntriesByType('resource').map((e) => e.name)] });
  };
  const go = (): void => { start().catch(() => {}); };
  if (document.readyState === 'complete') go();
  else addEventListener('load', go, { once: true });
}
