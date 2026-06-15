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
