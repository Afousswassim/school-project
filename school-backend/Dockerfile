FROM php:8.3-apache

RUN docker-php-ext-install pdo pdo_mysql \
    && a2enmod rewrite headers

COPY . /var/www/html/
RUN mkdir -p /var/www/html/uploads/profiles \
    && chown -R www-data:www-data /var/www/html

EXPOSE 80

CMD ["sh", "-c", "php /var/www/html/migrations/discipline-reports.php && php /var/www/html/migrations/discipline-reconsiderations.php && exec apache2-foreground"]
