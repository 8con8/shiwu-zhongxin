# 事务中心 · 纯静态可用版

原版依赖 `mock_server.py` / `proxy_server.py`（Python）才能登录和出数据。
这个版本把后端整套搬进了浏览器，**不需要任何服务端**，扔进 WebCatX 或任何静态托管就能直接跑。

> 实测环境：纯静态 HTTP 服务（无任何接口），页面自动免密登录 → 首页 → 我的申请 → 卡片详情全流程通过。

---

## 一、怎么用

### 方式一：直接打开（WebCatX / 手机浏览器）
1. 整个文件夹拷到手机 `/WebCatX/project/`（或 WebCatX 的项目目录）下
2. 用 WebCatX 打开 `index.html`
3. 完成 —— 自动进系统，不用登录

> 实测用 `file://` 直接打开（不起任何服务）也能正常渲染，首页 / 列表 / 底部导航全部正常。
> 因为所有接口都被 `local-mock.js` 在浏览器里拦掉了，不产生真实网络请求，所以不受 `file://` 的跨域限制。

### 方式二：部署到公网（任何设备都能打开）
见 **第八节**。拿到 `https://xxx.github.io/仓库名/` 这种链接，手机、电脑、平板都能直接访问。

### 方式三：电脑本地起服务
```bash
cd 这个文件夹
python -m http.server 8080
```
浏览器开 `http://127.0.0.1:8080/`。

---

## 二、日常要改的东西在哪

| 想改什么 | 改哪个文件 | 怎么改 |
|---|---|---|
| 字体 / 字号 | `theme.css` | 顶部 `--app-font`、`--app-size` |
| 页面上的文字 | `text-map.js` | 写 `"原文": "新文"` 键值对，改完刷新 |
| 有哪些文字可改 | `text-list.txt` | 753 条清单，搜关键词 |
| 用户信息（姓名/学号） | `local-mock.js` 顶部 `USER` | 直接改字符串 |
| 部门列表 | `local-mock.js` 的 `DEPARTMENTS` | 改 id / name |
| 事项列表（报修/请假…） | `local-mock.js` 的 `AFFAIRS` | 数组增删 |
| 我的申请（已办结/审批中） | `local-mock.js` 的 `ARC_LIST` / `CURRENT_LIST` | 数组增删 |
| 卡片详情的版式 | `detail.html` → 跑 `python _gen_cardview.py` | 见下方说明 |

### 改卡片详情版式（重要）
卡片详情页的模板是从 `detail.html` **内联**进 `card-view.js` 的（纯静态不能 fetch 本地文件）。

改版式的正确姿势：
1. 改 `detail.html`
2. 在本目录执行 `python _gen_cardview.py`
3. 它会重新生成 `card-view.js`

只想改字段值（结束时间/天数/结果）不用跑脚本，改 `local-mock.js` 的数据就行。

---

## 三、隐藏功能：7878

在首页搜索框（提示语「请输入事务名称」那个）里输入 **`7878`**：

- 右下角出现「＋ 添加请假流程」「－ 删除请假流程」
- 长按任意卡片 → 编辑它的名称/完结时间/耗时
- 清空搜索框 → 自动收回按钮

添加的卡片存在浏览器 localStorage 里（key：`__custom_flows_v1`），点卡片进详情页。

---

## 四、这个版本改了什么

### 新增
| 文件 | 作用 |
|---|---|
| `local-mock.js` | 拦截 XHR / fetch，本地应答全部接口（登录、系统设置、部门、事项、我的申请、阅办、评价、统计…） |
| `card-view.js` | 卡片详情页（页内浮层渲染，替代原来的 `card-N.html` 文件跳转） |
| `page-guard.js` | 路由自愈 + 空页面兜底（见下方「两个关键修复」） |
| `_gen_cardview.py` | 改完 `detail.html` 后用它重新生成 `card-view.js`（可选，只有改版式才需要） |

### 修改 `index.html`
1. head 里加 `local-mock.js`（必须最先加载）和 `card-view.js`
2. 删掉 `document.writeln` 引 `//as.alipayobjects.com/es6-promise` 的外链（断网会卡住加载）
3. `ensureCardFile()` 不再 POST `/__make_card`（静态托管下必然 404），改为本地回调
4. `syncCardFiles()` 置空（不再探测卡片的独立 HTML 文件是否存在）
5. `openCardFile()` 改为调 `__openCardView()` 渲染浮层
6. 原始卡片点击也走浮层（原来交给 Vue 跳它自己的详情页，但详情接口没数据 → 空白页）
7. 修了 `parseCost()` 的老 bug：原来 `[^\s]+` 会把紧跟的「申请结果：已完成」一起吃进去，导致详情页显示「1天4小时申请结果：已完成」

### 删掉（都是死文件 / 重复）
| 文件 | 原因 |
|---|---|
| `add-flow.js` | 旧版逻辑，全项目无人引用（真正生效的代码在 `index.html` 内联段） |
| `_addflow_inline.js` | 与 `index.html` 内联段**逐字节相同**，无人引用 |
| `app.html` | 与 `index.html` **md5 完全一致**，纯冗余副本 |
| `card-1/2/orig.html` | 由 python 动态生成的产物，纯静态下不存在也无用 |
| `cards.json` | 同上，python 用的索引文件 |
| `make_cards.py` | 同上，生成卡片的脚本 |
| `mock_server.py` / `proxy_server.py` / `start.sh` | 被 `local-mock.js` 取代，纯静态环境跑不了 Python |
| `shot1.jpg` / `shot2.png` | 截图素材 |
| `README.md` | 换成这份 |

---

## 五、两个关键修复（页面「串不起来」的真正原因）

### 1. 接口兜底返回空对象 → 列表页全部白屏

原来没单独造数据的接口一律返回 `ok({})`。但列表页拿到 `{}` 后会去取
`data.list.length` / `data.records.map(...)`，`undefined` 直接抛 `TypeError`，
React 渲染中断，页面就是一片白。

现在兜底返回一个「万能空结构」：

```js
{ list: [], records: [], rows: [], items: [], content: [], data: [],
  total: 0, count: 0, pageNum: 1, pageSize: 20, pages: 0,
  state: 0, status: 0, readAll: false, unreadCount: 0 }
```

页面至少能渲染出「暂无相关信息」的空状态，而不是白屏。

### 2. 初始化绑在首页组件上 → 直接打开子页面必白屏

这套前端把「登录 + 系统设置」的初始化写在首页组件里。所以：

- 从首页点进去 → 正常
- 直接打开 `#/draft` 或在那页刷新 → 初始化没跑 → 整页空白

`page-guard.js` 做的事：发现「不是首页 + 页面空白 + 还没初始化过」，
先回到 `#/` 把初始化跑完，2.2 秒后自动跳回原页面。实测 14 个子页面里 10 个能
靠这个自愈正常渲染。

剩下 4 个（全部事务 / 办事指南 / 常用意见 / 设置）依赖深层业务数据，
离线环境造不出来，会显示一个明确的提示页（模块名 + 说明 + 返回首页按钮），
不会白屏卡死。

---

## 六、文件结构

```
├── index.html                 入口（唯一入口页）
├── local-mock.js              ★ 本地后端（改数据改这里）
├── card-view.js               ★ 卡片详情浮层（由 detail.html 生成）
├── page-guard.js              路由自愈 + 空页面兜底
├── theme.css                  ★ 字体配置
├── text-map.js                ★ 文字替换表
├── detail.html                卡片详情模板源文件（改完跑 _gen_cardview.py）
├── text-list.txt              753 条可替换文字清单
│
├── common.b735d9be7547c936300d.js   webpack runtime（含 70 项 chunk 映射表）
├── index.17246456.js               主 bundle
├── index.6255e841.css              全局样式
├── fastclick.03d1d3b3.js           点击延迟优化
├── hwh5-cloudonline.js             华为云 WeLink 桥接
├── 0.*.async.js ~ 69.*.async.js    70 个路由 chunk（按需加载）
├── static/                         图片资源
├── font/                           iconfont 图标字体
├── icons/                          事项图标
└── titleIcon.png                   页面图标
```

---

## 七、为什么这些文件看起来「互相没关联」

这是 webpack 打包产物的正常形态，不是文件坏了：

- `index.html` 只显式引 5 个文件（`common.js` / `index.js` / `fastclick` / `text-map` / `text-override`）
- 70 个 `N.哈希.async.js` **互不引用**，靠 `common.js` 里的一张映射表拼文件名，运行时动态注入 `<script>`
- 首屏只加载 **1 个** chunk，其余点进对应页面才下载

映射表长这样（在 `common.b735d9be7547c936300d.js` 里）：

```js
{0:"ae283e6d", 1:"2d767b87", ..., 69:"477798fc"}[chunkId] + ".async.js"
```

70 项全部能对上实际文件，一个不缺。

---

## 八、部署到公网（GitHub Pages / Cloudflare Pages）

### 能不能直接传 GitHub Pages？能，而且这套最适合。

原因：

- 纯静态，没有后端，不需要 Node/PHP 运行环境
- 用的是 **hash 路由**（`#/myApply` 这种）。换成 `history` 模式才需要服务端 rewrite 配置；
  hash 模式在 GitHub Pages 上开箱即用，不用写任何 404 / rewrite 规则
- 所有资源都是相对路径（`./xxx.js`），放在 `https://用户名.github.io/仓库名/` 这种子目录下也不会 404

### 仓库结构

**把本目录里的所有文件放到仓库根目录**，不要多套一层文件夹：

```
仓库根/
├── index.html          ← 必须是根目录
├── local-mock.js
├── card-view.js
├── page-guard.js
├── .nojekyll           ← 已包含，别删
├── static/  font/  icons/
└── 0-69 的 async.js …
```

`.nojekyll` 是给 GitHub Pages 看的：告诉它别用 Jekyll 处理，直接原样发布。

### 上传（三选一）

| 方式 | 适合 | 注意 |
|---|---|---|
| **GitHub Desktop** | 不想碰命令行 | 直接把整个文件夹拖进去，无文件数量限制，最省事 |
| **git 命令行** | 熟 git | `git init` → `add` → `commit` → `push` |
| 网页 Upload files | 临时改文件 | **一次最多 100 个文件**，本项目 111 个，要分两批拖 |

> 网页上传分批的办法：第一批先拖 `index.html` + 4 个 js + css + `static/` `font/` `icons/` 三个目录；
> 第二批单独拖那 70 个 `N.哈希.async.js`。

### 开启 Pages

仓库页 → **Settings** → 左侧 **Pages** → Source 选 **Deploy from a branch** →
Branch 选 **main**、目录选 **/ (root)** → Save。

等 1~3 分钟，链接是：

```
https://你的用户名.github.io/仓库名/
```

仓库必须是 **Public**（免费账号的 Pages 只支持公开仓库）。

### 国内访问提醒

`*.github.io` 在国内部分网络下会被 DNS 污染或限速，打不开不一定是部署错了。
要稳定可以换：

- **Cloudflare Pages**（免费、国内连通性通常好于 github.io，同样支持纯静态 + hash 路由）
- Vercel / Netlify（同上，注册后拖文件夹即可）

三个平台的用法都一样：**拖文件夹 → 拿到 `https://xxx.pages.dev` 链接**。

---

## 九、已知限制

1. **接口全是假数据**。数据写死在 `local-mock.js`，不会真的提交到服务器。
2. **原始卡片详情**用的是 `detail.html` 的示例内容（申请人「谢哮」等），只有结束时间/天数/结果是动态的。
3. **全部事务 / 办事指南 / 常用意见 / 设置**这 4 个页面依赖深层业务数据，离线版只给提示页。
4. 首屏首次加载会先闪一下首页（路由自愈），属正常现象。
5. 想接真后端：删掉 `index.html` 里的 `local-mock.js` 那一行，改用 `proxy_server.py` 反代，
   此时 `page-guard.js` 也不用保留。
