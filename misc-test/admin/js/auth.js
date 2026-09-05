(function () {
  const auth = {
    initLogin() {
      const form = document.getElementById('loginForm');
      const emailInput = document.getElementById('email');
      const passwordInput = document.getElementById('password');
      const errorBox = document.getElementById('authError');
      const successBox = document.getElementById('authSuccess');
      const submitButton = document.getElementById('loginButton');
      const resetButton = document.getElementById('resetPasswordBtn');

      if (!form || !emailInput || !passwordInput) return;

      const setMessage = (type, message) => {
        const box = type === 'error' ? errorBox : successBox;
        const other = type === 'error' ? successBox : errorBox;
        if (!box) return;
        box.textContent = message;
        box.classList.add('visible');
        if (other) other.classList.remove('visible');
      };

      const setLoading = (loading) => {
        submitButton.disabled = loading;
        const label = submitButton.querySelector('.btn-label');
        const loader = submitButton.querySelector('.btn-loader');
        if (label) label.hidden = loading;
        if (loader) loader.hidden = !loading;
      };

      const redirectToDashboard = () => {
        const target = '/admin/dashboard.html';
        window.location.href = target;
      };

      const checkAlreadySignedIn = async () => {
        try {
          const client = window.AdminSupabase && window.AdminSupabase.getClient ? window.AdminSupabase.getClient() : null;
          if (!client) return;
          const { data } = await client.auth.getSession();
          if (data.session) {
            redirectToDashboard();
          }
        } catch (err) {
          console.warn('Session check failed', err);
        }
      };

      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        setLoading(true);
        setMessage('error', '');
        setMessage('success', '');

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        if (!email || !password) {
          setMessage('error', 'Please enter your email and password.');
          setLoading(false);
          return;
        }

        try {
          const client = window.AdminSupabase && window.AdminSupabase.getClient ? window.AdminSupabase.getClient() : null;
          if (!client) {
            throw new Error('Supabase configuration is missing.');
          }

          const { data, error } = await client.auth.signInWithPassword({ email, password });

          if (error) {
            const message = error.message || 'Login failed.';
            if (message.toLowerCase().includes('invalid login')) {
              setMessage('error', 'Incorrect email or password. Please try again.');
            } else if (message.toLowerCase().includes('email')) {
              setMessage('error', 'Please enter a valid administrator email address.');
            } else if (message.toLowerCase().includes('network')) {
              setMessage('error', 'Network error. Please check your connection and try again.');
            } else {
              setMessage('error', 'Unable to sign in. Please try again.');
            }
            setLoading(false);
            return;
          }

          if (data && data.user) {
            setMessage('success', 'Signed in securely. Redirecting...');
            setLoading(false);
            redirectToDashboard();
          }
        } catch (err) {
          console.error('Login error', err);
          setMessage('error', 'A network or configuration issue prevented sign in.');
          setLoading(false);
        }
      });

      resetButton.addEventListener('click', async () => {
        const email = emailInput.value.trim();
        if (!email) {
          setMessage('error', 'Enter your email to receive a password reset link.');
          return;
        }

        try {
          const client = window.AdminSupabase && window.AdminSupabase.getClient ? window.AdminSupabase.getClient() : null;
          if (!client) throw new Error('Supabase is not configured.');
          const { error } = await client.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/admin/reset-password.html`
          });

          if (error) {
            setMessage('error', 'We could not send a reset email. Please try again later.');
          } else {
            setMessage('success', 'Password reset instructions have been sent to your email.');
          }
        } catch (err) {
          console.error('Reset password error', err);
          setMessage('error', 'The reset link could not be created right now.');
        }
      });

      checkAlreadySignedIn();
    },

    initLogout() {
      const button = document.getElementById('logoutBtn');
      if (!button) return;

      button.addEventListener('click', async () => {
        try {
          const client = window.AdminSupabase && window.AdminSupabase.getClient ? window.AdminSupabase.getClient() : null;
          if (client) {
            await client.auth.signOut();
          }
          window.location.href = '/admin/login.html';
        } catch (err) {
          console.error('Logout error', err);
          window.location.href = '/admin/login.html';
        }
      });
    },

    requireAuth() {
      const client = window.AdminSupabase && window.AdminSupabase.getClient ? window.AdminSupabase.getClient() : null;
      if (!client) {
        window.location.href = '/admin/login.html';
        return false;
      }
      return true;
    }
  };

  window.AdminAuth = auth;
})();
