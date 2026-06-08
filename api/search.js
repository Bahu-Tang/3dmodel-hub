// 3D Model Hub - Vercel Serverless Function
// 部署到 Vercel 后永久在线，免费额度极大

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36';

export default async function handler(req, res) {
  const q = req.query.q || '';
  const skip = {
    printables: req.query.printables === '0',
    makerworld: req.query.makerworld === '0',
    thingiverse: req.query.thingiverse === '0',
    cults3d: req.query.cults3d === '0',
    myminifactory: req.query.myminifactory === '0',
  };

  if (!q) return res.json({ models: [] });

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

async function fetchJSON(url, opts = {}) {
  const r = await fetch(url, { headers: { 'User-Agent': UA, ...opts.headers }, ...opts });
  return r.json();
}

async function fetchText(url) {
  const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept': 'text/html' } });
  return r.text();
}

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
      image: (e.node.images?.[0]?.tiny || '').replace(/^\/\//, 'https://'),
      author: e.node.user?.username || '', likes: e.node.likeCount || 0,
      downloads: e.node.downloadCount || 0, description: (e.node.summary || '').slice(0, 300),
    }));
  } catch { return [f('Printables', `https://www.printables.com/search?q=${e(q)}`)]; }
}

async function searchMakerWorld(q) {
  try {
    const html = await fetchText(`https://makerworld.com/models?q=${e(q)}`);
    const models = [];
    const re = /href="(\/[^"]*\/[^"]*)".*?(?:<img[^>]+alt="([^"]+)")|alt="([^"]+)".*?<img[^>]+src="([^"]+)"/sg;
    // Simplified: extract any meaningful text + link pairs
    const linkRe = /<a[^>]+href="(\/models\/\d+[^"]*)"[^>]*>/g;
    let m;
    while ((m = linkRe.exec(html)) && models.length < 15) {
      const href = m[1];
      // try to find nearby text
      const start = m.index;
      const chunk = html.slice(start, start + 2000);
      const titleM = chunk.match(/<[^>]+class="[^"]*title[^"]*"[^>]*>([^<]+)</);
      const textM = chunk.match(/>([^<>]{5,100})</);
      const title = titleM?.[1] || textM?.[1] || 'Untitled';
      if (title.length > 3) {
        models.push({ title: title.trim(), source: 'MakerWorld',
          url: `https://makerworld.com${href}`, image: '', likes: 0, downloads: 0, description: '' });
      }
    }
    return models.length ? models : [f('MakerWorld', `https://makerworld.com/models?q=${e(q)}`)];
  } catch { return [f('MakerWorld', `https://makerworld.com/models?q=${e(q)}`)]; }
}

async function searchThingiverse(q) {
  try {
    const d = await fetchJSON(`https://api.thingiverse.com/search/${e(q)}?page=1&per_page=20`);
    return (d?.hits || d || []).slice(0, 20).map(item => ({
      title: item.name || '', source: 'Thingiverse',
      url: `https://www.thingiverse.com/thing:${item.id}`,
      image: (item.thumbnail || '').replace(/^\/\//, 'https://'),
      author: item.creator?.name || '', likes: item.like_count || 0,
      downloads: item.download_count || 0, description: '',
    }));
  } catch { return [f('Thingiverse', `https://www.thingiverse.com/search?q=${e(q)}`)]; }
}

async function searchCults3D(q) {
  try {
    const html = await fetchText(`https://cults3d.com/en/search?q=${e(q)}`);
    const models = [];
    const re = /href="(\/en\/3d-model\/[^"]+)"/g;
    let m;
    while ((m = re.exec(html)) && models.length < 15) {
      const href = m[1];
      const chunk = html.slice(m.index, m.index + 1500);
      const titleM = chunk.match(/alt="([^"]+)"/);
      const title = titleM?.[1] || (chunk.match(/>([^<>]{5,150})</)?.[1]) || 'Untitled';
      const imgM = chunk.match(/src="(https:\/\/[^"]+\.(?:jpg|png|webp)[^"]*)"/);
      if (title.length > 3) {
        models.push({ title: title.trim(), source: 'Cults3D',
          url: `https://cults3d.com${href}`, 
          image: (imgM?.[1] || '').replace(/^\/\//, 'https://'), likes: 0, downloads: 0, description: '' });
      }
    }
    return models.length ? models : [f('Cults3D', `https://cults3d.com/en/search?q=${e(q)}`)];
  } catch { return [f('Cults3D', `https://cults3d.com/en/search?q=${e(q)}`)]; }
}

async function searchMyMiniFactory(q) {
  return [f('MyMiniFactory', `https://www.myminifactory.com/search/?query=${e(q)}`)];
}

function f(source, url) { return { title: `去 ${source} 搜索`, source, url, image: '', likes: 0, downloads: 0, description: '点击跳转到原站查看搜索结果' }; }
function e(s) { return encodeURIComponent(s); }
