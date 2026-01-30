// App configuration for backend host. Change BACKEND_HOST to your dev machine IP:port when testing on LAN.
(function () {
  window.APP_CONFIG = window.APP_CONFIG || {};
  // adjust this value when your dev machine IP changes
  // If the page is opened from another device on the LAN, prefer using location.hostname
  const autoHost = (location && location.hostname && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1')
    ? `${location.hostname}:3000`
    : null;

  window.APP_CONFIG.BACKEND_HOST = window.APP_CONFIG.BACKEND_HOST || autoHost || 'localhost:3000';

  // helper to build HTTP(s) backend URLs
  window.getBackendUrl = function (path = '/') {
    if (!path.startsWith('/')) path = '/' + path;
    const protocol = (location.protocol === 'https:') ? 'https:' : 'http:';
    return `${protocol}//${window.APP_CONFIG.BACKEND_HOST}${path}`;
  };

  // helper to build WS(s) URL
  window.getWsUrl = function () {
    const proto = (location.protocol === 'https:') ? 'wss:' : 'ws:';
    return `${proto}//${window.APP_CONFIG.BACKEND_HOST}`;
  };

  // Robust WebSocket connector: tries primary ws/wss and falls back to the alternate if the first fails.
  // handlers: { onopen, onmessage, onerror, onclose }
  window.connectWebSocket = function (handlers = {}) {
    const primary = getWsUrl();
    const alt = primary.startsWith('ws:') ? primary.replace('ws:', 'wss:') : primary.replace('wss:', 'ws:');
    let triedAlt = false;

    function tryUrl(url) {
      try {
        const ws = new WebSocket(url);
        ws.addEventListener('open', (e) => handlers.onopen && handlers.onopen(e));
        ws.addEventListener('message', (e) => handlers.onmessage && handlers.onmessage(e));
        ws.addEventListener('error', (e) => handlers.onerror && handlers.onerror(e));
        ws.addEventListener('close', (e) => handlers.onclose && handlers.onclose(e));

        // If error occurs within a short timeframe, attempt fallback once
        const fallbackTimeout = setTimeout(() => {
          // connection did not error quickly — keep this ws
        }, 2000);

        ws.addEventListener('error', function onFirstError(ev) {
          clearTimeout(fallbackTimeout);
          ws.removeEventListener('error', onFirstError);
          if (!triedAlt) {
            triedAlt = true;
            console.warn('[connectWebSocket] primary failed, trying alternate protocol:', alt);
            tryUrl(alt);
          } else {
            console.error('[connectWebSocket] both WS and WSS failed');
          }
        });

        return ws;
      } catch (err) {
        console.error('[connectWebSocket] Exception while creating WebSocket for', url, err);
        if (!triedAlt) {
          triedAlt = true;
          return tryUrl(alt);
        }
        return null;
      }
    }

    return tryUrl(primary);
  };
})();
