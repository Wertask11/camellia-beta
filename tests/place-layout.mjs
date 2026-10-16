import {createServer} from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/postcss';
import {resolve} from 'node:path';
const root=process.cwd();
const server=await createServer({configFile:false,root,cacheDir:resolve('node_modules/.vite-place-layout'),resolve:{alias:[{find:'@/lib/place/client',replacement:resolve('tests/place-ui-fixture.ts')},{find:'@',replacement:root}]},css:{postcss:{plugins:[tailwindcss()]}},plugins:[react(),{name:'circle-layout',configureServer(server){server.middlewares.use((req,res,next)=>{if(req.url==='/place-fixture'){void server.transformIndexHtml('/place-fixture','<!doctype html><html lang="ja"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/tests/place-layout-entry.tsx"></script></html>').then(html=>{res.setHeader('Content-Type','text/html');res.end(html);});}else next();});}}],server:{host:'127.0.0.1',port:4178,strictPort:true}});await server.listen();console.log('Explicit Place component fixture, not live auth/API: http://127.0.0.1:4178/place-fixture');
