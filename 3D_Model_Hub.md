# 3D Model Hub - 多平台 3D 模型聚合搜索工具

> 状态: 开发完成 | 最后更新: 2026-06-09

---

## 项目概述

在统一界面中搜索多个 3D 打印模型平台，返回卡片化结果。针对 **拓竹 A1** 打印机参数展示。

**支持平台**: Printables / MakerWorld / Thingiverse / Cults3D / MyMiniFactory

---

## 功能清单

### 已实现
- [x] 多平台聚合搜索（并行请求 5 个平台）
- [x] Printables GraphQL API 精确搜索
- [x] Thingiverse REST API 搜索
- [x] 平台筛选 / 排序（名称/点赞/下载）
- [x] 拓竹 A1 打印参数展示面板
- [x] 卡片式结果（缩略图、来源标签、作者、统计数据）
- [x] 搜索失败自动降级为跳转链接
- [x] 移动端响应式布局
- [x] 原生 Node.js http 服务器（无 Express 依赖）

### 待后续
- [ ] 收藏 / 书签本地存储
- [ ] 模型体积与 A1 打印尺寸自动对比
- [ ] 多打印机配置管理
- [ ] PWA 离线支持

---

## 技术架构

```
Browser                  Node.js (Windows 原生)          外部平台
+-----------+   HTTP     +-------------------+  axios    +-----------------+
| index.html | ------>   | server-http.js    | --------> | Printables GQL  |
| (卡片UI)   | <------   | /api/search       | <-------- | Thingiverse API |
+-----------+   JSON     | scrapers.js       |  cheerio  | MakerWorld HTML |
                         +-------------------+           | Cults3D HTML    |
                                                         | MyMiniFactory   |
                                                         +-----------------+
```

### 技术栈

| 层 | 技术 | 说明 |
|---|------|------|
| 运行时 | Node.js (Windows 原生) | v22+ |
| HTTP 服务器 | 原生 `http` 模块 | 无外部框架依赖 |
| HTTP 客户端 | axios | 请求各平台 API/页面 |
| HTML 解析 | cheerio | 解析 HTML 搜索结果（API 不可用时回退）|
| 前端 | 原生 HTML/CSS/JS | 零框架、单文件 |
| API 集成 | Printables GraphQL | 直接查 JSON，速度快、不会被拦 |

### 搜索流程

1. 前端 `/api/search?q=keyword` → 后端
2. 后端 `Promise.allSettled` 并行请求 5 个平台
3. Printables 使用 GraphQL API（获取 JSON 结果）
4. Thingiverse 使用 REST API
5. 其他平台抓取 HTML 后用 cheerio 提取
6. 失败则返回跳转链接卡片
7. 前端渲染卡片并支持排序

---

## 项目结构

```
F:\3dmodel\
  |- package.json          # 依赖: axios, cheerio
  |- server-http.js        # 原生 Node.js HTTP 服务
  |- scrapers.js           # 各平台搜索逻辑（API + HTML 双模式）
  |- ecosystem.config.js   # PM2 进程管理配置
  |- Dockerfile            # Docker 镜像
  |- docker-compose.yml    # Docker 一键部署
  |- setup.bat             # Windows 一键安装+启动
  |- 3D_Model_Hub.md       # 本文档
  |- public/
  |   |- index.html        # 前端页面（单文件，含 CSS + JS）
```

---

## 安装与运行

### 本机 Windows

双击 `setup.bat`，自动安装 Node.js（如未装）、安装依赖、启动服务。

或手动:
```powershell
cd F:\3dmodel
npm install
node server-http.js
```

访问 `http://localhost:3456`

### WSL 备选（不推荐，网络受限）

```bash
cp -r /mnt/f/3dmodel ~/
cd ~/3dmodel && npm install && node server-http.js
```

> WSL 请求会被 Cloudflare 拦截（403），仅当 Windows 不可用时使用。

---

## API 接口

### `GET /api/search`

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `q` | string | 是 | 搜索关键词 |
| `printables` | string | 否 | 设为 `0` 跳过 |
| `makerworld` | string | 否 | 设为 `0` 跳过 |
| `thingiverse` | string | 否 | 设为 `0` 跳过 |
| `cults3d` | string | 否 | 设为 `0` 跳过 |
| `myminifactory` | string | 否 | 设为 `0` 跳过 |

**响应**:
```json
{
  "models": [{
    "title": "Articulated Frog",
    "source": "Printables",
    "url": "https://www.printables.com/model/123456",
    "image": "https://...",
    "author": "user123",
    "likes": 890,
    "downloads": 15230,
    "description": "..."
  }]
}
```

---

## 平台整合详情

### Printables
- 优先使用 GraphQL API `api2.printables.com/graphql`
- 返回结构化 JSON（标题、作者、图片、点赞/下载数）
- 不可用时回退到 HTML 抓取

### MakerWorld
- HTML 页面抓取 `makerworld.com/models?q=...`
- cheerio 提取链接和图片

### Thingiverse
- REST API `api.thingiverse.com/search/:query`
- 返回完整数据（名称、作者、统计）

### Cults3D
- HTML 页面抓取 `cults3d.com/en/search?q=...`

### MyMiniFactory
- HTML 页面抓取 `myminifactory.com/search/?query=...`

---

## 拓竹 A1 兼容性参考

| 参数 | 规格 |
|------|------|
| 打印体积 | 256 x 256 x 256 mm |
| 喷嘴 | 0.4mm (支持 0.2mm) |
| 热端温度 | max 300 degC |
| 热床温度 | max 100 degC |
| 材料 | PLA / PETG / TPU / ABS / ASA / PA / PC |
| 平台 | 双面纹理 PEI 弹簧钢板 |

---

## 远程访问（随时随地使用）

### 方案 A: Cloudflare Tunnel (推荐，免费)

无需公网 IP、无需云服务器。电脑开着就行。

**1. 安装 cloudflared**
```powershell
winget install Cloudflare.cloudflared
```

**2. 启动隧道**
```powershell
# 先启动服务
cd F:\3dmodel
node server-http.js

# 另开一个终端
cloudflared tunnel --url http://localhost:3456
```

**3. 获得公网地址**

输出类似: `https://example-something.trycloudflare.com`

**4. 手机/电脑浏览器打开这个 URL 即可使用**

> 每次重启 cloudflared URL 会变化。想固定域名需要注册 Cloudflare 账号（免费），绑定自己的域名。

### 方案 B: ngrok (备选，免费)

```powershell
winget install ngrok
ngrok http 3456
```

会获得类似 `https://xxx.ngrok-free.app` 的地址。

### 方案 C: 路由器端口转发

如果有公网 IP:
1. 路由器设置端口转发: 外部 3456 → 电脑内网 IP:3456
2. 防火墙放行 3456 端口
3. 访问 `http://<你的公网IP>:3456`

### 方案 D: 云服务器部署 (7x24 无需电脑开机)

```bash
# 上传项目到任意云服务器后
cd 3dmodel
docker compose up -d
# 访问 http://<服务器IP>:3456
```

推荐低配云服务器（1核1G 即可，约 30-50元/月）。

### 开机自启 (Windows)

让电脑开机就自动启动服务:

**1. 创建 `autostart.bat`**
```bat
cd /d F:\3dmodel
start /min cloudflared tunnel --url http://localhost:3456
node server-http.js
```

**2. 放入启动文件夹**

按 `Win+R` 输入 `shell:startup`，把 `autostart.bat` 快捷方式拖进去。

这样每次开机自动启动服务 + 公网隧道，手机随时能访问。

---

## 踩坑记录

### 1. WSL 网络被 Cloudflare 403 拦截
WSL2 的虚拟网卡 IP 被 Cloudflare 判定为数据中心 IP。
**解决**: 改为 Windows 原生运行 `node server-http.js`

### 2. Printables 搜索空结果
Printables 页面是 JS 渲染，HTML 抓取拿不到内容。
**解决**: 改用 Printables GraphQL API `api2.printables.com/graphql`，直接获取 JSON。

### 3. batch 文件编码乱码
WSL 写入的 UTF-8 批处理在中文 Windows CMD 中乱码。
**解决**: 去掉所有中文和特殊字符，纯 ASCII 编写 `.bat` 文件。

### 4. iframe 嵌入被 X-Frame-Options 拦截
所有 3D 模型平台禁止 iframe 嵌入。
**解决**: 改为后台 API 抓取 + 前端卡片展示。

---

## Docker 部署

### 构建镜像
```bash
cd F:\3dmodel
docker build -t 3dmodel-hub .
docker run -d -p 3456:3456 --restart always 3dmodel-hub
```

### docker-compose
```bash
docker compose up -d
```

---

## 更新日志

- **2026-06-09 v1.3**: 新增 Cloudflare Tunnel 远程访问方案、修复 batch 编码问题、更新文档
- **2026-06-08 v1.2**: Printables 改用 GraphQL API、重写为 Windows 原生运行、修复网络问题
- **2026-06-08 v1.1**: 移除 Express 改用原生 http、添加 Docker 支持
- **2026-06-08 v1.0**: 初始版本

---

*文档最后更新: 2026-06-09*

---

## 远程访问（不开电脑、不用服务器）

### Cloudflare Workers 部署（推荐）

永久在线、全球加速、**完全免费**（每天 10 万次请求）。

#### 步骤

1. 打开 [dash.cloudflare.com](https://dash.cloudflare.com)，注册/登录（免费）

2. 左侧菜单 → **Workers & Pages** → **创建应用程序** → **创建 Worker**

3. 任意命名（如 `3dmodel-hub`），点击 **编辑代码**

4. 清空默认代码，粘贴 `worker.js` 的**全部内容**

5. 点击 **部署** → 获得地址如:
   ```
   https://3dmodel-hub.你的用户名.workers.dev
   ```

6. 手机/电脑浏览器打开这个地址即可使用

#### 特点

- 零成本，Cloudflare 免费计划
- 全球 300+ 节点加速，访问速度极快
- 自动 HTTPS
- 不需要电脑开机
- 不需要任何服务器
- Printables 和 Thingiverse 返回**真实搜索结果**
- MakerWorld、Cults3D 尝试抓取，失败则显示跳转链接
- MyMiniFactory 显示跳转链接

#### 自定义域名（可选）

如果有自己的域名（也托管在 Cloudflare）:

Workers & Pages → 你的 Worker → **触发器** → **自定义域** → 添加域名

这样就可以用 `hub.yourdomain.com` 访问。


---

## 部署方案对比（不开电脑、不用服务器）

### 方案总览

| 方案 | 费用 | 平台 | 配置难度 | 说明 |
|------|------|------|---------|------|
| Cloudflare Workers | 免费 10万/天 | 国际 | 简单 | 全球300+节点，速度快 |
| Vercel Serverless | 免费 100GB | 国际+国内 | 最简单 | 支持 GitHub 一键部署 |
| Deno Deploy | 免费 100万/月 | 国际 | 简单 | 备选方案 |
| 阿里云 FC | 免费 100万次/月 | 国内 | 中等 | 需实名认证 |
| 腾讯云 SCF | 免费 100万次/月 | 国内 | 中等 | 需实名认证 |

### Cloudflare Workers

1. 打开 https://dash.cloudflare.com 注册
2. Workers & Pages → 创建 Worker
3. 粘贴 `worker.js` 全部内容 → 部署
4. 获得 `https://xxx.workers.dev` 地址

### Vercel（推荐，最简单）

1. 把项目推送到 GitHub
2. 打开 https://vercel.com 注册（支持 GitHub 登录）
3. Import Git Repository → 选择项目
4. Vercel 自动检测并部署
5. 获得 `https://xxx.vercel.app` 地址

**手动配置**（如果自动检测失败）:
- Framework Preset: Other
- Build Command: (留空)
- Output Directory: public
- Install Command: npm install (会安装 axios/cheerio 给 api 函数用)

### Deno Deploy

1. 打开 https://deno.com/deploy 注册
2. 新建项目 → 粘贴 `worker.js`（代码兼容）
3. 获得 `https://xxx.deno.dev` 地址

### 国内平台

**阿里云函数计算 FC:**
1. 打开 https://fc.console.aliyun.com
2. 创建函数 → HTTP 触发器
3. 上传代码 → 获得公网 URL

**腾讯云 SCF (Serverless Cloud Function):**
1. 打开 https://console.cloud.tencent.com/scf
2. 创建函数 → API 网关触发器

---

## 当前已知限制

| 平台 | 状态 | 原因 |
|------|------|------|
| Printables | API 可用 (部署后) | GraphQL API，Cloudflare/Vercel IP 可访问 |
| Thingiverse | 需认证 | 公开 API 已关闭，只能跳转 |
| MakerWorld | 受 Cloudflare 保护 | 从 WSL/本地被拦，部署到 Cloudflare 后可能可用 |
| Cults3D | 间歇可用 | JS 渲染页面，偶尔可抓取 HTML |
| MyMiniFactory | JS 渲染 | 返回 200 但内容靠 JS 加载，只能跳转 |

