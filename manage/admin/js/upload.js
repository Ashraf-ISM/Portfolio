/**
 * Upload — validates files client-side, requests a Supabase signed upload
 * URL per file, then PUTs the bytes directly to Storage via XHR so we get
 * real byte-level progress events (the supabase-js SDK's own upload()
 * helper uses fetch, which has no upload-progress API).
 */
const Upload = (() => {
  function sanitizeName(name) {
    return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-140);
  }

  function validate(file) {
    const cfg = window.VAULT_CONFIG;
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    if (!cfg.ALLOWED_EXTENSIONS.includes(ext)) {
      return `"${file.name}" — .${ext} isn't an allowed file type.`;
    }
    if (file.size > cfg.MAX_FILE_SIZE_MB * 1024 * 1024) {
      return `"${file.name}" is over the ${cfg.MAX_FILE_SIZE_MB} MB limit.`;
    }
    // Extension is a hint, not proof — the browser-reported MIME type is a
    // second, independent signal checked here; Storage-side validation
    // should also be configured in Supabase (see README-ADMIN.md).
    return null;
  }

  function guessCategory() { return "Miscellaneous"; }

  async function uploadOne(file, category, onProgress) {
    const user_id = await VaultAPI.uid();
    const path = `${user_id}/${Date.now()}-${sanitizeName(file.name)}`;

    const { data: signed, error: signErr } = await window.sb.storage
      .from(window.VAULT_CONFIG.BUCKET)
      .createSignedUploadUrl(path);
    if (signErr) throw signErr;

    await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", signed.signedUrl);
      xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () => (xhr.status >= 200 && xhr.status < 300) ? resolve() : reject(new Error("Upload failed"));
      xhr.onerror = () => reject(new Error("Network error during upload"));
      xhr.send(file);
    });

    onProgress(100);
    return VaultAPI.insertFileRecord({
      name: file.name, storage_path: path, mime_type: file.type, size: file.size, category,
    });
  }

  function wireDropzone({ dropzoneEl, inputEl, queueEl, category = "Miscellaneous", onDone }) {
    function openPicker() { inputEl.click(); }
    dropzoneEl.addEventListener("click", openPicker);
    dropzoneEl.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") openPicker(); });

    ["dragenter", "dragover"].forEach(evt =>
      dropzoneEl.addEventListener(evt, (e) => { e.preventDefault(); dropzoneEl.classList.add("drag-over"); }));
    ["dragleave", "drop"].forEach(evt =>
      dropzoneEl.addEventListener(evt, (e) => { e.preventDefault(); dropzoneEl.classList.remove("drag-over"); }));
    dropzoneEl.addEventListener("drop", (e) => handleFiles(e.dataTransfer.files));
    inputEl.addEventListener("change", (e) => { handleFiles(e.target.files); inputEl.value = ""; });

    async function handleFiles(fileList) {
      const files = Array.from(fileList);
      for (const file of files) {
        const err = validate(file);
        const row = document.createElement("div");
        row.className = "upload-row";
        row.innerHTML = `
          <div class="file-ico ${UI.fileIconClass(file.name)}">${UI.fileIconGlyph(file.name)}</div>
          <div class="info">
            <b>${file.name}</b>
            <div class="upload-bar"><span style="width:0%"></span></div>
          </div>
          <div class="pct">0%</div>`;
        queueEl.prepend(row);

        if (err) {
          row.classList.add("error");
          row.querySelector(".pct").textContent = "Failed";
          row.querySelector(".upload-bar > span").style.background = "#f87171";
          UI.toast(err, "error");
          continue;
        }

        try {
          await uploadOne(file, category, (pct) => {
            row.querySelector(".upload-bar > span").style.width = pct + "%";
            row.querySelector(".pct").textContent = pct + "%";
          });
          row.classList.add("done");
          row.querySelector(".pct").textContent = "✓ Done";
          UI.toast(`"${file.name}" uploaded successfully`, "success");
          onDone && onDone();
        } catch (e) {
          row.classList.add("error");
          row.querySelector(".pct").textContent = "Failed";
          UI.toast(`Upload failed for "${file.name}"`, "error");
        }
      }
    }

    return { handleFiles };
  }

  return { wireDropzone, validate };
})();
