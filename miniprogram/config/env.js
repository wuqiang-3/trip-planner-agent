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
