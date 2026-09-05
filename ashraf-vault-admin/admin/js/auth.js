/**
 * Authentication — Supabase Auth only. No credentials are ever hardcoded
 * or stored client-side; Supabase manages the session token (in a secure,
 * httpOnly-equivalent local session store) and refreshes it automatically.
 */
const Auth = (() => {

  /** Redirect unauthenticated visitors away from protected pages. Call at
   *  the top of every protected page. Resolves with the session's user. */
  async function requireAuth() {
    const { data: { session }, error } = await window.sb.auth.getSession();
    if (error || !session) {
      window.location.href = "login.html";
      return null;
    }
    // keep session fresh; if the refresh fails, bounce to login
    window.sb.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT" || event === "TOKEN_REFRESH_FAILED") {
        window.location.href = "login.html?expired=1";
      }
    });
    return session.user;
  }

  /** If already logged in on the login page, skip straight to the dashboard. */
  async function redirectIfAuthed() {
    const { data: { session } } = await window.sb.auth.getSession();
    if (session) window.location.href = "dashboard.html";
  }

  async function signIn(email, password) {
    return window.sb.auth.signInWithPassword({ email, password });
  }

  async function signOut() {
    await window.sb.auth.signOut();
    window.location.href = "login.html";
  }

  async function requestPasswordReset(email) {
    const redirectTo = window.location.origin + window.location.pathname.replace(/login\.html.*/, "reset-password.html");
    return window.sb.auth.resetPasswordForEmail(email, { redirectTo });
  }

  async function updatePassword(newPassword) {
    return window.sb.auth.updateUser({ password: newPassword });
  }

  async function currentUser() {
    const { data: { user } } = await window.sb.auth.getUser();
    return user;
  }

  return { requireAuth, redirectIfAuthed, signIn, signOut, requestPasswordReset, updatePassword, currentUser };
})();

/* ---------------------------------------------------------------------
   Login form wiring (only runs if the login form exists on this page)
--------------------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("login-form");
  if (!form) return;

  Auth.redirectIfAuthed();

  const params = new URLSearchParams(window.location.search);
  if (params.get("expired") === "1") {
    showAlert("Your session expired. Please sign in again.");
  }

  const emailField = document.getElementById("email");
  const pwField = document.getElementById("password");
  const btn = document.getElementById("signin-btn");
  const alertBox = document.getElementById("form-alert");

  function showAlert(msg) {
    alertBox.textContent = msg;
    alertBox.classList.add("show");
    alertBox.classList.add("error");
  }
  function clearAlert() {
    alertBox.classList.remove("show");
  }
  function setFieldError(field, msg) {
    const wrap = field.closest(".field");
    wrap.classList.add("has-error");
    wrap.querySelector(".field-error").textContent = msg;
  }
  function clearFieldErrors() {
    form.querySelectorAll(".field").forEach(f => f.classList.remove("has-error"));
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearAlert();
    clearFieldErrors();

    const email = emailField.value.trim();
    const password = pwField.value;
    let hasError = false;

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      setFieldError(emailField, "Enter a valid email address.");
      hasError = true;
    }
    if (!password) {
      setFieldError(pwField, "Password is required.");
      hasError = true;
    }
    if (hasError) return;

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Signing in…';

    try {
      const { error } = await Auth.signIn(email, password);
      if (error) {
        // Never reveal whether the account exists — one generic message.
        if (error.message.toLowerCase().includes("network")) {
          showAlert("Network error. Check your connection and try again.");
        } else {
          showAlert("Incorrect email or password.");
        }
        btn.disabled = false;
        btn.innerHTML = "Sign In Securely";
        return;
      }
      window.location.href = "dashboard.html";
    } catch (err) {
      showAlert("Something went wrong. Please try again.");
      btn.disabled = false;
      btn.innerHTML = "Sign In Securely";
    }
  });

  const forgot = document.getElementById("forgot-link");
  if (forgot) {
    forgot.addEventListener("click", async (e) => {
      e.preventDefault();
      const email = emailField.value.trim();
      if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
        setFieldError(emailField, "Enter your email above first, then click 'Forgot password?' again.");
        return;
      }
      const { error } = await Auth.requestPasswordReset(email);
      alertBox.classList.remove("error");
      alertBox.classList.add("show");
      alertBox.style.background = "rgba(52,211,153,0.1)";
      alertBox.style.borderColor = "rgba(52,211,153,0.3)";
      alertBox.style.color = "#5be0ac";
      alertBox.textContent = error
        ? "If that email has an account, a reset link has been sent."
        : "Password reset link sent — check your inbox.";
    });
  }

  const pwToggle = document.getElementById("pw-toggle");
  if (pwToggle) {
    pwToggle.addEventListener("click", () => {
      pwField.type = pwField.type === "password" ? "text" : "password";
    });
  }
});

/* Logout buttons anywhere in the app */
document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-action='logout']");
  if (btn) {
    e.preventDefault();
    Auth.signOut();
  }
});
