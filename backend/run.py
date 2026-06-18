"""启动脚本"""

import uvicorn
from app.config import get_settings

if __name__ == "__main__":
    settings = get_settings()
    
    uvicorn.run(
        "app.api.main:app",
        host=settings.host,
        port=settings.port,
        reload=False,  # reload=True 会触发 watchfiles 频繁重启，导致 MCP 工具发现被中断
        log_level=settings.log_level.lower()
    )

