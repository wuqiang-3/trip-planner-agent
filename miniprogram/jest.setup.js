const store = {}
global.__wxStore = store
global.wx = {
  getStorageSync: (k) => (k in store ? store[k] : ''),
  setStorageSync: (k, v) => { store[k] = v },
  removeStorageSync: (k) => { delete store[k] }
}
global.__resetWxStore = () => { for (const k in store) delete store[k] }
