const { defineConfig } = require('vite')
const _react = require('@vitejs/plugin-react')
const react = _react.default || _react

module.exports = defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8000',
      '/uploads': 'http://localhost:8000'
    }
  }
})
