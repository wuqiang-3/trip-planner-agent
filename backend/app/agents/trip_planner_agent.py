"""旅行规划系统 — 代码层直接调用MCP工具 + 单次LLM生成"""

import json
import time
import concurrent.futures
from typing import Dict, Any, List, Optional
from hello_agents import SimpleAgent
from hello_agents.tools import MCPTool
from ..services.llm_service import get_llm
from ..models.schemas import TripRequest, TripPlan, DayPlan, Attraction, Meal, WeatherInfo, Location, Hotel
from ..config import get_settings


PLANNER_AGENT_PROMPT = """你是行程规划专家。你的任务是根据景点信息和天气信息,生成详细的旅行计划。

请严格按照以下JSON格式返回旅行计划:
```json
{
  "city": "城市名称",
  "start_date": "YYYY-MM-DD",
  "end_date": "YYYY-MM-DD",
  "days": [
    {
      "date": "YYYY-MM-DD",
      "day_index": 0,
      "description": "第1天行程概述",
      "transportation": "交通方式",
      "accommodation": "住宿类型",
      "hotel": {
        "name": "酒店名称",
        "address": "酒店地址",
        "location": {"longitude": 116.397128, "latitude": 39.916527},
        "price_range": "300-500元",
        "rating": "4.5",
        "distance": "距离景点2公里",
        "type": "经济型酒店",
        "estimated_cost": 400
      },
      "attractions": [
        {
          "name": "景点名称",
          "address": "详细地址",
          "location": {"longitude": 116.397128, "latitude": 39.916527},
          "visit_duration": 120,
          "description": "景点详细描述",
          "category": "景点类别",
          "ticket_price": 60
        }
      ],
      "meals": [
        {"type": "breakfast", "name": "早餐推荐", "description": "早餐描述", "estimated_cost": 30},
        {"type": "lunch", "name": "午餐推荐", "description": "午餐描述", "estimated_cost": 50},
        {"type": "dinner", "name": "晚餐推荐", "description": "晚餐描述", "estimated_cost": 80}
      ]
    }
  ],
  "weather_info": [
    {
      "date": "YYYY-MM-DD",
      "day_weather": "晴",
      "night_weather": "多云",
      "day_temp": 25,
      "night_temp": 15,
      "wind_direction": "南风",
      "wind_power": "1-3级"
    }
  ],
  "overall_suggestions": "总体建议",
  "budget": {
    "total_attractions": 180,
    "total_hotels": 1200,
    "total_meals": 480,
    "total_transportation": 200,
    "total": 2060
  }
}
```

**重要提示:**
1. weather_info数组必须包含每一天的天气信息
2. 温度必须是纯数字(不要带°C等单位)
3. 每天安排2-3个景点
4. 考虑景点之间的距离和游览时间
5. 每天必须包含早中晚三餐
6. 提供实用的旅行建议
7. **必须包含预算信息**:
   - 景点门票价格(ticket_price)
   - 餐饮预估费用(estimated_cost)
   - 酒店预估费用(estimated_cost)
   - 预算汇总(budget)包含各项总费用
"""


class MultiAgentTripPlanner:
    """旅行规划系统

    性能设计:
      - 景点/天气/酒店 通过代码直接调用 MCP 工具获取 (绕过 LLM)
      - 三者并行执行 (ThreadPoolExecutor)
      - 仅最终行程生成调用一次 LLM
    """

    def __init__(self):
        """初始化"""
        print("🔄 开始初始化旅行规划系统...")

        try:
            settings = get_settings()
            self.llm = get_llm()

            # 创建共享的MCP工具(只创建一次)，带重试机制
            print("  - 创建高德MCP工具...")
            self.amap_tool = self._create_amap_tool_with_retry(settings)
            self.amap_tool.expandable = True

            # 创建行程规划Agent(仅用于最终整合，一次LLM调用)
            print("  - 创建行程规划Agent...")
            self.planner_agent = SimpleAgent(
                name="行程规划专家",
                llm=self.llm,
                system_prompt=PLANNER_AGENT_PROMPT
            )

            tool_count = len(self.amap_tool._available_tools) if hasattr(self.amap_tool, '_available_tools') else 0
            print(f"✅ 旅行规划系统初始化成功")
            print(f"   高德地图工具: {tool_count} 个")

            if tool_count == 0:
                print("⚠️  警告: 没有工具被注册，MCP连接可能失败")
                print("   建议检查网络环境和AMAP_API_KEY配置后重启")

        except Exception as e:
            print(f"❌ 初始化失败: {str(e)}")
            import traceback
            traceback.print_exc()
            raise

    # ── MCP 工具创建 ──────────────────────────────────────────────

    def _create_amap_tool_with_retry(self, settings, max_retries: int = 3):
        """创建高德MCP工具，带重试机制"""
        import shutil
        import os

        uvx_path = shutil.which('uvx')
        if not uvx_path:
            home_uvx = os.path.expanduser('~/.local/bin/uvx')
            if os.path.isfile(home_uvx):
                uvx_path = home_uvx
            else:
                print("  ❌ 未找到 uvx 命令。请安装 Rust 版 uv: curl -LsSf https://astral.sh/uv/install.sh | sh")

        mcp_env = {"AMAP_MAPS_API_KEY": settings.amap_api_key}
        current_path = os.environ.get("PATH", "")
        local_bin = os.path.expanduser('~/.local/bin')
        if local_bin not in current_path:
            mcp_env["PATH"] = f"{local_bin}:{current_path}"

        server_cmd = [uvx_path, "amap-mcp-server"] if uvx_path else ["uvx", "amap-mcp-server"]

        last_error = None
        for attempt in range(1, max_retries + 1):
            if attempt > 1:
                print(f"  - 重试MCP连接 ({attempt}/{max_retries})...")
                time.sleep(2)

            tool = MCPTool(
                name="amap",
                description="高德地图服务",
                server_command=server_cmd,
                env=mcp_env,
                auto_expand=True
            )

            count = len(tool._available_tools)
            if count > 0:
                print(f"  ✅ MCP连接成功: 发现 {count} 个工具")
                for t in tool._available_tools[:6]:
                    print(f"       - {t.get('name', '?')}: {t.get('description', '')[:50]}")
                return tool

            try:
                import subprocess
                result = subprocess.run(
                    server_cmd, capture_output=True, text=True, timeout=5,
                    env={**os.environ, **mcp_env}
                )
                err_detail = result.stderr[:200] if result.stderr else result.stdout[:200]
            except Exception as e:
                err_detail = str(e)

            last_error = f"uvx启动失败: {err_detail} (尝试 {attempt}/{max_retries})"
            print(f"  ⚠️  {last_error}")

        print(f"  ❌ MCP连接失败 ({max_retries}次重试均失败)")
        print(f"     错误: {last_error}")
        return tool

    # ── 直接MCP工具调用 (绕过LLM) ────────────────────────────────

    # ── 数据压缩 ──────────────────────────────────────────────────

    def _truncate(self, text: str, max_chars: int = 2000) -> str:
        """截断过长的MCP结果，减少传给LLM的token量（加速推理）"""
        if len(text) <= max_chars:
            return text
        return text[:max_chars] + f"\n\n...(已截断, 原始 {len(text)} 字符, 显示前 {max_chars} 字符)"

    # ── 直接MCP工具调用 (绕过LLM) ────────────────────────────────

    def _call_mcp_tool(self, tool_name: str, arguments: dict) -> str:
        """直接调用MCP工具，返回原始字符串结果"""
        try:
            result = self.amap_tool.run({
                "action": "call_tool",
                "tool_name": tool_name,
                "arguments": arguments
            })
            return str(result) if result else ""
        except Exception as e:
            print(f"  ⚠️ MCP工具调用失败 [{tool_name}]: {str(e)}")
            return ""

    def _search_attractions(self, city: str, preferences: Optional[List[str]]) -> str:
        """直接搜索景点POI (无LLM参与)，自动压缩结果"""
        keywords = preferences[0] if preferences else "热门景点"
        print(f"  - 搜索景点: {city} / {keywords}")
        raw = self._call_mcp_tool("maps_text_search", {
            "keywords": keywords,
            "city": city,
            "citylimit": "true"
        })
        return self._truncate(raw, max_chars=2000)

    def _query_weather(self, city: str) -> str:
        """直接查询天气 (无LLM参与)"""
        print(f"  - 查询天气: {city}")
        return self._call_mcp_tool("maps_weather", {
            "city": city
        })

    def _search_hotels(self, city: str, accommodation: str) -> str:
        """直接搜索酒店 (无LLM参与)，自动压缩结果"""
        print(f"  - 搜索酒店: {city}")
        raw = self._call_mcp_tool("maps_text_search", {
            "keywords": "酒店",
            "city": city,
            "citylimit": "true"
        })
        return self._truncate(raw, max_chars=2000)

    # ── 主入口 ────────────────────────────────────────────────────

    def plan_trip(self, request: TripRequest) -> TripPlan:
        """
        并行调用MCP工具获取原始数据 → 单次LLM调用生成完整行程

        相比改造前（4个Agent串行→7次LLM→~150s）:
          改造后（并行MCP→1次LLM→~25s）
        """
        try:
            print(f"\n{'='*60}")
            print(f"🚀 开始规划旅行...")
            print(f"目的地: {request.city}")
            print(f"日期: {request.start_date} 至 {request.end_date}")
            print(f"天数: {request.travel_days}天")
            print(f"偏好: {', '.join(request.preferences) if request.preferences else '无'}")
            print(f"{'='*60}\n")

            overall_start = time.time()

            # ── 步骤1-3: 并行获取数据 (代码直接调MCP，不经过LLM) ──
            print("📡 并行获取景点/天气/酒店数据...\n")
            with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
                fut_weather = pool.submit(self._query_weather, request.city)
                fut_hotel = pool.submit(self._search_hotels, request.city, request.accommodation)
                fut_attractions = pool.submit(self._search_attractions, request.city, request.preferences)

                # 按固定顺序取结果，避免打印混乱
                attraction_result = fut_attractions.result()
                weather_result = fut_weather.result()
                hotel_result = fut_hotel.result()

            data_elapsed = time.time() - overall_start
            print(f"\n  ✅ 数据获取完成，耗时 {data_elapsed:.1f}s")
            print(f"    - 景点: {len(attraction_result)} 字符")
            print(f"    - 天气: {len(weather_result)} 字符")
            print(f"    - 酒店: {len(hotel_result)} 字符\n")

            # ── 步骤4: 单次LLM调用生成完整行程 ──
            print("🧠 单次LLM调用生成行程方案...")
            planner_query = self._build_planner_query(
                request, attraction_result, weather_result, hotel_result
            )
            planner_response = self.planner_agent.run(planner_query)
            print(f"    LLM返回: {planner_response[:200]}...\n")

            # ── 解析 ──
            trip_plan = self._parse_response(planner_response, request)

            total_elapsed = time.time() - overall_start
            print(f"{'='*60}")
            print(f"✅ 旅行计划生成完成! 总耗时 {total_elapsed:.1f}s")
            print(f"{'='*60}\n")

            return trip_plan

        except Exception as e:
            print(f"❌ 生成旅行计划失败: {str(e)}")
            import traceback
            traceback.print_exc()
            return self._create_fallback_plan(request)

    # ── 查询构建 ──────────────────────────────────────────────────

    def _build_planner_query(self, request: TripRequest, attractions: str, weather: str, hotels: str = "") -> str:
        """构建行程规划查询"""
        query = f"""请根据以下信息生成{request.city}的{request.travel_days}天旅行计划:

**基本信息:**
- 城市: {request.city}
- 日期: {request.start_date} 至 {request.end_date}
- 天数: {request.travel_days}天
- 交通方式: {request.transportation}
- 住宿: {request.accommodation}
- 偏好: {', '.join(request.preferences) if request.preferences else '无'}

**景点信息:**
{attractions}

**天气信息:**
{weather}

**酒店信息:**
{hotels}

**要求:**
1. 每天安排2-3个景点
2. 每天必须包含早中晚三餐
3. 每天推荐一个具体的酒店(从酒店信息中选择)
4. 考虑景点之间的距离和交通方式
5. 返回完整的JSON格式数据
6. 景点的经纬度坐标要真实准确
"""
        if request.free_text_input:
            query += f"\n**额外要求:** {request.free_text_input}"

        return query

    # ── 响应解析 ──────────────────────────────────────────────────

    def _parse_response(self, response: str, request: TripRequest) -> TripPlan:
        """解析Agent响应，提取JSON"""
        try:
            if "```json" in response:
                json_start = response.find("```json") + 7
                json_end = response.find("```", json_start)
                json_str = response[json_start:json_end].strip()
            elif "```" in response:
                json_start = response.find("```") + 3
                json_end = response.find("```", json_start)
                json_str = response[json_start:json_end].strip()
            elif "{" in response and "}" in response:
                json_start = response.find("{")
                json_end = response.rfind("}") + 1
                json_str = response[json_start:json_end]
            else:
                raise ValueError("响应中未找到JSON数据")

            data = json.loads(json_str)
            return TripPlan(**data)

        except Exception as e:
            print(f"⚠️  解析响应失败: {str(e)}")
            print(f"   将使用备用方案生成计划")
            return self._create_fallback_plan(request)

    def _create_fallback_plan(self, request: TripRequest) -> TripPlan:
        """创建备用计划(当Agent失败时)"""
        from datetime import datetime, timedelta

        start_date = datetime.strptime(request.start_date, "%Y-%m-%d")

        days = []
        for i in range(request.travel_days):
            current_date = start_date + timedelta(days=i)
            day_plan = DayPlan(
                date=current_date.strftime("%Y-%m-%d"),
                day_index=i,
                description=f"第{i+1}天行程",
                transportation=request.transportation,
                accommodation=request.accommodation,
                attractions=[
                    Attraction(
                        name=f"{request.city}景点{j+1}",
                        address=f"{request.city}市",
                        location=Location(longitude=116.4 + i*0.01 + j*0.005, latitude=39.9 + i*0.01 + j*0.005),
                        visit_duration=120,
                        description=f"这是{request.city}的著名景点",
                        category="景点"
                    )
                    for j in range(2)
                ],
                meals=[
                    Meal(type="breakfast", name=f"第{i+1}天早餐", description="当地特色早餐"),
                    Meal(type="lunch", name=f"第{i+1}天午餐", description="午餐推荐"),
                    Meal(type="dinner", name=f"第{i+1}天晚餐", description="晚餐推荐")
                ]
            )
            days.append(day_plan)

        return TripPlan(
            city=request.city,
            start_date=request.start_date,
            end_date=request.end_date,
            days=days,
            weather_info=[],
            overall_suggestions=f"这是为您规划的{request.city}{request.travel_days}日游行程,建议提前查看各景点的开放时间。"
        )


# 全局单例
_multi_agent_planner = None


def get_trip_planner_agent() -> MultiAgentTripPlanner:
    """获取旅行规划系统实例(单例模式)"""
    global _multi_agent_planner

    if _multi_agent_planner is None:
        _multi_agent_planner = MultiAgentTripPlanner()

    return _multi_agent_planner
