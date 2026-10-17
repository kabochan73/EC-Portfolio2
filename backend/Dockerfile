# 本番用（Railway）。backend・queue・scheduler の 3 サービスで共用する（R4: scheduler を追加）。
# ローカル開発は docker-compose.yml が serversideup イメージを直接使う（docs/04 / docs/07）。

FROM serversideup/php:8.4-fpm-nginx

# 本番は opcache 有効。TLS は Railway エッジで終端するので SSL は無効。
ENV PHP_OPCACHE_ENABLE=1 \
    SSL_MODE=off

USER www-data

COPY --chown=www-data:www-data . /var/www/html

RUN composer install --no-dev --optimize-autoloader --no-interaction --no-progress

# nginx(8080) + php-fpm は s6-overlay が起動する。
# backend: CMD は上書きしない。migrate / config:cache は serversideup の AUTORUN に任せる。
# queue:     Railway 側で Start Command を
#          php artisan queue:work --tries=3 --sleep=3 --max-time=3600
#          に上書きし、AUTORUN_ENABLED=false にする。
# scheduler: 同じく Start Command を php artisan schedule:work に上書きし、AUTORUN_ENABLED=false
#          （orders:expire-pending = 30 分過ぎた未決済注文のキャンセル / sanctum:prune-expired。routes/console.php）
