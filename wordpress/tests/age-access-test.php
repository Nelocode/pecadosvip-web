<?php
/**
 * Adult access gate: only a verified adapter may authorise content, and the legal
 * documents plus the reporting channel stay reachable without adult content.
 *
 * No cookie, query parameter, User-Agent or self-declaration is accepted as proof.
 */
define('ABSPATH',__DIR__);
$checks=0;$settings=[];$hooks=[];$filters=[];
function add_action($n,$f,...$a){$GLOBALS['hooks'][$n][]=$f;}
function add_filter($n,$f,...$a){$GLOBALS['filters'][$n][]=$f;}
function apply_filters($n,$v,...$a){foreach($GLOBALS['filters'][$n]??[] as $f){$v=$f($v,...$a);}return $v;}
function pvc_legal_settings(){return $GLOBALS['settings'];}
function pvwp_age_verified_session_default(){return null;}
function check($ok,$m){++$GLOBALS['checks'];if(!$ok)throw new \RuntimeException($m);}
function is_admin(){return false;} function wp_doing_ajax(){return false;} function wp_doing_cron(){return false;}
function nocache_headers(){} function headers_sent(){return true;} function header(...$a){} function status_header(...$a){}
function home_url($p=''){return 'https://example.test'.$p;} function esc_url($v){return $v;} function esc_html($v){return $v;}
function esc_attr($v){return $v;} function bloginfo($v){}
function pvwp_text($p,$vars=[]){return $p;} function pvwp_label($p,$vars=[]){echo $p;}
function pvwp_legal_document_text($d,$f){return $d.'-'.$f;}
function pvwp_context(){return array('owned'=>true,'locale'=>'es','route'=>array('kind'=>'profile','record'=>array('key'=>'maria')));}
function pvwp_legal_report($v='section'){}
function current_user_can($c){return false;}
class WP_Error { public function __construct(public string $code='',public string $message='',public array $data=array()){} }
require __DIR__.'/../theme/pecadosvip/inc/age-access.php';

check(pvwp_age_enabled()===false,'Gate is disabled by default');
check(pvwp_age_authorized()===false,'No adapter means no authorisation');
$settings=['age_gate'=>['enabled'=>true,'minimum'=>18]];
check(pvwp_age_enabled()===true,'Gate follows the stored setting');
check(pvwp_age_authorized()===false,'Still denied without a proof');
$valid=['verified'=>true,'threshold'=>18,'expires_at'=>time()+600];
$filters['pvwp_age_verified_session']=[fn()=>$valid];
check(pvwp_age_authorized()===true,'A valid verified session authorises content');
foreach([
 ['verified'=>false,'threshold'=>18,'expires_at'=>time()+600],
 ['verified'=>true,'threshold'=>21,'expires_at'=>time()+600],
 ['verified'=>true,'threshold'=>18,'expires_at'=>time()-10],
 ['verified'=>true,'threshold'=>18,'expires_at'=>time()+43201],
 ['verified'=>true,'threshold'=>18,'expires_at'=>'600'],
 ['verified'=>true,'threshold'=>18],
 ['verified'=>'true','threshold'=>18,'expires_at'=>time()+600],
 'declaracion',
 null,
] as $index=>$proof){$filters['pvwp_age_verified_session']=[fn()=>$proof];check(pvwp_age_authorized()===false,'Malformed, expired or oversized proof denied: '.$index);}
$filters['pvwp_age_verified_session']=[function(){throw new RuntimeException('adapter down');}];
check(pvwp_age_authorized()===false,'An adapter failure denies access');
$filters['pvwp_age_verified_session']=[];
check(pvwp_age_route_is_open(['owned'=>false])===true,'Requests outside the theme are not gated here');
$record=['route'=>['kind'=>'page','record'=>['key'=>'privacidad']]];
check(pvwp_age_route_is_open($record)===true,'Privacy policy is reachable without adult content');
check(pvwp_age_route_is_open(['owned'=>true,'route'=>['kind'=>'page','record'=>['key'=>'cookies']]])===true,'Cookie policy is reachable');
check(pvwp_age_route_is_open(['owned'=>true,'route'=>['kind'=>'page','record'=>['key'=>'aviso-legal']]])===true,'Legal notice is reachable');
check(pvwp_age_route_is_open(['owned'=>true,'route'=>['kind'=>'page','record'=>['key'=>'terminos-del-servicio']]])===true,'Terms are reachable');
check(pvwp_age_route_is_open(['owned'=>true,'route'=>['kind'=>'page','record'=>['key'=>'contacto']]])===false,'Contact requires authorisation');
check(pvwp_age_route_is_open(['owned'=>true,'route'=>['kind'=>'profile','record'=>['key'=>'maria']]])===false,'A profile requires authorisation');
check(pvwp_age_route_is_open(['owned'=>true,'route'=>['kind'=>'home','record'=>['key'=>'home']]])===false,'Home requires authorisation');
check(pvwp_age_route_is_open(['owned'=>true,'route'=>['kind'=>'page','record'=>['key'=>'privacidad-copia']]])===false,'Only the exact legal keys are open');
check(isset($hooks['template_redirect'])&&isset($filters['rest_pre_dispatch']),'Frontend and REST are both protected');
$source=file_get_contents(__DIR__.'/../theme/pecadosvip/inc/age-access.php');
foreach(['localStorage','document.cookie','$_COOKIE','$_GET','pvn-age-declaration','setcookie'] as $forbidden){check(strpos($source,$forbidden)===false,'The gate never trusts '.$forbidden);}
echo json_encode(['ok'=>true,'assertions'=>$checks],JSON_PRETTY_PRINT).PHP_EOL;
