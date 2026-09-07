/**
 * Bootstraps the Supabase JS client from window.ASHRAF_VAULT_CONFIG
 * (defined in config.js — see config.example.js). Only the public
 * project URL and anon key are used here; both are safe to ship to
 * the browser because every table is locked down with Row Level
 * Security and the storage bucket is private.
 */
(function () {
  const cfg = window.ASHRAF_VAULT_CONFIG;

  if (!cfg || !cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY ||
      cfg.SUPABASE_URL.includes("YOUR-PROJECT-REF")) {
    document.addEventListener("DOMContentLoaded", () => {
      document.body.innerHTML =
        '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;' +
        'background:#0a0f1a;color:#eef1f7;font-family:Inter,sans-serif;text-align:center;padding:24px;">' +
        '<div><h2 style="font-family:\'Space Grotesk\',sans-serif;margin-bottom:10px;">Vault not configured</h2>' +
        '<p style="color:#9aa3b8;max-width:420px;">Create <code>admin/js/config.js</code> from ' +
        '<code>config.example.js</code> and add your Supabase project URL and anon key. ' +
        'See README-ADMIN.md.</p></div></div>';
    });
    throw new Error("ASHRAF_VAULT_CONFIG missing or unfilled — see config.example.js");
  }

  window.sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: "ashraf-vault-auth"
    }
  });

  window.VAULT_CONFIG = cfg;
})();
