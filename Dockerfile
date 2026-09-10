FROM node:22-alpine AS builder

WORKDIR /app

# We use COPY . . because .dockerignore already correctly filters out 
# everything except the necessary source directories (app, lib, assets, compliance, wordpress, etc.)
COPY . .

# Install dependencies for the build
RUN cd wordpress && npm install

# Build the theme and plugin
RUN cd wordpress && npm run build

# Shared production/QA runtime: image editing and asynchronous video watermarking.
FROM wordpress:7.1.0-php8.3-apache@sha256:5a93c470ae8220fddf71f6ebe3bc94e615ddc2ae4d9810f795b830fb11c41a17 AS runtime

RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/* \
    && php -r 'exit(extension_loaded("gd") && extension_loaded("exif") ? 0 : 1);' \
    && ffmpeg -version >/dev/null \
    && ffprobe -version >/dev/null

# Allow profile video uploads within the processor's bounded input limit.
RUN printf 'upload_max_filesize=128M\npost_max_size=136M\nmemory_limit=512M\n' \
    > /usr/local/etc/php/conf.d/pecadosvip-media.ini

# Production protection is mandatory; the base runtime is retained for isolated legacy QA.
FROM runtime AS protected-runtime

# Default-closed public protection, including persistent-volume starts.
COPY wordpress/protection/00-pecadosvip-protection.php /usr/local/share/pecadosvip-protection/00-pecadosvip-protection.php
COPY wordpress/protection/apache-public-protection.conf /etc/apache2/conf-available/pecadosvip-public-protection.conf
COPY wordpress/protection/sync-protection.sh /usr/local/bin/sync-pecadosvip-protection.sh
COPY wordpress/protection/protection-entrypoint.sh /usr/local/bin/pecadosvip-protection-entrypoint.sh
RUN a2enmod headers \
    # && a2enconf pecadosvip-public-protection \
    && chmod +x /usr/local/bin/sync-pecadosvip-protection.sh /usr/local/bin/pecadosvip-protection-entrypoint.sh \
    && php -l /usr/local/share/pecadosvip-protection/00-pecadosvip-protection.php \
    && apache2ctl -t
ENTRYPOINT ["pecadosvip-protection-entrypoint.sh"]

FROM protected-runtime AS production

# We copy the compiled theme and plugin directly to the default WordPress directory
COPY --from=builder /app/wordpress/dist/pecadosvip /usr/src/wordpress/wp-content/themes/pecadosvip
COPY --from=builder /app/wordpress/dist/pecadosvip-content /usr/src/wordpress/wp-content/plugins/pecadosvip-content

# Set ownership
RUN chown -R www-data:www-data /usr/src/wordpress/wp-content/themes/pecadosvip \
    && chown -R www-data:www-data /usr/src/wordpress/wp-content/plugins/pecadosvip-content

# Create a custom entrypoint to sync our custom theme and plugin to the persistent volume on every startup
RUN echo '#!/bin/bash\n\
set -e\n\
\n\
# Copy custom theme and plugin into the live volume if it exists\n\
if [ -d "/var/www/html/wp-content" ]; then\n\
    echo "Syncing PecadosVip theme and plugin to persistent volume..."\n\
    cp -r /usr/src/wordpress/wp-content/themes/pecadosvip /var/www/html/wp-content/themes/\n\
    cp -r /usr/src/wordpress/wp-content/plugins/pecadosvip-content /var/www/html/wp-content/plugins/\n\
    chown -R www-data:www-data /var/www/html/wp-content/themes/pecadosvip\n\
    chown -R www-data:www-data /var/www/html/wp-content/plugins/pecadosvip-content\n\
fi\n\
\n\
# Execute the original WordPress entrypoint\n\
exec pecadosvip-protection-entrypoint.sh "$@"\n\
' > /usr/local/bin/custom-entrypoint.sh \
    && chmod +x /usr/local/bin/custom-entrypoint.sh

ENTRYPOINT ["custom-entrypoint.sh"]
CMD ["apache2-foreground"]
