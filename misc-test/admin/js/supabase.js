(function () {
  const config = window.__SUPABASE_CONFIG__ || {};
  const url = config.url;
  const anonKey = config.anonKey;

  function isConfigured() {
    return Boolean(url && anonKey && !url.includes('your-project-ref') && !anonKey.includes('your-anon-key'));
  }

  function createClient() {
    if (!isConfigured()) {
      console.warn('Supabase config is incomplete. Add your project URL and anon key in admin/js/config.js.');
      return null;
    }

    return window.supabase.createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
  }

  const api = {
    isConfigured,
    createClient,
    getClient() {
      const client = createClient();
      if (!client) {
        throw new Error('Supabase is not configured. Please add your project URL and anon key.');
      }
      return client;
    },
    getSession() {
      const client = createClient();
      if (!client) {
        return Promise.resolve(null);
      }
      return client.auth.getSession();
    }
  };

  window.AdminSupabase = api;
})();
