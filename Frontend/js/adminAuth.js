// Small helper to protect admin pages and provide logout
(function () {
  function ensureAdmin() {
    // allow dev URL param override
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('admin') === '1') {
        localStorage.setItem('isAdmin','true');
        return true;
      }
    } catch (e) {}

    return !!localStorage.getItem('isAdmin');
  }

  // Expose a global check function
  window.ensureAdmin = ensureAdmin;

  // Attach a logout helper
  window.adminLogout = function () {
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('adminUser');
    window.location.href = 'login.html';
  };
})();
