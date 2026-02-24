#!/bin/sh
set -e

# If API_BACKEND_HOST or API_BACKEND_URL is set, generate nginx config from
# the template so the reverse-proxy target is configurable at runtime.
# Otherwise the static nginx.conf (copied at build time) is used as-is.
if [ -n "${API_BACKEND_URL}" ] || [ -n "${API_BACKEND_HOST}" ]; then
  if [ -z "${API_BACKEND_URL}" ]; then
    export API_BACKEND_URL="https://${API_BACKEND_HOST}"
  fi
  # Only substitute API_BACKEND_URL; leave nginx $variables untouched
  envsubst '${API_BACKEND_URL}' \
    < /etc/nginx/templates/default.conf.template \
    > /etc/nginx/conf.d/default.conf
fi

exec "$@"
