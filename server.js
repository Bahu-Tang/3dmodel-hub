const express = require('express');
const path = require('path');
const { searchPrintables, searchMakerWorld, searchThingiverse, searchCults3D, searchMyMiniFactory } = require('./scrapers');

const app = express();
const PORT = process.env.PORT || 3456;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

app.get('/api/search', async (req, res) => {
  const query = (req.query.q || '').trim();
  if (!query) return res.json({ models: [], error: '请输入搜索关键词' });

  const platforms = [];
  if (req.query.printables !== '0') platforms.push(searchPrintables(query));
  if (req.query.makerworld !== '0') platforms.push(searchMakerWorld(query));
  if (req.query.thingiverse !== '0') platforms.push(searchThingiverse(query));
  if (req.query.cults3d !== '0') platforms.push(searchCults3D(query));
  if (req.query.myminifactory !== '0') platforms.push(searchMyMiniFactory(query));

  try {
    const results = await Promise.allSettled(platforms);
    const models = results.flatMap(r => r.status === 'fulfilled' ? r.value : []);
    res.json({ models });
  } catch (e) {
    res.json({ models: [], error: e.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`3D Model Hub 已启动: http://localhost:${PORT}`);
  console.log(`局域网访问: http://<本机IP>:${PORT}`);
});
