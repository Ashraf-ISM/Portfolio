/* Shared shell behaviour + small UI helpers used across every admin page. */

const UI = (() => {
  function toast(message, type = "info") {
    const stack = document.getElementById("toast-stack");
    if (!stack) return;
    const icons = {
      success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6 9 17l-5-5"/></svg>',
      error:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>',
      info:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>'
    };
    const el = document.createElement("div");
    el.className = `toast ${type}`;
    el.innerHTML = `${icons[type] || icons.info}<span>${message}</span>`;
    stack.appendChild(el);
    setTimeout(() => { el.style.opacity = "0"; el.style.transition = "opacity .25s"; setTimeout(() => el.remove(), 250); }, 3800);
  }

  function confirmDialog({ title, body, confirmLabel = "Confirm", danger = false }) {
    return new Promise((resolve) => {
      const backdrop = document.getElementById("confirm-modal");
      backdrop.querySelector("h3").textContent = title;
      backdrop.querySelector("p").textContent = body;
      const okBtn = backdrop.querySelector("[data-confirm-ok]");
      okBtn.className = "btn " + (danger ? "btn-danger" : "btn-primary");
      okBtn.textContent = confirmLabel;
      backdrop.classList.add("show");

      function cleanup(result) {
        backdrop.classList.remove("show");
        okBtn.removeEventListener("click", onOk);
        cancelBtn.removeEventListener("click", onCancel);
        resolve(result);
      }
      function onOk() { cleanup(true); }
      function onCancel() { cleanup(false); }
      const cancelBtn = backdrop.querySelector("[data-confirm-cancel]");
      okBtn.addEventListener("click", onOk);
      cancelBtn.addEventListener("click", onCancel);
    });
  }

  function formatBytes(bytes) {
    if (!bytes || bytes <= 0) return "0 B";
    const units = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
  }

  function timeAgo(dateStr) {
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hour${Math.floor(diff/3600)>1?"s":""} ago`;
    if (diff < 172800) return "Yesterday";
    if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`;
    return new Date(dateStr).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  function extOf(name) { return (name.split(".").pop() || "").toLowerCase(); }

  function fileIconClass(name) {
    const e = extOf(name);
    if (e === "pdf") return "pdf";
    if (["doc", "docx", "txt"].includes(e)) return "doc";
    if (["png", "jpg", "jpeg", "webp"].includes(e)) return "img";
    if (["ppt", "pptx"].includes(e)) return "ppt";
    if (["xls", "xlsx", "csv"].includes(e)) return "xls";
    if (e === "zip") return "zip";
    return "other";
  }

  function fileIconGlyph(name) {
    const e = extOf(name);
    const map = { pdf: "PDF", doc: "DOC", docx: "DOC", txt: "TXT", ppt: "PPT", pptx: "PPT",
      xls: "XLS", xlsx: "XLS", csv: "CSV", zip: "ZIP", png: "IMG", jpg: "IMG", jpeg: "IMG", webp: "IMG" };
    return map[e] || "FILE";
  }

  function categoryBadgeClass(cat) {
    const key = (cat || "misc").toLowerCase().replace(/[^a-z]/g, "");
    const known = ["research","academic","certificates","career","projects","geophysics","personal","finance","training"];
    return known.includes(key) ? `b-${key}` : "b-misc";
  }

  return { toast, confirmDialog, formatBytes, timeAgo, extOf, fileIconClass, fileIconGlyph, categoryBadgeClass };
})();

/* ---------------------------------------------------------------------
   Shell: sidebar collapse / mobile drawer / topbar profile / notifications
--------------------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  const sidebar = document.getElementById("sidebar");
  const collapseBtn = document.getElementById("collapse-sidebar");
  const menuBtn = document.getElementById("mobile-menu-btn");
  const backdrop = document.getElementById("sidebar-backdrop");

  if (collapseBtn && sidebar) {
    collapseBtn.addEventListener("click", () => sidebar.classList.toggle("collapsed"));
  }
  if (menuBtn && sidebar && backdrop) {
    menuBtn.addEventListener("click", () => {
      sidebar.classList.add("mobile-open");
      backdrop.classList.add("show");
    });
    backdrop.addEventListener("click", () => {
      sidebar.classList.remove("mobile-open");
      backdrop.classList.remove("show");
    });
  }

  // keyboard shortcut: "/" or Ctrl+K focuses search
  const search = document.getElementById("global-search");
  document.addEventListener("keydown", (e) => {
    if ((e.key === "/" && document.activeElement.tagName !== "INPUT") ||
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k")) {
      e.preventDefault();
      search?.focus();
    }
  });

  // populate profile name/email/avatar from the session, once available
  window.sb?.auth.getUser().then(({ data }) => {
    const user = data?.user;
    if (!user) return;
    const label = (user.user_metadata?.full_name || user.email || "Admin").trim();
    const initials = label.split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase();
    document.querySelectorAll("[data-user-initials]").forEach(el => el.textContent = initials);
    document.querySelectorAll("[data-user-name]").forEach(el => el.textContent = label.split("@")[0]);
    document.querySelectorAll("[data-user-email]").forEach(el => el.textContent = user.email);
  });
});
