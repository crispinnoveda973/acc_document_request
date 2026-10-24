import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/**
 * XSS defence: Content-Security-Policy for the BUILT site (npm run build).
 * Only our own scripts may run; inline <script>, eval() and scripts from other sites are blocked, so an injected
 * <script> or onerror="..." cannot execute even if some text slipped through. Not applied in `npm run dev`
 * because Vite's hot-reload needs inline scripts. (A real HTTP header is better - see README "Security".)
 */
const csp = {
  name: 'acc-csp',
  apply: 'build',
  transformIndexHtml: () => [{
    tag: 'meta', injectTo: 'head-prepend',
    attrs: {
      'http-equiv': 'Content-Security-Policy',
      content: [
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: blob:",
        "connect-src 'self'",
        "frame-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join('; '),
    },
  }],
};

// The proxy sends /api and /storage to Laravel, so no CORS setup is needed in development.
export default defineConfig({
  plugins: [react(), tailwindcss(), csp],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://127.0.0.1:8000',
      '/storage': 'http://127.0.0.1:8000',
    },
  },
});
