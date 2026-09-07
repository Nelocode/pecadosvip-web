import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { cp, copyFile, mkdir, readFile, writeFile, lstat, realpath, rename } from 'node:fs/promises';
import { dirname, resolve, relative, extname, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { sourceCommit as getSourceCommit, buildInputs } from './build-inputs.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const repository = resolve(root, '..');
const staging = resolve(root, '.build');
const stage = resolve(staging, `editable-${Date.now()}`);
const theme = resolve(stage, 'pecadosvip');
const plugin = resolve(stage, 'pecadosvip-content');
const sha = (value) => createHash('sha256').update(value).digest('hex');
await mkdir(staging, { recursive: true });
await mkdir(resolve(theme, 'content'), { recursive: true });
await mkdir(resolve(theme, 'assets/media'), { recursive: true });
await cp(resolve(root, 'theme/pecadosvip'), theme, { recursive: true });
await cp(resolve(root, 'plugin/pecadosvip-content'), plugin, { recursive: true });

await build({ bundle:true,entryPoints:[resolve(root,'src/seed.ts')],platform:'node',format:'esm',
  outfile:resolve(staging,'seed.mjs'),define:{'process.env':'{}','import.meta.env':'{}'},logLevel:'warning' });
const exporter = await import(pathToFileURL(resolve(staging,'seed.mjs')).href + `?build=${Date.now()}`);
const sourceCommit = await getSourceCommit(repository);
const media = {};
const inventory = [];
const definitions = [...exporter.mediaAssets,
  {sourcePath:'app/icon.png',publicPath:'/icon.png'},
  {sourcePath:'app/apple-icon.png',publicPath:'/apple-icon.png'},
];
for(const asset of definitions){
  const source=resolve(repository,asset.sourcePath);
  if(relative(repository,source).startsWith(`..${sep}`)||(await lstat(source)).isSymbolicLink()
    ||relative(repository,await realpath(source)).startsWith('..')) throw new Error('Unsafe source asset');
  const bytes=await readFile(source);
  const path=`assets/media/${sha(bytes).slice(0,24)}${extname(source)}`;
  await copyFile(source,resolve(theme,path));
  media[asset.publicPath]=path;
  inventory.push({...asset,path,bytes:bytes.length,sha256:sha(bytes)});
}
media['/preview-local-sintetico/decor-media/border-filigree']=media['/beta-media/decor/border-filigree'];
const seed=exporter.makeSeed(media,sourceCommit);
const seedBytes=JSON.stringify(seed,null,2);
await writeFile(resolve(theme,'content/seed.json'),seedBytes);
await writeFile(resolve(theme,'content/media-inventory.json'),JSON.stringify(inventory,null,2));
const visited=new Set();
async function inlineCss(path){
  if(visited.has(path))return '';
  visited.add(path);
  let css=await readFile(path,'utf8');
  for(const match of [...css.matchAll(/@import\s+['"]([^'"]+)['"];?/g)])css=css.replace(match[0],await inlineCss(resolve(dirname(path),match[1])));
  return css.replace(/url\((['"]?)(\/[^)'"\s]+)\1\)/g,(_match,_quote,url)=>{
    if(!media[url])throw new Error(`Unmapped CSS asset ${url}`);
    return `url('./${media[url].replace(/^assets\//,'')}')`;
  });
}
const css=[];
for(const file of ['globals.css','theme.css','public-site.css'])css.push(await inlineCss(resolve(repository,'app',file)));
await writeFile(resolve(theme,'assets/frontend.css'),css.join('\n'));
const metadata={schema:2,sourceCommit,mode:'native-editable-wordpress',generatedAt:new Date().toISOString(),
  records:seed.records.length,locales:Object.keys(seed.copy),mediaCount:inventory.length,seedSha256:sha(seedBytes),productionActivation:false};
await writeFile(resolve(theme,'content/manifest.json'),JSON.stringify(metadata,null,2));
await writeFile(resolve(theme,'content/build-inputs.json'),JSON.stringify(await buildInputs(repository,definitions.map((asset)=>asset.sourcePath)),null,2));
await mkdir(resolve(root,'dist'),{recursive:true});
for(const name of ['pecadosvip','pecadosvip-content']){
  const target=resolve(root,'dist',name);
  try{await rename(target,resolve(staging,`previous-${name}-${Date.now()}`));}catch(error){if(error.code!=='ENOENT')throw error;}
  await rename(resolve(stage,name),target);
}
await writeFile(resolve(staging,'build-result.json'),JSON.stringify(metadata,null,2));
console.log(JSON.stringify({...metadata,theme:resolve(root,'dist/pecadosvip'),plugin:resolve(root,'dist/pecadosvip-content')},null,2));
