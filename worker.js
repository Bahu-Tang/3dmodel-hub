// 3D Model Hub - Cloudflare Worker
// Printables (GraphQL) + MakerWorld (internal API) + Cults3D (HTML)
// Thingiverse + MyMiniFactory -> direct links

const HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>3D Model Hub</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,'Segoe UI',Roboto,sans-serif;background:#1a1a2e;color:#eee;min-height:100vh}
.w{max-width:900px;margin:0 auto;padding:20px 16px}
hdr{text-align:center;padding:30px 0 20px}
h1{font-size:2em;letter-spacing:1px;background:linear-gradient(90deg,#e74c3c,#f39c12,#2ecc71,#3498db,#9b59b6);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
hdr p{opacity:.5;margin-top:6px;font-size:.9em}
.box{background:#16213e;border-radius:14px;padding:22px;margin-bottom:18px}
.row{display:flex;gap:10px}
.row input{flex:1;padding:14px 18px;border:2px solid #2a3a5c;border-radius:10px;font-size:1.1em;background:#0f3460;color:white;outline:none;transition:border .2s}
.row input:focus{border-color:#e74c3c}
.row button{padding:14px 32px;background:#e74c3c;color:white;border:none;border-radius:10px;font-size:1em;font-weight:700;cursor:pointer;white-space:nowrap;transition:background .2s}
.row button:hover{background:#c0392b}
.tags{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
.tags span{padding:5px 14px;border-radius:16px;font-size:.78em;font-weight:600;cursor:pointer;border:2px solid #444;user-select:none;transition:all .15s}
.tags span.sel{color:white;border-color:transparent}
.t-printables.sel{background:#e74c3c}.t-makerworld.sel{background:#27ae60}.t-thingiverse.sel{background:#2980b9}.t-cults3d.sel{background:#8e44ad}.t-myminifactory.sel{background:#d35400}
.printer{background:#1b4332;padding:10px 16px;border-radius:8px;font-size:.8em;color:#95d5b2;margin-top:10px;display:flex;flex-wrap:wrap;gap:10px}
.printer strong{color:#fff}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:14px;margin-top:16px}
.card{background:#16213e;border-radius:10px;overflow:hidden;border:1px solid #222;transition:all .2s;cursor:pointer}
.card:hover{transform:translateY(-2px);border-color:#3498db;box-shadow:0 6px 20px rgba(0,0,0,.3)}
.card-img{height:170px;background:#0f3460;display:flex;align-items:center;justify-content:center;overflow:hidden;position:relative}
.card-img img{width:100%;height:100%;object-fit:cover}
.card-img .badge{position:absolute;top:10px;right:10px;padding:3px 10px;border-radius:10px;font-size:.7em;font-weight:700;color:white}
.b-printables{background:#e74c3c}.b-makerworld{background:#27ae60}.b-thingiverse{background:#2980b9}.b-cults3d{background:#8e44ad}.b-myminifactory{background:#d35400}
.card-body{padding:12px}
.card-body h3{font-size:.92em;line-height:1.4;margin-bottom:4px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;color:#fff}
.card-body .author{font-size:.75em;color:#888;margin-bottom:4px}
.card-body .desc{font-size:.75em;color:#777;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.card-body .stats{display:flex;gap:12px;margin-top:8px;font-size:.75em;color:#888}
.card-footer{padding:0 12px 12px}
.card-footer a{display:block;text-align:center;padding:8px;background:#0f3460;border-radius:6px;font-size:.8em;color:#3498db;text-decoration:none;transition:all .15s}
.card-footer a:hover{background:#3498db;color:white}
.loading{text-align:center;padding:60px}
.spin{width:36px;height:36px;border:3px solid #333;border-top-color:#3498db;border-radius:50%;animation:spin .7s linear infinite;margin:0 auto 16px}
@keyframes spin{to{transform:rotate(360deg)}}
.hidden{display:none!important}
.empty{text-align:center;padding:60px;color:#555}
.ftr{text-align:center;padding:20px;color:#555;font-size:.8em}
@media(max-width:640px){.row{flex-direction:column}.grid{grid-template-columns:1fr}.card-img{height:140px}}
</style>
</head>
<body>
<div class="w">
<hdr><h1>3D Model Hub</h1><p>多平台聚合搜索 · 拓竹 A1 · CF Worker</p></hdr>
<div class="box">
<form id="sf">
<div class="row"><input type="text" id="q" placeholder="搜索 3D 模型..." autofocus><button type="submit">搜索</button></div>
<div class="tags" id="tags">
<span class="sel t-printables" data-src="printables">Printables</span>
<span class="sel t-makerworld" data-src="makerworld">MakerWorld</span>
<span class="sel t-thingiverse" data-src="thingiverse">Thingiverse</span>
<span class="sel t-cults3d" data-src="cults3d">Cults3D</span>
<span class="sel t-myminifactory" data-src="myminifactory">MyMiniFactory</span>
</div></form>
<div class="printer"><strong>拓竹 A1</strong> <span>256mm³</span> <span>0.4mm 喷嘴</span> <span>PLA/PETG/TPU</span> <span>热床≤100°C</span></div>
</div>
<div class="loading hidden" id="loading"><div class="spin"></div><p>搜索中...</p></div>
<div class="grid" id="grid"></div>
<div class="empty hidden" id="empty">输入关键词，回车搜索</div>
</div>
<footer class="ftr">Cloudflare Workers · 免费永久在线</footer>
<script>
const PLATFORMS={printables:(q)=>url('https://www.printables.com/search?q=',q,'&o=points'),makerworld:(q)=>url('https://makerworld.com/models?q=',q),thingiverse:(q)=>url('https://www.thingiverse.com/search?q=',q,'&sort=relevant'),cults3d:(q)=>url('https://cults3d.com/en/search?q=',q),myminifactory:(q)=>url('https://www.myminifactory.com/search/?query=',q)};
const NAMES={printables:'Printables',makerworld:'MakerWorld',thingiverse:'Thingiverse',cults3d:'Cults3D',myminifactory:'MyMiniFactory'};
const ICONS={printables:'&#x1F9E9;',makerworld:'&#x1F38B;',thingiverse:'&#x1F527;',cults3d:'&#x1F48E;',myminifactory:'&#x1F3B2;'};
function url(a,q,b){return a+encodeURIComponent(q)+(b||'');}
const sf=document.getElementById('sf'),grid=document.getElementById('grid'),loading=document.getElementById('loading'),empty=document.getElementById('empty');
let selected=new Set(['printables','makerworld','thingiverse','cults3d','myminifactory']);
document.querySelectorAll('.tags span').forEach(s=>{s.addEventListener('click',()=>{s.classList.toggle('sel');s.classList.contains('sel')?selected.add(s.dataset.src):selected.delete(s.dataset.src)})});
sf.addEventListener('submit',e=>{e.preventDefault();const q=document.getElementById('q').value.trim();if(!q)return;search(q)});
async function search(q){if(selected.size===0){alert('请至少选择一个平台');return}loading.classList.remove('hidden');empty.classList.add('hidden');grid.innerHTML='';const ofl={};for(const k of['printables','makerworld','thingiverse','cults3d','myminifactory']){if(!selected.has(k))ofl[k]='0'}let models=[];try{const r=await fetch('/api/search?'+new URLSearchParams({q,...ofl}));const d=await r.json();models=d.models||[]}catch{}const found=new Set(models.map(m=>m.source));for(const id of selected){if(!found.has(NAMES[id])){models.push({title:'在 '+NAMES[id]+' 上搜索 "'+q+'"',source:NAMES[id],url:PLATFORMS[id](q),image:'',description:'点击跳转到原站查看搜索结果',likes:0,downloads:0,_action:'open'})}}render(models);loading.classList.add('hidden')}
function render(models){grid.innerHTML=models.map(m=>{const cls=m.source.toLowerCase().replace(/\\s/g,'');const isLink=m._action==='open'||(m.title&&m.title.indexOf('在 ')==0);const icon=ICONS[cls]||'&#x1F4E6;';return'<div class="card"'+(isLink?' onclick="window.open(\\''+m.url+'\\',\\'_blank\\')"':'')+'><div class="card-img">'+(m.image?'<img src="'+m.image+'" loading="lazy" onerror="this.innerHTML=\\'<span style=font-size:2.5em;color:#555>'+icon+'</span>\\'">':'<span style="font-size:2.5em;color:#555">'+icon+'</span>')+'<span class="badge b-'+cls+'">'+m.source+'</span></div><div class="card-body"><h3>'+m.title+'</h3>'+(m.author?'<div class="author">by '+m.author+'</div>':'')+(m.description?'<div class="desc">'+m.description+'</div>':'')+'<div class="stats">'+(m.likes?'&#x2764; '+m.likes:'')+' '+(m.downloads?'&#x2B07; '+m.downloads:'')+'</div></div><div class="card-footer"><a href="'+m.url+'" target="_blank">'+(isLink?'打开搜索 &rarr;':'查看详情 &rarr;')+'</a></div></div>'}).join('')}
</script>
</body>
</html>`;

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/api/search') return handleSearch(request);
    return new Response(HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }
};

async function handleSearch(request) {
  const url = new URL(request.url);
  const q = url.searchParams.get('q') || '';
  const skip = { printables: url.searchParams.get('printables') === '0', makerworld: url.searchParams.get('makerworld') === '0', thingiverse: url.searchParams.get('thingiverse') === '0', cults3d: url.searchParams.get('cults3d') === '0', myminifactory: url.searchParams.get('myminifactory') === '0' };
  if (!q) return json({ models: [] });
  const tasks = [];
  if (!skip.printables) tasks.push(searchP(q));
  if (!skip.makerworld) tasks.push(searchM(q));
  if (!skip.thingiverse) tasks.push([f('Thingiverse', `https://www.thingiverse.com/search?q=${enc(q)}`)]);
  if (!skip.cults3d) tasks.push(searchC(q));
  if (!skip.myminifactory) tasks.push([f('MyMiniFactory', `https://www.myminifactory.com/search/?query=${enc(q)}`)]);
  const results = await Promise.allSettled(tasks);
  return json({ models: results.flatMap(r => r.status === 'fulfilled' ? r.value : []) });
}

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36';
function json(d) { return new Response(JSON.stringify(d), { headers: { 'Content-Type': 'application/json;charset=utf-8', 'Access-Control-Allow-Origin': '*' } }); }
function enc(s) { return encodeURIComponent(s); }
function f(source, url) { return { title: `去 ${source} 搜索`, source, url, image: '', likes: 0, downloads: 0, description: '' }; }
function fix(url) { return (url || '').replace(/^\/\//, 'https://'); }

async function searchP(q) {
  try {
    const r = await fetch('https://api2.printables.com/graphql', { method: 'POST', headers: { 'Content-Type': 'application/json', 'User-Agent': UA, 'Origin': 'https://www.printables.com' },
      body: JSON.stringify({ query: `query Search($q:String!,$limit:Int){search(q:$q,first:$limit,order:POINTS){edges{node{id name summary likeCount downloadCount user{username} images{tiny url}}}}}`, variables: { q, limit: 20 } }) });
    const d = await r.json();
    return (d?.data?.search?.edges || []).map(e => ({ title: e.node.name, source: 'Printables', url: `https://www.printables.com/model/${e.node.id}`, image: fix(e.node.images?.[0]?.tiny || ''), author: e.node.user?.username || '', likes: e.node.likeCount || 0, downloads: e.node.downloadCount || 0, description: (e.node.summary || '').slice(0, 300) }));
  } catch { return [f('Printables', `https://www.printables.com/search?q=${enc(q)}`)]; }
}

async function searchM(q) {
  try {
    const r = await fetch(`https://makerworld.com/v1/design-service/design/search?keyword=${enc(q)}&pageSize=20`, { headers: { 'User-Agent': UA, 'x-bbl-client-type': 'web', 'x-bbl-client-name': 'MakerWorld', 'x-bbl-client-version': '00.00.00.01', 'x-bbl-app-source': 'makerworld' } });
    const d = await r.json();
    const items = d?.data?.designs || d?.data?.list || d?.data || [];
    if (Array.isArray(items) && items.length) {
      return items.slice(0, 20).map(item => ({ title: item.name || item.title || '', source: 'MakerWorld', url: `https://makerworld.com/models/${item.id || item.designId || ''}`, image: fix(item.thumbnail || item.cover || ''), author: item.creator?.name || '', likes: item.likeCount || 0, downloads: item.downloadCount || 0, description: (item.summary || '').slice(0, 300) }));
    }
  } catch {}
  try {
    const r = await fetch(`https://makerworld.com/models?q=${enc(q)}`, { headers: { 'User-Agent': UA } });
    const html = await r.text();
    const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([^<]+)<\/script>/);
    if (m) {
      const next = JSON.parse(m[1]);
      const designs = next?.props?.pageProps?.designs || next?.props?.pageProps?.data || [];
      if (Array.isArray(designs) && designs.length) {
        return designs.slice(0, 20).map(item => ({ title: item.name || item.title || '', source: 'MakerWorld', url: `https://makerworld.com/models/${item.id || item.designId || ''}`, image: fix(item.thumbnail || ''), author: item.creator?.name || '', likes: item.likeCount || 0, downloads: item.downloadCount || 0, description: '' }));
      }
    }
  } catch {}
  return [f('MakerWorld', `https://makerworld.com/models?q=${enc(q)}`)];
}

async function searchC(q) {
  try {
    const r = await fetch(`https://cults3d.com/en/search?q=${enc(q)}`, { headers: { 'User-Agent': UA, 'Accept': 'text/html', 'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8' } });
    const html = await r.text();
    const re = /href="(\/en\/3d-model\/[^"]+)"/g;
    const models = []; let m;
    while ((m = re.exec(html)) && models.length < 15) {
      const href = m[1];
      const chunk = html.slice(m.index, m.index + 1800);
      let title = '';
      const altM = chunk.match(/alt="([^"]{4,150})"/); if (altM) title = altM[1];
      if (!title) { const hM = chunk.match(/<h[23][^>]*>([^<]{4,150})<\/h[23]>/); if (hM) title = hM[1]; }
      if (!title) { const tM = chunk.match(/>([^<>]{5,120})</); if (tM) title = tM[1]; }
      if (title && title.length > 3) {
        const imgM = chunk.match(/src="(https?:\/\/[^"]+\.(?:jpg|png|webp)[^"]*)"/);
        models.push({ title: title.trim(), source: 'Cults3D', url: `https://cults3d.com${href}`, image: fix(imgM?.[1] || ''), likes: 0, downloads: 0, description: '' });
      }
    }
    return models.length ? models : [f('Cults3D', `https://cults3d.com/en/search?q=${enc(q)}`)];
  } catch { return [f('Cults3D', `https://cults3d.com/en/search?q=${enc(q)}`)]; }
}
