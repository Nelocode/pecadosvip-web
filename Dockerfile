FROM node:22-alpine AS builder

WORKDIR /app

# We use COPY . . because .dockerignore already correctly filters out 
# everything except the necessary source directories (app, lib, assets, compliance, wordpress, etc.)
COPY . .

# Install dependencies for the build
RUN cd wordpress && npm install

# Build the theme and plugin
RUN cd wordpress && npm run build

# Final WordPress Image
FROM wordpress:php8.3-apache

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
exec docker-entrypoint.sh "$@"\n\
' > /usr/local/bin/custom-entrypoint.sh \
    && chmod +x /usr/local/bin/custom-entrypoint.sh

ENTRYPOINT ["custom-entrypoint.sh"]
CMD ["apache2-foreground"]
