const API_BASE = '/api';

function saveToken(token){ try { localStorage.setItem('token', token); } catch {}
}

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('login-form');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const errorEl = document.getElementById('error');
    errorEl.style.display = 'none';
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) {
        errorEl.textContent = data.error || 'Login failed';
        errorEl.style.display = 'block';
        return;
      }
      saveToken(data.token);
      window.location.href = '/';
    } catch (err) {
      errorEl.textContent = 'Network error';
      errorEl.style.display = 'block';
    }
  });
});


