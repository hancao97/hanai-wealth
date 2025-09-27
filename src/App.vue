<template>
  <div id="app">
    <router-view />
  </div>
</template>

<script setup>
// Vue 3 Composition API
</script>

<style>
@import '@/styles/main.css';

:root { 
  --bg: #f8fafc; 
  --card: #ffffff; 
  --text: #334155; 
  --accent: #3b82f6; 
  --border: rgba(0,0,0,0.1);
  --input-bg: rgba(255,255,255,0.8);
  --shadow: rgba(0,0,0,0.1);
  --primary: #1e40af;
  --secondary: #7c3aed;
  --gold: #f59e0b;
  --success: #10b981;
  --warning: #f59e0b;
  --danger: #ef4444;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  background: linear-gradient(88deg, #dbeafe 0%, #e0e7ff 50%, var(--bg) 100%);
  color: var(--text);
  line-height: 1.6;
  min-height: 100vh;
  overflow-x: hidden;
}

#app {
  min-height: 100vh;
}
</style>
