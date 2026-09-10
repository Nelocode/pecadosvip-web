<?php
// SYNTHETIC TEST ONLY. Authentication below is NOT WordPress authentication.
define('ABSPATH',__DIR__);
$GLOBALS['pagenow']=basename(parse_url($_SERVER['REQUEST_URI'] ?? '/',PHP_URL_PATH) ?: '');
function add_action(...$a) {}
function add_filter(...$a) {}
function add_management_page(...$a) {}
function esc_html($s){return htmlspecialchars($s,ENT_QUOTES|ENT_SUBSTITUTE,'UTF-8');}
function esc_attr($s){return esc_html($s);}
function esc_url($s){return esc_html($s);}
function home_url($p='/'){return 'http://127.0.0.1:8095'.$p;}
function current_user_can($cap){return ($_SERVER['HTTP_X_SYNTHETIC_EDITOR']??'')==='1';}
function is_admin(){return str_starts_with($_SERVER['REQUEST_URI']??'','/wp-admin/');}
function wp_doing_ajax(){return $GLOBALS['pagenow']==='admin-ajax.php';}
function nocache_headers(){if(!headers_sent())header('Cache-Control: no-store');}
function status_header($s){http_response_code($s);}
class WP_Error{public function __construct(public $code,public $message,public $data){}}
require getenv('PVP_TEST_SOURCE');
if(defined('PVP_UNIT_TEST')){return;}
pvp_guard_request();
echo 'SYNTHETIC_EDITOR_OR_LOGIN_PATH';
