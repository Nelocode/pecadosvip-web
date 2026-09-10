<?php
/**
 * Closing the public site is a policy, not an accident of a commented-out line.
 *
 * The shipped default keeps public access open, because the site belongs to a running
 * business with profiles already published. Containment is enabled explicitly, and the
 * mechanism has to stay complete so a closed deployment is verified rather than assumed.
 * This suite pins the policy semantics and proves that the guards are registered only when
 * the policy asks for them.
 */
define('ABSPATH', __DIR__);
$checks = 0;
function check($ok, $m) { ++$GLOBALS['checks']; if (!$ok) { throw new \RuntimeException($m); } }

$GLOBALS['pvqa_actions'] = array();
$GLOBALS['pvqa_filters'] = array();
function add_action($hook, $callback = null, $priority = 10) { $GLOBALS['pvqa_actions'][] = array($hook, $priority); }
function add_filter($hook, $callback = null, $priority = 10) { $GLOBALS['pvqa_filters'][] = array($hook, $priority); }

// The CI image is built with the policy set, so the expected load-time state is measured
// rather than assumed; the rest of the suite drives the policy explicitly.
$ambient = (string) getenv('PECADOSVIP_CONTAINMENT');
require __DIR__ . '/../protection/00-pecadosvip-protection.php';

/* The admin screen must exist in both states: it is how the operator sees the policy. */
check(in_array(array('admin_menu', 10), $GLOBALS['pvqa_actions'], true), 'The admin page is always registered');

/* Loading the plugin registers the public guards if and only if the environment asks for it. */
$expectedAtLoad = strtolower(trim($ambient)) === 'closed' ? 1 : 0;
check(count(array_keys($GLOBALS['pvqa_actions'], array('init', -PHP_INT_MAX), true)) === $expectedAtLoad, 'The environment policy decides the load-time request guard');
check(count(array_keys($GLOBALS['pvqa_filters'], array('rest_pre_dispatch', -PHP_INT_MAX), true)) === $expectedAtLoad, 'The environment policy decides the load-time REST guard');

/* Only the exact value closes the site. Everything else, including a typo, opens it. */
foreach (array('closed' => false, 'CLOSED' => false, '  Closed  ' => false, 'open' => true, '' => true, 'yes' => true, '1' => true, 'true' => true, 'close' => true) as $value => $expectedOpen) {
    putenv('PECADOSVIP_CONTAINMENT=' . $value);
    check(pvp_containment_enabled() === !$expectedOpen, 'The policy reads "' . $value . '" as ' . ($expectedOpen ? 'open' : 'closed'));
}

/* An open policy must not interfere with the public site in any way. */
putenv('PECADOSVIP_CONTAINMENT=open');
$actions = count($GLOBALS['pvqa_actions']);
$filters = count($GLOBALS['pvqa_filters']);
pvp_containment_register();
check(count($GLOBALS['pvqa_actions']) === $actions, 'An open policy registers no public request guard');
check(count($GLOBALS['pvqa_filters']) === $filters, 'An open policy registers no public REST guard');

/* A closed policy must register exactly the two guards, and nothing else. */
putenv('PECADOSVIP_CONTAINMENT=closed');
pvp_containment_register();
check(count($GLOBALS['pvqa_actions']) === $actions + 1, 'A closed policy registers exactly one public request guard');
check(count($GLOBALS['pvqa_filters']) === $filters + 1, 'A closed policy registers exactly one public REST guard');
check(in_array(array('init', -PHP_INT_MAX), $GLOBALS['pvqa_actions'], true), 'The request guard runs first on init');
check(in_array(array('rest_pre_dispatch', -PHP_INT_MAX), $GLOBALS['pvqa_filters'], true), 'The REST guard runs first on dispatch');

/* The containment screen must not claim a state the policy does not have. */
$source = file_get_contents(__DIR__ . '/../protection/00-pecadosvip-protection.php');
check(str_contains($source, 'pvp_containment_enabled()'), 'The admin screen reads the policy instead of asserting a fixed state');
check(!str_contains($source, 'no hay un interruptor'), 'The stale claim that no switch exists is gone');

/* The mechanism itself must remain complete: nothing was deleted to open the site. */
check(function_exists('pvp_guard_request') && function_exists('pvp_guard_rest') && function_exists('pvp_guard_headers'), 'The containment mechanism stays implemented');
check(str_contains($source, "'X-PecadosVIP-Protection: closed-v1'"), 'The containment marker is still emitted when closed');
check(str_contains($source, 'status_header(503)'), 'The containment still answers 503 when closed');

putenv('PECADOSVIP_CONTAINMENT');

echo json_encode(array('ok' => true, 'assertions' => $checks), JSON_PRETTY_PRINT) . PHP_EOL;
