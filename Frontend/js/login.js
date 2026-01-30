document.getElementById('loginBtn').addEventListener('click', async function () {
  const user = document.getElementById('username').value.trim();
  const pass = document.getElementById('password').value;
  const msg = document.getElementById('msg');
  msg.textContent = '';

  if (!user || !pass) {
    msg.textContent = 'Please fill username and password';
    return;
  }

  try {
    // Query backend for matching admin
  const res = await fetch(getBackendUrl(`/admins?username=${encodeURIComponent(user)}&password=${encodeURIComponent(pass)}`));
    if (!res.ok) {
      msg.textContent = 'Login server error';
      return;
    }

    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      // Successful login
      localStorage.setItem('isAdmin', 'true');
      // Optionally store admin username
      localStorage.setItem('adminUser', user);
      window.location.href = 'admin.html';
      return;
    }

    msg.textContent = 'Invalid username or password';
  } catch (err) {
    console.error('Login error', err);
    msg.textContent = 'Unable to contact login server';
  }
});
