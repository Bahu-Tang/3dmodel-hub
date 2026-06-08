const axios = require('axios');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36';

async function searchPrintables(q) {
  try {
    const r = await axios.post('https://api2.printables.com/graphql', {
      query: `query Search($q:String!,$limit:Int){search(q:$q,first:$limit,order:POINTS){edges{node{id name summary likeCount downloadCount user{username} images{tiny url}}}}}`,
      variables: { q, limit: 20 }
    }, { headers: { 'Content-Type': 'application/json', 'User-Agent': UA, 'Origin': 'https://www.printables.com' }, timeout: 12000 });
    return (r.data?.data?.search?.edges || []).map(e => ({
      title: e.node.name, source: 'Printables',
      url: `https://www.printables.com/model/${e.node.id}`,
      image: (e.node.images?.[0]?.tiny || e.node.images?.[0]?.url || '').replace(/^\/\//, 'https://'),
      author: e.node.user?.username || '', likes: e.node.likeCount || 0,
      downloads: e.node.downloadCount || 0, description: (e.node.summary || '').slice(0, 300),
    }));
  } catch { return [f('Printables', `https://www.printables.com/search?q=${enc(q)}`)]; }
}

async function searchMakerWorld(q) {
  // Phase 1: internal REST API
  try {
    const r = await axios.get(`https://makerworld.com/v1/design-service/design/search?keyword=${enc(q)}&pageSize=20`, {
      headers: { 'User-Agent': UA, 'x-bbl-client-type': 'web', 'x-bbl-client-name': 'MakerWorld', 'x-bbl-client-version': '00.00.00.01', 'x-bbl-app-source': 'makerworld' },
      timeout: 12000,
    });
    const items = r.data?.data?.designs || r.data?.data?.list || r.data?.data || [];
    if (Array.isArray(items) && items.length > 0) {
      return items.slice(0, 20).map(item => ({
        title: item.name || item.title || 'Untitled', source: 'MakerWorld',
        url: `https://makerworld.com/models/${item.id || item.designId || ''}`,
        image: (item.thumbnail || item.cover || item.images?.[0] || '').replace(/^\/\//, 'https://'),
        author: item.creator?.name || item.author || '',
        likes: item.likeCount || item.likes || 0,
        downloads: item.downloadCount || item.downloads || 0,
        description: (item.summary || item.description || '').slice(0, 300),
      }));
    }
  } catch {}

  // Phase 2: __NEXT_DATA__ SSR
  try {
    const r = await axios.get(`https://makerworld.com/models?q=${enc(q)}`, { headers: { 'User-Agent': UA }, timeout: 15000 });
    const html = r.data;
    const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([^<]+)<\/script>/);
    if (m) {
      const next = JSON.parse(m[1]);
      const props = next?.props?.pageProps;
      const designs = props?.designs || props?.data || props?.list || [];
      if (Array.isArray(designs) && designs.length > 0) {
        return designs.slice(0, 20).map(item => ({
          title: item.name || item.title || 'Untitled', source: 'MakerWorld',
          url: `https://makerworld.com/models/${item.id || item.designId || ''}`,
          image: (item.thumbnail || item.cover || '').replace(/^\/\//, 'https://'),
          author: item.creator?.name || item.author || '',
          likes: item.likeCount || 0, downloads: item.downloadCount || 0,
          description: (item.summary || '').slice(0, 300),
        }));
      }
    }
  } catch {}

  // Phase 3: simple HTML link extraction
  try {
    const r = await axios.get(`https://makerworld.com/models?q=${enc(q)}`, { headers: { 'User-Agent': UA }, timeout: 12000 });
    const html = r.data;
    const models = [];
    const re = /href="(\/models\/[^"]+)"[^>]*>\s*(<[^>]*>)*\s*([^<]{4,150}?)\s*(<[^>]*>)*\s*<\/a>/gi;
    let rm;
    while ((rm = re.exec(html)) && models.length < 15) {
      const title = rm[3]?.trim();
      if (title && title.length > 3) {
        models.push({ title, source: 'MakerWorld', url: `https://makerworld.com${rm[1]}`, image: '', likes: 0, downloads: 0, description: '' });
      }
    }
    if (models.length) return models;
  } catch {}

  return [f('MakerWorld', `https://makerworld.com/models?q=${enc(q)}`)];
}

async function searchThingiverse(q) {
  try {
    const r = await axios.get(`https://www.thingiverse.com/search?q=${enc(q)}`, { headers: { 'User-Agent': UA }, timeout: 12000 });
    const html = r.data;
    const models = [];
    const re = /href="(\/thing:\d+)"[^>]*>([^<]+)<\/a>/gi;
    let m;
    while ((m = re.exec(html)) && models.length < 15) {
      const title = m[2]?.trim();
      if (title && title.length > 3) {
        models.push({ title, source: 'Thingiverse', url: `https://www.thingiverse.com${m[1]}`, image: '', likes: 0, downloads: 0, description: '' });
      }
    }
    return models.length ? models : [f('Thingiverse', `https://www.thingiverse.com/search?q=${enc(q)}`)];
  } catch { return [f('Thingiverse', `https://www.thingiverse.com/search?q=${enc(q)}`)]; }
}

async function searchCults3D(q) {
  const fetchWithRetry = async (retry = 0) => {
    await new Promise(resolve => setTimeout(resolve, retry * 2000));
    try {
      return await axios.get(`https://cults3d.com/en/search?q=${enc(q)}`, {
        headers: { 'User-Agent': UA, 'Accept': 'text/html,application/xhtml+xml', 'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8' },
        timeout: 15000,
      });
    } catch (e) {
      if (retry < 3) return fetchWithRetry(retry + 1);
      throw e;
    }
  };

  try {
    const r = await fetchWithRetry();
    const html = r.data;
    const models = [];
    const re = /href="(\/en\/3d-model\/[^"]+)"/g;
    let m;
    while ((m = re.exec(html)) && models.length < 15) {
      const href = m[1];
      const chunk = html.slice(m.index, m.index + 1800);
      let title = '';
      const altM = chunk.match(/alt="([^"]{4,150})"/);
      if (altM) title = altM[1];
      if (!title) { const hM = chunk.match(/<h[23][^>]*>([^<]{4,150})<\/h[23]>/); if (hM) title = hM[1]; }
      if (!title) { const tM = chunk.match(/>([^<>]{5,120})</); if (tM) title = tM[1]; }
      if (title && title.length > 3) {
        const imgM = chunk.match(/src="(https?:\/\/[^"]+\.(?:jpg|png|webp)[^"]*)"/);
        models.push({ title: title.trim(), source: 'Cults3D', url: `https://cults3d.com${href}`, image: (imgM?.[1] || '').replace(/^\/\//, 'https://'), likes: 0, downloads: 0, description: '' });
      }
    }
    return models.length ? models : [f('Cults3D', `https://cults3d.com/en/search?q=${enc(q)}`)];
  } catch { return [f('Cults3D', `https://cults3d.com/en/search?q=${enc(q)}`)]; }
}

async function searchMyMiniFactory(q) {
  return [f('MyMiniFactory', `https://www.myminifactory.com/search/?query=${enc(q)}`)];
}

function enc(s) { return encodeURIComponent(s); }
function f(source, url) { return { title: `去 ${source} 搜索`, source, url, image: '', likes: 0, downloads: 0, description: '点击跳转到原站查看搜索结果' }; }

module.exports = { searchPrintables, searchMakerWorld, searchThingiverse, searchCults3D, searchMyMiniFactory };
