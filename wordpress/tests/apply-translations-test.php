<?php
/** The offline applier creates drafts, never overwrites, and refuses an ambiguous body. */
define('ABSPATH',__DIR__);
$posts=array();$meta=array();$options=array();$checks=0;$deleted=array();
function check($ok,$m){++$GLOBALS['checks'];if(!$ok)throw new \RuntimeException($m);}
function add_action(...$a){} function add_filter(...$a){}
function get_option($k,$d=false){return $GLOBALS['options'][$k]??$d;}
function add_option($k,$v,...$a){if(isset($GLOBALS['options'][$k]))return false;$GLOBALS['options'][$k]=$v;return true;}
function update_option($k,$v,...$a){$GLOBALS['options'][$k]=$v;return true;}
function delete_option($k){unset($GLOBALS['options'][$k]);}
function get_post($id){return $GLOBALS['posts'][$id]??null;}
function get_post_meta($id,$k,$s=false){return $GLOBALS['meta'][$id][$k]??'';}
function get_post_thumbnail_id($p){return (int)get_post_meta(is_object($p)?$p->ID:$p,'_thumbnail_id',true);}
function set_post_thumbnail($id,$v){$GLOBALS['meta'][$id]['_thumbnail_id']=$v;}
function wp_json_encode($v){return json_encode($v);} function wp_kses_post($v){return $v;}
function wp_slash($v){return $v;} function wp_unslash($v){return $v;}
function sanitize_key($v){return preg_replace('/[^a-z0-9_-]/','',$v);}
function sanitize_text_field($v){return strip_tags((string)$v);} function sanitize_textarea_field($v){return strip_tags((string)$v);}
function absint($v){return abs((int)$v);} function current_user_can(...$a){return true;}
function check_ajax_referer(...$a){} function wp_send_json_error(...$a){} function wp_send_json_success(...$a){}
function admin_url($v=''){return '/wp-admin/'.$v;} function clean_post_cache(...$a){}
function is_wp_error($v){return false;}
function pvc_types(){return array_fill_keys(array('pv_profile','pv_service','pv_city','pv_page'),array());}
function pvc_validate(...$a){return true;} function pvc_sanitize_data($d,$t){return $d;}
function pvc_route($p){return '/'.get_post_meta($p->ID,'pv_locale',true).'/'.get_post_meta($p->ID,'pv_key',true);}
function pvc_bump(){} function pvc_revision(){return '1';}
function get_post_status($p){$id=is_object($p)?$p->ID:(int)$p;return $GLOBALS['posts'][$id]->post_status??false;}
function get_posts($q){return array_values(array_filter($GLOBALS['posts'],function($p)use($q){
 if(!in_array($p->post_type,(array)$q['post_type'],true)||!in_array($p->post_status,(array)$q['post_status'],true))return false;
 if(isset($q['meta_key'])&&get_post_meta($p->ID,$q['meta_key'],true)!==$q['meta_value'])return false;
 foreach($q['meta_query']??array() as $m){$v=get_post_meta($p->ID,$m['key'],true);if(($m['compare']??'=')==='EXISTS'){if($v===''||$v===null)return false;continue;}if($v!==$m['value'])return false;}
 return true;
}));}
function wp_insert_post($payload,$error=false){
 if(!$GLOBALS['posts'])return 0;
 $id=max(array_keys($GLOBALS['posts']))+1;
 $p=(object)array('ID'=>$id,'post_type'=>$payload['post_type'],'post_status'=>'draft','post_password'=>'','post_title'=>'','post_content'=>'','post_excerpt'=>'','menu_order'=>0);
 foreach($payload as $k=>$v){if($k!=='meta_input')$p->$k=$v;}
 $GLOBALS['posts'][$id]=$p;$GLOBALS['meta'][$id]=array_merge(array('_thumbnail_id'=>0),$payload['meta_input']??array());return $id;
}
/** Only published source profiles are visible to the applier. */
function pvc_record(string $type, string $locale, string $key): ?array {
 $post=null;foreach($GLOBALS['posts'] as $p){if($p->post_type==='pv_profile'&&$p->post_status==='publish'&&get_post_meta($p->ID,'pv_key',true)===$key&&get_post_meta($p->ID,'pv_locale',true)===$locale){$post=$p;break;}}
 if(!$post)return null;
 return array('id'=>$post->ID,'key'=>$key,'locale'=>$locale,'title'=>$post->post_title,'excerpt'=>$post->post_excerpt,'content'=>$post->post_content,'data'=>get_post_meta($post->ID,'pv_data',true));
}
function fixture_source($id,$content,$excerpt){
 $GLOBALS['posts'][$id]=(object)array('ID'=>$id,'post_type'=>'pv_profile','post_status'=>'publish','post_password'=>'','post_title'=>'Maria','post_content'=>$content,'post_excerpt'=>$excerpt,'menu_order'=>0);
 $GLOBALS['meta'][$id]=array('pv_key'=>'maria','pv_locale'=>'es','_thumbnail_id'=>44,'pv_data'=>array('age'=>25,'availability'=>'on-request','cities'=>array('madrid'),'languages'=>array('Inglés','Español'),'synthetic'=>true,'tags'=>array()));
 return $GLOBALS['posts'][$id];
}
require __DIR__.'/../plugin/pecadosvip-content/includes/selective-translation.php';
$map=tempnam(sys_get_temp_dir(),'pvc').'.json';
putenv('PVC_TRANSLATIONS='.$map);
function run_applier(){include __DIR__.'/../tools/apply-profile-translations.php';}

// 1. A single-node body creates one draft per locale and keeps the source untouched.
fixture_source(465,'<!-- wp:paragraph --><p>Carismática, romántica.</p><!-- /wp:paragraph -->','Carismática, romántica.');
$profiles=array('maria'=>array('en'=>array('content'=>'Charismatic, romantic.','excerpt'=>'Charismatic, romantic.','languages'=>array('Inglés'=>'English','Español'=>'Spanish')),'fr'=>array('content'=>'Charismatique, romantique.','excerpt'=>'Charismatique, romantique.','languages'=>array('Inglés'=>'Anglais','Español'=>'Espagnol'))));
$payload=json_encode(array('schema'=>'pecadosvip.profile-translations','version'=>1,'sourceLocale'=>'es','profiles'=>$profiles));
file_put_contents($map,$payload);
ob_start();run_applier();$out=ob_get_clean();
$created=array_values(array_filter($GLOBALS['posts'],fn($p)=>$p->post_type==='pv_profile'&&$p->post_status==='draft'));
check(count($created)===2,'Two locale drafts are created');
$en=null;foreach($created as $p){if(get_post_meta($p->ID,'pv_locale',true)==='en')$en=$p;}
check($en!==null&&str_contains($en->post_content,'Charismatic, romantic.'),'The body is replaced with the translation');
check(!str_contains($en->post_content,'Carismática'),'The source body does not leak into the translation');
check($en->post_excerpt==='Charismatic, romantic.','The excerpt is translated');
check(get_post_meta($en->ID,'pv_data',true)['languages']===array('English','Spanish'),'Spoken languages are mapped by source value');
check(get_post_meta($en->ID,'pv_data',true)['age']===25,'Untranslated data is carried over');
check((int)get_post_meta($en->ID,'_pvc_lt_source',true)===465,'Provenance is recorded');
check(get_post_meta($en->ID,'_pvc_lt_engine',true)==='offline-map','The engine is recorded as the offline map');
check(get_post_thumbnail_id($en->ID)===44,'The featured image is carried over');
check($GLOBALS['posts'][465]->post_status==='publish','The source stays published');
check(str_contains($out,'2 creados'),'The report counts both creations');
check(str_contains($out,'Publicación: borradores'),'Drafts are the default');

// 2. A second run never overwrites what already exists.
ob_start();run_applier();$out=ob_get_clean();
check(str_contains($out,'0 creados'),'Nothing is created twice');
check(str_contains($out,'2 omitidos por existir'),'Existing versions are reported as kept');
check(count(array_filter($GLOBALS['posts'],fn($p)=>$p->post_type==='pv_profile'&&$p->post_status==='draft'))===2,'No duplicate record appears');

// 3. An ambiguous body is refused instead of guessed.
$GLOBALS['posts']=array();$GLOBALS['meta']=array();
fixture_source(500,'<p>Uno.</p><p>Dos.</p>','Resumen');
file_put_contents($map,$payload);
ob_start();run_applier();$out=ob_get_clean();
check(str_contains($out,'2 nodos de texto'),'A multi-node body is refused with the exact count');
check(!array_filter($GLOBALS['posts'],fn($p)=>$p->post_status==='draft'),'No record is written for a refused body');

// 4. Explicit per-node keys are accepted when the body really has several nodes.
$GLOBALS['posts']=array();$GLOBALS['meta']=array();fixture_source(600,'<p>Uno.</p><p>Dos.</p>','Resumen');
$multi=array('maria'=>array('en'=>array('content:0'=>'One.','content:1'=>'Two.','excerpt'=>'Summary','languages'=>array('Inglés'=>'English','Español'=>'Spanish'))));
file_put_contents($map,json_encode(array('schema'=>'pecadosvip.profile-translations','version'=>1,'sourceLocale'=>'es','profiles'=>$multi)));
ob_start();run_applier();$out=ob_get_clean();
$made=array_values(array_filter($GLOBALS['posts'],fn($p)=>$p->post_status==='draft'));
check(count($made)===1,'A multi-node body with explicit keys is created');
check(str_contains($made[0]->post_content,'One.')&&str_contains($made[0]->post_content,'Two.'),'Both nodes are replaced');

// 5. A missing excerpt or a missing node is refused.
$GLOBALS['posts']=array();$GLOBALS['meta']=array();fixture_source(700,'<p>Uno.</p>','Resumen');
file_put_contents($map,json_encode(array('schema'=>'pecadosvip.profile-translations','version'=>1,'sourceLocale'=>'es','profiles'=>array('maria'=>array('en'=>array('content'=>'One.'))))));
ob_start();run_applier();$out=ob_get_clean();
check(str_contains($out,'falta el extracto'),'A missing excerpt is refused');

// 6. Publication needs the explicit environment flag.
$GLOBALS['posts']=array();$GLOBALS['meta']=array();fixture_source(800,'<p>Uno.</p>','Resumen');
putenv('PVC_TRANSLATE_PUBLISH=1');
file_put_contents($map,json_encode(array('schema'=>'pecadosvip.profile-translations','version'=>1,'sourceLocale'=>'es','profiles'=>array('maria'=>array('it'=>array('content'=>'Uno.','excerpt'=>'Riepilogo','languages'=>array('Inglés'=>'Inglese','Español'=>'Spagnolo')))))));
ob_start();run_applier();$out=ob_get_clean();
putenv('PVC_TRANSLATE_PUBLISH');
$published=array_values(array_filter($GLOBALS['posts'],fn($p)=>$p->post_type==='pv_profile'&&$p->post_status==='publish'&&get_post_meta($p->ID,'_pvc_lt_engine',true)==='offline-map'));
check(count($published)===1,'The explicit flag publishes the translation');
check(str_contains($out,'Publicación: activada'),'The report states the publication mode');

// 7. An unsupported map is refused without touching anything.
file_put_contents($map,'{"schema":"otra-cosa"}');
ob_start();run_applier();$out=ob_get_clean();
check(str_contains($out,'Mapa no compatible'),'A foreign map is refused');
unlink($map);
echo json_encode(array('ok'=>true,'assertions'=>$checks),JSON_PRETTY_PRINT).PHP_EOL;
