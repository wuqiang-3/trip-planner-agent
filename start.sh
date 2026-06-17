#!/bin/bash
# 智能旅行助手 - 一键启动脚本(后端 + 前端网页)
# 用法: 在终端里执行  ./start.sh   按 Ctrl+C 可同时停止前后端

cd "$(dirname "$0")"

echo "🚀 启动后端 (http://localhost:8000) ..."
(cd backend && ./venv/bin/python run.py) &
BACKEND_PID=$!

echo "🚀 启动前端 (http://localhost:5173) ..."
(cd frontend && npm run dev) &
FRONTEND_PID=$!

# 退出时(Ctrl+C)一并关闭前后端
trap "echo ''; echo '🛑 正在停止...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT

echo ""
echo "================================================"
echo "  后端文档: http://localhost:8000/docs"
echo "  前端网页: http://localhost:5173   <- 浏览器打开这个"
echo "  按 Ctrl+C 停止全部服务"
echo "================================================"

wait
