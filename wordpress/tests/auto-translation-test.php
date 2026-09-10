<?php
/** Publishing a new model creates the missing locales automatically, or does nothing. */
define('ABSPATH',__DIR__);
$posts=array();$meta=array();$options=array();$hooks=array();$filters=array();$checks=0;
function check($ok,$m){++$GLOBALS['checks'];if(!$ok)throw new \RuntimeException($m);}
function add_action($n,$f,...$a){$GLOBALS['hooks'][$n][]=$f;}
function add_filter($n,$f,...$a){$GLOBALS['filters'][$n][]=$f;}
function apply_filters($n,$v,...$a){foreach($GLOBALS['filters'][$n]??array() as $f){$v=$f($v,...$a);}return $v;}
function has_filter($n,$f=false){return !empty($GLOBALS['filters'][$n]);}
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
require __DIR__.'/../plugin/pecadosvip-content/includes/selective-translation.php';
require __DIR__.'/../plugin/pecadosvip-content/includes/auto-translation.php';
function source_profile($id){
 $GLOBALS['posts'][$id]=(object)array('ID'=>$id,'post_type'=>'pv_profile','post_status'=>'publish','post_password'=>'','post_title'=>'Maria','post_content'=>'<p>Carismática, romántica.</p>','post_excerpt'=>'Carismática, romántica.','menu_order'=>0);
 $GLOBALS['meta'][$id]=array('pv_key'=>'maria','pv_locale'=>'es','_thumbnail_id'=>44,'pv_data'=>array('age'=>25,'availability'=>'on-request','homeZone'=>'madrid','synthetic'=>false,'tags'=>array(),'conceptTags'=>array(),'languages'=>array('Español')));
 return $GLOBALS['posts'][$id];
}
function fire_transition($new,$old,$post){foreach($GLOBALS['hooks']['transition_post_status']??array() as $f){$f($new,$old,$post);}}
function drafts(){return array_values(array_filter($GLOBALS['posts'],fn($p)=>$p->post_type==='pv_profile'&&$p->post_status==='draft'));}

// 1. Fail-closed: with the tool disabled nothing happens, engine or not.
$GLOBALS['filters']['pvc_lt_translate_text']=array(fn($v,$t,$f,$to)=>'EN '.$t);
$post=source_profile(465);
fire_transition('publish','draft',$post);
check(drafts()===array(),'A disabled tool creates nothing even with an engine plugged in');

// 2. Enabled but no engine: no half-translated record is invented.
$GLOBALS['options']['pvc_local_translation_policy']=array('enabled'=>true,'mode'=>'content-drafts-v2','legacy'=>array(),'publish'=>false);
$GLOBALS['filters']['pvc_lt_translate_text']=array();
check(!pvc_lt_engine_ready(),'No engine is configured by default');
check(pvc_lt_translate_text('hola','es','en')==='hola','Without an engine the text is returned unchanged');
$report=pvc_lt_auto_translate($post);
check($report['created']===0&&$report['reason']==='ok','Without an engine nothing is created');
check(drafts()===array(),'The source text is never published as a translation');
check($report['details']['en']==='no-engine','The report names the missing engine');

// 3. With an engine, publishing creates the missing locales automatically.
$GLOBALS['filters']['pvc_lt_translate_text']=array(fn($v,$t,$f,$to)=>$to.'|'.$t);
fire_transition('publish','draft',$post);
$made=drafts();
check(count($made)===3,'Publishing a new model creates the three missing locales');
$locales=array();foreach($made as $p){$locales[]=get_post_meta($p->ID,'pv_locale',true);}
sort($locales);check($locales===array('en','fr','it'),'Exactly en, fr and it are created');
$en=null;foreach($made as $p){if(get_post_meta($p->ID,'pv_locale',true)==='en')$en=$p;}
check(str_contains($en->post_content,'en|Carismática, romántica.'),'The engine output reaches the record');
check(get_post_meta($en->ID,'_pvc_lt_engine',true)==='auto','The record is marked as automatic');
check((int)get_post_meta($en->ID,'_pvc_lt_source',true)===465,'The source is recorded');
check(get_post_thumbnail_id($en->ID)===44,'The featured image is carried over');

// 4. Idempotent: a second publication never duplicates or overwrites.
fire_transition('publish','draft',$post);
check(count(drafts())===3,'A second run creates nothing new');
$report=pvc_lt_auto_translate($post);
check($report['created']===0&&$report['skipped']===3,'An existing version is skipped, never replaced');

// 5. A record created by the module can never trigger another run.
$before=count($GLOBALS['posts']);
fire_transition('publish','draft',$en);
check(count($GLOBALS['posts'])===$before,'A translation does not trigger another translation');

// 6. Only a first publication triggers, and only in the source locale.
$other=source_profile(700);
$GLOBALS['meta'][700]['pv_locale']='en';
fire_transition('publish','draft',$other);
check(count(drafts())===3,'A record already in another locale is not treated as a source');
fire_transition('publish','publish',$post);
check(count(drafts())===3,'An update does not re-run the translation');
fire_transition('draft','publish',$post);
check(count(drafts())===3,'Unpublishing does not create anything');
echo json_encode(array('ok'=>true,'assertions'=>$checks),JSON_PRETTY_PRINT).PHP_EOL;
