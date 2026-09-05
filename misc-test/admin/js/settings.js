(function () {
  const init = () => {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        try {
          const client = window.AdminSupabase && window.AdminSupabase.getClient ? window.AdminSupabase.getClient() : null;
          if (client) {
            await client.auth.signOut();
          }
        } catch (error) {
          console.warn('Sign out failed', error);
        }
        window.location.href = '/admin/login.html';
      });
    }
  };

  window.AdminSettings = {
    init
  };

  document.addEventListener('DOMContentLoaded', init);
})();
