/** Component layout checks only. No authentication replacement or API response mocks. */
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/postcss';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('..', import.meta.url));
const server = await createServer({
  configFile: false,
  cacheDir: root + '/node_modules/.vite-place-demo',
  root,
  resolve: { alias: { '@': root } },
  css: { postcss: { plugins: [tailwindcss()] } },
  plugins: [
    react(),
    {
      name: 'phase1-component-entry',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url?.startsWith('/?') || req.url === '/') {
            void server
              .transformIndexHtml(
                '/',
                '<!doctype html><html lang="ja"><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="root"></div><script type="module" src="/tests/place-demo-entry.tsx"></script></body></html>',
              )
              .then((html) => {
                res.setHeader('Content-Type', 'text/html');
                res.end(html);
              });
          } else next();
        });
      },
    },
  ],
  server: { host: '127.0.0.1', port: 4181, strictPort: true },
});
await server.listen();
console.log('Public app demo check http://127.0.0.1:4181/layout');
