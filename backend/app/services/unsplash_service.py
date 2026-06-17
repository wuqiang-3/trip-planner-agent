"""图片服务 - 使用高德地图Web API获取POI图片"""

import json
from typing import List, Optional
import requests
from ..config import get_settings


class ImageService:
    """图片服务类 - 通过高德地图Web API获取景点图片"""

    def __init__(self):
        """初始化服务"""
        settings = get_settings()
        self.api_key = settings.amap_api_key
        self.base_url = "https://restapi.amap.com/v3/place"

    def search_photos(self, query: str, per_page: int = 5) -> List[dict]:
        """
        搜索景点图片

        Args:
            query: 景点名称
            per_page: 返回图片数量

        Returns:
            图片列表
        """
        try:
            # 搜索POI(extensions=all 才能返回图片)
            url = f"{self.base_url}/text"
            params = {
                "key": self.api_key,
                "keywords": query,
                "city": "",
                "offset": 1,
                "page": 1,
                "extensions": "all"
            }

            resp = requests.get(url, params=params, timeout=10)
            data = resp.json()

            if data.get("status") != "1":
                print(f"⚠️  高德API搜索失败: {data.get('info', '未知错误')}")
                return []

            pois = data.get("pois", [])
            if not pois:
                print(f"⚠️  未找到景点 '{query}' 的POI信息")
                return []

            # 提取第一个POI的图片
            photos = pois[0].get("photos", [])
            results = []
            for p in photos[:per_page]:
                url = p.get("url", "")
                if url:
                    # 修复HTTP链接
                    if url.startswith("http://"):
                        url = url.replace("http://", "https://")
                    results.append({
                        "url": url,
                        "title": p.get("title", ""),
                    })

            return results

        except Exception as e:
            print(f"❌ 图片搜索失败: {str(e)}")
            return []

    def get_photo_url(self, query: str) -> Optional[str]:
        """
        获取单张景点图片URL

        Args:
            query: 景点名称

        Returns:
            图片URL
        """
        photos = self.search_photos(query, per_page=1)
        if photos:
            return photos[0].get("url")
        return None


# 全局服务实例
_image_service = None


def get_image_service() -> ImageService:
    """获取图片服务实例(单例模式)"""
    global _image_service

    if _image_service is None:
        _image_service = ImageService()

    return _image_service

