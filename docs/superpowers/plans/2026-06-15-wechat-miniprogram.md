# 微信小程序版 v1 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `trip-planner-agent` 仓库新增 `miniprogram/`,做出一个可在微信开发者工具运行的原生小程序:输入旅行需求 → 调现有后端 `/api/trip/plan` → 卡片化展示行程,带本地历史与微信分享。

**Architecture:** 原生微信小程序(WXML/WXSS/JS),三页面(输入/结果/历史)+两组件(单日卡片/生成动画)+四个 util(env 配置 / request / history / trip 纯逻辑)。后端完全复用,不新增接口。纯逻辑用 Jest 做 TDD;页面/组件在开发者工具人工验证。

**Tech Stack:** 原生微信小程序、JavaScript(CommonJS)、Jest(仅开发期测纯逻辑)、现有 FastAPI 后端。

**设计依据:** `docs/superpowers/specs/2026-06-15-wechat-miniprogram-design.md`

---

## 文件结构

```
miniprogram/
├── package.json              # 仅开发期 Jest 依赖,不进小程序包
├── jest.setup.js             # 提供 wx 全局 mock
├── project.config.json       # 开发者工具项目配置(miniprogramRoot=本目录)
├── sitemap.json
├── app.js / app.json / app.wxss
├── config/
│   └── env.js                # BASE_URL + 选项常量
├── utils/
│   ├── trip.js               # 纯逻辑:computeTravelDays/validateForm/buildRequest/matchWeather/parseTripResponse
│   ├── history.js            # 本地历史:list/get/add/remove(上限30)
│   └── request.js            # wxRequest 封装 + planTrip
├── components/
│   ├── day-card/             # 单日行程卡片(输入 DayPlan + WeatherInfo)
│   └── loading-overlay/      # 全屏生成动画
├── pages/
│   ├── index/                # 输入页
│   ├── result/               # 结果页
│   └── history/              # 历史页
├── mock/
│   └── trip-plan.js          # 一份真实结构的 TripPlan 假数据(调结果页UI用)
└── tests/
    ├── trip.test.js
    └── history.test.js
```

**职责边界:**
- `utils/trip.js`:无副作用纯函数,可单测。
- `utils/history.js`:唯一读写 `wx.setStorageSync('trip_history')` 的地方。
- `utils/request.js`:唯一调 `wx.request` 的地方,对外只暴露 `planTrip(form)`。
- `components/day-card`:纯展示,输入一天数据。
- 页面只编排,不写业务逻辑细节。

---

## Task 1: 项目脚手架 + Jest 测试环境

**Files:**
- Create: `miniprogram/app.json`
- Create: `miniprogram/app.js`
- Create: `miniprogram/app.wxss`
- Create: `miniprogram/project.config.json`
- Create: `miniprogram/sitemap.json`
- Create: `miniprogram/package.json`
- Create: `miniprogram/jest.setup.js`

- [ ] **Step 1: 创建 `app.json`**

```json
{
  "pages": [
    "pages/index/index",
    "pages/result/result",
    "pages/history/history"
  ],
  "window": {
    "navigationBarTitleText": "智能旅行助手",
    "navigationBarBackgroundColor": "#2b6cb0",
    "navigationBarTextStyle": "white",
    "backgroundColor": "#f5f7fa"
  },
  "networkTimeout": {
    "request": 120000
  },
  "style": "v2",
  "sitemapLocation": "sitemap.json"
}
```

- [ ] **Step 2: 创建 `app.js`、`app.wxss`、`sitemap.json`**

`app.js`:
```js
App({
  globalData: {}
})
```

`app.wxss`:
```css
page {
  background: #f5f7fa;
  font-family: -apple-system, "PingFang SC", sans-serif;
  color: #1a202c;
}
```

`sitemap.json`:
```json
{ "rules": [{ "action": "allow", "page": "*" }] }
```

- [ ] **Step 3: 创建 `project.config.json`**

```json
{
  "miniprogramRoot": "./",
  "projectname": "trip-planner-miniprogram",
  "description": "智能旅行助手小程序版",
  "setting": {
    "urlCheck": false,
    "es6": true,
    "postcss": true,
    "minified": true
  },
  "compileType": "miniprogram",
  "libVersion": "latest",
  "appid": "touristappid"
}
```

> 注:`urlCheck:false` 即「不校验合法域名」,开发期连本地后端用;`appid` 先用测试号占位,有真实 AppID 再替换。

- [ ] **Step 4: 创建 Jest 环境 `package.json` 与 `jest.setup.js`**

`package.json`:
```json
{
  "name": "trip-planner-miniprogram",
  "private": true,
  "scripts": {
    "test": "jest"
  },
  "devDependencies": {
    "jest": "^29.7.0"
  },
  "jest": {
    "testEnvironment": "node",
    "setupFiles": ["<rootDir>/jest.setup.js"],
    "testMatch": ["<rootDir>/tests/**/*.test.js"]
  }
}
```

`jest.setup.js`(提供内存版 wx storage mock):
```js
const store = {}
global.__wxStore = store
global.wx = {
  getStorageSync: (k) => (k in store ? store[k] : ''),
  setStorageSync: (k, v) => { store[k] = v },
  removeStorageSync: (k) => { delete store[k] }
}
global.__resetWxStore = () => { for (const k in store) delete store[k] }
```

- [ ] **Step 5: 安装依赖并验证 Jest 可运行**

Run: `cd miniprogram && npm install`
然后建一个临时占位测试 `tests/smoke.test.js`:
```js
test('jest works', () => { expect(1 + 1).toBe(2) })
```
Run: `cd miniprogram && npx jest`
Expected: PASS(1 个测试通过)。通过后删除 `tests/smoke.test.js`。

- [ ] **Step 6: 在微信开发者工具人工验证工程可打开**

操作:微信开发者工具 → 导入项目 → 目录选 `miniprogram/` → 测试号。
预期:能编译,出现「智能旅行助手」导航栏,无报错(页面暂空,后续任务补)。
> 若三个页面文件还没建会报缺页;可在 Task 9–11 完成后再做本步完整验证,此处只确认能导入。

- [ ] **Step 7: Commit**

```bash
cd ~/Desktop/trip-planner-agent
git add miniprogram/
git commit -m "chore(miniapp): 脚手架与 Jest 测试环境"
```

---

## Task 2: 配置常量 `config/env.js`

**Files:**
- Create: `miniprogram/config/env.js`

- [ ] **Step 1: 写配置(无测试,纯常量)**

```js
// 后端地址:开发期连本地;上线改这一处
const BASE_URL = 'http://localhost:8000'

const TRANSPORTATION_OPTIONS = ['公共交通', '自驾', '步行', '混合']
const ACCOMMODATION_OPTIONS = ['经济型酒店', '舒适型酒店', '豪华酒店', '民宿']
const PREFERENCE_OPTIONS = ['历史文化', '自然风光', '美食', '购物', '艺术', '休闲']
const HISTORY_KEY = 'trip_history'
const HISTORY_LIMIT = 30

module.exports = {
  BASE_URL,
  TRANSPORTATION_OPTIONS,
  ACCOMMODATION_OPTIONS,
  PREFERENCE_OPTIONS,
  HISTORY_KEY,
  HISTORY_LIMIT
}
```

- [ ] **Step 2: Commit**

```bash
git add miniprogram/config/env.js
git commit -m "feat(miniapp): 配置常量(后端地址与表单选项)"
```

---

## Task 3: `utils/trip.js` — computeTravelDays(TDD)

**Files:**
- Create: `miniprogram/tests/trip.test.js`
- Create: `miniprogram/utils/trip.js`

- [ ] **Step 1: 写失败测试**

`tests/trip.test.js`:
```js
const trip = require('../utils/trip')

describe('computeTravelDays', () => {
  test('同一天为1天', () => {
    expect(trip.computeTravelDays('2026-06-20', '2026-06-20')).toBe(1)
  })
  test('06-20到06-22为3天(含首尾)', () => {
    expect(trip.computeTravelDays('2026-06-20', '2026-06-22')).toBe(3)
  })
  test('结束早于开始返回0', () => {
    expect(trip.computeTravelDays('2026-06-22', '2026-06-20')).toBe(0)
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd miniprogram && npx jest tests/trip.test.js`
Expected: FAIL,`trip.computeTravelDays is not a function`。

- [ ] **Step 3: 实现**

`utils/trip.js`:
```js
function computeTravelDays(startDate, endDate) {
  const s = new Date(startDate + 'T00:00:00Z').getTime()
  const e = new Date(endDate + 'T00:00:00Z').getTime()
  if (isNaN(s) || isNaN(e) || e < s) return 0
  return Math.round((e - s) / 86400000) + 1
}

module.exports = { computeTravelDays }
```

- [ ] **Step 4: 跑测试确认通过**

Run: `cd miniprogram && npx jest tests/trip.test.js`
Expected: PASS(3 个通过)。

- [ ] **Step 5: Commit**

```bash
git add miniprogram/utils/trip.js miniprogram/tests/trip.test.js
git commit -m "feat(miniapp): trip.computeTravelDays + 测试"
```

---

## Task 4: `utils/trip.js` — validateForm(TDD)

**Files:**
- Modify: `miniprogram/tests/trip.test.js`
- Modify: `miniprogram/utils/trip.js`

- [ ] **Step 1: 追加失败测试**

在 `tests/trip.test.js` 末尾追加:
```js
describe('validateForm', () => {
  const base = { city: '杭州', start_date: '2026-06-20', end_date: '2026-06-22' }

  test('合法表单通过', () => {
    expect(trip.validateForm(base)).toEqual({ valid: true, message: '' })
  })
  test('城市为空报错', () => {
    const r = trip.validateForm({ ...base, city: '' })
    expect(r.valid).toBe(false)
    expect(r.message).toContain('城市')
  })
  test('结束早于开始报错', () => {
    const r = trip.validateForm({ ...base, end_date: '2026-06-19' })
    expect(r.valid).toBe(false)
    expect(r.message).toContain('日期')
  })
  test('超过30天报错', () => {
    const r = trip.validateForm({ city: '杭州', start_date: '2026-01-01', end_date: '2026-03-01' })
    expect(r.valid).toBe(false)
    expect(r.message).toContain('30')
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd miniprogram && npx jest tests/trip.test.js -t validateForm`
Expected: FAIL,`trip.validateForm is not a function`。

- [ ] **Step 3: 实现(在 `utils/trip.js` 增加函数并导出)**

```js
function validateForm(form) {
  if (!form.city || !form.city.trim()) {
    return { valid: false, message: '请填写目的地城市' }
  }
  if (!form.start_date || !form.end_date) {
    return { valid: false, message: '请选择出发和返程日期' }
  }
  const days = computeTravelDays(form.start_date, form.end_date)
  if (days <= 0) {
    return { valid: false, message: '返程日期不能早于出发日期' }
  }
  if (days > 30) {
    return { valid: false, message: '行程天数不能超过30天' }
  }
  return { valid: true, message: '' }
}

module.exports = { computeTravelDays, validateForm }
```

- [ ] **Step 4: 跑测试确认通过**

Run: `cd miniprogram && npx jest tests/trip.test.js`
Expected: PASS(全部通过)。

- [ ] **Step 5: Commit**

```bash
git add miniprogram/utils/trip.js miniprogram/tests/trip.test.js
git commit -m "feat(miniapp): trip.validateForm + 测试"
```

---

## Task 5: `utils/trip.js` — buildRequest(TDD)

**Files:**
- Modify: `miniprogram/tests/trip.test.js`
- Modify: `miniprogram/utils/trip.js`

- [ ] **Step 1: 追加失败测试**

```js
describe('buildRequest', () => {
  test('补齐travel_days与默认值', () => {
    const form = {
      city: '杭州', start_date: '2026-06-20', end_date: '2026-06-22',
      transportation: '公共交通', accommodation: '经济型酒店',
      preferences: ['美食']
    }
    expect(trip.buildRequest(form)).toEqual({
      city: '杭州',
      start_date: '2026-06-20',
      end_date: '2026-06-22',
      travel_days: 3,
      transportation: '公共交通',
      accommodation: '经济型酒店',
      preferences: ['美食'],
      free_text_input: ''
    })
  })
  test('preferences与free_text_input缺省', () => {
    const form = {
      city: '北京', start_date: '2026-07-01', end_date: '2026-07-01',
      transportation: '自驾', accommodation: '民宿'
    }
    const r = trip.buildRequest(form)
    expect(r.preferences).toEqual([])
    expect(r.free_text_input).toBe('')
    expect(r.travel_days).toBe(1)
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd miniprogram && npx jest tests/trip.test.js -t buildRequest`
Expected: FAIL,`trip.buildRequest is not a function`。

- [ ] **Step 3: 实现**

```js
function buildRequest(form) {
  return {
    city: form.city.trim(),
    start_date: form.start_date,
    end_date: form.end_date,
    travel_days: computeTravelDays(form.start_date, form.end_date),
    transportation: form.transportation,
    accommodation: form.accommodation,
    preferences: form.preferences || [],
    free_text_input: form.free_text_input || ''
  }
}

module.exports = { computeTravelDays, validateForm, buildRequest }
```

- [ ] **Step 4: 跑测试确认通过**

Run: `cd miniprogram && npx jest tests/trip.test.js`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add miniprogram/utils/trip.js miniprogram/tests/trip.test.js
git commit -m "feat(miniapp): trip.buildRequest + 测试"
```

---

## Task 6: `utils/trip.js` — matchWeather + parseTripResponse(TDD)

**Files:**
- Modify: `miniprogram/tests/trip.test.js`
- Modify: `miniprogram/utils/trip.js`

- [ ] **Step 1: 追加失败测试**

```js
describe('matchWeather', () => {
  const weather = [
    { date: '2026-06-20', day_weather: '晴', day_temp: 28, night_temp: 22 },
    { date: '2026-06-21', day_weather: '多云', day_temp: 27, night_temp: 21 }
  ]
  test('按日期匹配', () => {
    expect(trip.matchWeather(weather, '2026-06-21').day_weather).toBe('多云')
  })
  test('无匹配返回null', () => {
    expect(trip.matchWeather(weather, '2026-06-30')).toBeNull()
  })
  test('空数组返回null', () => {
    expect(trip.matchWeather([], '2026-06-20')).toBeNull()
  })
})

describe('parseTripResponse', () => {
  test('success取data', () => {
    const data = { city: '杭州', days: [] }
    expect(trip.parseTripResponse({ success: true, message: 'ok', data })).toBe(data)
  })
  test('success=false抛错带message', () => {
    expect(() => trip.parseTripResponse({ success: false, message: '生成失败', data: null }))
      .toThrow('生成失败')
  })
  test('data为空抛错', () => {
    expect(() => trip.parseTripResponse({ success: true, message: '', data: null }))
      .toThrow()
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd miniprogram && npx jest tests/trip.test.js -t "matchWeather|parseTripResponse"`
Expected: FAIL,函数未定义。

- [ ] **Step 3: 实现**

```js
function matchWeather(weatherInfo, date) {
  if (!Array.isArray(weatherInfo)) return null
  return weatherInfo.find((w) => w.date === date) || null
}

function parseTripResponse(resp) {
  if (!resp || !resp.success || !resp.data) {
    throw new Error((resp && resp.message) || '行程生成失败,请重试')
  }
  return resp.data
}

module.exports = {
  computeTravelDays, validateForm, buildRequest, matchWeather, parseTripResponse
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `cd miniprogram && npx jest tests/trip.test.js`
Expected: PASS(全部)。

- [ ] **Step 5: Commit**

```bash
git add miniprogram/utils/trip.js miniprogram/tests/trip.test.js
git commit -m "feat(miniapp): trip.matchWeather/parseTripResponse + 测试"
```

---

## Task 7: `utils/history.js` — 本地历史(TDD)

**Files:**
- Create: `miniprogram/tests/history.test.js`
- Create: `miniprogram/utils/history.js`

- [ ] **Step 1: 写失败测试**

`tests/history.test.js`:
```js
const history = require('../utils/history')

beforeEach(() => { global.__resetWxStore() })

function rec(id) {
  return { id: String(id), createdAt: id, city: '杭州', travelDays: 3, request: {}, plan: {} }
}

describe('history', () => {
  test('初始为空', () => {
    expect(history.list()).toEqual([])
  })
  test('add后能list与get', () => {
    history.add(rec(1))
    expect(history.list().length).toBe(1)
    expect(history.get('1').city).toBe('杭州')
  })
  test('新记录排在最前', () => {
    history.add(rec(1))
    history.add(rec(2))
    expect(history.list()[0].id).toBe('2')
  })
  test('上限30,超出截断最旧', () => {
    for (let i = 1; i <= 31; i++) history.add(rec(i))
    const list = history.list()
    expect(list.length).toBe(30)
    expect(list[0].id).toBe('31')
    expect(history.get('1')).toBeNull()
  })
  test('remove删除指定', () => {
    history.add(rec(1))
    history.add(rec(2))
    history.remove('1')
    expect(history.get('1')).toBeNull()
    expect(history.list().length).toBe(1)
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd miniprogram && npx jest tests/history.test.js`
Expected: FAIL,`history.list is not a function`。

- [ ] **Step 3: 实现**

`utils/history.js`:
```js
const { HISTORY_KEY, HISTORY_LIMIT } = require('../config/env')

function list() {
  return wx.getStorageSync(HISTORY_KEY) || []
}

function get(id) {
  return list().find((r) => r.id === id) || null
}

function add(record) {
  const next = [record, ...list()].slice(0, HISTORY_LIMIT)
  wx.setStorageSync(HISTORY_KEY, next)
  return record
}

function remove(id) {
  wx.setStorageSync(HISTORY_KEY, list().filter((r) => r.id !== id))
}

module.exports = { list, get, add, remove }
```

- [ ] **Step 4: 跑测试确认通过**

Run: `cd miniprogram && npx jest tests/history.test.js`
Expected: PASS(全部)。

- [ ] **Step 5: Commit**

```bash
git add miniprogram/utils/history.js miniprogram/tests/history.test.js
git commit -m "feat(miniapp): 本地历史 util + 测试"
```

---

## Task 8: `utils/request.js` — wx.request 封装与 planTrip

**Files:**
- Create: `miniprogram/utils/request.js`

> 说明:`wx.request` 依赖小程序运行时,纯逻辑(参数构造/响应解析)已在 `trip.js` 测过,本文件只做薄封装,采用人工验证(Task 14 联调时一并验证)。

- [ ] **Step 1: 实现**

`utils/request.js`:
```js
const { BASE_URL } = require('../config/env')
const trip = require('./trip')

function wxRequest({ url, method = 'GET', data }) {
  return new Promise((resolve, reject) => {
    wx.request({
      url,
      method,
      data,
      timeout: 120000,
      header: { 'Content-Type': 'application/json' },
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(res.data)
        else reject(new Error('服务异常 HTTP ' + res.statusCode))
      },
      fail: (err) => reject(new Error((err && err.errMsg) || '网络请求失败'))
    })
  })
}

// 输入表单对象 → 返回 TripPlan(失败抛错)
async function planTrip(form) {
  const body = trip.buildRequest(form)
  const resp = await wxRequest({
    url: BASE_URL + '/api/trip/plan',
    method: 'POST',
    data: body
  })
  return trip.parseTripResponse(resp)
}

module.exports = { wxRequest, planTrip }
```

- [ ] **Step 2: Commit**

```bash
git add miniprogram/utils/request.js
git commit -m "feat(miniapp): request 封装与 planTrip"
```

---

## Task 9: mock 数据 + `day-card` 组件

**Files:**
- Create: `miniprogram/mock/trip-plan.js`
- Create: `miniprogram/components/day-card/day-card.{json,wxml,wxss,js}`

- [ ] **Step 1: 创建 mock TripPlan(贴合真实 schema)**

`miniprogram/mock/trip-plan.js`:
```js
module.exports = {
  city: '杭州',
  start_date: '2026-06-20',
  end_date: '2026-06-21',
  overall_suggestions: '建议错峰出行,西湖周边步行为主,注意防晒。',
  budget: { total: 1860, total_attractions: 45, total_hotels: 600, total_meals: 300, total_transportation: 80 },
  weather_info: [
    { date: '2026-06-20', day_weather: '晴', night_weather: '晴', day_temp: 28, night_temp: 22 },
    { date: '2026-06-21', day_weather: '多云', night_weather: '阴', day_temp: 27, night_temp: 21 }
  ],
  days: [
    {
      date: '2026-06-20', day_index: 0, description: '西湖经典环线',
      transportation: '步行', accommodation: '经济型酒店',
      hotel: { name: '西湖银泰酒店', price_range: '¥500-700', estimated_cost: 600 },
      attractions: [
        { name: '西湖', address: '杭州市西湖区', visit_duration: 120, ticket_price: 0, description: '湖光山色,断桥残雪', location: { longitude: 120.15, latitude: 30.25 } },
        { name: '灵隐寺', address: '杭州市西湖区法云弄1号', visit_duration: 90, ticket_price: 45, description: '千年古刹', location: { longitude: 120.10, latitude: 30.24 } }
      ],
      meals: [
        { type: 'lunch', name: '楼外楼', estimated_cost: 150, address: '孤山路30号' },
        { type: 'dinner', name: '绿茶餐厅', estimated_cost: 100, address: '灵隐路' }
      ]
    },
    {
      date: '2026-06-21', day_index: 1, description: '运河与古镇',
      transportation: '公共交通', accommodation: '经济型酒店',
      hotel: null,
      attractions: [
        { name: '京杭大运河', address: '拱墅区', visit_duration: 100, ticket_price: 0, description: '夜游运河', location: { longitude: 120.13, latitude: 30.32 } }
      ],
      meals: [ { type: 'lunch', name: '外婆家', estimated_cost: 80, address: '湖滨银泰' } ]
    }
  ]
}
```

- [ ] **Step 2: `day-card.json`**

```json
{ "component": true }
```

- [ ] **Step 3: `day-card.wxml`**

```xml
<view class="card">
  <view class="card-head">
    <text class="day-no">第{{ index + 1 }}天</text>
    <text class="day-date">{{ day.date }}</text>
    <text wx:if="{{ weather }}" class="day-weather">{{ weather.day_weather }} {{ weather.day_temp }}°/{{ weather.night_temp }}°</text>
  </view>

  <view wx:if="{{ day.description }}" class="day-desc">{{ day.description }}</view>
  <view class="day-tags">
    <text class="tag">🚇 {{ day.transportation }}</text>
    <text class="tag">🏨 {{ day.accommodation }}</text>
  </view>

  <view wx:if="{{ day.attractions.length }}" class="block">
    <view class="block-title">🏛 景点</view>
    <view wx:for="{{ day.attractions }}" wx:key="name" class="poi">
      <view class="poi-line">
        <text class="poi-name">{{ item.name }}</text>
        <text class="poi-meta">游玩{{ item.visit_duration }}分 · {{ item.ticket_price > 0 ? '¥' + item.ticket_price : '免费' }}</text>
      </view>
      <view wx:if="{{ item.address }}" class="poi-sub">📍 {{ item.address }}</view>
      <view wx:if="{{ item.description }}" class="poi-sub">{{ item.description }}</view>
    </view>
  </view>

  <view wx:if="{{ day.meals.length }}" class="block">
    <view class="block-title">🍜 餐饮</view>
    <view wx:for="{{ day.meals }}" wx:key="name" class="poi-line">
      <text class="poi-name">{{ item.name }}</text>
      <text class="poi-meta">{{ item.estimated_cost > 0 ? '约¥' + item.estimated_cost : '' }}</text>
    </view>
  </view>

  <view wx:if="{{ day.hotel }}" class="block">
    <view class="block-title">🏨 住宿</view>
    <view class="poi-line">
      <text class="poi-name">{{ day.hotel.name }}</text>
      <text class="poi-meta">{{ day.hotel.price_range || (day.hotel.estimated_cost > 0 ? '¥' + day.hotel.estimated_cost + '/晚' : '') }}</text>
    </view>
  </view>
</view>
```

- [ ] **Step 4: `day-card.js`**

```js
Component({
  properties: {
    day: { type: Object, value: {} },
    index: { type: Number, value: 0 },
    weather: { type: Object, value: null }
  }
})
```

- [ ] **Step 5: `day-card.wxss`**

```css
.card { background:#fff; border-radius:16rpx; padding:24rpx; margin:20rpx 24rpx; box-shadow:0 2rpx 12rpx rgba(0,0,0,.05); }
.card-head { display:flex; align-items:center; gap:16rpx; margin-bottom:12rpx; }
.day-no { font-size:32rpx; font-weight:700; color:#2b6cb0; }
.day-date { font-size:26rpx; color:#718096; }
.day-weather { margin-left:auto; font-size:24rpx; color:#dd6b20; }
.day-desc { font-size:26rpx; color:#4a5568; margin-bottom:12rpx; }
.day-tags { display:flex; gap:12rpx; margin-bottom:12rpx; }
.tag { font-size:22rpx; background:#ebf4ff; color:#2b6cb0; padding:4rpx 14rpx; border-radius:20rpx; }
.block { margin-top:16rpx; }
.block-title { font-size:26rpx; font-weight:600; margin-bottom:8rpx; }
.poi { padding:10rpx 0; border-bottom:1rpx solid #f0f2f5; }
.poi-line { display:flex; justify-content:space-between; align-items:baseline; }
.poi-name { font-size:28rpx; color:#1a202c; }
.poi-meta { font-size:22rpx; color:#a0aec0; }
.poi-sub { font-size:24rpx; color:#718096; margin-top:4rpx; }
```

- [ ] **Step 6: 人工验证(临时挂到结果页前先跳过,Task 11 验证)**

本任务产物在 Task 11 结果页接入后统一在开发者工具验证渲染。此处只确认文件无语法报错(开发者工具编译不报错)。

- [ ] **Step 7: Commit**

```bash
git add miniprogram/mock/ miniprogram/components/day-card/
git commit -m "feat(miniapp): day-card 组件与 mock 数据"
```

---

## Task 10: `loading-overlay` 组件(全屏生成动画)

**Files:**
- Create: `miniprogram/components/loading-overlay/loading-overlay.{json,wxml,wxss,js}`

- [ ] **Step 1: `loading-overlay.json`**

```json
{ "component": true }
```

- [ ] **Step 2: `loading-overlay.wxml`**

```xml
<view wx:if="{{ show }}" class="overlay">
  <view class="spinner"></view>
  <text class="tip">{{ tips[step] }}</text>
  <text class="hint">行程生成约需 30 秒至 2 分钟,请稍候</text>
</view>
```

- [ ] **Step 3: `loading-overlay.js`(阶段文案轮播)**

```js
Component({
  properties: {
    show: { type: Boolean, value: false, observer(v) { v ? this._start() : this._stop() } }
  },
  data: {
    step: 0,
    tips: ['正在理解你的需求…', '正在搜索景点…', '正在查询天气…', '正在规划路线…', '正在编排行程…']
  },
  methods: {
    _start() {
      this.setData({ step: 0 })
      this._timer = setInterval(() => {
        const next = (this.data.step + 1) % this.data.tips.length
        this.setData({ step: next })
      }, 1500)
    },
    _stop() { if (this._timer) clearInterval(this._timer) }
  },
  detached() { this._stop() }
})
```

- [ ] **Step 4: `loading-overlay.wxss`**

```css
.overlay { position:fixed; inset:0; background:rgba(255,255,255,.95); display:flex; flex-direction:column; align-items:center; justify-content:center; z-index:999; }
.spinner { width:80rpx; height:80rpx; border:8rpx solid #ebf4ff; border-top-color:#2b6cb0; border-radius:50%; animation:spin 0.9s linear infinite; }
@keyframes spin { to { transform:rotate(360deg); } }
.tip { margin-top:32rpx; font-size:30rpx; color:#2b6cb0; font-weight:600; }
.hint { margin-top:12rpx; font-size:24rpx; color:#a0aec0; }
```

- [ ] **Step 5: Commit**

```bash
git add miniprogram/components/loading-overlay/
git commit -m "feat(miniapp): loading-overlay 生成动画组件"
```

---

## Task 11: 结果页 `pages/result`(先用 mock 验证渲染)

**Files:**
- Create: `miniprogram/pages/result/result.{json,wxml,wxss,js}`

- [ ] **Step 1: `result.json`(注册组件)**

```json
{
  "navigationBarTitleText": "行程详情",
  "enableShareAppMessage": true,
  "usingComponents": {
    "day-card": "/components/day-card/day-card"
  }
}
```

- [ ] **Step 2: `result.js`(支持 mock / 历史两种来源)**

```js
const history = require('../../utils/history')
const trip = require('../../utils/trip')
const mockPlan = require('../../mock/trip-plan')

Page({
  data: { plan: null, weatherMap: {} },

  onLoad(query) {
    let plan = null
    if (query.mock === '1') {
      plan = mockPlan
    } else if (query.historyId) {
      const rec = history.get(query.historyId)
      plan = rec && rec.plan
    } else if (getApp().globalData.lastPlan) {
      plan = getApp().globalData.lastPlan
    }
    if (!plan) {
      wx.showToast({ title: '行程数据缺失', icon: 'none' })
      return
    }
    this.setData({ plan })
  },

  // 给每个 day 取对应天气,组件里用
  weatherFor(date) {
    return trip.matchWeather(this.data.plan.weather_info, date)
  },

  onShareAppMessage() {
    const p = this.data.plan
    const days = p && p.days ? p.days.length : ''
    return {
      title: `我的${p ? p.city : ''}${days}日游行程 🧳`,
      path: '/pages/index/index'
    }
  }
})
```

> 注:WXML 无法直接调用方法,天气在 `onLoad` 里预计算成 `weatherMap[date]`。修正见下步。

- [ ] **Step 3: 修正 `result.js` 的 onLoad,预计算 weatherMap**

把 `onLoad` 里 `this.setData({ plan })` 替换为:
```js
    const weatherMap = {}
    ;(plan.weather_info || []).forEach((w) => { weatherMap[w.date] = w })
    this.setData({ plan, weatherMap })
```
并删除 `weatherFor` 方法(不再需要)。

- [ ] **Step 4: `result.wxml`**

```xml
<view wx:if="{{ plan }}" class="page">
  <view class="header">
    <text class="title">{{ plan.city }}</text>
    <text class="subtitle">{{ plan.start_date }} ~ {{ plan.end_date }} · {{ plan.days.length }}日游</text>
    <view wx:if="{{ plan.budget }}" class="budget">预算合计 ¥{{ plan.budget.total }}</view>
  </view>

  <day-card
    wx:for="{{ plan.days }}"
    wx:key="date"
    day="{{ item }}"
    index="{{ index }}"
    weather="{{ weatherMap[item.date] }}"
  />

  <view wx:if="{{ plan.overall_suggestions }}" class="suggest">
    <text class="suggest-title">💡 总体建议</text>
    <text class="suggest-body">{{ plan.overall_suggestions }}</text>
  </view>

  <button class="share-btn" open-type="share">分享给好友</button>
</view>
```

- [ ] **Step 5: `result.wxss`**

```css
.page { padding-bottom:60rpx; }
.header { background:#2b6cb0; color:#fff; padding:40rpx 32rpx; }
.title { font-size:44rpx; font-weight:700; }
.subtitle { display:block; margin-top:8rpx; font-size:26rpx; opacity:.9; }
.budget { margin-top:16rpx; font-size:28rpx; background:rgba(255,255,255,.2); display:inline-block; padding:6rpx 20rpx; border-radius:24rpx; }
.suggest { background:#fffaf0; margin:20rpx 24rpx; padding:24rpx; border-radius:16rpx; border-left:8rpx solid #dd6b20; }
.suggest-title { font-size:28rpx; font-weight:700; color:#dd6b20; }
.suggest-body { display:block; margin-top:10rpx; font-size:26rpx; color:#4a5568; line-height:1.6; }
.share-btn { margin:40rpx 24rpx 0; background:#2b6cb0; color:#fff; border-radius:48rpx; }
```

- [ ] **Step 6: 人工验证(开发者工具)**

操作:开发者工具 → 编译 → 在地址/编译模式里把启动页设为 `pages/result/result`,启动参数 `mock=1`(或临时在 `index` 加个跳 `?mock=1` 的按钮)。
预期:
- 顶部蓝色头显示「杭州 / 2026-06-20 ~ 2026-06-21 · 2日游 / 预算合计 ¥1860」。
- 两张 day-card,第1天含西湖/灵隐寺(门票免费/¥45)、午晚餐、酒店;右上角天气「晴 28°/22°」。
- 底部「总体建议」黄框 + 「分享给好友」按钮。
- 点右上「…」转发,卡片标题为「我的杭州2日游行程 🧳」。

- [ ] **Step 7: Commit**

```bash
git add miniprogram/pages/result/
git commit -m "feat(miniapp): 结果页渲染 + 分享(mock 验证通过)"
```

---

## Task 12: 输入页 `pages/index`

**Files:**
- Create: `miniprogram/pages/index/index.{json,wxml,wxss,js}`

- [ ] **Step 1: `index.json`(注册 loading 组件)**

```json
{
  "navigationBarTitleText": "智能旅行助手",
  "usingComponents": {
    "loading-overlay": "/components/loading-overlay/loading-overlay"
  }
}
```

- [ ] **Step 2: `index.js`**

```js
const env = require('../../config/env')
const trip = require('../../utils/trip')
const history = require('../../utils/history')
const { planTrip } = require('../../utils/request')

Page({
  data: {
    form: {
      city: '', start_date: '', end_date: '',
      transportation: '公共交通', accommodation: '经济型酒店',
      preferences: [], free_text_input: ''
    },
    transportationOptions: env.TRANSPORTATION_OPTIONS,
    accommodationOptions: env.ACCOMMODATION_OPTIONS,
    preferenceOptions: env.PREFERENCE_OPTIONS,
    loading: false
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ [`form.${field}`]: e.detail.value })
  },
  onDate(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ [`form.${field}`]: e.detail.value })
  },
  onPickTransportation(e) {
    this.setData({ 'form.transportation': this.data.transportationOptions[e.detail.value] })
  },
  onPickAccommodation(e) {
    this.setData({ 'form.accommodation': this.data.accommodationOptions[e.detail.value] })
  },
  onTogglePref(e) {
    const p = e.currentTarget.dataset.pref
    const cur = this.data.form.preferences
    const next = cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]
    this.setData({ 'form.preferences': next })
  },

  async onSubmit() {
    const check = trip.validateForm(this.data.form)
    if (!check.valid) {
      wx.showToast({ title: check.message, icon: 'none' })
      return
    }
    this.setData({ loading: true })
    try {
      const plan = await planTrip(this.data.form)
      // 自动写入历史
      const rec = {
        id: String(Date.now()),
        createdAt: Date.now(),
        city: plan.city,
        travelDays: plan.days.length,
        request: trip.buildRequest(this.data.form),
        plan
      }
      history.add(rec)
      getApp().globalData.lastPlan = plan
      wx.navigateTo({ url: '/pages/result/result' })
    } catch (err) {
      wx.showModal({ title: '生成失败', content: err.message || '请稍后重试', showCancel: false })
    } finally {
      this.setData({ loading: false })
    }
  },

  goHistory() {
    wx.navigateTo({ url: '/pages/history/history' })
  }
})
```

- [ ] **Step 3: `index.wxml`**

```xml
<view class="page">
  <view class="hero">
    <text class="hero-title">🧳 智能旅行助手</text>
    <text class="hero-sub">告诉我去哪、玩几天,AI 帮你排好行程</text>
  </view>

  <view class="form">
    <view class="field">
      <text class="label">目的地城市</text>
      <input class="input" data-field="city" value="{{ form.city }}" placeholder="如:杭州" bindinput="onInput" />
    </view>

    <view class="field">
      <text class="label">出发日期</text>
      <picker mode="date" data-field="start_date" value="{{ form.start_date }}" bindchange="onDate">
        <view class="picker">{{ form.start_date || '请选择' }}</view>
      </picker>
    </view>

    <view class="field">
      <text class="label">返程日期</text>
      <picker mode="date" data-field="end_date" value="{{ form.end_date }}" bindchange="onDate">
        <view class="picker">{{ form.end_date || '请选择' }}</view>
      </picker>
    </view>

    <view class="field">
      <text class="label">交通方式</text>
      <picker range="{{ transportationOptions }}" bindchange="onPickTransportation">
        <view class="picker">{{ form.transportation }}</view>
      </picker>
    </view>

    <view class="field">
      <text class="label">住宿偏好</text>
      <picker range="{{ accommodationOptions }}" bindchange="onPickAccommodation">
        <view class="picker">{{ form.accommodation }}</view>
      </picker>
    </view>

    <view class="field">
      <text class="label">旅行偏好</text>
      <view class="prefs">
        <text
          wx:for="{{ preferenceOptions }}"
          wx:key="*this"
          data-pref="{{ item }}"
          bindtap="onTogglePref"
          class="pref {{ form.preferences.includes(item) ? 'pref-on' : '' }}"
        >{{ item }}</text>
      </view>
    </view>

    <view class="field">
      <text class="label">额外要求(选填)</text>
      <textarea class="textarea" data-field="free_text_input" value="{{ form.free_text_input }}" placeholder="如:想看升旗、对海鲜过敏…" bindinput="onInput" />
    </view>

    <button class="submit" bindtap="onSubmit">生成行程</button>
    <view class="history-entry" bindtap="goHistory">查看历史行程 ›</view>
  </view>

  <loading-overlay show="{{ loading }}" />
</view>
```

- [ ] **Step 4: `index.wxss`**

```css
.hero { background:#2b6cb0; color:#fff; padding:48rpx 32rpx; }
.hero-title { font-size:44rpx; font-weight:700; }
.hero-sub { display:block; margin-top:12rpx; font-size:26rpx; opacity:.9; }
.form { padding:24rpx; }
.field { background:#fff; border-radius:16rpx; padding:24rpx; margin-bottom:20rpx; }
.label { font-size:26rpx; color:#718096; }
.input, .picker, .textarea { margin-top:12rpx; font-size:30rpx; color:#1a202c; }
.picker { color:#2b6cb0; }
.textarea { width:100%; height:140rpx; }
.prefs { display:flex; flex-wrap:wrap; gap:16rpx; margin-top:16rpx; }
.pref { font-size:24rpx; padding:8rpx 22rpx; border-radius:28rpx; background:#edf2f7; color:#4a5568; }
.pref-on { background:#2b6cb0; color:#fff; }
.submit { margin-top:16rpx; background:#2b6cb0; color:#fff; border-radius:48rpx; font-size:32rpx; }
.history-entry { text-align:center; margin-top:28rpx; color:#718096; font-size:26rpx; }
```

- [ ] **Step 5: 人工验证(开发者工具,先不依赖后端)**

操作:编译,启动页设回 `pages/index/index`。
预期:
- 表单完整显示;偏好标签点按高亮切换;日期/选择器可选。
- 不填城市点「生成行程」→ Toast「请填写目的地城市」。
- 返程早于出发 → Toast「返程日期不能早于出发日期」。
(真实生成留到 Task 14 连后端验证。)

- [ ] **Step 6: Commit**

```bash
git add miniprogram/pages/index/
git commit -m "feat(miniapp): 输入页(表单+校验+提交编排)"
```

---

## Task 13: 历史页 `pages/history`

**Files:**
- Create: `miniprogram/pages/history/history.{json,wxml,wxss,js}`

- [ ] **Step 1: `history.json`**

```json
{ "navigationBarTitleText": "历史行程" }
```

- [ ] **Step 2: `history.js`**

```js
const history = require('../../utils/history')

Page({
  data: { records: [] },

  onShow() {
    const records = history.list().map((r) => ({
      id: r.id,
      city: r.city,
      travelDays: r.travelDays,
      dateText: new Date(r.createdAt).toLocaleString()
    }))
    this.setData({ records })
  },

  openRecord(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/result/result?historyId=${id}` })
  },

  deleteRecord(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '删除', content: '确定删除这条历史行程?',
      success: (res) => {
        if (res.confirm) {
          history.remove(id)
          this.onShow()
        }
      }
    })
  }
})
```

- [ ] **Step 3: `history.wxml`**

```xml
<view class="page">
  <view wx:if="{{ records.length === 0 }}" class="empty">
    <text>还没有历史行程</text>
    <navigator url="/pages/index/index" open-type="navigateBack" class="empty-link">去生成一个 ›</navigator>
  </view>

  <view
    wx:for="{{ records }}"
    wx:key="id"
    class="item"
    data-id="{{ item.id }}"
    bindtap="openRecord"
  >
    <view class="item-main">
      <text class="item-city">{{ item.city }} · {{ item.travelDays }}日游</text>
      <text class="item-date">{{ item.dateText }}</text>
    </view>
    <text class="item-del" data-id="{{ item.id }}" catchtap="deleteRecord">删除</text>
  </view>
</view>
```

- [ ] **Step 4: `history.wxss`**

```css
.page { padding:24rpx; }
.empty { text-align:center; color:#a0aec0; margin-top:120rpx; font-size:28rpx; }
.empty-link { color:#2b6cb0; margin-top:20rpx; }
.item { background:#fff; border-radius:16rpx; padding:28rpx 24rpx; margin-bottom:20rpx; display:flex; align-items:center; }
.item-main { flex:1; }
.item-city { font-size:30rpx; font-weight:600; }
.item-date { display:block; margin-top:8rpx; font-size:24rpx; color:#a0aec0; }
.item-del { font-size:26rpx; color:#e53e3e; padding:0 12rpx; }
```

- [ ] **Step 5: 人工验证**

操作:先在输入页造一条历史(需 Task 14 后端可用;或临时在结果页 `onLoad` 后手动 `history.add` 一条 mock),进入历史页。
预期:
- 列表显示「杭州 · 2日游 + 时间」。
- 点条目进结果页正确渲染该行程。
- 点「删除」弹确认 → 确认后消失。
- 全删后显示空状态。

- [ ] **Step 6: Commit**

```bash
git add miniprogram/pages/history/
git commit -m "feat(miniapp): 历史页(列表/打开/删除)"
```

---

## Task 14: 真机/真后端联调 + README

**Files:**
- Create: `miniprogram/README.md`

- [ ] **Step 1: 启动后端**

Run:
```bash
cd ~/Desktop/trip-planner-agent/backend
# 按 backend/README 配好 .env(LLM key、高德 key)
pip install -r requirements.txt
uvicorn app.api.main:app --host 0.0.0.0 --port 8000
```
Expected: `http://localhost:8000/docs` 可访问。

- [ ] **Step 2: 开发者工具端到端验证(关键)**

操作:开发者工具确认「详情 → 本地设置 → 不校验合法域名」已勾;输入页填「杭州 / 选 3 天 / 偏好美食」→ 生成行程。
预期:
- 出现全屏生成动画,阶段文案轮播。
- 30s–2min 内跳结果页,渲染真实行程(景点/天气/预算/建议)。
- 返回输入页 → 进历史页,能看到刚生成那条,点开可复看。
- 失败路径:把后端停掉再生成 → 弹「生成失败」弹窗,不白屏、loading 关闭。

- [ ] **Step 3: 写 `miniprogram/README.md`**

```markdown
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
`cd miniprogram && npm install && npm test`(Jest,测 utils/trip 与 utils/history)。

## 功能
- 输入需求 → AI 生成多日行程(卡片展示:景点/餐饮/酒店/天气/预算/建议)
- 历史:本地缓存最近 30 条(`wx.setStorageSync`)
- 分享:微信转发卡片(v1 仅引流到首页,不传具体行程)

## 发布前清单(未完成不可正式发布)
- [ ] 后端部署公网 + HTTPS + 域名 ICP 备案
- [ ] 微信公众平台配置 request 合法域名
- [ ] `project.config.json` 换成真实 AppID,关闭 `urlCheck`(或保持线上域名校验)
- [ ] 小程序提审发布

## 已知限制(v1)
- 无交互地图(经纬度已在数据中保留,留给 v2)
- 分享卡片好友点开只到首页,看不到分享者的具体行程(需后端存储+shareId,v2)
```

- [ ] **Step 4: 全量测试回归**

Run: `cd miniprogram && npm test`
Expected: 所有 Jest 测试 PASS。

- [ ] **Step 5: Commit**

```bash
git add miniprogram/README.md
git commit -m "docs(miniapp): README 与发布前清单"
```

---

## Task 15: 收尾 — 分支整合

- [ ] **Step 1: 确认全部任务完成、测试通过**

Run: `cd miniprogram && npm test`
Expected: PASS。开发者工具端到端跑通一次。

- [ ] **Step 2: 用 finishing-a-development-branch 技能决定合并/PR**

调用 `superpowers:finishing-a-development-branch`,在「合并到 main / 开 PR / 暂留分支」之间选择。

---

## 自检(spec 覆盖核对)

- 架构/数据流 → Task 1、8、12 ✅
- 目录结构 `miniprogram/` → Task 1 ✅
- 输入页字段↔接口映射 → Task 12(+ trip.buildRequest Task 5)✅
- 结果页基于真实 schema 渲染 → Task 9、11 ✅
- 历史(本地、上限30、自动入历史)→ Task 7、12、13 ✅
- 分享(onShareAppMessage、仅引流限制)→ Task 11 ✅
- 接口契约冻结 → Task 8 ✅
- 风险:生成慢(120s+动画)→ Task 1、10 ✅;真机连不上 localhost → Task 14 README ✅;发布前清单 → Task 14 ✅
- 测试策略(纯逻辑 TDD + 结果页 mock 先行 + 联调)→ Task 3–7、9/11、14 ✅
- 交付物(工程+3页+2组件+2util+README)→ 全部 ✅

无占位符;类型/函数命名跨任务一致(`computeTravelDays/validateForm/buildRequest/matchWeather/parseTripResponse/list/get/add/remove/planTrip`)。
