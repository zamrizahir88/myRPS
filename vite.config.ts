import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base must match the GitHub Pages sub-path: https://<user>.github.io/myRPS/
export default defineConfig({
  plugins: [react()],
  base: '/myRPS/',
})
