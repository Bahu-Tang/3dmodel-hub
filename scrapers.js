const axios = require('axios');
const cheerio = require('cheerio');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36';

function normalize(item, source) {
  return {
    title: item.title || item.name || '',
    source,
    url: item.url || '#',
    image: item.image || '',
    author: item.author || '',
    downloads: item.downloads || 0,
    likes: item.likes || 0,
    description: (item.description || item.summary || '').slice(0, 300),
  };
}

const API = axios.create({
  headers: { 'User-Agent': UA, 'Accept': 'application/json, text/html' },
  timeout: 15000,
  validateStatus: s => s < 500,
});

// ===== Printables (GraphQL API) =====
async function searchPrintables(query) {
  try {
    const r = await API.post('https://api2.printables.com/graphql', {
      query: `query Search($q:String!,$limit:Int){search(q:$q,first:$limit,order:POINTS){edges{node{id name summary likeCount downloadCount user{username} images{tiny url}}}}}`,
      variables: { q: query, limit: 20 }
    });
    const edges = r.data?.data?.search?.edges || [];
    return edges.map(e => normalize({
      title: e.node.name,
      url: `https://www.printables.com/model/${e.node.id}`,
      image: e.node.images?.[0]?.tiny || e.node.images?.[0]?.url || '',
      author: e.node.user?.username,
      likes: e.node.likeCount,
      downloads: e.node.downloadCount,
      description: e.node.summary,
    }, 'Printables'));
  } catch {
    try {
      const r = await API.get(`https://www.printables.com/search?q=${encodeURIComponent(query)}`);
      const $ = cheerio.load(r.data);
      const models = [];
      $('a[href*="/model/"]').each((i, el) => {
        const link = $(el), href = link.attr('href');
        if (!href || models.some(m => m.url.includes(href))) return;
        const title = link.find('h3').first().text().trim();
        const img = link.find('img').first().attr('src') || '';
        if (title && href.includes('/model/')) {
          models.push(normalize({ title, url: `https://www.printables.com${href}`, image: img.startsWith('http') ? img : `https:${img}` }, 'Printables'));
        }
      });
      return models.slice(0, 20);
    } catch {
      return [fallback('Printables', `https://www.printables.com/search?q=${encodeURIComponent(query)}`)];
    }
  }
}

// ===== MakerWorld =====
async function searchMakerWorld(query) {
  try {
    const r = await API.get(`https://makerworld.com/models?q=${encodeURIComponent(query)}`);
    const $ = cheerio.load(r.data);
    const models = [];
    const seen = new Set();
    $('a[href]').each((i, el) => {
      const link = $(el), href = link.attr('href');
      if (!href || seen.has(href)) return;
      const title = link.text().trim();
      const img = link.find('img').first().attr('src') || '';
      if (title && title.length > 5 && title.length < 200 && img && img.startsWith('http')) {
        seen.add(href);
        models.push(normalize({ title, url: href.startsWith('http') ? href : `https://makerworld.com${href}`, image: img }, 'MakerWorld'));
      }
    });
    return models.slice(0, 20);
  } catch {
    return [fallback('MakerWorld', `https://makerworld.com/models?q=${encodeURIComponent(query)}`)];
  }
}

// ===== Thingiverse =====
async function searchThingiverse(query) {
  try {
    const r = await API.get(`https://api.thingiverse.com/search/${encodeURIComponent(query)}?page=1&per_page=20`);
    const hits = r.data?.hits || r.data || [];
    if (!Array.isArray(hits)) throw new Error('bad data');
    return hits.map(item => normalize({
      title: item.name || item.title,
      url: `https://www.thingiverse.com/thing:${item.id}`,
      image: item.thumbnail || '',
      author: item.creator?.name || item.added_by_username || '',
      likes: item.like_count || 0,
      downloads: item.download_count || 0,
    }, 'Thingiverse'));
  } catch {
    try {
      const r = await API.get(`https://www.thingiverse.com/search?q=${encodeURIComponent(query)}`);
      const $ = cheerio.load(r.data);
      const models = [];
      $('a[href*="/thing:"]').each((i, el) => {
        const link = $(el), href = link.attr('href');
        if (!href || models.some(m => m.url.includes(href))) return;
        const title = link.text().trim() || link.attr('title');
        const img = $(el).closest('.card,div').find('img').first().attr('src') || '';
        if (title) models.push(normalize({ title, url: href.startsWith('http') ? href : `https://www.thingiverse.com${href}`, image: img.startsWith('http') ? img : '' }, 'Thingiverse'));
      });
      return models.slice(0, 20);
    } catch {
      return [fallback('Thingiverse', `https://www.thingiverse.com/search?q=${encodeURIComponent(query)}`)];
    }
  }
}

// ===== Cults3D =====
async function searchCults3D(query) {
  try {
    const r = await API.get(`https://cults3d.com/en/search?q=${encodeURIComponent(query)}`);
    const $ = cheerio.load(r.data);
    const models = [];
    $('a[href*="/en/3d-model/"]').each((i, el) => {
      const link = $(el), href = link.attr('href');
      if (!href || models.some(m => m.url.includes(href))) return;
      const title = link.find('h3,h2').first().text().trim() || link.attr('title') || '';
      const img = link.find('img').first().attr('src') || link.find('img').first().attr('data-src') || '';
      if (title) models.push(normalize({ title, url: href.startsWith('http') ? href : `https://cults3d.com${href}`, image: img.startsWith('http') ? img : '' }, 'Cults3D'));
    });
    return models.slice(0, 20);
  } catch {
    return [fallback('Cults3D', `https://cults3d.com/en/search?q=${encodeURIComponent(query)}`)];
  }
}

// ===== MyMiniFactory =====
async function searchMyMiniFactory(query) {
  try {
    const r = await API.get(`https://www.myminifactory.com/search/?query=${encodeURIComponent(query)}`);
    const $ = cheerio.load(r.data);
    const models = [];
    $('a[href*="/object/"]').each((i, el) => {
      const link = $(el), href = link.attr('href');
      if (!href || models.some(m => m.url.includes(href))) return;
      const title = link.find('h3,.title').first().text().trim() || link.attr('title') || '';
      const img = link.find('img').first().attr('src') || '';
      if (title) models.push(normalize({ title, url: href.startsWith('http') ? href : `https://www.myminifactory.com${href}`, image: img.startsWith('http') ? img : '' }, 'MyMiniFactory'));
    });
    return models.slice(0, 20);
  } catch {
    return [fallback('MyMiniFactory', `https://www.myminifactory.com/search/?query=${encodeURIComponent(query)}`)];
  }
}

function fallback(source, url) {
  return { title: `去 ${source} 搜索`, source, url, image: '', likes: 0, downloads: 0, description: '' };
}

module.exports = { searchPrintables, searchMakerWorld, searchThingiverse, searchCults3D, searchMyMiniFactory };
