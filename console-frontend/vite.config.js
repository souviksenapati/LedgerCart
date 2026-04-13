const { defineConfig } = require('vite')
const _react = require('@vitejs/plugin-react')
const react = _react.default || _react

module.exports = defineConfig({
  plugins: [react()],
  server: {
    port: 5174,   // Different from app-frontend (5173) — both can run in dev simultaneously
    proxy: {
      '/api': 'http://localhost:8000',
    }
  }
})
