// 3D Model Hub - Vercel Serverless Function
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36';

export default async function handler(req, res) {
  const q = req.query.q || '';
  if (!q) return res.json({ models: [] });

  const skip = {
    printables: req.query.printables === '0',
    makerworld: req.query.makerworld === '0',
    thingiverse: req.query.thingiverse === '0',
    cults3d: req.query.cults3d === '0',
    myminifactory: req.query.myminifactory === '0',
  };

  const tasks = [];
  if (!skip.printables) tasks.push(searchPrintables(q));
  if (!skip.makerworld) tasks.push(searchMakerWorld(q));
  if (!skip.thingiverse) tasks.push(searchThingiverse(q));
  if (!skip.cults3d) tasks.push(searchCults3D(q));
  if (!skip.myminifactory) tasks.push(searchMyMiniFactory(q));

  const results = await Promise.allSettled(tasks);
  const models = results.flatMap(r => r.status === 'fulfilled' ? r.value : []);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json({ models });
}

// ===== Printables (GraphQL API) =====
async function searchPrintables(q) {
  try {
    const r = await fetch('https://api2.printables.com/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': UA, 'Origin': 'https://www.printables.com' },
      body: JSON.stringify({ query: `query Search($q:String!,$limit:Int){search(q:$q,first:$limit,order:POINTS){edges{node{id name summary likeCount downloadCount user{username} images{tiny url}}}}}`, variables: { q, limit: 20 } }),
    });
    const d = await r.json();
    return (d?.data?.search?.edges || []).map(e => ({
      title: e.node.name, source: 'Printables',
      url: `https://www.printables.com/model/${e.node.id}`,
      image: fixUrl((e.node.images?.[0]?.tiny || e.node.images?.[0]?.url || '')),
      author: e.node.user?.username || '', likes: e.node.likeCount || 0,
      downloads: e.node.downloadCount || 0, description: (e.node.summary || '').slice(0, 300),
    }));
  } catch { return [f('Printables', `https://www.printables.com/search?q=${enc(q)}`)]; }
}

// ===== MakerWorld (Internal REST API + HTML fallback) =====
async function searchMakerWorld(q) {
  // Phase 1: try internal API
  try {
    const r = await fetch(`https://makerworld.com/v1/design-service/design/search?keyword=${enc(q)}&pageSize=20`, {
      headers: {
        'User-Agent': UA,
        'Accept': 'application/json',
        'x-bbl-client-type': 'web',
        'x-bbl-client-name': 'MakerWorld',
        'x-bbl-client-version': '00.00.00.01',
        'x-bbl-app-source': 'makerworld',
      },
      signal: AbortSignal.timeout(12000),
    });
    const d = await r.json();
    const items = d?.data?.designs || d?.data?.list || d?.data || [];
    if (Array.isArray(items) && items.length > 0) {
      return items.slice(0, 20).map(item => ({
        title: item.name || item.title || 'Untitled',
        source: 'MakerWorld',
        url: `https://makerworld.com/models/${item.id || item.designId || ''}`,
        image: fixUrl(item.thumbnail || item.cover || item.images?.[0] || ''),
        author: item.creator?.name || item.author || '',
        likes: item.likeCount || item.likes || 0,
        downloads: item.downloadCount || item.downloads || 0,
        description: (item.summary || item.description || '').slice(0, 300),
      }));
    }
  } catch {}

  // Phase 2: try SSR page with __NEXT_DATA__
  try {
    const r = await fetch(`https://makerworld.com/models?q=${enc(q)}`, { headers: { 'User-Agent': UA, 'Accept': 'text/html' } });
    const html = await r.text();
    const nextMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([^<]+)<\/script>/);
    if (nextMatch) {
      const next = JSON.parse(nextMatch[1]);
      const props = next?.props?.pageProps;
      const designs = props?.designs || props?.data || props?.list || [];
      if (Array.isArray(designs) && designs.length > 0) {
        return designs.slice(0, 20).map(item => ({
          title: item.name || item.title || 'Untitled',
          source: 'MakerWorld',
          url: `https://makerworld.com/models/${item.id || item.designId || ''}`,
          image: fixUrl(item.thumbnail || item.cover || ''),
          author: item.creator?.name || item.author || '',
          likes: item.likeCount || 0,
          downloads: item.downloadCount || 0,
          description: (item.summary || '').slice(0, 300),
        }));
      }
    }
  } catch {}

  // Phase 3: simple HTML extraction
  try {
    const html = await (await fetch(`https://makerworld.com/models?q=${enc(q)}`, { headers: { 'User-Agent': UA, 'Accept': 'text/html' } })).text();
    const models = [];
    const re = /href="(\/models\/[^"]+)"[^>]*>\s*(<[^>]*>)*\s*([^<]{4,150}?)\s*(<[^>]*>)*\s*<\/a>/gi;
    let m;
    while ((m = re.exec(html)) && models.length < 15) {
      const title = m[3]?.trim();
      if (title && title.length > 3) {
        models.push({ title, source: 'MakerWorld', url: `https://makerworld.com${m[1]}`, image: '', likes: 0, downloads: 0, description: '' });
      }
    }
    if (models.length) return models;
  } catch {}

  return [f('MakerWorld', `https://makerworld.com/models?q=${enc(q)}`)];
}

// ===== Thingiverse =====
async function searchThingiverse(q) {
  try {
    const r = await fetch(`https://www.thingiverse.com/search?q=${enc(q)}`, { headers: { 'User-Agent': UA, 'Accept': 'text/html' } });
    const html = await r.text();
    const models = [];
    // Try to find thing cards with JSON embedded data
    const dataRe = /<script[^>]*type="application\/json"[^>]*data-initial-state[^>]*>(\{.*?\})<\/script>/s;
    const dataM = html.match(dataRe);
    if (dataM) {
      try {
        const state = JSON.parse(dataM[1]);
        const things = state?.things || state?.search?.results || [];
        if (Array.isArray(things)) {
          return things.slice(0, 20).map(t => ({
            title: t.name || t.title || '', source: 'Thingiverse',
            url: `https://www.thingiverse.com/thing:${t.id}`,
            image: fixUrl(t.thumbnail || t.preview_image || t.image || ''),
            author: t.creator?.name || t.designer || '',
            likes: t.like_count || t.likes || 0,
            downloads: t.download_count || t.downloads || 0,
            description: (t.description || '').slice(0, 300),
          }));
        }
      } catch {}
    }
    // Fallback: HTML extraction
    const re = /href="(\/thing:\d+)"[^>]*>([^<]+)<\/a>/gi;
    let m;
    while ((m = re.exec(html)) && models.length < 15) {
      const title = m[2]?.trim();
      if (title && title.length > 3 && !models.some(x => x.url.includes(m[1]))) {
        models.push({ title, source: 'Thingiverse', url: `https://www.thingiverse.com${m[1]}`, image: '', likes: 0, downloads: 0, description: '' });
      }
    }
    return models.length ? models : [f('Thingiverse', `https://www.thingiverse.com/search?q=${enc(q)}`)];
  } catch { return [f('Thingiverse', `https://www.thingiverse.com/search?q=${enc(q)}`)]; }
}

// ===== Cults3D (with retry + delay) =====
async function searchCults3D(q) {
  const fetchPage = async (retry = 0) => {
    const delay = 3000 + retry * 2000;
    if (retry > 0) await new Promise(r => setTimeout(r, delay));
    try {
      return await fetch(`https://cults3d.com/en/search?q=${enc(q)}`, {
        headers: { 'User-Agent': UA, 'Accept': 'text/html,application/xhtml+xml', 'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8', 'Cache-Control': 'no-cache' },
        signal: AbortSignal.timeout(15000),
      });
    } catch (e) { if (retry < 3) return fetchPage(retry + 1); throw e; }
  };

  try {
    const r = await fetchPage();
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const html = await r.text();
    const models = [];
    const re = /href="(\/en\/3d-model\/[^"]+)"/g;
    let m;
    while ((m = re.exec(html)) && models.length < 15) {
      const href = m[1];
      const chunk = html.slice(m.index, m.index + 1800);
      // Try alt text, then heading, then generic content
      let title = '';
      const altM = chunk.match(/alt="([^"]{4,150})"/);
      if (altM) title = altM[1];
      if (!title) { const hM = chunk.match(/<h[23][^>]*>([^<]{4,150})<\/h[23]>/); if (hM) title = hM[1]; }
      if (!title) { const tM = chunk.match(/>([^<>]{5,120})</); if (tM) title = tM[1]; }
      if (title && title.length > 3 && !models.some(x => x.url.includes(href))) {
        const imgM = chunk.match(/src="(https?:\/\/[^"]+\.(?:jpg|png|webp|jpeg)[^"]*)"/);
        models.push({
          title: title.trim(), source: 'Cults3D',
          url: `https://cults3d.com${href}`,
          image: fixUrl(imgM?.[1] || ''), likes: 0, downloads: 0, description: '',
        });
      }
    }
    return models.length ? models : [f('Cults3D', `https://cults3d.com/en/search?q=${enc(q)}`)];
  } catch {
    try {
      // final retry
      const r = await (await fetch(`https://cults3d.com/en/search?q=${enc(q)}`, { headers: { 'User-Agent': UA } })).text();
      const re = /"\/en\/3d-model\/[^"]+"/g;
      const matches = r.match(re) || [];
      const models = matches.slice(0, 15).map(m => {
        const href = m.replace(/"/g, '');
        const idx = r.indexOf(href);
        const chunk = r.slice(Math.max(0, idx - 200), idx + 500);
        const altM = chunk.match(/title="([^"]+)"/);
        return { title: altM?.[1] || '3D Model', source: 'Cults3D', url: `https://cults3d.com${href}`, image: '', likes: 0, downloads: 0, description: '' };
      });
      return models.length ? models : [f('Cults3D', `https://cults3d.com/en/search?q=${enc(q)}`)];
    } catch { return [f('Cults3D', `https://cults3d.com/en/search?q=${enc(q)}`)]; }
  }
}

// ===== MyMiniFactory =====
async function searchMyMiniFactory(q) {
  return [f('MyMiniFactory', `https://www.myminifactory.com/search/?query=${enc(q)}`)];
}

function fixUrl(url) { return (url || '').replace(/^\/\//, 'https://'); }
function enc(s) { return encodeURIComponent(s); }
function f(source, url) { return { title: `去 ${source} 搜索`, source, url, image: '', likes: 0, downloads: 0, description: '点击跳转到原站查看搜索结果' }; }
// deploy trigger 1780944881
