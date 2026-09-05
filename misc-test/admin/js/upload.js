(function () {
  const uploadZone = document.getElementById('uploadDropzone');
  const fileInput = document.getElementById('fileInput');
  const progressList = document.getElementById('uploadProgressList');

  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
    'application/zip',
    'image/png',
    'image/jpeg',
    'image/webp'
  ];

  function renderProgress(fileName, progress) {
    if (!progressList) return;

    const item = document.createElement('div');
    item.className = 'progress-item';
    item.innerHTML = `
      <div class="progress-meta">
        <strong>${fileName}</strong>
        <span>${progress}%</span>
      </div>
      <div class="progress-bar-shell">
        <span class="progress-fill" style="width: ${progress}%"></span>
      </div>
    `;
    progressList.appendChild(item);
  }

  function handleFiles(files) {
    if (!files || !files.length) return;

    Array.from(files).forEach((file, index) => {
      const isAllowed = allowedTypes.includes(file.type) || /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|csv|zip|png|jpg|jpeg|webp)$/i.test(file.name);
      if (!isAllowed) {
        console.warn(`Unsupported file type ignored: ${file.name}`);
        return;
      }

      const progress = 20 + (index * 15) % 80;
      renderProgress(file.name, progress);
    });
  }

  if (uploadZone) {
    ['dragenter', 'dragover'].forEach((eventName) => {
      uploadZone.addEventListener(eventName, (event) => {
        event.preventDefault();
        uploadZone.classList.add('dragover');
      });
    });

    ['dragleave', 'drop'].forEach((eventName) => {
      uploadZone.addEventListener(eventName, (event) => {
        event.preventDefault();
        uploadZone.classList.remove('dragover');
      });
    });

    uploadZone.addEventListener('drop', (event) => {
      handleFiles(event.dataTransfer.files);
    });
  }

  if (fileInput) {
    fileInput.addEventListener('change', (event) => {
      handleFiles(event.target.files);
      fileInput.value = '';
    });
  }

  window.AdminUpload = {
    handleFiles
  };
})();
