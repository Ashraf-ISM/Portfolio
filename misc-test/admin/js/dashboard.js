(function () {
  function updateOverview() {
    const totalFiles = document.getElementById('totalFilesStat');
    const storageUsed = document.getElementById('storageStat');
    const recentUploads = document.getElementById('recentUploadsStat');
    const favoriteStat = document.getElementById('favoriteStat');
    const storageValue = document.getElementById('storageValue');
    const storageText = document.getElementById('storageText');
    const storageBar = document.getElementById('storageBar');
    const ringPercent = document.getElementById('ringPercent');

    const total = 128;
    const used = 2.45;
    const available = 10;
    const percent = (used / available) * 100;

    if (totalFiles) totalFiles.textContent = total;
    if (storageUsed) storageUsed.textContent = `${used.toFixed(2)} GB`;
    if (recentUploads) recentUploads.textContent = 12;
    if (favoriteStat) favoriteStat.textContent = 8;
    if (storageValue) storageValue.textContent = `${used.toFixed(2)} GB`;
    if (storageText) storageText.textContent = `${percent.toFixed(1)}% used`;
    if (storageBar) storageBar.style.width = `${percent}%`;
    if (ringPercent) ringPercent.textContent = `${percent.toFixed(1)}%`;

    const usedLegend = document.getElementById('usedStorageLegend');
    const freeLegend = document.getElementById('freeStorageLegend');
    if (usedLegend) usedLegend.textContent = `${used.toFixed(2)} GB`;
    if (freeLegend) freeLegend.textContent = `${(available - used).toFixed(2)} GB`;

    const recentList = document.getElementById('recentUploadsList');
    if (recentList) {
      recentList.innerHTML = [
        { name: 'Project_Report.pdf', time: '1 hour ago' },
        { name: 'Dataset_2024.xlsx', time: '3 hours ago' },
        { name: 'Petrophysics_Notes.pdf', time: '5 hours ago' },
        { name: 'Seismic_Section.png', time: '1 day ago' }
      ].map((item) => `
        <li>
          <span class="small-badge">📄</span>
          <div>
            <strong>${item.name}</strong>
            <small>${item.time}</small>
          </div>
        </li>
      `).join('');
    }
  }

  function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const toggle = document.getElementById('mobileToggle');
    if (!sidebar || !toggle) return;

    toggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });
  }

  function switchViews() {
    const navItems = document.querySelectorAll('.nav-item');
    const views = {
      dashboard: document.getElementById('dashboardView'),
      files: document.getElementById('filesView'),
      favorites: document.getElementById('favoritesView'),
      settings: document.getElementById('settingsView')
    };

    navItems.forEach((button) => {
      button.addEventListener('click', () => {
        navItems.forEach((item) => item.classList.remove('active'));
        button.classList.add('active');
        const target = button.dataset.view;
        Object.entries(views).forEach(([viewName, element]) => {
          if (element) {
            element.classList.toggle('active', viewName === target);
          }
        });

        const crumb = document.querySelector('.crumb');
        if (crumb) {
          const labels = { dashboard: 'Dashboard / My Files', files: 'Dashboard / My Files', favorites: 'Dashboard / Favorites', settings: 'Dashboard / Settings' };
          crumb.textContent = labels[target] || 'Dashboard / My Files';
        }
      });
    });
  }

  function initUploadLauncher() {
    const uploadLauncher = document.getElementById('uploadLauncher');
    const browseUploadBtn = document.getElementById('browseUploadBtn');
    const fileInput = document.getElementById('fileInput');

    [uploadLauncher, browseUploadBtn].forEach((button) => {
      if (!button) return;
      button.addEventListener('click', () => {
        if (fileInput) fileInput.click();
      });
    });
  }

  function initDashboard() {
    updateOverview();
    toggleSidebar();
    switchViews();
    initUploadLauncher();

    const client = window.AdminSupabase && window.AdminSupabase.getClient ? window.AdminSupabase.getClient() : null;
    if (!client) return;

    client.auth.getSession().then(({ data }) => {
      if (!data.session) {
        window.location.href = '/admin/login.html';
      }
    }).catch(() => {
      window.location.href = '/admin/login.html';
    });
  }

  window.AdminDashboard = {
    initDashboard
  };
})();
