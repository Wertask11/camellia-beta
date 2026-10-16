/** Component layout checks only. No authentication replacement or API response mocks. */
import {createServer} from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/postcss';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('..',import.meta.url));
const server=await createServer({configFile:false,cacheDir:root+'/node_modules/.vite-phase1-layout',root,resolve:{alias:{'@':root}},css:{postcss:{plugins:[tailwindcss()]}},plugins:[react(),{name:'phase1-component-entry',configureServer(server){server.middlewares.use((req,res,next)=>{if(req.url?.startsWith('/layout')){const entry='reflection-layout-entry';void server.transformIndexHtml('/layout','<!doctype html><html lang="ja"><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="root"></div><script type="module" src="/tests/' + entry + '.tsx"></script></body></html>').then(html=>{res.setHeader('Content-Type','text/html');res.end(html);});}else next();});}}],server:{host:'127.0.0.1',port:4179,strictPort:true}});
await server.listen();console.log('Component-only layout preview http://127.0.0.1:4179/layout');
