(async function () {
  const user = await Auth.requireAuth();
  if (!user) return;

  document.getElementById("profile-email").textContent = user.email;
  document.getElementById("profile-created").textContent = new Date(user.created_at).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });

  document.getElementById("pw-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const pw = document.getElementById("new-pw").value;
    if (pw.length < 8) { UI.toast("Password must be at least 8 characters.", "error"); return; }
    const { error } = await Auth.updatePassword(pw);
    if (error) UI.toast("Couldn't update password: " + error.message, "error");
    else { UI.toast("Password updated", "success"); document.getElementById("new-pw").value = ""; }
  });

  document.getElementById("signout-all-btn").addEventListener("click", async () => {
    const ok = await UI.confirmDialog({ title: "Sign out everywhere?", body: "This ends every active session, including this one.", confirmLabel: "Sign out all" });
    if (!ok) return;
    await window.sb.auth.signOut({ scope: "global" });
    window.location.href = "login.html";
  });

  const s = await VaultAPI.stats();
  const entries = Object.entries(s.byCategory).sort((a, b) => b[1] - a[1]);
  document.getElementById("storage-breakdown").innerHTML = entries.length
    ? entries.map(([cat, count]) => `
        <div class="settings-row">
          <div class="lbl">${cat}</div>
          <div class="desc">${count} file${count === 1 ? "" : "s"}</div>
        </div>`).join("")
    : '<p style="color:var(--text-tertiary);font-size:13px;">No files yet.</p>';
})();
