import {spawn} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const here=path.dirname(fileURLToPath(import.meta.url));
const image=process.argv[2];
assert(image && /^[a-zA-Z0-9_./:@-]+$/.test(image),'Pass the built production image tag');
const root=path.resolve(here,'../..');
const output=path.resolve(process.env.PVP_DOCKER_OUTPUT || path.join(root,'output/containment-linux'));
const port=Number(process.env.PVP_QA_PORT || 18088);
assert(Number.isInteger(port)&&port>=1024&&port<=65535);
const base='http://127.0.0.1:'+port;
const project='pecadosvip-containment-qa';
const docker=process.env.DOCKER_BIN || (process.platform==='win32'?'C:/Program Files/Docker/Docker/resources/bin/docker.exe':'docker');
await mkdir(output,{recursive:true});
const secrets=path.join(output,'secrets');
await mkdir(secrets,{recursive:true,mode:0o700});
for(const name of ['db-password','db-root-password','admin-password']){
 try{await writeFile(path.join(secrets,name+'.txt'),randomBytes(32).toString('base64url'),{flag:'wx',mode:0o444});}catch(e){if(e.code!=='EEXIST')throw e;}
}
const composeFile=path.join(output,'compose.json');
const env={WORDPRESS_DB_HOST:'db:3306',WORDPRESS_DB_USER:'pvp_qa',WORDPRESS_DB_NAME:'pvp_qa',WORDPRESS_DB_PASSWORD_FILE:'/run/secrets/db_password',WORDPRESS_CONFIG_EXTRA:"define('WP_ENVIRONMENT_TYPE','local'); define('WP_HTTP_BLOCK_EXTERNAL',true); define('DISABLE_WP_CRON',true); define('WP_AUTO_UPDATE_CORE',false);"};
const compose={services:{
 db:{image:'mariadb:11.4.13@sha256:611a2fcc5fa7c6ceb8644c6f74b25ede004ff6c3a6b38c8f8c23d3bbf6c26430',environment:{MARIADB_DATABASE:'pvp_qa',MARIADB_USER:'pvp_qa',MARIADB_PASSWORD_FILE:'/run/secrets/db_password',MARIADB_ROOT_PASSWORD_FILE:'/run/secrets/db_root_password'},secrets:['db_password','db_root_password'],volumes:['database:/var/lib/mysql'],healthcheck:{test:['CMD','healthcheck.sh','--connect','--innodb_initialized'],interval:'3s',timeout:'5s',retries:50}},
 wordpress:{image,environment:env,secrets:['db_password'],volumes:['wordpress:/var/www/html'],ports:['127.0.0.1:'+port+':80'],depends_on:{db:{condition:'service_healthy'}},healthcheck:{test:['CMD','php','-r',"exit(is_file('/var/www/html/wp-config.php')?0:1);"],interval:'3s',timeout:'5s',retries:50}},
 cli:{image:'wordpress:cli-2.12.0-php8.3@sha256:2b5e9d4d3e51909dca1aaa4732e9f5e5bf0377c2114dbd8ff39f060bff202586',profiles:['tools'],user:'33:33',environment:{...env,WP_QA_URL:base},secrets:['db_password','admin_password'],volumes:['wordpress:/var/www/html',here.replaceAll('\\','/')+':/protection:ro',path.join(root,'wordpress/qa').replaceAll('\\','/')+':/native-qa:ro']}
},volumes:{database:{},wordpress:{}},secrets:{db_password:{file:path.join(secrets,'db-password.txt')},db_root_password:{file:path.join(secrets,'db-root-password.txt')},admin_password:{file:path.join(secrets,'admin-password.txt')}}};
await writeFile(composeFile,JSON.stringify(compose,null,2));
const command=['compose','-p',project,'-f',composeFile];
function run(args){return new Promise((resolve,reject)=>{const child=spawn(docker,args,{windowsHide:true,stdio:['ignore','pipe','pipe']});let log='';child.stdout.on('data',b=>log+=b);child.stderr.on('data',b=>log+=b);child.on('error',reject);child.on('close',code=>code===0?resolve(log):reject(new Error('Docker command failed ('+code+'): '+log.slice(-3000))));});}
const results=[];
const media=['/wp-content/uploads/pvp-qa/original.jpg','/wp-content/uploads/pvp-qa/video.mp4','/wp-content/uploads/pvp-qa/opaque','/wp-content/uploads/pvc-watermarked/pvp-qa/hash/poster.jpg','/wp-content/themes/pecadosvip/assets/media/pvp-qa.webp','/wp-content/themes/pecadosvip/content/pvp-qa.json','/pvp-legacy.jpg.backup','/wp-content/up%6coads/pvp-qa/original.jpg'];
async function get(uri,options={}){return fetch(base+uri,{redirect:'manual',signal:AbortSignal.timeout(10000),...options});}
async function publicChecks(phase){
 for(const uri of ['/es','/en','/fr','/it','/protected-qa-page/','/?rest_route=/wp/v2/pages','/wp-json/pecadosvip/v1/catalog','/?feed=rss2','/wp-admin/admin-ajax.php','/wp-admin/admin-post.php','/xmlrpc.php']){
  for(const method of ['GET','HEAD','POST']){
   const r=await get(uri,{method,headers:{Cookie:'age_verified=true','User-Agent':'Googlebot'}});const body=await r.text();
   assert.equal(r.status,503,phase+' '+method+' '+uri);assert.equal(r.headers.get('x-pecadosvip-protection'),'closed-v1');
   assert(!/PRIVATE_SYNTHETIC|<(?:img|video|iframe|script|form)\b/i.test(body));
   assert(r.headers.get('cache-control')?.includes('no-store'));
   results.push({phase,type:'public',uri,method,status:r.status});
  }
 }
 for(const uri of media){for(const method of ['GET','HEAD']){
  const r=await get(uri,{method,headers:{Range:'bytes=0-20',Cookie:'age_verified=true'}});const body=await r.text();
  assert.equal(r.status,403,uri);assert(!body.includes('PRIVATE_SYNTHETIC'));
  assert.equal(r.headers.get('x-pecadosvip-origin-protection'),'closed-v1');
  results.push({phase,type:'media',uri,method,status:r.status});
 }}
}
async function login(user){
 const jar=new Map();const collect=r=>{for(const item of r.headers.getSetCookie()){const [pair]=item.split(';');const at=pair.indexOf('=');jar.set(pair.slice(0,at),pair.slice(at+1));}};
 let r=await get('/wp-login.php');assert.equal(r.status,200);collect(r);
 const password=(await readFile(path.join(secrets,'admin-password.txt'),'utf8')).trim();
 r=await get('/wp-login.php',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded',Cookie:[...jar].map(([k,v])=>k+'='+v).join('; ')},body:new URLSearchParams({log:user,pwd:password,'wp-submit':'Log In',redirect_to:base+'/wp-admin/',testcookie:'1'})});
 collect(r);assert.equal(r.status,302,'Real WordPress login failed');assert([...jar.keys()].some(k=>k.startsWith('wordpress_logged_in_')),'Missing real WP session');
 return [...jar].map(([k,v])=>k+'='+v).join('; ');
}
try{
 console.log('Starting isolated WordPress/MariaDB production-image QA');
 await run([...command,'up','-d','--wait','--wait-timeout','240','wordpress']);
 await run([...command,'run','--rm','cli','wp','eval-file','/protection/tests/docker-bootstrap.php','--skip-wordpress']);
 await publicChecks('initial');
 const seoOutput=await run([...command,'run','--rm','cli','wp','eval-file','/native-qa/seo-runtime.php']);
 await writeFile(path.join(output,'seo-runtime.txt'),seoOutput);
 const admin=await login('pvp_qa');
 const adminPage=await get('/wp-admin/tools.php?page=pvp-public-protection',{headers:{Cookie:admin}});
 assert.equal(adminPage.status,200);assert((await adminPage.text()).includes('Protección pública'));
 results.push({type:'real-admin',status:200});
 const subscriber=await login('pvp_subscriber');
 const blocked=await get('/es',{headers:{Cookie:subscriber}});assert.equal(blocked.status,503);
 results.push({type:'real-subscriber',status:503});
 const editorMedia=await get(media[0],{headers:{Cookie:admin}});assert.equal(editorMedia.status,403);
 results.push({type:'admin-media-contained',status:403});
 const core=await run([...command,'run','--rm','cli','wp','core','version']);
 const before=await run([...command,'exec','-T','wordpress','php','-r',"echo hash_file('sha256','/var/www/html/wp-content/uploads/pvp-qa/original.jpg').' '.hash_file('sha256','/var/www/html/wp-content/mu-plugins/00-pecadosvip-protection.php');"]);
 await run([...command,'restart','wordpress']);
 await run([...command,'up','-d','--wait','--wait-timeout','120','wordpress']);
 await publicChecks('after-restart');
 const after=await run([...command,'exec','-T','wordpress','php','-r',"echo hash_file('sha256','/var/www/html/wp-content/uploads/pvp-qa/original.jpg').' '.hash_file('sha256','/var/www/html/wp-content/mu-plugins/00-pecadosvip-protection.php');"]);
 assert.equal(after,before,'Original or protection changed across restart');
 const imageId=(await run(['image','inspect',image,'--format','{{.Id}}'])).trim();
 const report={status:'PASS',testedAt:new Date().toISOString(),image,imageId,wordpressVersion:core.split('\n').find(s=>/^7\./.test(s)),scenarios:results.length,realWordPress:true,realMariaDB:true,originalAndMuPluginPreserved:true,results};
 await writeFile(path.join(output,'result.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify({...report,results:undefined}));
}finally{await run([...command,'down']);}
