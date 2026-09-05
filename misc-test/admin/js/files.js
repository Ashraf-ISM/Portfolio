(function () {
  const state = {
    files: [],
    filtered: [],
    favoritesOnly: false,
    listView: false,
    category: 'all',
    searchTerm: '',
    sort: 'newest'
  };

  function formatBytes(bytes) {
    if (!bytes && bytes !== 0) return '0 KB';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    let value = bytes;
    let index = 0;

    while (value >= 1024 && index < sizes.length - 1) {
      value /= 1024;
      index += 1;
    }

    return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${sizes[index]}`;
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function getFileTypeBadge(name) {
    const ext = (name || '').split('.').pop()?.toLowerCase();
    if (['pdf'].includes(ext)) return 'pdf';
    if (['doc', 'docx', 'rtf'].includes(ext)) return 'doc';
    if (['xls', 'xlsx', 'csv'].includes(ext)) return 'xls';
    if (['ppt', 'pptx'].includes(ext)) return 'ppt';
    if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)) return 'img';
    if (['zip', 'rar', 'gz'].includes(ext)) return 'zip';
    return 'txt';
  }

  function applySearchFilter() {
    const term = state.searchTerm.trim().toLowerCase();
    const category = state.category;

    let filtered = [...state.files];

    if (state.favoritesOnly) {
      filtered = filtered.filter((file) => file.is_favorite);
    }

    if (term) {
      filtered = filtered.filter((file) => {
        const haystack = [
          file.name,
          file.category,
          file.mime_type,
          (file.tags || []).join(' ')
        ].join(' ').toLowerCase();
        return haystack.includes(term);
      });
    }

    if (category !== 'all') {
      filtered = filtered.filter((file) => file.category === category);
    }

    switch (state.sort) {
      case 'name-asc':
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name-desc':
        filtered.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'largest':
        filtered.sort((a, b) => (b.size || 0) - (a.size || 0));
        break;
      case 'smallest':
        filtered.sort((a, b) => (a.size || 0) - (b.size || 0));
        break;
      case 'oldest':
        filtered.sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
        break;
      default:
        filtered.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    }

    state.filtered = filtered;
    renderFiles();
  }

  function renderFiles() {
    const grid = document.getElementById('filesGrid');
    const favoritesGrid = document.getElementById('favoritesGrid');
    const recentTable = document.getElementById('recentFilesTable');

    if (!grid && !favoritesGrid && !recentTable) return;

    const list = state.filtered.slice(0, 50);

    if (grid) {
      if (!list.length) {
        grid.innerHTML = '<div class="panel" style="grid-column: 1 / -1;">No files found.</div>';
        return;
      }

      grid.innerHTML = list.map((file) => `
        <article class="file-card">
          <div class="file-card top">
            <span class="file-badge ${getFileTypeBadge(file.name)}">${(file.name || 'F').slice(0, 2).toUpperCase()}</span>
            <button class="action-icon" data-action="favorite" data-id="${file.id}" aria-label="Toggle favorite">${file.is_favorite ? '★' : '☆'}</button>
          </div>

          <div>
            <div class="file-name">${escapeHtml(file.name)}</div>
            <div class="file-meta">
              <span>${escapeHtml(file.category || 'Miscellaneous')}</span>
              <span>${formatBytes(file.size)}</span>
            </div>
          </div>

          <div class="file-actions">
            <button data-action="preview" data-id="${file.id}">Preview</button>
            <button data-action="download" data-id="${file.id}">Download</button>
          </div>
        </article>
      `).join('');
    }

    if (favoritesGrid) {
      const favoriteList = state.files.filter((file) => file.is_favorite);
      favoritesGrid.innerHTML = favoriteList.length
        ? favoriteList.map((file) => `
          <article class="file-card">
            <div class="file-card top">
              <span class="file-badge ${getFileTypeBadge(file.name)}">${(file.name || 'F').slice(0, 2).toUpperCase()}</span>
              <button class="action-icon" data-action="favorite" data-id="${file.id}">${file.is_favorite ? '★' : '☆'}</button>
            </div>
            <div class="file-name">${escapeHtml(file.name)}</div>
            <div class="file-meta"><span>${escapeHtml(file.category || 'Miscellaneous')}</span><span>${formatBytes(file.size)}</span></div>
          </article>
        `).join('')
        : '<div class="panel" style="grid-column:1 / -1;">No favorite files yet.</div>';
    }

    if (recentTable) {
      recentTable.innerHTML = list.slice(0, 6).map((file) => `
        <tr>
          <td>
            <div class="name-cell">
              <span class="file-badge ${getFileTypeBadge(file.name)}">${(file.name || 'F').slice(0, 2).toUpperCase()}</span>
              <span>${escapeHtml(file.name)}</span>
            </div>
          </td>
          <td>${(file.mime_type || 'File').split('/')[1]?.toUpperCase() || 'FILE'}</td>
          <td><span class="tag-pill">${escapeHtml(file.category || 'Miscellaneous')}</span></td>
          <td>${formatBytes(file.size)}</td>
          <td>${file.updated_at ? new Date(file.updated_at).toLocaleDateString() : 'Today'}</td>
          <td>
            <div class="actions-cell">
              <button class="action-icon" data-action="preview" data-id="${file.id}">◉</button>
              <button class="action-icon" data-action="download" data-id="${file.id}">↓</button>
            </div>
          </td>
        </tr>
      `).join('');
    }
  }

  async function loadDemoFiles() {
    const demoFiles = [
      { id: '1', name: 'Resume_2026.pdf', category: 'Career', mime_type: 'application/pdf', size: 1850000, is_favorite: true, created_at: '2026-09-05T07:20:00Z', updated_at: '2026-09-05T07:20:00Z', tags: ['cv', 'career'] },
      { id: '2', name: 'MSc_Thesis.pdf', category: 'Research', mime_type: 'application/pdf', size: 8400000, is_favorite: false, created_at: '2026-09-04T09:30:00Z', updated_at: '2026-09-04T09:30:00Z', tags: ['thesis', 'geophysics'] },
      { id: '3', name: 'Python_Certificate.pdf', category: 'Certificates', mime_type: 'application/pdf', size: 2100000, is_favorite: true, created_at: '2026-09-02T12:00:00Z', updated_at: '2026-09-02T12:00:00Z', tags: ['python', 'certificate'] },
      { id: '4', name: 'Seismic_Interpretation_Example.png', category: 'Research', mime_type: 'image/png', size: 3600000, is_favorite: false, created_at: '2026-08-31T15:10:00Z', updated_at: '2026-08-31T15:10:00Z', tags: ['seismic', 'image'] },
      { id: '5', name: 'Internship_Letter.pdf', category: 'Career', mime_type: 'application/pdf', size: 1200000, is_favorite: false, created_at: '2026-08-27T10:00:00Z', updated_at: '2026-08-27T10:00:00Z', tags: ['internship'] },
      { id: '6', name: 'Field_Data.xlsx', category: 'Geophysics', mime_type: 'application/vnd.ms-excel', size: 5100000, is_favorite: false, created_at: '2026-08-22T18:00:00Z', updated_at: '2026-08-22T18:00:00Z', tags: ['log', 'field'] }
    ];

    state.files = demoFiles;
    state.filtered = [...demoFiles];
    applySearchFilter();
    populateCategoryOptions();
  }

  function populateCategoryOptions() {
    const filter = document.getElementById('categoryFilter');
    if (!filter) return;

    const categories = ['all', ...new Set(state.files.map((file) => file.category || 'Miscellaneous'))];
    filter.innerHTML = categories.map((category) => `
      <option value="${category}">${category === 'all' ? 'All Categories' : category}</option>
    `).join('');
    filter.value = state.category;
  }

  function attachControls() {
    const searchInput = document.getElementById('globalSearch');
    if (searchInput) {
      searchInput.addEventListener('input', (event) => {
        state.searchTerm = event.target.value || '';
        applySearchFilter();
      });
    }

    const categoryFilter = document.getElementById('categoryFilter');
    if (categoryFilter) {
      categoryFilter.addEventListener('change', (event) => {
        state.category = event.target.value;
        applySearchFilter();
      });
    }

    const sortFilter = document.getElementById('sortFilter');
    if (sortFilter) {
      sortFilter.addEventListener('change', (event) => {
        state.sort = event.target.value;
        applySearchFilter();
      });
    }

    const toggleList = document.getElementById('toggleListView');
    if (toggleList) {
      toggleList.addEventListener('click', () => {
        state.listView = !state.listView;
        toggleList.textContent = state.listView ? 'Grid View' : 'List View';
        renderFiles();
      });
    }

    document.addEventListener('click', async (event) => {
      const actionTarget = event.target.closest('[data-action]');
      if (!actionTarget) return;

      const action = actionTarget.getAttribute('data-action');
      const id = actionTarget.getAttribute('data-id');
      const file = state.files.find((item) => item.id === id);
      if (!file) return;

      if (action === 'favorite') {
        file.is_favorite = !file.is_favorite;
        applySearchFilter();
      }

      if (action === 'preview') {
        alert(`Preview: ${file.name}`);
      }

      if (action === 'download') {
        alert(`Download: ${file.name}`);
      }
    });
  }

  function initialize() {
    attachControls();
    loadDemoFiles();
  }

  window.AdminFiles = {
    initialize,
    updateSearch: (term) => {
      state.searchTerm = term;
      applySearchFilter();
    },
    setCategory: (category) => {
      state.category = category;
      applySearchFilter();
    },
    setSort: (sort) => {
      state.sort = sort;
      applySearchFilter();
    },
    getFiles: () => state.files
  };

  document.addEventListener('DOMContentLoaded', initialize);
})();
