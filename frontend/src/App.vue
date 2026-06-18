<template>
  <a-config-provider :locale="zhCN">
    <div id="app">
      <a-layout style="min-height: 100vh">
        <a-layout-header style="background: #001529; padding: 0 50px">
          <div style="color: white; font-size: 24px; font-weight: bold">
            🌍 趣游智能旅行助手
          </div>
        </a-layout-header>
        <a-layout-content style="padding: 24px">
          <router-view />
        </a-layout-content>
        <a-layout-footer style="text-align: center">
          趣游智能旅行助手 ©2025
        </a-layout-footer>
      </a-layout>
    </div>
  </a-config-provider>
</template>

<script setup lang="ts">
import zhCN from 'ant-design-vue/locale/zh_CN'
</script>

<style>
#app {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial,
    'Noto Sans', sans-serif;
}
</style>

