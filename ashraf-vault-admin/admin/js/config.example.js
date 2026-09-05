/**
 * ASHRAF VAULT — public runtime config
 *
 * 1. Copy this file to "config.js" in the same folder.
 * 2. Fill in the two values below from Supabase → Project Settings → API.
 * 3. config.js is in .gitignore — never commit it, even though these two
 *    values are meant to be public (see README-ADMIN.md for why that's safe).
 *
 * NEVER put your service_role key here or anywhere in frontend code.
 */
window.ASHRAF_VAULT_CONFIG = {
  SUPABASE_URL: "https://YOUR-PROJECT-REF.supabase.co",
  SUPABASE_ANON_KEY: "YOUR-PUBLIC-ANON-KEY",

  // Storage bucket name (must match schema.sql)
  BUCKET: "vault-files",

  // Soft limits enforced client-side before upload (server-side limits should
  // also be set in Supabase Storage settings for the bucket)
  MAX_FILE_SIZE_MB: 100,
  ALLOWED_EXTENSIONS: [
    "pdf","doc","docx","xls","xlsx","ppt","pptx","txt","csv","zip",
    "png","jpg","jpeg","webp"
  ]
};
