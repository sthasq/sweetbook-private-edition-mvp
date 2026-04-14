#!/bin/sh
set -eu

normalize_base_path() {
  input="$(printf '%s' "${1:-/}" | tr -d '\r')"
  if [ -z "$input" ] || [ "$input" = "/" ]; then
    printf "/"
    return
  fi

  case "$input" in
    /*) base="$input" ;;
    *) base="/$input" ;;
  esac

  printf "%s" "${base%/}"
}

APP_BASE_PATH="$(normalize_base_path "${APP_BASE_PATH:-/}")"

if [ "$APP_BASE_PATH" = "/" ]; then
  cat >/etc/nginx/conf.d/default.conf <<'EOF'
server {
    listen 80;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    location = /api/admin/webhooks/stream {
        proxy_pass http://backend:8080/api/admin/webhooks/stream;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";
        proxy_buffering off;
        proxy_cache off;
        add_header X-Accel-Buffering no;
        proxy_connect_timeout 30s;
        proxy_send_timeout 1800s;
        proxy_read_timeout 1800s;
        send_timeout 1800s;
    }

    location /api/ {
        proxy_pass http://backend:8080/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 30s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
        send_timeout 300s;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
EOF
  exit 0
fi

cat >/etc/nginx/conf.d/default.conf <<EOF
server {
    listen 80;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    location = ${APP_BASE_PATH} {
        return 301 ${APP_BASE_PATH}/;
    }

    location = ${APP_BASE_PATH}/api/admin/webhooks/stream {
        rewrite ^${APP_BASE_PATH}/api/admin/webhooks/stream\$ /api/admin/webhooks/stream break;
        proxy_pass http://backend:8080;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-Prefix ${APP_BASE_PATH};
        proxy_set_header Connection "";
        proxy_buffering off;
        proxy_cache off;
        add_header X-Accel-Buffering no;
        proxy_connect_timeout 30s;
        proxy_send_timeout 1800s;
        proxy_read_timeout 1800s;
        send_timeout 1800s;
    }

    location ^~ ${APP_BASE_PATH}/api/ {
        rewrite ^${APP_BASE_PATH}/api/(.*)\$ /api/\$1 break;
        proxy_pass http://backend:8080;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-Prefix ${APP_BASE_PATH};
        proxy_connect_timeout 30s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
        send_timeout 300s;
    }

    location ^~ ${APP_BASE_PATH}/ {
        alias /usr/share/nginx/html/;
        try_files \$uri \$uri/ ${APP_BASE_PATH}/index.html;
    }

    location / {
        return 404;
    }
}
EOF
