<?php
if (!defined('WP_CLI') || !WP_CLI) { throw new RuntimeException('CLI only'); }
define('WP_INSTALLING', true);
require '/var/www/html/wp-load.php';
if (wp_get_environment_type() !== 'local') { throw new RuntimeException('Local QA only'); }
add_filter('pre_wp_mail', static function () { return true; });
$secret=trim(file_get_contents('/run/secrets/admin_password'));
if (strlen($secret)<24) { throw new RuntimeException('Missing fixture secret'); }
$url=getenv('WP_QA_URL');
if (!preg_match('~^http://127\\.0\\.0\\.1:\\d+$~', $url)) { throw new RuntimeException('Loopback required'); }
if (!is_blog_installed()) {
 require_once ABSPATH.'wp-admin/includes/upgrade.php';
 wp_install('Private containment QA','pvp_qa','qa@example.invalid',false,'',$secret);
}
update_option('home',$url); update_option('siteurl',$url); update_option('blog_public',0);
require_once ABSPATH.'wp-admin/includes/plugin.php';
$result=activate_plugin('pecadosvip-content/pecadosvip-content.php');
if(is_wp_error($result)){throw new RuntimeException($result->get_error_message());}
switch_theme('pecadosvip');
global $wp_rewrite;
$wp_rewrite->set_permalink_structure('/%postname%/');
require_once ABSPATH.'wp-admin/includes/misc.php';
insert_with_markers(ABSPATH.'.htaccess','WordPress',explode("\n",$wp_rewrite->mod_rewrite_rules()));
$subscriber=get_user_by('login','pvp_subscriber');
if(!$subscriber){$id=wp_create_user('pvp_subscriber',$secret,'subscriber@example.invalid');if(is_wp_error($id)){throw new RuntimeException('Fixture user failed');}$subscriber=new WP_User($id);}
$subscriber->set_role('subscriber');
if (!get_page_by_path('protected-qa-page')) {wp_insert_post(array('post_type'=>'page','post_status'=>'publish','post_title'=>'Protected QA page','post_name'=>'protected-qa-page','post_content'=>'PRIVATE_SYNTHETIC_POST_DO_NOT_SERVE'));}
$files=array('wp-content/uploads/pvp-qa/original.jpg','wp-content/uploads/pvp-qa/video.mp4','wp-content/uploads/pvp-qa/opaque','wp-content/uploads/pvc-watermarked/pvp-qa/hash/poster.jpg','wp-content/themes/pecadosvip/assets/media/pvp-qa.webp','wp-content/themes/pecadosvip/content/pvp-qa.json','pvp-legacy.jpg.backup');
foreach($files as $file){wp_mkdir_p(dirname(ABSPATH.$file));file_put_contents(ABSPATH.$file,'PRIVATE_SYNTHETIC_BYTES_DO_NOT_SERVE');}
file_put_contents(ABSPATH.'wp-content/uploads/pvp-qa/.htaccess',"Require all granted\n");
echo "PVP_QA_READY\n";
