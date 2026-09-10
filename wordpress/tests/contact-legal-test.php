<?php
/**
 * Contact destinations and the Spanish legal mechanics.
 *
 * Both modules are fail-closed: an empty or invalid destination never becomes a link,
 * a channel needs the explicit approval, the regular channels additionally need a
 * complete and approved provider identification, and a legal document is never
 * published with invented data.
 */
define('ABSPATH',__DIR__);
$options=[];$hooks=[];$checks=0;$canManage=true;
function add_action($n,$f,...$a){$GLOBALS['hooks'][$n][]=$f;}
function add_filter($n,$f,...$a){$GLOBALS['hooks'][$n][]=$f;}
function get_option($k,$d=false){return $GLOBALS['options'][$k]??$d;}
function add_option($k,$v,...$a){if(isset($GLOBALS['options'][$k]))return false;$GLOBALS['options'][$k]=$v;return true;}
function update_option($k,$v,...$a){$GLOBALS['options'][$k]=$v;return true;}
function delete_option($k){unset($GLOBALS['options'][$k]);}
function current_user_can(...$a){return $GLOBALS['canManage'];}
function wp_die($m,...$a){throw new \RuntimeException('wp_die: '.$m);}
function wp_safe_redirect($u){throw new \RuntimeException('redirect: '.$u);}
function check_admin_referer(...$a){}
function wp_unslash($v){return $v;}
function sanitize_key($v){return preg_replace('/[^a-z0-9_-]/','',$v);}
function sanitize_text_field($v){return trim(strip_tags((string)$v));}
function sanitize_textarea_field($v){return trim(strip_tags((string)$v));}
function rest_sanitize_boolean($v){return (bool)$v;}
function wp_parse_url($u,$c=-1){return $c===-1?parse_url($u):parse_url($u,$c);}
function absint($v){return abs((int)$v);}
function add_query_arg($a,$b=null){return is_array($a)?$b.'?'.http_build_query($a):$a;}
function admin_url($v=''){return '/wp-admin/'.$v;}
function esc_attr($v){return htmlspecialchars((string)$v,ENT_QUOTES);}
function esc_html($v){return htmlspecialchars((string)$v,ENT_QUOTES);}
function esc_url($v){return (string)$v;}
function checked($a,$b=true,$e=true){return $a==$b?'checked="checked"':'';}
function selected($a,$b=true,$e=true){return $a==$b?'selected="selected"':'';}
function submit_button(...$a){return '';}
function wp_nonce_field(...$a){return '';}
function check($ok,$m){++$GLOBALS['checks'];if(!$ok)throw new \RuntimeException($m);}
require __DIR__.'/../plugin/pecadosvip-content/includes/legal.php';
require __DIR__.'/../plugin/pecadosvip-content/includes/contact.php';

// --- Destination schema -----------------------------------------------------------------
$valid=['whatsapp'=>'https://wa.me/34600000000','telegram'=>'https://t.me/usuario','phone'=>'tel:+34600000000','email'=>'mailto:contacto@dominio.example','form'=>'https://dominio.example/contacto','report'=>'mailto:reportes@dominio.example'];
foreach($valid as $channel=>$url){check(pvc_contact_normalize($channel,$url)===$url,'Accepted destination: '.$channel);}
$rejected=['whatsapp'=>'https://example.com/34600000000','telegram'=>'https://example.com/usuario','phone'=>'tel:12345','email'=>'mailto:sinArroba','form'=>'http://dominio.example/contacto'];
foreach($rejected as $channel=>$url){check(pvc_contact_normalize($channel,$url)==='','Rejected destination: '.$channel);}
check(pvc_contact_normalize('whatsapp','https://wa.me/')==='','Branded destination requires a path');
check(pvc_contact_normalize('form','https://usuario:clave@dominio.example/x')==='','Credentials rejected');
check(pvc_contact_normalize('form','https://dominio.example/x#fragmento')==='','Fragment rejected');
check(pvc_contact_normalize('whatsapp','')==='','Empty destination stays empty');
check(pvc_contact_normalize('email','mailto:a@b.co')==='mailto:a@b.co','Minimal address accepted');

// --- Fail-closed defaults ---------------------------------------------------------------
check(pvc_contact_active()===[],'No channel is active on a fresh install');
foreach(pvc_contact_resolved() as $channel=>$row){check($row['url']===''&&$row['enabled']===false,'Empty and disabled by default: '.$channel);}
check(pvc_contact_gate()['ok']===false,'Gate closed without approval and legal data');
check(count(pvc_contact_blockers())>0,'Blockers are reported to the administrator');

// --- Approval opens the reporting channel only ------------------------------------------
$options['pvc_contact_settings']=['approved'=>true,'channels'=>['report'=>['url'=>$valid['report'],'enabled'=>true],'whatsapp'=>['url'=>$valid['whatsapp'],'enabled'=>true]]];
$active=pvc_contact_active();
check(isset($active['report']),'The reporting channel only needs the explicit approval');
check(!isset($active['whatsapp']),'A regular channel still requires the approved identification');
check(pvc_contact_gate()['legal']===false,'Legal gate is still closed');

// --- Complete and approved identification ------------------------------------------------
$provider=['name'=>'Titular Ejemplo SL','tax_id'=>'B00000000','address'=>'Calle Ejemplo 1, Madrid','email'=>'contacto@dominio.example','trade_name'=>'','phone'=>'','registry'=>'','domain_owner'=>'','approver'=>'Responsable Ejemplo'];
$options['pvc_legal_settings']=['approved'=>true,'provider'=>$provider,'cookies'=>pvc_legal_defaults()['cookies'],'age_gate'=>pvc_legal_defaults()['age_gate']];
check(pvc_legal_defaults()['approved']===false,'Legal approval defaults to disabled');
check(pvc_legal_missing()===[],'Complete intake reports no missing field');
check(pvc_legal_ready()===true,'Complete and approved intake is ready');
$active=pvc_contact_active();
check(isset($active['whatsapp'])&&isset($active['report']),'Approved and complete identification opens the regular channels');
$options['pvc_contact_settings']['channels']['telegram']=['url'=>$rejected['telegram'],'enabled'=>true];
check(!isset(pvc_contact_active()['telegram']),'An invalid stored destination never becomes a link');

// --- Missing data keeps everything closed ------------------------------------------------
$incomplete=$provider;$incomplete['tax_id']='';
$options['pvc_legal_settings']['provider']=$incomplete;
check(count(pvc_legal_missing())===1,'Missing required field is reported');
check(pvc_legal_ready()===false,'Incomplete intake is not ready');
check(!isset(pvc_contact_active()['whatsapp']),'Incomplete identification closes the regular channels');
check(isset(pvc_contact_active()['report']),'The reporting channel stays reachable');

// --- Sanitisation -------------------------------------------------------------------------
$options['pvc_legal_settings']['provider']=$provider;
$sanitized=pvc_legal_sanitize(['approved'=>1,'provider'=>$provider,'cookies'=>['banner_enabled'=>1,'policy_version'=>'2','inventory'=>[['name'=>' _ga ','provider'=>'Analytics','purpose'=>'Medición','duration'=>'2 años','category'=>'analytics'],['name'=>'','purpose'=>'descartada'],['name'=>'pixel','category'=>'inventada']]],'age_gate'=>['enabled'=>1,'minimum'=>9]]);
check($sanitized['approved']===true&&$sanitized['approved_at_utc']!=='','Approval records its timestamp');
check(count($sanitized['cookies']['inventory'])===2,'Empty rows are dropped');
check($sanitized['cookies']['inventory'][0]['name']==='_ga','Names are sanitised');
check($sanitized['cookies']['inventory'][1]['category']==='essential','An unknown category falls back to necessary');
check($sanitized['age_gate']['minimum']===18,'Age minimum is clamped to 18');
check(pvc_legal_sanitize(['approved'=>0])['approved_at_utc']==='','A withdrawn approval clears its timestamp');

// --- Cookie consent is only requested for a real non-essential cookie --------------------
$options['pvc_legal_settings']=pvc_legal_sanitize(['approved'=>1,'provider'=>$provider,'cookies'=>['banner_enabled'=>1,'inventory'=>$sanitized['cookies']['inventory']]]);
check(pvc_legal_non_essential()!==[],'A non-essential cookie is recognised');
check(pvc_legal_cookie_consent_required()===true,'Consent is requested once a real non-essential cookie exists');
$options['pvc_legal_settings']=pvc_legal_sanitize(['approved'=>1,'provider'=>$provider,'cookies'=>['banner_enabled'=>1,'inventory'=>pvc_legal_defaults()['cookies']['inventory']]]);
check(pvc_legal_non_essential()===[],'Only necessary cookies configured');
check(pvc_legal_cookie_consent_required()===false,'No fictional banner when there is no non-essential cookie');
$options['pvc_legal_settings']=pvc_legal_sanitize(['approved'=>1,'provider'=>$incomplete,'cookies'=>['banner_enabled'=>1,'inventory'=>$sanitized['cookies']['inventory']]]);
check(pvc_legal_cookie_consent_required()===false,'Consent stays closed while the intake is incomplete');
check(pvc_legal_cookie_categories()===['essential'=>'Necesarias','analytics'=>'Analítica','marketing'=>'Publicidad'],'Cookie categories are stable');

echo json_encode(['ok'=>true,'assertions'=>$checks],JSON_PRETTY_PRINT).PHP_EOL;
