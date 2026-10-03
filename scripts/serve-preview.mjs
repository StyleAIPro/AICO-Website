// Local, read-only website preview with byte ranges for seekable recordings.
// Usage: node scripts/serve-preview.mjs [port]
import {createServer} from 'node:http';
import {createReadStream} from 'node:fs';
import {stat} from 'node:fs/promises';
import {dirname,extname,resolve,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const port=Number(process.argv[2]||8766);
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.vtt':'text/vtt; charset=utf-8','.mp4':'video/mp4','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.webp':'image/webp','.woff2':'font/woff2'};
const server=createServer(async(req,res)=>{
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{Allow:'GET, HEAD'}).end();return;}
  try{
    const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    let path=resolve(root,'.'+pathname);
    if(path!==root&&!path.startsWith(root+sep)){res.writeHead(403).end();return;}
    let info=await stat(path);if(info.isDirectory()){path=resolve(path,'index.html');info=await stat(path);}if(!info.isFile()){res.writeHead(404).end();return;}
    let start=0,end=info.size-1,status=200;
    const headers={'Content-Type':types[extname(path)]||'application/octet-stream','Accept-Ranges':'bytes','Cache-Control':'no-cache','Last-Modified':info.mtime.toUTCString()};
    if(req.headers.range){
      const match=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
      if(!match||(!match[1]&&!match[2])){res.writeHead(416,{'Content-Range':`bytes */${info.size}`}).end();return;}
      if(match[1]){start=Number(match[1]);end=match[2]?Math.min(Number(match[2]),end):end;}
      else start=Math.max(0,info.size-Number(match[2]));
      if(start>end||start>=info.size||!Number.isSafeInteger(start)||!Number.isSafeInteger(end)){res.writeHead(416,{'Content-Range':`bytes */${info.size}`}).end();return;}
      status=206;headers['Content-Range']=`bytes ${start}-${end}/${info.size}`;
    }
    headers['Content-Length']=Math.max(0,end-start+1);res.writeHead(status,headers);
    if(req.method==='HEAD'||info.size===0){res.end();return;}
    const stream=createReadStream(path,{start,end});stream.on('error',()=>res.destroy());res.on('close',()=>stream.destroy());stream.pipe(res);
  }catch(error){if(!res.headersSent)res.writeHead(error.code==='ENOENT'?404:400);res.end();}
});
server.listen(port,'127.0.0.1',()=>console.log(`Candidate preview: http://127.0.0.1:${port}/docs/index-next.html`));
