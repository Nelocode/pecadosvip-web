<?php
/** A new model is translated on publication with no API, no key and no browser. */
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
function remove_accents($v){return $v;}
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
require __DIR__.'/../plugin/pecadosvip-content/includes/offline-translation.php';
require __DIR__.'/../plugin/pecadosvip-content/includes/auto-translation.php';
function source_profile($id,$content='<p>Carismática, romántica.</p>'){
 $GLOBALS['posts'][$id]=(object)array('ID'=>$id,'post_type'=>'pv_profile','post_status'=>'publish','post_password'=>'','post_title'=>'Maria','post_content'=>$content,'post_excerpt'=>'Carismática, romántica.','menu_order'=>0);
 $GLOBALS['meta'][$id]=array('pv_key'=>'maria','pv_locale'=>'es','_thumbnail_id'=>44,'pv_data'=>array('age'=>25,'availability'=>'on-request','homeZone'=>'madrid','synthetic'=>false,'tags'=>array(),'conceptTags'=>array(),'languages'=>array('Español')));
 return $GLOBALS['posts'][$id];
}
function fire_transition($new,$old,$post){foreach($GLOBALS['hooks']['transition_post_status']??array() as $f){$f($new,$old,$post);}}
function made(){return array_values(array_filter($GLOBALS['posts'],fn($p)=>$p->post_type==='pv_profile'&&get_post_meta($p->ID,'_pvc_lt_engine',true)==='auto'));}
function by_locale($locale){foreach(made() as $p){if(get_post_meta($p->ID,'pv_locale',true)===$locale)return $p;}return null;}
function enable($publish=false){$GLOBALS['options']['pvc_local_translation_policy']=array('enabled'=>true,'mode'=>'content-drafts-v2','legacy'=>array(),'publish'=>$publish);}

// 1. The glossary is built in: no API, no key, no browser, and it always reports itself.
check(pvc_lt_auto_available(),'The offline glossary is always available');
check(pvc_lt_auto_mode()==='glossary','The default mode is the bundled glossary');
check(pvc_lt_offline_dictionary_size()>400,'The bundled glossary carries a wide editorial vocabulary');
check(pvc_lt_offline_translate('Carismática, romántica.','en')['text']==='Charismatic, romantic.','A known phrase is translated and its punctuation preserved');
// Every phrase the catalogue actually contains must reach full coverage, or the engine
// would leave its translation as a review draft instead of publishing it.
foreach (array('Carismática, romántica.', 'Extrovertida, sensual, espontánea.', 'Amable, apasionado, extrovertida') as $real) {
    foreach (array('en', 'fr', 'it') as $locale) {
        $result = pvc_lt_offline_translate($real, $locale);
        check($result['complete'] === true, 'A real catalogue phrase must be fully covered: ' . $locale . ' / ' . $real);
    }
}
// Multi-word entries must win over their single words and consume exactly what they use.
$phrase = pvc_lt_offline_translate('Reserva por horas, sin prisa', 'en');
check($phrase['text'] === 'Booking by the hour, without rushing', 'A multi-word phrase is translated as a whole');
check(pvc_lt_offline_translate('Masaje tántrico y cena romántica','en')['text']==='Tantric massage and romantic dinner','Phrases and connectors combine correctly');
$t=pvc_lt_offline_translate('Carismática, romántica.','en');
check($t['complete']===true&&$t['coverage']===1.0,'A fully known phrase reports full coverage');
$t=pvc_lt_offline_translate('Carismática y violinista.','it');
check($t['complete']===false&&$t['coverage']<1.0,'An unknown word lowers the coverage instead of being invented');
check(str_contains($t['text'],'violinista'),'An unknown word is kept as it is, never guessed');
check(pvc_lt_offline_translate('Inglés','fr')['text']==='Anglais','Spoken languages are exact and keep the label capitalisation');
check(pvc_lt_offline_translate('inglés','fr')['text']==='anglais','A lowercase source stays lowercase');
check(pvc_lt_offline_translate('Elegante','en')['text']==='Elegant','Capitalisation is preserved');

// 2. No administrator step: the first publication provisions the policy and translates.
$post=source_profile(465);
fire_transition('publish','draft',$post);
check(pvc_lt_enabled(),'The first publication provisions the translation policy on its own');
check(count(made())===3,'The model is translated with no administrator step and no configuration');
check((int)$options['pvc_local_translation_policy']['anchor_id']===465,'The anchor is the source profile of the reference model');
check(!in_array('pv_profile:maria',$options['pvc_local_translation_policy']['legacy'],true),'The anchor model itself stays translatable');
check(!empty($options['pvc_local_translation_policy']['publish']),'Provisioning publishes, so the model shows in every language');

// 3. Enabled: publishing a model creates the three locales on its own.
enable(false);
fire_transition('publish','draft',$post);
$created=made();
check(count($created)===3,'Publishing a model creates en, fr and it without any interaction');
$locales=array();foreach($created as $p){$locales[]=get_post_meta($p->ID,'pv_locale',true);}
sort($locales);check($locales===array('en','fr','it'),'Exactly the three target locales');
$en=by_locale('en');
check(str_contains($en->post_content,'Charismatic, romantic.'),'The English record carries the translation');
check($en->post_excerpt==='Charismatic, romantic.','The excerpt is translated too');
check(get_post_meta($en->ID,'pv_data',true)['languages']===array('Spanish'),'Spoken languages are translated');
check(get_post_meta($en->ID,'pv_data',true)['age']===25,'Untranslated data is carried over');
check(get_post_meta($en->ID,'_pvc_lt_method',true)==='glossary','The method is recorded');
check((float)get_post_meta($en->ID,'_pvc_lt_coverage',true)===1.0,'Full coverage is recorded');
check(get_post_meta($en->ID,'_pvc_lt_review',true)==='','A complete translation needs no review flag');
check(get_post_thumbnail_id($en->ID)===44,'The featured image is carried over');
check($GLOBALS['posts'][465]->post_status==='publish','The source stays published');

// 4. With the publication policy on, a complete translation is published straight away.
foreach (made() as $p) { $GLOBALS['posts'][$p->ID]->post_status='trash'; }
$GLOBALS['posts']=array_filter($GLOBALS['posts'],fn($p)=>get_post_meta($p->ID,'_pvc_lt_engine',true)!=='auto');
enable(true);
$post=source_profile(600);
fire_transition('publish','draft',$post);
$en=by_locale('en');
check($en!==null&&$en->post_status==='publish','A complete translation is published when the policy allows it');

// 5. A partial translation is never published: it waits as a draft, flagged.
foreach (made() as $p) { $GLOBALS['posts'][$p->ID]->post_status='trash'; }
$GLOBALS['posts']=array_filter($GLOBALS['posts'],fn($p)=>get_post_meta($p->ID,'_pvc_lt_engine',true)!=='auto');
$GLOBALS['meta'][700]['pv_key']=null;
$post=source_profile(700,'<p>Carismática y violinista.</p>');
$GLOBALS['meta'][700]['pv_key']='otra';
fire_transition('publish','draft',$post);
$partial=by_locale('en');
check($partial!==null&&$partial->post_status==='draft','An incomplete translation stays a draft even with publication allowed');
check(get_post_meta($partial->ID,'_pvc_lt_review',true)==='incomplete','The incomplete draft is flagged for review');
check((float)get_post_meta($partial->ID,'_pvc_lt_coverage',true)<1.0,'Its real coverage is recorded');

// 6. Idempotent, and a generated record never triggers another run.
$before=count($GLOBALS['posts']);
fire_transition('publish','draft',$post);
check(count($GLOBALS['posts'])===$before,'A second publication creates nothing new');
$report=pvc_lt_auto_translate($post);
check($report['created']===0,'An existing version is skipped, never replaced');
$GLOBALS['filters']['pvc_lt_translate_text']=array(fn($v,$t,$f,$to)=>$to.'|'.$t);
check(pvc_lt_auto_mode()==='filter','A plugged provider takes precedence over the glossary');
check(pvc_lt_translate_segment('hola','es','en')['source']==='filter','The plugged provider is used');
check(pvc_lt_translate_segment('Carismática','es','en')['text']==='en|Carismática','The filter result is returned as is');
$GLOBALS['filters']['pvc_lt_translate_text']=array();
fire_transition('publish','draft',$partial);
check(count($GLOBALS['posts'])===$before,'A translation does not trigger another translation');

// 7. Only a first publication, and only from the source locale.
fire_transition('publish','publish',$post);
check(count($GLOBALS['posts'])===$before,'An update does not re-run the translation');
fire_transition('draft','publish',$post);
check(count($GLOBALS['posts'])===$before,'Unpublishing creates nothing');
$other=source_profile(800);
$GLOBALS['meta'][800]['pv_locale']='en';
$GLOBALS['meta'][800]['pv_key']='otra-mas';
$beforeOther=count($GLOBALS['posts']);
fire_transition('publish','draft',$other);
check(count($GLOBALS['posts'])===$beforeOther,'A record already in another locale is not treated as a source');

// 8. Fail-closed without an anchor: nothing is invented, not even a policy.
foreach ($GLOBALS['posts'] as $pv_id => $pv_post) { if (get_post_meta($pv_id,'pv_key',true)==='maria' && get_post_meta($pv_id,'pv_locale',true)==='es') { unset($GLOBALS['posts'][$pv_id]); } }
foreach (made() as $p) { unset($GLOBALS['posts'][$p->ID]); }
delete_option('pvc_local_translation_policy');
$orphan=source_profile(950);
$GLOBALS['meta'][950]['pv_key']='huerfana';
$beforeOrphan=count($GLOBALS['posts']);
fire_transition('publish','draft',$orphan);
check(count($GLOBALS['posts'])===$beforeOrphan,'Without an anchor nothing is created');
check(empty($GLOBALS['options']['pvc_local_translation_policy']),'Without an anchor no policy is provisioned either');
echo json_encode(array('ok'=>true,'assertions'=>$checks),JSON_PRETTY_PRINT).PHP_EOL;
