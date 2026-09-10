
import {spawn,spawnSync} from 'node:child_process';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const testDir=path.dirname(fileURLToPath(import.meta.url));
const base=path.resolve(process.env.PVP_TEST_OUTPUT || path.join(testDir,'../../../../output/legal-containment-tests'));
const repo=process.argv[2];
assert(repo,'Pass repository root');
const source=path.join(repo,'wordpress/protection/00-pecadosvip-protection.php');
const php=process.env.PVP_PHP;
assert(php,'Set PVP_PHP');
const runRoot=process.env.PVP_QA_ROOT;
assert(runRoot,'Set PVP_QA_ROOT to an empty local QA directory');
const apache=process.env.PVP_APACHE_HOME;
assert(apache,'Set PVP_APACHE_HOME');
const qa=path.join(runRoot,'qa'),root=path.join(qa,'www');
await mkdir(root,{recursive:true});
await mkdir(base,{recursive:true});
const norm=p=>p.replaceAll('\\','/');
const sentinel='PRIVATE_SYNTHETIC_BYTES_DO_NOT_SERVE';
const media=['wp-content/uploads/original.jpg','wp-content/uploads/video.mp4','wp-content/uploads/opaque','wp-content/uploads/data.json','wp-content/uploads/pvc-watermarked/1/hash/poster.jpg','wp-content/uploads/nested/test.php','wp-content/themes/pecadosvip/assets/media/fixture.webp','wp-content/themes/pecadosvip/content/seed.json','legacy.jpg.backup','legacy.mp4'];
for(const file of media){await mkdir(path.dirname(path.join(root,file)),{recursive:true});await writeFile(path.join(root,file),sentinel);}
await writeFile(path.join(root,'wp-content/uploads/.htaccess'),'Require all granted\n');
await writeFile(path.join(root,'control.txt'),'PUBLIC_CONTROL');
await writeFile(path.join(root,'style.css'),'body{color:white}');
await writeFile(path.join(root,'.htaccess'),'');
let origin=await readFile(path.join(repo,'wordpress/protection/apache-public-protection.conf'),'utf8');
origin=origin.replaceAll('/var/www/html',norm(root));
await writeFile(path.join(qa,'protection.conf'),origin);
const modules=['authz_core','authz_host','mime','dir','headers','log_config'];
const config=[
'ServerRoot "'+norm(apache)+'"',
'Listen 127.0.0.1:8096',
'ServerName localhost',
'PidFile "'+norm(path.join(qa,'httpd.pid'))+'"',
'ErrorLog "'+norm(path.join(qa,'error.log'))+'"',
...modules.map(m=>'LoadModule '+m+'_module modules/mod_'+m+'.so'),
'TypesConfig "'+norm(path.join(apache,'conf/mime.types'))+'"',
'DocumentRoot "'+norm(root)+'"',
'<Directory "'+norm(root)+'">',
'AllowOverride All','Require all granted','</Directory>',
'Include "'+norm(path.join(qa,'protection.conf'))+'"'
].join('\n');
const cfg=path.join(qa,'httpd.conf');
await writeFile(cfg,config);
const env={...process.env,PVP_TEST_SOURCE:source};
const lint=spawnSync(php,['-l',source],{encoding:'utf8',env,windowsHide:true});
assert.equal(lint.status,0,lint.stderr);
const unit=spawnSync(php,[path.join(testDir,'unit.php')],{encoding:'utf8',env,windowsHide:true});
assert.equal(unit.status,0,unit.stderr);
const unitReport=JSON.parse(unit.stdout);
const syntax=spawnSync(path.join(apache,'bin/httpd.exe'),['-d',norm(apache),'-t','-f',norm(cfg)],{encoding:'utf8',windowsHide:true});
assert.equal(syntax.status,0,syntax.stderr);
await writeFile(path.join(base,'unit-results.json'),JSON.stringify(unitReport,null,2));
const children=[];
const results=[];
async function waitReady(url){
 for(let i=0;i<50;i++){try{await fetch(url,{signal:AbortSignal.timeout(1000)});return;}catch{await new Promise(r=>setTimeout(r,100));}}
 throw Error('Local server did not start '+url);
}
try{
 for(const [exe,args,options] of [
 [php,['-S','127.0.0.1:8095',path.join(testDir,'fixture.php')],{env}],
 [path.join(apache,'bin/httpd.exe'),['-d',norm(apache),'-X','-f',norm(cfg)],{}]
 ]){const child=spawn(exe,args,{...options,windowsHide:true,stdio:['ignore','pipe','pipe']});child.stdout.on('data',()=>{});child.stderr.on('data',()=>{});children.push(child);}
 await waitReady('http://127.0.0.1:8096/control.txt');
 await waitReady('http://127.0.0.1:8095/es');
 for(const file of [...media,'wp-content/up%6coads/original.jpg','WP-CONTENT/UPLOADS/original.jpg','wp-content/uploads/original.jpg?age_verified=true']){
  for(const method of ['GET','HEAD']){
   const response=await fetch('http://127.0.0.1:8096/'+file,{method,headers:{Range:'bytes=0-31',Cookie:'age_verified=true',Referer:'https://pecadosvip.com/es'},signal:AbortSignal.timeout(3000)});
   const body=await response.text();
   assert([403,404].includes(response.status),file+' '+response.status);
   assert(!body.includes(sentinel),'Private bytes leaked '+file);
   assert(response.headers.get('cache-control')?.includes('no-store'));
   results.push({layer:'apache',path:file,method,status:response.status,noPrivateBytes:true});
  }
 }
 for(const file of ['control.txt','style.css']){
  const response=await fetch('http://127.0.0.1:8096/'+file);assert.equal(response.status,200);
  results.push({layer:'apache-control',path:file,status:response.status});
 }
 for(const uri of ['/es','/en','/fr','/it','/es/perfiles/test','/es/legal/privacidad','/?rest_route=/wp/v2/media','/wp-json/wp/v2/media','/?feed=rss2','/wp-admin/admin-ajax.php','/wp-admin/admin-post.php','/xmlrpc.php','/es?age_verified=true']){
  for(const method of ['GET','HEAD','POST']){
   const response=await fetch('http://127.0.0.1:8095'+uri,{method,headers:{Cookie:'age_verified=true','User-Agent':'Googlebot'},signal:AbortSignal.timeout(3000)});
   const body=await response.text();
   assert.equal(response.status,503,uri);
   assert(!body.includes('SYNTHETIC_EDITOR_OR_LOGIN_PATH'));
   assert(!/<(?:img|video|source|script|iframe|form)\b/i.test(body));
   assert(response.headers.get('cache-control')?.includes('no-store'));
   results.push({layer:'php-fixture',path:uri,method,status:response.status,noContent:true});
  }
 }
 for(const uri of ['/wp-login.php','/wp-admin/index.php']){
  const response=await fetch('http://127.0.0.1:8095'+uri);assert.equal(response.status,200);
  results.push({layer:'auth-fixture',path:uri,status:response.status});
 }
 const editor=await fetch('http://127.0.0.1:8095/es',{headers:{'X-Synthetic-Editor':'1'}});
 assert.equal(editor.status,200);assert((await editor.text()).includes('SYNTHETIC_EDITOR_OR_LOGIN_PATH'));
 results.push({layer:'editor-fixture',status:editor.status});
 await writeFile(path.join(base,'http-results.json'),JSON.stringify({status:'PASS',apacheVersion:'2.4.68 Win64',unitAssertions:unitReport.assertions,scenarios:results.length,scope:'Actual Apache static access rules and PHP guard with synthetic WordPress auth; Linux Docker and real WordPress remain separate',results},null,2));
 console.log(JSON.stringify({status:'PASS',unitAssertions:unitReport.assertions,httpScenarios:results.length,apacheSyntax:syntax.stderr.trim()},null,2));
}finally{
 for(const child of children){child.kill();}
}
