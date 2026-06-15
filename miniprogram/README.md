# 智能旅行助手 · 微信小程序版

原生微信小程序,复用本仓库 `backend/` 的 `/api/trip/plan` 接口。

## 本地开发
1. 启动后端:`cd backend && uvicorn app.api.main:app --host 0.0.0.0 --port 8000`
2. 微信开发者工具 → 导入项目 → 目录选 `miniprogram/` → 用测试号
3. 勾选「详情 → 本地设置 → 不校验合法域名」(连本地 http 后端必需)
4. 后端地址配置在 `config/env.js` 的 `BASE_URL`

## 真机预览
真机连不上 `localhost`。把 `config/env.js` 的 `BASE_URL` 改为电脑局域网 IP(如 `http://192.168.1.10:8000`),后端用 `--host 0.0.0.0` 启动,手机与电脑同一 WiFi。

## 纯逻辑测试
`cd miniprogram && npm install && npm test`(Jest,测 `utils/trip` 与 `utils/history`,共 23 个用例)。

## 目录结构
```
miniprogram/
├── config/env.js          # 后端地址 + 表单选项常量
├── utils/
│   ├── trip.js            # 纯逻辑:日期计算/校验/构造请求/天气匹配/响应解析
│   ├── history.js         # 本地历史:list/get/add/remove(上限30)
│   └── request.js         # wx.request 封装 + planTrip
├── components/
│   ├── day-card/          # 单日行程卡片
│   └── loading-overlay/   # 全屏生成动画
├── pages/
│   ├── index/             # 输入页
│   ├── result/            # 结果页(支持 ?mock=1 / ?historyId=xxx)
│   └── history/           # 历史页
└── mock/trip-plan.js      # 调结果页 UI 用的假数据
```

## 功能
- 输入需求 → AI 生成多日行程(卡片展示:景点/餐饮/酒店/天气/预算/建议)
- 历史:本地缓存最近 30 条(`wx.setStorageSync`),不依赖登录与后端
- 分享:微信转发卡片(v1 仅引流到首页,不传具体行程)

## 调试技巧
- 结果页单独验证 UI:开发者工具「编译模式」启动页设 `pages/result/result`、启动参数 `mock=1`。

## 发布前清单(未完成不可正式发布)
- [ ] 后端部署公网 + HTTPS + 域名 ICP 备案
- [ ] 微信公众平台配置 request 合法域名
- [ ] `project.config.json` 换成真实 AppID
- [ ] 小程序提审发布

## 已知限制(v1)
- 无交互地图(经纬度已在数据中保留,留给 v2)
- 分享卡片好友点开只到首页,看不到分享者的具体行程(需后端存储 + shareId,v2)
