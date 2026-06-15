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
