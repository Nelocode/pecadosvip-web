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

# Emergency recovery: quarantine only the exact services 1.2.0 file deployed
# on 2026-09-18. Preserve its directory and leave all other versions untouched.
pvsp_plugin_dir=/var/www/html/wp-content/plugins/pecadosvip-servicios-presentacion
pvsp_disabled_dir=/var/www/html/wp-content/plugins/.pecadosvip-servicios-presentacion-1.2.0-disabled
pvsp_plugin_file="$pvsp_plugin_dir/pecadosvip-servicios-presentacion.php"
if [ -d "$pvsp_plugin_dir" ] && [ ! -L "$pvsp_plugin_dir" ] &&
   [ -f "$pvsp_plugin_file" ] && [ ! -L "$pvsp_plugin_file" ]; then
    if [ -e "$pvsp_disabled_dir" ] || [ -L "$pvsp_disabled_dir" ]; then
        echo "PecadosVip recovery: preserved existing quarantine; no files changed."
    elif [ "$(sha256sum "$pvsp_plugin_file" | cut -d ' ' -f 1)" = "fab8cd80378a4c943434c7407a7825fb7088a1adec486d534985bf33ffb44400" ] &&
         grep -Eq '^[[:space:]]*\*[[:space:]]*Version:[[:space:]]*1\.2\.0[[:space:]]*$' "$pvsp_plugin_file"; then
        if mv -T -n -- "$pvsp_plugin_dir" "$pvsp_disabled_dir"; then
            if [ ! -e "$pvsp_plugin_dir" ]; then
                echo "PecadosVip recovery: services 1.2.0 quarantined; files preserved."
            else
                echo "PecadosVip recovery: quarantine already exists; no files replaced."
            fi
        else
            echo "PecadosVip recovery: could not quarantine services 1.2.0; continuing startup." >&2
        fi
    fi
fi

apache2ctl -t
