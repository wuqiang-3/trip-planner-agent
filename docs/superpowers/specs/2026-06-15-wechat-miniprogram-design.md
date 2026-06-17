# 智能旅行助手 · 微信小程序版 设计方案

- 日期:2026-06-15
- 分支:`feat/wechat-miniprogram`
- 作者:吴强(wuqiang-3)
- 状态:已与用户逐块确认,待用户复核本文档

---

## 1. 背景与目标

现有 `trip-planner-agent` 已有:
- **后端**:FastAPI + SimpleAgent + 高德地图 MCP,核心接口 `POST /api/trip/plan`,Agent 自动调用高德工具(POI/天气/路线)生成多日行程。
- **Web 前端**:Vue3 + TS + Vite + Ant Design Vue + 高德 JS API。

**目标**:在同一仓库内新增**微信小程序端**,复用现有后端,做出一个能用、好看的 v1。

**v1 范围(已确认)**:
- 后端**完全复用**,不新增接口、不接数据库、不做登录。
- **不做交互地图**,纯卡片/列表展示行程(经纬度数据保留,留给 v2 地图)。
- 技术栈:**原生微信小程序**(WXML/WXSS/JS)。
- 附加功能:**B 历史记录(本地缓存)** + **C 分享(微信转发卡片)**。
- 开发期用微信开发者工具"**不校验合法域名**"直连本地后端;HTTPS+ICP 备案+合法域名作为**发布前清单**,不阻塞开发。

**非目标(v2+)**:交互地图、微信登录、行程云端存储与可分享查看、导出。

---

## 2. 总体架构与数据流

```
微信小程序(原生)                现有后端(几乎不动)
┌──────────────────┐           ┌────────────────────────┐
│ 输入页 index      │           │ FastAPI                 │
│   ↓ wx.request    │ ──POST──▶ │ /api/trip/plan          │
│ 结果页 result     │ ◀─JSON─── │  → AI Agent              │
│   ↓ Storage       │           │  → 高德 MCP(POI/天气/路线)│
│ 历史页 history    │           └────────────────────────┘
└──────────────────┘
   本地缓存 wx.setStorageSync('trip_history')
```

- 小程序只做三件事:**收集表单 → 调一个接口 → 渲染返回的 `TripPlan`**。
- 历史完全存在用户手机本地(`wx.setStorageSync`),不依赖后端、不需登录。
- 后端可能需要确认的点:生成耗时长时网关层别超时(wx.request 不受浏览器 CORS 限制,通常无需改 CORS)。

---

## 3. 目录结构(monorepo,新增 `miniprogram/`)

```
trip-planner-agent/
├── backend/                  # 现有,不动
├── frontend/                 # 现有 Web 版,不动
├── miniprogram/              # 🆕 小程序代码(微信开发者工具项目根指向此目录)
│   ├── app.js
│   ├── app.json
│   ├── app.wxss
│   ├── project.config.json
│   ├── sitemap.json
│   ├── config/
│   │   └── env.js            # 后端 BASE_URL、选项常量
│   ├── utils/
│   │   ├── request.js        # wx.request 封装(Promise + 超时 + 错误)
│   │   └── history.js        # 本地历史读写
│   ├── pages/
│   │   ├── index/            # 首页/输入页
│   │   ├── result/           # 行程结果页
│   │   └── history/          # 历史列表页
│   └── components/
│       ├── day-card/         # 单日行程卡片
│       └── loading-overlay/  # 全屏生成动画
└── docs/superpowers/specs/2026-06-15-wechat-miniprogram-design.md
```

**模块边界**:
- `utils/request.js`:唯一与后端通信的地方,对外暴露 `planTrip(form)`。输入表单对象,输出 `TripPlan` 或抛错。
- `utils/history.js`:唯一读写本地历史的地方,暴露 `list() / get(id) / add(record) / remove(id)`。
- `components/day-card`:输入一个 `DayPlan`(+ 对应 `WeatherInfo`),纯展示,无副作用。
- 页面只负责编排:取数据 → 调 util → 喂组件。

---

## 4. 页面与交互

### 4.1 首页 / 输入页 `pages/index`

表单字段(与后端 `TripRequest` 一一对应):

| 控件 | 字段 | 类型/选项 | 必填 |
|---|---|---|---|
| 城市输入框 | `city` | 文本 | 是 |
| 出发日期 picker | `start_date` | YYYY-MM-DD | 是 |
| 返程日期 picker | `end_date` | YYYY-MM-DD | 是 |
| (自动计算) | `travel_days` | `end-start+1`,范围 1–30 | 是 |
| 交通方式 picker | `transportation` | 公共交通 / 自驾 / 步行 / 混合 | 是 |
| 住宿偏好 picker | `accommodation` | 经济型酒店 / 舒适型酒店 / 豪华酒店 / 民宿 | 是 |
| 旅行偏好多选 | `preferences` | 历史文化/自然风光/美食/购物/艺术/休闲 | 否 |
| 额外要求 textarea | `free_text_input` | 文本 | 否 |

交互:
- 校验:`city` 非空;`end_date >= start_date`;`travel_days ∈ [1,30]`,否则 `wx.showToast` 提示。
- 点「生成行程」→ 显示全屏生成动画 → 调 `planTrip` → 成功后 `wx.navigateTo` 到结果页并写入历史;失败弹错误。
- 右上/顶部入口跳「历史」页。

### 4.2 结果页 `pages/result`

数据来源两种:① 从首页生成后传入;② 从历史页点击传入(`historyId`,本地读取,不重新请求)。

渲染结构(基于真实 `TripPlan`):
- 顶部:`city` + 日期区间 + `budget.total`(预算合计)。
- 每天一个 `day-card`:
  - 头:`第N天` + `date` + 当日 `WeatherInfo`(按 date 匹配,☀️白天/夜间温度)。
  - `description` 当日概述;`transportation` / `accommodation` 标签。
  - 景点列表 `attractions[]`:`name` / `visit_duration`(分钟)/ `ticket_price` / `address` / `description`。
  - 餐饮 `meals[]`:`type`(早午晚)/ `name` / `estimated_cost`。
  - 酒店 `hotel`:`name` / `price_range` 或 `estimated_cost`。
- 底部:`overall_suggestions` 总体建议 + 「分享给好友」按钮。(历史在生成成功时自动写入,结果页不再提供手动保存,避免重复。)
- `location` 经纬度字段**不渲染但保留在数据中**(v2 地图用)。

### 4.3 历史页 `pages/history`

- 读 `wx.getStorageSync('trip_history')`,倒序列出 `{城市 · N日游, 生成时间}`。
- 点击项 → 结果页(传 `historyId`,本地取 `plan` 直接渲染)。
- 支持左滑/长按删除单条(`history.remove(id)`)。
- 空状态:引导去首页生成。

---

## 5. 历史(B)与分享(C)实现

### 5.1 历史(本地缓存)

记录结构:
```js
{
  id: String,           // 时间戳或 uuid
  createdAt: Number,    // Date.now()
  city: String,
  travelDays: Number,
  request: { ...TripRequest },  // 便于"再生成一次"
  plan: { ...TripPlan }         // 直接渲染用
}
```
- 存储 key:`trip_history`,值为数组,生成成功后 `unshift` 新记录。
- 上限保护:最多保留最近 30 条,超出截断(避免本地存储膨胀)。

### 5.2 分享(微信转发卡片)

- 结果页实现 `onShareAppMessage`,标题如「我的{city}{travelDays}日游行程 🧳」,`path` 指向首页。
- **已确认限制**:不接后端存储,好友点开分享卡片只进到**小程序首页**,**看不到分享者的具体行程**(行程数据过大无法塞进分享 `path` 参数;"可查看的行程分享"需后端存储 + shareId,属 v2)。v1 分享 = **传播小程序入口**。

---

## 6. 接口契约(冻结,前后端对齐)

**请求** `POST {BASE_URL}/api/trip/plan`,`Content-Type: application/json`
```json
{
  "city": "杭州",
  "start_date": "2026-06-20",
  "end_date": "2026-06-22",
  "travel_days": 3,
  "transportation": "公共交通",
  "accommodation": "经济型酒店",
  "preferences": ["历史文化", "美食"],
  "free_text_input": ""
}
```

**响应** `TripPlanResponse`
```
{ success: bool, message: str, data: TripPlan | null }
```
`TripPlan`:`city, start_date, end_date, days[DayPlan], weather_info[WeatherInfo], overall_suggestions, budget`
`DayPlan`:`date, day_index, description, transportation, accommodation, hotel, attractions[], meals[]`
(完整字段见 `backend/app/models/schemas.py`,本设计以该文件为准。)

`BASE_URL`:开发期 `http://localhost:8000`,集中配置在 `miniprogram/config/env.js`,后续切换正式域名只改一处。

---

## 7. 关键技术风险与对策

1. **生成慢**(LLM + 多次高德调用,约 30s–2min):
   - `app.json` 设 `networkTimeout.request = 120000`(与现有 Web 端一致)。
   - 结果出来前展示**全屏生成动画**,配阶段文案「正在搜索景点 → 查询天气 → 规划路线」(因接口非流式,文案为节奏引导,非真实进度)。
2. **真机调试连不上 `localhost`**:
   - 微信开发者工具勾「不校验合法域名」可连本地。
   - 真机预览无法访问 `localhost`,需改用电脑局域网 IP(后端 `--host 0.0.0.0`)或临时内网穿透。文档/README 写明步骤。
3. **发布前硬门槛**(单列清单,不阻塞开发):
   - 后端部署到公网 + HTTPS + 域名 ICP 备案。
   - 微信公众平台配置 request 合法域名。
   - 小程序提审发布。

---

## 8. 测试策略

- **结果页渲染**:先用一份真实/Mock 的 `TripPlan` JSON 灌进结果页,把卡片渲染调好,**不依赖后端是否在跑**。
- **表单校验**:必填、日期先后、天数 1–30 边界。
- **历史闭环**:生成 → 写入 → 列表 → 读取渲染 → 删除。
- **分享**:开发者工具模拟转发,校验标题与 path。
- **接口联调**:开发者工具开「不校验合法域名」直连本地后端,跑通真实生成一次。

---

## 9. 交付物

- `miniprogram/` 下可在微信开发者工具直接打开运行的小程序工程。
- 三个页面 + 两个组件 + request/history 两个 util。
- `miniprogram/README.md`:如何打开、连本地后端、真机调试、发布前清单。
- 全部提交到 `feat/wechat-miniprogram` 分支。
