import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    watch: {
      // Vite rewrites edited modules through a temp file in the same folder. On
      // Windows that rename can fail with EBUSY while a handle is still open,
      // and the leftover path then crashes the file watcher and the whole dev
      // server. Ignoring the temp artifacts keeps the server alive across edits.
      ignored: [
        '**/.*.tmpdir/**',
        '**/.*.tmpdir',
        '**/*.tmp',
        '**/.*.tmp',
      ],
    },
  },
})
