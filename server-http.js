const http = require('http');
const fs = require('fs');
const path = require('path');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
};

const publicDir = path.join(__dirname, 'public');

async function searchAll(query, flags) {
  const { searchPrintables, searchMakerWorld, searchThingiverse, searchCults3D, searchMyMiniFactory } = require('./scrapers');
  const tasks = [];
  if (flags.printables !== 0) tasks.push(searchPrintables(query));
  if (flags.makerworld !== 0) tasks.push(searchMakerWorld(query));
  if (flags.thingiverse !== 0) tasks.push(searchThingiverse(query));
  if (flags.cults3d !== 0) tasks.push(searchCults3D(query));
  if (flags.myminifactory !== 0) tasks.push(searchMyMiniFactory(query));
  const results = await Promise.allSettled(tasks);
  return results.flatMap(r => r.status === 'fulfilled' ? r.value : []);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === '/api/search') {
    const q = url.searchParams.get('q') || '';
    if (!q) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ models: [] })); return; }
    try {
      const flags = {
        printables: url.searchParams.get('printables') === '0' ? 0 : 1,
        makerworld: url.searchParams.get('makerworld') === '0' ? 0 : 1,
        thingiverse: url.searchParams.get('thingiverse') === '0' ? 0 : 1,
        cults3d: url.searchParams.get('cults3d') === '0' ? 0 : 1,
        myminifactory: url.searchParams.get('myminifactory') === '0' ? 0 : 1,
      };
      const models = await searchAll(q, flags);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ models }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ models: [], error: e.message }));
    }
    return;
  }

  let filePath = url.pathname === '/' ? '/index.html' : url.pathname;
  const fullPath = path.join(publicDir, filePath);
  if (!fullPath.startsWith(publicDir)) { res.writeHead(403); res.end('Forbidden'); return; }

  try {
    const content = fs.readFileSync(fullPath);
    const ext = path.extname(fullPath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(content);
  } catch {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(fs.readFileSync(path.join(publicDir, 'index.html')));
  }
});

const PORT = 3456;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`3D Model Hub: http://localhost:${PORT}`);
});
