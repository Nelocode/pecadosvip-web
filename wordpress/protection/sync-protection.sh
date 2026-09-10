#!/bin/sh
set -eu
source_file=/usr/local/share/pecadosvip-protection/00-pecadosvip-protection.php
target_dir=/var/www/html/wp-content/mu-plugins
test -s "$source_file"
mkdir -p "$target_dir"
# Copy only our named MU plugin. Never sync/delete other plugins or media.
cp "$source_file" "$target_dir/00-pecadosvip-protection.php"
chown www-data:www-data "$target_dir/00-pecadosvip-protection.php"
chmod 0644 "$target_dir/00-pecadosvip-protection.php"
apache2ctl -t
