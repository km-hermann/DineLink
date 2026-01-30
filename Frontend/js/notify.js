// Lightweight toast notification utility — injects styles and exposes showNotification
(function () {
  // inject styles once
  if (!document.getElementById('notify-styles')) {
    const style = document.createElement('style');
    style.id = 'notify-styles';
    style.textContent = `
      #toastContainer{position:fixed;top:70px;right:18px;z-index:9999;display:flex;flex-direction:column;gap:8px;pointer-events:none}
      .toast{pointer-events:auto;min-width:180px;max-width:320px;padding:10px 14px;border-radius:8px;color:#fff;font-weight:600;box-shadow:0 6px 18px rgba(0,0,0,0.12);transform:translateY(-6px) scale(.98);opacity:0;transition:transform .22s cubic-bezier(.2,.9,.2,1),opacity .22s}
      .toast.visible{transform:translateY(0) scale(1);opacity:1}
      .toast-info{background:linear-gradient(90deg,#2196f3,#1e88e5)}
      .toast-success{background:linear-gradient(90deg,#4caf50,#43a047)}
      .toast-warn{background:linear-gradient(90deg,#ffb300,#ff8f00);color:#222}
      .toast-error{background:linear-gradient(90deg,#ef5350,#e53935)}
      @media (prefers-reduced-motion: reduce){ .toast{transition:none} }
    `;
    document.head.appendChild(style);
  }

  function ensureContainer() {
    let c = document.getElementById('toastContainer');
    if (!c) {
      c = document.createElement('div');
      c.id = 'toastContainer';
      document.body.appendChild(c);
    }
    return c;
  }

  // message: string, type: 'info'|'success'|'warn'|'error', timeout in ms
  function showNotification(message, type = 'info', timeout = 3200) {
    try {
      const container = ensureContainer();
      const t = document.createElement('div');
      t.className = `toast toast-${type}`;
      t.textContent = message;
      container.appendChild(t);
      // trigger visible state
      requestAnimationFrame(() => t.classList.add('visible'));
      const remove = () => {
        t.classList.remove('visible');
        setTimeout(() => t.remove(), 260);
      };
      const timer = setTimeout(remove, timeout);
      // allow click to dismiss
      t.addEventListener('click', () => {
        clearTimeout(timer);
        remove();
      });
      return t;
    } catch (e) {
      // graceful fallback: console
      console.log('[notify] ', message);
    }
  }

  window.showNotification = showNotification;
})();
