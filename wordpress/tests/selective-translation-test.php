<?php
namespace TranslateRocket {
 class Settings { static function get(){return ['source_language'=>'es','target_languages'=>[],'active_provider'=>''];} }
 class Strings { static function remember_batch(...$a){} static function hash(...$a){return sha1(implode('|',$a));} static function save_translation(...$a){} }
 class Database { static function strings_table(){return 'test_strings';} }
}
namespace {
define('ABSPATH',__DIR__); $hooks=$meta=$posts=$options=[]; $checks=0; $canManage=$validNonce=true;
$wpdb=new class {function prepare($q,...$a){return $q;} function get_var($q){return 1;}};
class Response extends \RuntimeException {function __construct(public bool $success,public array $data,public int $status=200){parent::__construct($data['message']??'response');}}
function add_action($n,$f,...$a){$GLOBALS['hooks'][$n][]=$f;}
function get_option($k,$d=false){return $GLOBALS['options'][$k]??$d;}
function add_option($k,$v,...$a){if(isset($GLOBALS['options'][$k]))return false;$GLOBALS['options'][$k]=$v;return true;}
function delete_option($k){unset($GLOBALS['options'][$k]);}
function update_option($k,$v,...$a){$GLOBALS['options'][$k]=$v;return true;}
function get_post($id){return $GLOBALS['posts'][$id]??null;}
function get_post_meta($id,$k,$s=false){return $GLOBALS['meta'][$id][$k]??'';}
function get_post_thumbnail_id($p){return (int)get_post_meta(is_object($p)?$p->ID:$p,'_thumbnail_id',true);}
function wp_json_encode($v){return json_encode($v);} function wp_kses_post($v){return $v;}
function wp_slash($v){return $v;} function wp_unslash($v){return $v;}
function sanitize_key($v){return preg_replace('/[^a-z0-9_-]/','',$v);}
function sanitize_text_field($v){return strip_tags($v);} function sanitize_textarea_field($v){return strip_tags($v);}
function absint($v){return abs((int)$v);} function current_user_can(...$a){return $GLOBALS['canManage'];}
function check_ajax_referer(...$a){if(!$GLOBALS['validNonce'])throw new Response(false,['message'=>'Invalid nonce'],403);}
function wp_send_json_error($d,$s=400){throw new Response(false,$d,$s);} function wp_send_json_success($d){throw new Response(true,$d);}
function is_wp_error($v){return false;} function pvc_validate(...$a){return true;} function pvc_sanitize_data($d,$t){return $d;}
function pvc_types(){return array_fill_keys(['pv_profile','pv_service','pv_city','pv_page'],[]);}
function pvc_route($p){return '/'.get_post_meta($p->ID,'pv_locale',true).'/'.get_post_meta($p->ID,'pv_key',true);}
function admin_url($v){return '/wp-admin/'.$v;} function clean_post_cache($id){if(!empty($GLOBALS['race']))$GLOBALS['posts'][$id]->post_status='private';}
function set_post_thumbnail($id,$v){$GLOBALS['meta'][$id]['_thumbnail_id']=$v;}
function get_posts($q){return array_values(array_filter($GLOBALS['posts'],function($p)use($q){
 if(!in_array($p->post_type,(array)$q['post_type'],true)||!in_array($p->post_status,(array)$q['post_status'],true))return false;
 if(isset($q['has_password'])&&!$q['has_password']&&$p->post_password!=='')return false;
 if(isset($q['meta_key'])&&get_post_meta($p->ID,$q['meta_key'],true)!==$q['meta_value'])return false;
 foreach($q['meta_query']??[]as$m)if(get_post_meta($p->ID,$m['key'],true)!==$m['value'])return false;
 return true;
}));}
function fixture($id,$key,$locale='es',$status='publish',$type='pv_page',$kind='information'){
 $p=(object)['ID'=>$id,'post_type'=>$type,'post_status'=>$status,'post_password'=>'','post_title'=>$key,'post_content'=>'<p>Informacion <strong>general</strong> y <a href="/es/contacto">contacto</a>.</p><!-- keep --><code>keep()</code>','post_excerpt'=>'Resumen','menu_order'=>1];
 $GLOBALS['posts'][$id]=$p;$GLOBALS['meta'][$id]=['pv_key'=>$key,'pv_locale'=>$locale,'pv_data'=>['kind'=>$kind,'route'=>'info/'.$key,'tags'=>['Informacion']],'_thumbnail_id'=>44];return $p;
}
function wp_insert_post($payload,$error=false){
 $id=max(array_keys($GLOBALS['posts']))+1;$p=fixture($id,$payload['meta_input']['pv_key'],$payload['meta_input']['pv_locale'],'draft');
 foreach($payload as$k=>$v)if($k!=='meta_input')$p->$k=$v;
 $GLOBALS['meta'][$id]=array_merge($GLOBALS['meta'][$id],$payload['meta_input']);return $id;
}
function check($ok,$m){++$GLOBALS['checks'];if(!$ok)throw new \RuntimeException($m);}
function action($n){try{$GLOBALS['hooks'][$n][0]();}catch(Response$r){return $r;}throw new \RuntimeException('No response');}
require __DIR__.'/../plugin/pecadosvip-content/includes/selective-translation.php';
$legacy=fixture(100,'legado');$anchor=fixture(465,'maria','es','private','pv_profile');$profile=fixture(531,'maria','es','publish','pv_profile');$info=fixture(600,'informacion');
check(!pvc_lt_eligible($info),'Disabled without explicit enable');
$options['pvc_local_translation_policy']=['enabled'=>true,'mode'=>'informational-drafts-v1','legacy'=>pvc_lt_baseline(array_values($posts),465)];
check(!pvc_lt_eligible($legacy),'Legacy excluded');$legacy->post_content='Later edit';check(!pvc_lt_eligible($legacy),'Edited Legacy excluded');
check(pvc_lt_eligible($info),'Informational page eligible');
foreach(['pv_profile','pv_service','pv_city']as$type){$p=fixture(610+count($posts),'excluded-'.$type,'es','publish',$type);check(!pvc_lt_eligible($p),$type.' excluded');}
foreach(['home','profiles','services','page']as$kind){$meta[600]['pv_data']['kind']=$kind;check(!pvc_lt_eligible($info),$kind.' excluded');}$meta[600]['pv_data']['kind']='information';
foreach(['draft','private','trash','pending','future']as$s){$info->post_status=$s;check(!pvc_lt_eligible($info),$s.' excluded');}$info->post_status='publish';
$info->post_password='secret';check(!pvc_lt_eligible($info),'Private content excluded');$info->post_password='';
$policy=$options['pvc_local_translation_policy'];unset($options['pvc_local_translation_policy']['mode']);check(!pvc_lt_eligible($info),'Old policy cannot enable module');$options['pvc_local_translation_policy']=$policy;
$parts=pvc_lt_segments($info);check(!in_array('keep()',$parts,true),'Code excluded');check(!in_array('/es/contacto',$parts,true),'Links excluded');
$translated=array_map(fn($v)=>'EN '.$v,$parts);$payload=pvc_lt_payload($info,$translated,'en');
check($payload['post_status']==='draft','Always draft');check(str_contains($payload['post_content'],'<strong>EN general</strong>'),'Formatting kept');check(str_contains($payload['post_content'],'<!-- keep -->'),'Comments kept');
check($payload['meta_input']['pv_data']['route']==='info/informacion','Route unchanged');check(count(pvc_lt_pending()['jobs'])===3,'Only informational source queued');
$_POST=['id'=>600,'lang'=>'en','fingerprint'=>pvc_lt_hash($info),'translations'=>json_encode($translated)];
$canManage=false;$r=action('wp_ajax_pvc_lt_store');check(!$r->success&&$r->status===403,'Unauthorized write denied');$canManage=true;
$validNonce=false;$r=action('wp_ajax_pvc_lt_store');check(!$r->success&&$r->status===403,'Invalid nonce denied');$validNonce=true;
$_POST['lang']='ru';check(!action('wp_ajax_pvc_lt_store')->success,'Unexpected language denied');$_POST['lang']='en';
$_POST['id']=531;check(!action('wp_ajax_pvc_lt_store')->success,'Profile save denied');$_POST['id']=600;
$_POST['fingerprint']='stale';check(!action('wp_ajax_pvc_lt_store')->success,'Stale source denied');$_POST['fingerprint']=pvc_lt_hash($info);
$_POST['translations']='{}';check(!action('wp_ajax_pvc_lt_store')->success,'Incomplete payload denied');$_POST['translations']=json_encode($translated);
$r=action('wp_ajax_pvc_lt_store');check($r->success&&$r->data['status']==='draft','Actual save returns draft');$target=get_post($r->data['id']);
check($target->post_status==='draft','Actual stored post is draft');check(str_contains($r->data['url'],'wp-admin/post.php'),'Review link');check(!isset($options['pvc_lt_lock_600_en']),'Lock released');
$count=count($posts);check(!action('wp_ajax_pvc_lt_store')->success,'Existing draft protected');check(count($posts)===$count,'No duplicate target');
$race=true;$_POST['lang']='fr';$r=action('wp_ajax_pvc_lt_store');check(!$r->success,'Concurrent withdrawal detected');check(!isset($options['pvc_lt_lock_600_fr']),'Lock released after race');
foreach($posts as$p)if((int)get_post_meta($p->ID,'_pvc_lt_source',true)===600)check($p->post_status==='draft','No publication');
check(!isset($hooks['transition_post_status'])&&!isset($hooks['before_delete_post'])&&!isset($hooks['wp_after_insert_post']),'No background mutation hooks');
check(!isset($hooks['wp_ajax_nopriv_pvc_lt_store']),'No anonymous write endpoint');
$savedLegacy=$options['pvc_local_translation_policy']['legacy'];
check(action('wp_ajax_pvc_lt_disable')->success,'Disable action succeeds');
check(empty($options['pvc_local_translation_policy']['enabled']),'Tool disabled');
check(action('wp_ajax_pvc_lt_enable')->success,'Can explicitly re-enable');
check($savedLegacy===$options['pvc_local_translation_policy']['legacy'],'Re-enabling preserves frozen Legacy');
echo json_encode(['ok'=>true,'assertions'=>$checks],JSON_PRETTY_PRINT).PHP_EOL;
}
