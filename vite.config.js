const { defineConfig } = require("vite");
const react = require("@vitejs/plugin-react");
const tailwindcss = require("@tailwindcss/vite");

module.exports = defineConfig({
  plugins: [react(), tailwindcss()],
});
