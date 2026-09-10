<?php
define('PVP_UNIT_TEST',true);
require __DIR__.'/fixture.php';
$count=0;
function check($value,$label){global $count;if(!$value){fwrite(STDERR,'FAIL '.$label."\n");exit(1);} $count++;}
foreach(array('es','en','fr','it') as $lang){
 foreach(array('/'.$lang,'/'.$lang.'/perfiles/test','/sub/'.$lang.'/legal/privacidad') as $path){
  check(pvp_guard_language($path)===$lang,'route language');
  $html=pvp_guard_html($lang);
  check(str_contains($html,'lang="'.$lang.'"'),'html language');
  check(!preg_match('/<(img|video|source|script|iframe|form)\\b/i',$html),'no graphics scripts forms');
  check(!preg_match('/url\\s*\\(/i',$html),'no background media');
  check(!str_contains($html,'wp-content/uploads'),'no upload urls');
 }
}
check(pvp_guard_language('/unknown')==='es','fallback language');
check(!str_contains(pvp_guard_html('"><script>'),'"><script>'),'unsupported language cannot inject');
$_COOKIE['age_verified']='true';$_POST['adult']='yes';$_GET['age']=18;
check(!pvp_guard_is_editor(),'untrusted declaration grants no editorial access');
$error=pvp_guard_rest(null,null,null);check($error instanceof WP_Error && $error->data['status']===503,'anonymous rest denied');
$_SERVER['HTTP_X_SYNTHETIC_EDITOR']='1';check(pvp_guard_rest('allowed',null,null)==='allowed','editor rest preserved');
echo json_encode(array('status'=>'PASS','assertions'=>$count,'scope'=>'Synthetic WordPress API fixture; not live WordPress or identity verification'),JSON_PRETTY_PRINT)."\n";
