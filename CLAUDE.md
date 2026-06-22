# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**趣游智能旅行助手** — 三端旅行规划应用（Web + Backend API + 微信小程序），基于多智能体系统 + 高德地图 MCP 生成结构化行程。

## Quick Start

```bash
# 一键启动（后端 + Web 前端）
./start.sh

# 后端单独启动
cd backend && source venv/bin/activate && python run.py

# 前端单独启动
cd frontend && npm run dev

# 微信小程序测试
cd miniprogram && npm test
```

## Commands

| 目录 | 命令 | 用途 |
|------|------|------|
| backend | `source venv/bin/activate && python run.py` | 启动 FastAPI 服务 (localhost:8000) |
| frontend | `npm run dev` | Vite 开发服务器 (localhost:5173) |
| frontend | `npm run build` | 生产构建 |
| miniprogram | `npm test` | 运行 Jest 测试（23 用例） |

## Architecture

### 三端结构

```
trip-planner-agent/
├── backend/       # Python FastAPI + 多智能体系统
├── frontend/      # Vue 3 + TypeScript Web 应用
├── miniprogram/   # 原生微信小程序
└── docs/          # 设计文档与验证清单
```

### Backend (FastAPI + 多智能体)

- **入口**: `backend/run.py` → `app/api/main.py`
- **多智能体系统** (`app/agents/trip_planner_agent.py`): 四个子 Agent 通过 `[TOOL_CALL:...]` 语法调用高德 MCP 工具
  1. 景点搜索 Agent → `maps_text_search`
  2. 天气查询 Agent → `maps_weather`
  3. 酒店推荐 Agent → `maps_text_search`
  4. 行程规划 Agent → 整合输出结构化 JSON
- **API 层** (`app/api/routes/`): `POST /api/trip/plan` 为规划主入口，另有地图/POI 直查接口
- **服务层** (`app/services/`): 封装高德 MCP 调用 (`amap_service.py`) 与 LLM 单例 (`llm_service.py`)
- **配置**: `app/config.py` — Pydantic BaseSettings，从 `.env` 读取高德密钥 / LLM 地址 / CORS

### Frontend (Vue 3 + Ant Design Vue)

- 两条路由: `/` (Home 表单) → `/result` (行程展示)
- 高德 JS API 通过 `@amap/amap-jsapi-loader` 按需加载
- 导出功能: html2canvas (图片) + jspdf (PDF)
- Vite 代理 `/api` → `localhost:8000`

### 微信小程序 (原生)

- 三个页面: index / result / history
- **纯函数/副作用分离**: `utils/trip.js` 为纯业务逻辑（可测试），`utils/request.js`/`utils/history.js` 处理 I/O
- 长图生成: `utils/image-generator.js` — Canvas 绘制 320px 宽行程长图
- 历史记录: `wx.setStorageSync('trip_history')`，上限 30 条

### 数据流

```
用户输入 → TripRequest (form) → POST /api/trip/plan → 多 Agent 系统 → TripPlan (JSON) → 结果渲染
```

统一 `TripPlan` schema (`backend/app/models/schemas.py`, `frontend/src/types/index.ts`, 小程序 `config/env.js`)

### LLM 配置

- 模型: `deepseek-v4-pro` @ `https://api.deepseek.com/v1`
- 超时: 120s
- 后端启动时预初始化 Agent 以避免首次请求超时
- `uvicorn reload=False` (避免 MCP 工具重发现时 WatchFiles 崩溃)

## Key Conventions

- **品牌名称**: 趣游 / 趣游智能旅行助手
- **小程序开发**: 微信开发者工具真机验证后才能合并到 main
- **小程序测试**: TDD 模式，修改 `utils/trip.js` 需同步更新 `tests/trip.test.js`
- **.env 文件**: 含真实密钥，永不提交；修改环境变量需同步更新 `.env.example`
- **高德地图**: 两个 Key — Web API Key（后端/前端 API 调用）和 JS API Key（前端地图渲染）
