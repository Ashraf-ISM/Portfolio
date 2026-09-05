(async function () {
  const user = await Auth.requireAuth();
  if (!user) return;

  const params = new URLSearchParams(window.location.search);
  const state = {
    view: params.get("view") || "dashboard",       // dashboard | files | recent | favorites | trash | shared
    category: params.get("category") || "all",
    sort: "newest",
    search: "",
    page: 1,
    pageSize: 8,
  };

  const titles = {
    dashboard: ["Dashboard", "Welcome back — here's what's happening with your vault."],
    files: ["My Files", "Every file in your private workspace."],
    recent: ["Recent", "Files you've uploaded or opened recently."],
    favorites: ["Favorites", "Files you've starred for quick access."],
    trash: ["Recycle Bin", "Deleted files are kept here until removed permanently."],
    shared: ["Shared Links", "Active temporary links to your files."],
  };
  const [pageTitle, pageSub] = titles[state.view] || titles.dashboard;
  document.getElementById("page-title").textContent = state.category !== "all" ? state.category : pageTitle;
  document.getElementById("page-subtitle").textContent = pageSub;
  document.getElementById("files-panel-title").textContent = state.category !== "all" ? state.category : (titles[state.view] ? pageTitle : "My Files");
  document.getElementById("files-breadcrumb-current").textContent = state.category !== "all" ? state.category : pageTitle;

  document.querySelectorAll(".nav-link[data-view]").forEach(a => {
    if (a.dataset.view === state.view) a.classList.add("active");
    else if (a.dataset.view) a.classList.remove("active");
  });
  if (state.view !== "dashboard") document.querySelector('.nav-link[href="dashboard.html"]').classList.remove("active");
  document.querySelectorAll(".nav-link[data-category]").forEach(a => {
    a.classList.toggle("active", a.dataset.category === state.category);
  });

  /* ---------------- Stats + storage ---------------- */
  async function loadStats() {
    const s = await VaultAPI.stats();
    const usedGB = s.totalBytes / 1024 ** 3;
    const totalGB = 10;
    const pct = Math.min(100, Math.round((usedGB / totalGB) * 1000) / 10);

    document.getElementById("stat-total-files").textContent = s.totalFiles.toLocaleString();
    document.getElementById("stat-files-delta").textContent = `${s.recentUploads} uploaded this week`;
    document.getElementById("stat-total-folders").textContent = s.totalCategories;
    document.getElementById("stat-folders-delta").textContent = "categories in use";
    document.getElementById("stat-storage").textContent = UI.formatBytes(s.totalBytes);
    document.getElementById("stat-storage-delta").textContent = `of ${totalGB} GB · ${pct}% used`;
    document.getElementById("stat-shared").textContent = s.sharedCount;
    document.getElementById("stat-shared-delta").textContent = "active links";

    const circumference = 2 * Math.PI * 46;
    const ring = document.getElementById("ring-fill");
    ring.setAttribute("stroke-dasharray", circumference.toFixed(1));
    ring.setAttribute("stroke-dashoffset", (circumference * (1 - pct / 100)).toFixed(1));
    document.getElementById("ring-pct").textContent = pct + "%";
    document.getElementById("legend-used").textContent = UI.formatBytes(s.totalBytes);
    document.getElementById("legend-avail").textContent = `${(totalGB - usedGB).toFixed(2)} GB`;

    document.getElementById("sidebar-storage-bar").style.width = pct + "%";
    document.getElementById("sidebar-storage-text").textContent = `${UI.formatBytes(s.totalBytes)} of ${totalGB} GB`;
  }

  /* ---------------- Recent uploads (right rail) ---------------- */
  async function loadRecentUploads() {
    const rows = await VaultAPI.recentFiles(4);
    const el = document.getElementById("recent-uploads-list");
    if (!rows.length) { el.innerHTML = '<div class="empty-state"><p>No uploads yet.</p></div>'; return; }
    el.innerHTML = rows.map(f => `
      <div class="mini-item">
        <div class="file-ico ${UI.fileIconClass(f.name)}">${UI.fileIconGlyph(f.name)}</div>
        <div class="meta"><b>${escapeHtml(f.name)}</b><span>${UI.formatBytes(f.size)} · ${UI.timeAgo(f.created_at)}</span></div>
      </div>`).join("");
  }

  /* ---------------- Recent activity (right rail) ---------------- */
  const activityIcons = {
    uploaded: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/></svg>',
    downloaded: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 4v12m-5-5 5 5 5-5"/><path d="M4 20h16"/></svg>',
    deleted: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-8 0 1 12a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-12"/></svg>',
    shared: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.6-4.2M8.2 13.2l7.6 4.2"/></svg>',
    favorited: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m12 3 2.6 5.6 6.1.7-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6-4.5-4.2 6.1-.7Z"/></svg>',
    renamed: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
    restored: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5"/></svg>',
  };
  async function loadActivity() {
    const rows = await VaultAPI.recentActivity(6);
    const el = document.getElementById("activity-list");
    if (!rows.length) { el.innerHTML = '<div class="empty-state"><p>No activity yet.</p></div>'; return; }
    el.innerHTML = rows.map(a => `
      <div class="timeline-item">
        <div class="timeline-dot">${activityIcons[a.action] || activityIcons.uploaded}</div>
        <div class="meta"><p>You ${a.action} ${a.file_name ? `<b>${escapeHtml(a.file_name)}</b>` : ""}</p><span>${UI.timeAgo(a.created_at)}</span></div>
      </div>`).join("");
  }

  /* ---------------- Files table ---------------- */
  function rowHtml(f) {
    const badgeClass = UI.categoryBadgeClass(f.category);
    const inTrash = !!f.deleted_at;
    return `
    <tr data-id="${f.id}">
      <td><input type="checkbox" class="row-check file-check"></td>
      <td class="file-name-td">
        <div class="file-name-cell">
          <div class="file-ico ${UI.fileIconClass(f.name)}">${UI.fileIconGlyph(f.name)}</div>
          <span class="fn" title="${escapeHtml(f.name)}">${escapeHtml(f.name)}</span>
          ${f.is_favorite ? '<svg viewBox="0 0 24 24" width="13" height="13" fill="#f2ac41" stroke="#f2ac41"><path d="m12 3 2.6 5.6 6.1.7-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6-4.5-4.2 6.1-.7Z"/></svg>' : ""}
        </div>
      </td>
      <td data-label="Category"><span class="badge ${badgeClass}">${escapeHtml(f.category)}</span></td>
      <td data-label="Size">${UI.formatBytes(f.size)}</td>
      <td data-label="Modified">${UI.timeAgo(f.updated_at || f.created_at)}</td>
      <td style="text-align:right">
        ${inTrash ? `
          <button class="icon-action" data-action="restore" title="Restore"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5"/></svg></button>
          <button class="icon-action" data-action="purge" title="Delete permanently"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-8 0 1 12a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-12"/></svg></button>
        ` : `
          <button class="icon-action" data-action="download" title="Download"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 4v12m-5-5 5 5 5-5"/><path d="M4 20h16"/></svg></button>
          <button class="icon-action" data-action="menu" title="More"><svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="19" r="1.6"/></svg></button>
        `}
      </td>
    </tr>`;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  async function loadFiles() {
    const tbody = document.getElementById("files-tbody");
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><p>Loading…</p></div></td></tr>`;
    try {
      const opts = {
        category: state.category,
        favoritesOnly: state.view === "favorites",
        trashOnly: state.view === "trash",
        search: state.search || undefined,
        sort: state.sort,
        page: state.page,
        pageSize: state.pageSize,
      };
      const { rows, total } = await VaultAPI.listFiles(opts);

      if (!rows.length) {
        tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/></svg>
          <h4>Nothing here yet</h4><p>Upload a file to get started.</p></div></td></tr>`;
      } else {
        tbody.innerHTML = rows.map(rowHtml).join("");
      }

      const from = total === 0 ? 0 : (state.page - 1) * state.pageSize + 1;
      const to = Math.min(state.page * state.pageSize, total);
      document.getElementById("pagination-info").textContent = `Showing ${from} to ${to} of ${total} files`;
      renderPagination(total);
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><h4>Couldn't load files</h4><p>${escapeHtml(err.message || "Unknown error")}</p></div></td></tr>`;
    }
  }

  function renderPagination(total) {
    const pages = Math.max(1, Math.ceil(total / state.pageSize));
    const wrap = document.getElementById("pagination-btns");
    let html = `<button ${state.page === 1 ? "disabled" : ""} data-pg="prev">‹</button>`;
    const add = (p) => `<button class="${p === state.page ? "active" : ""}" data-pg="${p}">${p}</button>`;
    if (pages <= 6) {
      for (let p = 1; p <= pages; p++) html += add(p);
    } else {
      html += add(1);
      if (state.page > 3) html += `<span style="color:var(--text-tertiary);padding:0 4px;">…</span>`;
      for (let p = Math.max(2, state.page - 1); p <= Math.min(pages - 1, state.page + 1); p++) html += add(p);
      if (state.page < pages - 2) html += `<span style="color:var(--text-tertiary);padding:0 4px;">…</span>`;
      html += add(pages);
    }
    html += `<button ${state.page === pages ? "disabled" : ""} data-pg="next">›</button>`;
    wrap.innerHTML = html;
    wrap.querySelectorAll("button[data-pg]").forEach(btn => btn.addEventListener("click", () => {
      const v = btn.dataset.pg;
      if (v === "prev") state.page = Math.max(1, state.page - 1);
      else if (v === "next") state.page = Math.min(pages, state.page + 1);
      else state.page = parseInt(v, 10);
      loadFiles();
    }));
  }

  async function refreshAll() {
    await Promise.all([loadStats(), loadFiles(), loadRecentUploads(), loadActivity()]);
  }

  /* ---------------- Row actions ---------------- */
  document.getElementById("files-tbody").addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const tr = btn.closest("tr");
    const id = tr?.dataset.id;
    if (!id) return;
    const { rows } = await VaultAPI.listFiles({ trashOnly: state.view === "trash", category: state.category, sort: state.sort, page: state.page, pageSize: state.pageSize, search: state.search, favoritesOnly: state.view === "favorites" });
    const file = rows.find(f => f.id === id);
    if (!file) return;

    if (btn.dataset.action === "download") {
      try {
        const url = await VaultAPI.getDownloadUrl(file);
        window.open(url, "_blank");
      } catch { UI.toast("Couldn't generate a download link.", "error"); }
    }
    if (btn.dataset.action === "restore") {
      await VaultAPI.restoreFile(file); UI.toast(`"${file.name}" restored`, "success"); refreshAll();
    }
    if (btn.dataset.action === "purge") {
      const ok = await UI.confirmDialog({ title: "Delete permanently?", body: `"${file.name}" will be permanently deleted. This action cannot be undone.`, confirmLabel: "Delete permanently", danger: true });
      if (ok) { await VaultAPI.deletePermanently(file); UI.toast("File permanently deleted", "success"); refreshAll(); }
    }
    if (btn.dataset.action === "menu") {
      openRowMenu(btn, file);
    }
  });

  function openRowMenu(anchor, file) {
    document.querySelectorAll(".row-menu-pop").forEach(m => m.remove());
    const rect = anchor.getBoundingClientRect();
    const menu = document.createElement("div");
    menu.className = "row-menu-pop";
    Object.assign(menu.style, {
      position: "fixed", top: rect.bottom + 6 + "px", left: (rect.right - 190) + "px",
      background: "var(--bg-elevated)", border: "1px solid var(--border-strong)", borderRadius: "10px",
      padding: "6px", width: "190px", zIndex: 150, boxShadow: "var(--shadow-soft)",
    });
    const items = [
      ["Preview", "preview"], ["Rename", "rename"], [file.is_favorite ? "Remove Favorite" : "Add to Favorites", "fav"],
      ["Share", "share"], ["Move to Trash", "trash"],
    ];
    menu.innerHTML = items.map(([label, act]) =>
      `<button data-act="${act}" style="display:block;width:100%;text-align:left;background:none;border:none;color:var(--text-primary);padding:8px 10px;border-radius:7px;font-size:13px;cursor:pointer;">${label}</button>`
    ).join("");
    document.body.appendChild(menu);
    menu.querySelectorAll("button").forEach(b => b.style.setProperty("--h", "1"));
    menu.addEventListener("mouseover", e => { const b = e.target.closest("button"); if (b) b.style.background = "var(--bg-surface-2)"; });
    menu.addEventListener("mouseout", e => { const b = e.target.closest("button"); if (b) b.style.background = "none"; });

    menu.addEventListener("click", async (e) => {
      const b = e.target.closest("button[data-act]");
      if (!b) return;
      const act = b.dataset.act;
      menu.remove();
      if (act === "preview") {
        try { const url = await VaultAPI.getSignedUrl(file, 120); window.open(url, "_blank"); }
        catch { UI.toast("Preview unavailable.", "error"); }
      }
      if (act === "rename") {
        const name = prompt("Rename file", file.name);
        if (name && name.trim() && name !== file.name) { await VaultAPI.renameFile(file, name.trim()); UI.toast("File renamed", "success"); refreshAll(); }
      }
      if (act === "fav") { await VaultAPI.toggleFavorite(file); refreshAll(); }
      if (act === "share") {
        const hours = parseInt(prompt("Link expires in how many hours?", "24") || "24", 10);
        try { const link = await VaultAPI.createShareLink(file, { expiresInHours: hours || 24 }); await navigator.clipboard.writeText(link).catch(() => {}); UI.toast("Share link copied to clipboard", "success"); }
        catch { UI.toast("Couldn't create share link.", "error"); }
      }
      if (act === "trash") {
        const ok = await UI.confirmDialog({ title: "Move to Trash?", body: `"${file.name}" will be moved to Trash.`, confirmLabel: "Move to Trash", danger: true });
        if (ok) { await VaultAPI.moveToTrash(file); UI.toast("Moved to Trash", "success"); refreshAll(); }
      }
    });
    setTimeout(() => document.addEventListener("click", function close(ev) {
      if (!menu.contains(ev.target)) { menu.remove(); document.removeEventListener("click", close); }
    }), 0);
  }

  /* ---------------- Toolbar wiring ---------------- */
  document.getElementById("filter-category").value = state.category !== "all" ? state.category : "all";
  document.getElementById("filter-category").addEventListener("change", (e) => { state.category = e.target.value; state.page = 1; loadFiles(); });
  document.getElementById("filter-sort").addEventListener("change", (e) => { state.sort = e.target.value; state.page = 1; loadFiles(); });
  document.getElementById("clear-filters-btn").addEventListener("click", () => {
    state.category = "all"; state.sort = "newest"; state.search = "";
    document.getElementById("filter-category").value = "all";
    document.getElementById("filter-sort").value = "newest";
    document.getElementById("global-search").value = "";
    state.page = 1; loadFiles();
  });

  let searchDebounce;
  document.getElementById("global-search").addEventListener("input", (e) => {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => { state.search = e.target.value.trim(); state.page = 1; loadFiles(); }, 300);
  });

  document.getElementById("select-all").addEventListener("change", (e) => {
    document.querySelectorAll(".file-check").forEach(c => c.checked = e.target.checked);
  });

  document.querySelectorAll("[data-view-link]").forEach(a => a.addEventListener("click", () => {
    window.location.href = `dashboard.html?view=${a.dataset.viewLink === "activity" ? "recent" : a.dataset.viewLink}`;
  }));

  /* ---------------- Upload dropzone toggle + wiring ---------------- */
  const dropzone = document.getElementById("dropzone");
  document.getElementById("upload-trigger-btn").addEventListener("click", () => dropzone.classList.toggle("hidden"));
  Upload.wireDropzone({
    dropzoneEl: dropzone,
    inputEl: document.getElementById("file-input"),
    queueEl: document.getElementById("upload-queue"),
    category: state.category !== "all" ? state.category : "Miscellaneous",
    onDone: () => refreshAll(),
  });

  document.getElementById("storage-details-btn").addEventListener("click", () => window.location.href = "settings.html#storage");

  refreshAll();
})();
