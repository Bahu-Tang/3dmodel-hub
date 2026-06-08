// 3D Model Hub - Cloudflare Worker
// 部署后永久在线，无需电脑、无需服务器。免费: 10万次/天

const HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>3D Model Hub</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,'Segoe UI',Roboto,sans-serif;background:#1a1a2e;color:#eee;min-height:100vh}
.wrapper{max-width:1500px;margin:0 auto;padding:16px}
header{text-align:center;padding:30px 0 20px}
h1{font-size:2em;background:linear-gradient(90deg,#e74c3c,#e67e22,#f1c40f,#2ecc71,#3498db,#9b59b6);-webkit-background-clip:text;-webkit-text-fill-color:transparent;letter-spacing:2px}
.search-box{background:#16213e;border-radius:12px;padding:20px;margin-bottom:16px}
.search-row{display:flex;gap:8px}
.search-row input{flex:1;padding:12px 16px;border:2px solid #2a3a5c;border-radius:8px;font-size:1.05em;background:#0f3460;color:white;outline:none}
.search-row input:focus{border-color:#e74c3c}
.search-row button{padding:12px 28px;background:#e74c3c;color:white;border:none;border-radius:8px;font-size:1em;font-weight:600;cursor:pointer}
.search-row button:hover{background:#c0392b}
.filter-row{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px;align-items:center}
.filter-row label{cursor:pointer;padding:4px 12px;border-radius:14px;font-size:.8em;border:2px solid #444;user-select:none}
.filter-row label:has(input:checked){background:#3498db;border-color:#3498db;color:white}
.filter-row input{display:none}
.printer-bar{background:#1b4332;border-radius:8px;padding:8px 14px;font-size:.8em;color:#95d5b2;display:flex;flex-wrap:wrap;gap:10px;margin-top:10px}
.toolbar{display:flex;justify-content:space-between;align-items:center;margin:12px 0;font-size:.85em}
.toolbar select{padding:4px 10px;background:#16213e;color:#eee;border:1px solid #333;border-radius:6px}
.stats{color:#888}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px}
.card{background:#16213e;border-radius:10px;overflow:hidden;transition:all .15s;border:1px solid #222;display:flex;flex-direction:column}
.card:hover{transform:translateY(-1px);border-color:#3498db;box-shadow:0 4px 16px rgba(0,0,0,.3)}
.card-img{height:180px;background:#0f3460;display:flex;align-items:center;justify-content:center;overflow:hidden}
.card-img img{width:100%;height:100%;object-fit:cover}
.card-img .noimg{color:#555;font-size:3em}
.card-body{padding:12px 14px;flex:1;display:flex;flex-direction:column}
.card-body h3{font-size:.95em;line-height:1.4;margin-bottom:6px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.card-body h3 a{color:#eee;text-decoration:none}
.card-body h3 a:hover{color:#3498db}
.card-meta{display:flex;align-items:center;gap:8px;margin-bottom:6px}
.src{font-size:.7em;font-weight:700;padding:2px 8px;border-radius:10px;color:white}
.src-printables{background:#e74c3c}.src-makerworld{background:#27ae60}.src-thingiverse{background:#2980b9}.src-cults3d{background:#8e44ad}.src-myminifactory{background:#d35400}
.card-stats{font-size:.75em;color:#888;margin-top:auto;display:flex;gap:10px}
.card-body .desc{font-size:.78em;color:#777;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;margin-bottom:6px}
.card-link{margin-top:8px}
.card-link a{display:block;text-align:center;padding:7px;background:#0f3460;border-radius:6px;color:#3498db;text-decoration:none;font-size:.82em}
.card-link a:hover{background:#3498db;color:white}
.card-error{padding:18px;text-align:center;color:#888;font-size:.9em}
.card-error a{color:#3498db;display:inline-block;margin-top:6px}
.loading{text-align:center;padding:60px 0}
.spinner{width:36px;height:36px;border:3px solid #333;border-top-color:#3498db;border-radius:50%;animation:spin .7s linear infinite;margin:0 auto 16px}
@keyframes spin{to{transform:rotate(360deg)}}
.hidden{display:none!important}
.empty{text-align:center;padding:60px 0;color:#555}
footer{text-align:center;padding:24px;color:#555;font-size:.8em}
@media(max-width:600px){.search-row{flex-direction:column}.search-row button{padding:14px}.grid{grid-template-columns:1fr}}
</style>
</head>
<body>
<div class="wrapper">
<header><h1>3D Model Hub</h1><p style="opacity:.5;margin-top:4px">Cloudflare Worker · 永久在线 · 全球加速</p></header>
<div class="search-box">
<form id="sf"><div class="search-row">
<input type="text" id="q" placeholder="搜索 3D 模型..." autofocus>
<button type="submit">搜索</button>
</div>
<div class="filter-row">
<label><input type="checkbox" data-src="printables" checked> Printables</label>
<label><input type="checkbox" data-src="makerworld" checked> MakerWorld</label>
<label><input type="checkbox" data-src="thingiverse" checked> Thingiverse</label>
<label><input type="checkbox" data-src="cults3d" checked> Cults3D</label>
<label><input type="checkbox" data-src="myminifactory" checked> MyMiniFactory</label>
</div></form>
<div class="printer-bar"><strong>拓竹 A1</strong> 256mm³ · 0.4mm喷嘴 · PLA/PETG/TPU/ABS · 热床≤100°C</div>
</div>
<div class="toolbar">
<select id="sort"><option value="">综合排序</option><option value="title">名称 A-Z</option><option value="likes">点赞多</option><option value="downloads">下载多</option></select>
<span class="stats" id="stats"></span>
</div>
<div class="loading hidden" id="loading"><div class="spinner"></div><p>搜索中...</p></div>
<div class="grid" id="grid"></div>
<div class="empty" id="empty"><p>输入关键词开始搜索</p></div>
</div>
<footer>Powered by Cloudflare Workers · 免费永久在线</footer>
<script>
const sf=document.getElementById('sf'),grid=document.getElementById('grid'),loading=document.getElementById('loading'),empty=document.getElementById('empty'),stats=document.getElementById('stats'),sort=document.getElementById('sort');
let cache=[];

sf.addEventListener('submit',async e=>{
e.preventDefault();
const q=document.getElementById('q').value.trim();
if(!q)return;
loading.classList.remove('hidden');empty.classList.add('hidden');grid.innerHTML='';stats.textContent='';
const off={};
document.querySelectorAll('#sf input[type=checkbox]').forEach(cb=>{if(!cb.checked)off[cb.dataset.src]='0'});
const p=new URLSearchParams({q,...off});
try{const r=await fetch('/api/search?'+p);const d=await r.json();cache=d.models||[];render()}catch(e){stats.textContent='请求失败'}finally{loading.classList.add('hidden')}
});

sort.addEventListener('change',render);

function render(){
let arr=[...cache];
if(sort.value==='title')arr.sort((a,b)=>(a.title||'').localeCompare(b.title||''));
if(sort.value==='likes')arr.sort((a,b)=>(b.likes||0)-(a.likes||0));
if(sort.value==='downloads')arr.sort((a,b)=>(b.downloads||0)-(a.downloads||0));
stats.textContent=arr.length?'共 '+arr.length+' 个结果':'';
grid.innerHTML=arr.map(m=>{
const cls='src-'+m.source.toLowerCase();
if(!m.image&&m.title&&m.title.indexOf('去 ')!==-1){
return '<div class="card"><div class="card-error">'+m.title+'<br><a href="'+m.url+'" target="_blank">打开原站 &rarr;</a></div></div>';
}
return '<div class="card">'+
'<div class="card-img">'+(m.image?'<img src="'+m.image+'" loading="lazy" onerror="this.parentElement.innerHTML=\\'<span class=noimg>&#x1F4E6;</span>\\'">':'<span class="noimg">&#x1F4E6;</span>')+'</div>'+
'<div class="card-body">'+
'<h3><a href="'+m.url+'" target="_blank">'+m.title+'</a></h3>'+
'<div class="card-meta"><span class="src '+cls+'">'+m.source+'</span>'+(m.author?'<span style="font-size:.75em;color:#888">by '+m.author+'</span>':'')+'</div>'+
(m.description?'<div class="desc">'+m.description+'</div>':'')+
'<div class="card-stats">'+(m.likes?'&#x2764; '+m.likes:'')+' '+(m.downloads?'&#x2B07; '+m.downloads:'')+'</div>'+
'<div class="card-link"><a href="'+m.url+'" target="_blank">查看详情</a></div>'+
'</div></div>';
}).join('')}
</script>
</body>
</html>`;

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/api/search') {
      return handleSearch(request);
    }
    return new Response(HTML, {
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=3600' }
    });
  }
};

async function handleSearch(request) {
  const url = new URL(request.url);
  const q = url.searchParams.get('q') || '';
  const skip = {
    printables: url.searchParams.get('printables') === '0',
    makerworld: url.searchParams.get('makerworld') === '0',
    thingiverse: url.searchParams.get('thingiverse') === '0',
    cults3d: url.searchParams.get('cults3d') === '0',
    myminifactory: url.searchParams.get('myminifactory') === '0',
  };

  if (!q) return json({ models: [] });

  const tasks = [];
  if (!skip.printables) tasks.push(searchPrintables(q));
  if (!skip.makerworld) tasks.push(searchMakerWorld(q));
  if (!skip.thingiverse) tasks.push(searchThingiverse(q));
  if (!skip.cults3d) tasks.push(searchCults3D(q));
  if (!skip.myminifactory) tasks.push(searchMyMiniFactory(q));

  const results = await Promise.allSettled(tasks);
  const models = results.flatMap(r => r.status === 'fulfilled' ? r.value : []);
  return json({ models });
}

function json(data) {
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=300' }
  });
}

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36';

async function searchPrintables(q) {
  try {
    const r = await fetch('https://api2.printables.com/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': UA, 'Origin': 'https://www.printables.com' },
      body: JSON.stringify({ query: `query Search($q:String!,$limit:Int){search(q:$q,first:$limit,order:POINTS){edges{node{id name summary likeCount downloadCount user{username} images{tiny url}}}}}`,
        variables: { q, limit: 20 } })
    });
    const d = await r.json();
    return (d?.data?.search?.edges || []).map(e => ({
      title: e.node.name, source: 'Printables',
      url: `https://www.printables.com/model/${e.node.id}`,
      image: (e.node.images?.[0]?.tiny || e.node.images?.[0]?.url || '').replace(/^\/\//, 'https://'),
      author: e.node.user?.username || '', likes: e.node.likeCount || 0,
      downloads: e.node.downloadCount || 0, description: (e.node.summary || '').slice(0, 300)
    }));
  } catch { return [f('Printables', `https://www.printables.com/search?q=${encodeURIComponent(q)}`)]; }
}

async function searchThingiverse(q) {
  try {
    const r = await fetch(`https://api.thingiverse.com/search/${encodeURIComponent(q)}?page=1&per_page=20`,
      { headers: { 'User-Agent': UA } });
    const d = await r.json();
    return (d?.hits || d || []).slice(0, 20).map(item => ({
      title: item.name || '', source: 'Thingiverse',
      url: `https://www.thingiverse.com/thing:${item.id}`,
      image: (item.thumbnail || '').replace(/^\/\//, 'https://'),
      author: item.creator?.name || '', likes: item.like_count || 0,
      downloads: item.download_count || 0, description: ''
    }));
  } catch { return [f('Thingiverse', `https://www.thingiverse.com/search?q=${encodeURIComponent(q)}`)]; }
}

async function searchMakerWorld(q) {
  try {
    const r = await fetch(`https://makerworld.com/models?q=${encodeURIComponent(q)}`,
      { headers: { 'User-Agent': UA, 'Accept': 'text/html' } });
    const html = await r.text();
    const models = [];
    const re = /<a[^>]*href="(\/[^"]*)"[^>]*>\s*(?:<[^>]*>)*\s*([^<]{3,200}?)\s*(?:<[^>]*>)*\s*<\/a>/gi;
    let m; while ((m = re.exec(html)) !== null && models.length < 20) {
      if (m[2].length > 3 && m[2].length < 150 && m[1] !== '/') {
        models.push({ title: m[2].trim(), source: 'MakerWorld',
          url: `https://makerworld.com${m[1]}`, image: '', likes: 0, downloads: 0, description: '' });
      }
    }
    return models.length ? models : [f('MakerWorld', `https://makerworld.com/models?q=${encodeURIComponent(q)}`)];
  } catch { return [f('MakerWorld', `https://makerworld.com/models?q=${encodeURIComponent(q)}`)]; }
}

async function searchCults3D(q) {
  try {
    const r = await fetch(`https://cults3d.com/en/search?q=${encodeURIComponent(q)}`,
      { headers: { 'User-Agent': UA, 'Accept': 'text/html' } });
    const html = await r.text();
    const models = [];
    const re = /href="(\/en\/3d-model\/[^"]*)"[^>]*>\s*<[^>]*>\s*<[^>]*>\s*<[^>]*>\s*([^<]+)/gi;
    let m; while ((m = re.exec(html)) !== null && models.length < 20) {
      if (m[2].trim().length > 3) {
        models.push({ title: m[2].trim(), source: 'Cults3D',
          url: `https://cults3d.com${m[1]}`, image: '', likes: 0, downloads: 0, description: '' });
      }
    }
    return models.length ? models : [f('Cults3D', `https://cults3d.com/en/search?q=${encodeURIComponent(q)}`)];
  } catch { return [f('Cults3D', `https://cults3d.com/en/search?q=${encodeURIComponent(q)}`)]; }
}

async function searchMyMiniFactory(q) {
  return [f('MyMiniFactory', `https://www.myminifactory.com/search/?query=${encodeURIComponent(q)}`)];
}

function f(source, url) {
  return { title: `去 ${source} 搜索`, source, url, image: '', likes: 0, downloads: 0, description: '' };
}
