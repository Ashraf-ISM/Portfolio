/**
 * VaultAPI — every read/write against the `files`, `activity_log` and
 * Storage bucket. RLS on the server means every call here is implicitly
 * scoped to the signed-in user; there is no way for this client to read
 * or write another user's rows even if it tried.
 */
const VaultAPI = (() => {
  const BUCKET = () => window.VAULT_CONFIG.BUCKET;

  async function uid() {
    const { data: { user } } = await window.sb.auth.getUser();
    return user?.id;
  }

  async function logActivity(action, file_name, details = {}) {
    const user_id = await uid();
    if (!user_id) return;
    await window.sb.from("activity_log").insert({ user_id, action, file_name, details });
  }

  /** List files with filtering / sorting / pagination.
   *  opts: { category, favoritesOnly, trashOnly, search, sort, page, pageSize } */
  async function listFiles(opts = {}) {
    const { category, favoritesOnly, trashOnly, search, sort = "newest", page = 1, pageSize = 8 } = opts;
    let q = window.sb.from("files").select("*", { count: "exact" });

    q = trashOnly ? q.not("deleted_at", "is", null) : q.is("deleted_at", null);
    if (category && category !== "all") q = q.eq("category", category);
    if (favoritesOnly) q = q.eq("is_favorite", true);
    if (search) q = q.ilike("name", `%${search}%`);

    const sortMap = {
      newest: ["created_at", false], oldest: ["created_at", true],
      name_asc: ["name", true], name_desc: ["name", false],
      largest: ["size", false], smallest: ["size", true],
    };
    const [col, asc] = sortMap[sort] || sortMap.newest;
    q = q.order(col, { ascending: asc });

    const from = (page - 1) * pageSize;
    q = q.range(from, from + pageSize - 1);

    const { data, error, count } = await q;
    if (error) throw error;
    return { rows: data || [], total: count || 0 };
  }

  async function recentFiles(limit = 4) {
    const { data, error } = await window.sb.from("files").select("*")
      .is("deleted_at", null).order("created_at", { ascending: false }).limit(limit);
    if (error) throw error;
    return data || [];
  }

  async function recentActivity(limit = 6) {
    const { data, error } = await window.sb.from("activity_log").select("*")
      .order("created_at", { ascending: false }).limit(limit);
    if (error) throw error;
    return data || [];
  }

  async function stats() {
    const user_id = await uid();
    const [{ count: totalFiles }, { data: sizeRows }, { count: favCount }] = await Promise.all([
      window.sb.from("files").select("id", { count: "exact", head: true }).is("deleted_at", null),
      window.sb.from("files").select("size,category").is("deleted_at", null),
      window.sb.from("files").select("id", { count: "exact", head: true }).is("deleted_at", null).eq("is_favorite", true),
    ]);

    const totalBytes = (sizeRows || []).reduce((s, r) => s + (r.size || 0), 0);
    const byCategory = {};
    (sizeRows || []).forEach(r => {
      byCategory[r.category] = (byCategory[r.category] || 0) + 1;
    });

    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const { count: recentUploads } = await window.sb.from("files").select("id", { count: "exact", head: true })
      .is("deleted_at", null).gte("created_at", weekAgo);

    const { count: sharedCount } = await window.sb.from("file_shares").select("id", { count: "exact", head: true })
      .is("revoked_at", null).gt("expires_at", new Date().toISOString());

    return {
      totalFiles: totalFiles || 0,
      totalBytes,
      totalCategories: Object.keys(byCategory).length,
      byCategory,
      recentUploads: recentUploads || 0,
      favoritesCount: favCount || 0,
      sharedCount: sharedCount || 0,
      user_id,
    };
  }

  async function insertFileRecord({ name, storage_path, mime_type, size, category }) {
    const user_id = await uid();
    const { data, error } = await window.sb.from("files")
      .insert({ user_id, name, storage_path, mime_type, size, category: category || "Miscellaneous" })
      .select().single();
    if (error) throw error;
    await logActivity("uploaded", name, { size });
    return data;
  }

  async function toggleFavorite(file) {
    const { error } = await window.sb.from("files").update({ is_favorite: !file.is_favorite }).eq("id", file.id);
    if (error) throw error;
    await logActivity(file.is_favorite ? "unfavorited" : "favorited", file.name);
  }

  async function renameFile(file, newName) {
    const { error } = await window.sb.from("files").update({ name: newName }).eq("id", file.id);
    if (error) throw error;
    await logActivity("renamed", newName, { from: file.name });
  }

  async function moveToTrash(file) {
    const { error } = await window.sb.from("files").update({ deleted_at: new Date().toISOString() }).eq("id", file.id);
    if (error) throw error;
    await logActivity("deleted", file.name);
  }

  async function restoreFile(file) {
    const { error } = await window.sb.from("files").update({ deleted_at: null }).eq("id", file.id);
    if (error) throw error;
    await logActivity("restored", file.name);
  }

  async function deletePermanently(file) {
    const { error: storageErr } = await window.sb.storage.from(BUCKET()).remove([file.storage_path]);
    if (storageErr) throw storageErr;
    const { error } = await window.sb.from("files").delete().eq("id", file.id);
    if (error) throw error;
    await logActivity("permanently deleted", file.name);
  }

  /** Short-lived signed URL for preview/download. Never exposes a permanent path. */
  async function getSignedUrl(file, expiresInSeconds = 60) {
    const { data, error } = await window.sb.storage.from(BUCKET())
      .createSignedUrl(file.storage_path, expiresInSeconds, { download: false });
    if (error) throw error;
    await window.sb.from("files").update({ last_accessed_at: new Date().toISOString() }).eq("id", file.id);
    return data.signedUrl;
  }

  async function getDownloadUrl(file) {
    const { data, error } = await window.sb.storage.from(BUCKET())
      .createSignedUrl(file.storage_path, 60, { download: file.name });
    if (error) throw error;
    await logActivity("downloaded", file.name);
    return data.signedUrl;
  }

  async function createShareLink(file, { expiresInHours = 24, password = null }) {
    const user_id = await uid();
    const expires_at = new Date(Date.now() + expiresInHours * 3600 * 1000).toISOString();
    let password_hash = null;
    if (password) {
      const enc = new TextEncoder().encode(password);
      const digest = await crypto.subtle.digest("SHA-256", enc);
      password_hash = Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
    }
    const { data, error } = await window.sb.from("file_shares")
      .insert({ file_id: file.id, user_id, expires_at, password_hash })
      .select().single();
    if (error) throw error;
    await logActivity("shared", file.name, { expires_at });
    // Resolving this token for an anonymous visitor requires a small Edge
    // Function (see README-ADMIN.md) — this returns the shareable URL shape.
    return `${window.location.origin}/admin/share.html?token=${data.token}`;
  }

  return {
    listFiles, recentFiles, recentActivity, stats, insertFileRecord,
    toggleFavorite, renameFile, moveToTrash, restoreFile, deletePermanently,
    getSignedUrl, getDownloadUrl, createShareLink, logActivity, uid,
  };
})();
