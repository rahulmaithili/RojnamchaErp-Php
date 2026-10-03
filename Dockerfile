# Use official PHP Apache image
FROM php:8.2-apache

# Install required system packages and PHP extensions
RUN apt-get update && apt-get install -y \
    sqlite3 \
    libsqlite3-dev \
    libzip-dev \
    zip \
    unzip \
    && docker-php-ext-install pdo pdo_sqlite pdo_mysql \
    && rm -rf /var/lib/apt/lists/*

# Enable Apache mod_rewrite & mod_headers
RUN a2enmod rewrite headers

# Copy application files to web root
COPY . /var/www/html/

# Create data directory and grant permissions for SQLite read/write
RUN mkdir -p /var/www/html/data && \
    chown -R www-data:www-data /var/www/html/data /var/www/html/ && \
    chmod -R 775 /var/www/html/data

# Support Render's dynamic PORT environment variable (default 10000 or 80)
RUN sed -i 's/Listen 80/Listen ${PORT:-80}/g' /etc/apache2/ports.conf && \
    sed -i 's/<VirtualHost \*:80>/<VirtualHost \*:${PORT:-80}>/g' /etc/apache2/sites-available/000-default.conf

# Set environment
ENV PORT=80

EXPOSE 80 10000

# Start Apache in foreground
CMD ["apache2-foreground"]
