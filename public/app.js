const searchForm = document.getElementById('search-form');
const searchInput = document.getElementById('search-input');
const modelGrid = document.getElementById('model-grid');
const loading = document.getElementById('loading');
const errorDiv = document.getElementById('error');
const emptyDiv = document.getElementById('empty');
const resultCount = document.getElementById('result-count');
const sortSelect = document.getElementById('sort-select');

const PLATFORM_COLORS = {
  Printables: 'printables',
  MakerWorld: 'makerworld',
  Thingiverse: 'thingiverse',
  Cults3D: 'cults3d',
  MyMiniFactory: 'myminifactory'
};

let lastResults = [];

searchForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const query = searchInput.value.trim();
  if (!query) return;
  await doSearch(query);
});

sortSelect.addEventListener('change', () => {
  renderResults(lastResults);
});

async function doSearch(query) {
  const platforms = {};
  document.querySelectorAll('.platform-toggle input').forEach(cb => {
    platforms[cb.dataset.platform] = cb.checked;
  });

  const params = new URLSearchParams({ q: query });
  if (!platforms.Printables) params.set('printables', '0');
  if (!platforms.MakerWorld) params.set('makerworld', '0');
  if (!platforms.Thingiverse) params.set('thingiverse', '0');
  if (!platforms.Cults3D) params.set('cults3d', '0');
  if (!platforms.MyMiniFactory) params.set('myminifactory', '0');

  loading.classList.remove('hidden');
  errorDiv.classList.add('hidden');
  emptyDiv.classList.add('hidden');
  modelGrid.innerHTML = '';
  resultCount.textContent = '';

  try {
    const resp = await fetch(`/api/search?${params}`);
    const data = await resp.json();
    lastResults = data.models || [];
    renderResults(lastResults);
  } catch (err) {
    errorDiv.textContent = '搜索失败: ' + err.message;
    errorDiv.classList.remove('hidden');
  } finally {
    loading.classList.add('hidden');
  }
}

function renderResults(models) {
  if (models.length === 0) {
    emptyDiv.classList.remove('hidden');
    emptyDiv.innerHTML = '<p>没有找到结果，试试其他关键词</p>';
    modelGrid.innerHTML = '';
    resultCount.textContent = '';
    return;
  }
  emptyDiv.classList.add('hidden');

  const sortBy = sortSelect.value;
  let sorted = [...models];
  if (sortBy === 'title') sorted.sort((a, b) => a.title.localeCompare(b.title));
  else if (sortBy === 'likes') sorted.sort((a, b) => (b.likes || 0) - (a.likes || 0));
  else if (sortBy === 'downloads') sorted.sort((a, b) => (b.downloads || 0) - (a.downloads || 0));

  resultCount.textContent = `共 ${sorted.length} 个结果`;
  modelGrid.innerHTML = sorted.map(model => {
    if (model.url && model.title && model.title.startsWith(model.source + ':')) {
      return `<div class="model-card"><div class="card-error">${model.title}<br><a href="${model.url}" target="_blank" style="color:#0f3460">去 ${model.source} 搜索 →</a></div></div>`;
    }
    const sourceClass = PLATFORM_COLORS[model.source] || '';
    return `<div class="model-card">
      <div class="card-img">
        ${model.image ? `<img src="${model.image}" alt="${model.title}" loading="lazy" onerror="this.parentElement.innerHTML='<span class=\\'no-img\\'>📦</span>'">` : `<span class="no-img">📦</span>`}
      </div>
      <div class="card-body">
        <div class="card-title"><a href="${model.url}" target="_blank" rel="noopener">${model.title}</a></div>
        <div class="card-meta">
          <span class="source-badge source-${sourceClass}">${model.source}</span>
          ${model.author ? `<span style="font-size:0.8em;color:#888">by ${model.author}</span>` : ''}
        </div>
        ${model.description ? `<p style="font-size:0.8em;color:#888;margin-bottom:8px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${model.description}</p>` : ''}
        <div class="card-stats">
          ${model.likes ? `<span>❤️ ${model.likes}</span>` : ''}
          ${model.downloads ? `<span>⬇️ ${model.downloads}</span>` : ''}
        </div>
        <div class="card-action">
          <a href="${model.url}" target="_blank" rel="noopener">查看详情</a>
        </div>
      </div>
    </div>`;
  }).join('');
}

searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') searchForm.dispatchEvent(new Event('submit'));
});
