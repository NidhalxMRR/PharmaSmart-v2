#!/bin/sh
set -eu

cert_dir=/certs
cert_days=${MQTT_CERT_DAYS:-365}
cert_cn=${MQTT_CERT_CN:-localhost}
cert_san=${MQTT_CERT_SAN:-DNS:localhost}

mkdir -p "$cert_dir"

if [ -s "$cert_dir/ca.crt" ] &&
   [ -s "$cert_dir/server.crt" ] &&
   [ -s "$cert_dir/server.key" ] &&
   [ "${MQTT_REGENERATE_CERTS:-false}" != "true" ]; then
  echo "[MQTT Certs] Existing certificates found"
  exit 0
fi

echo "[MQTT Certs] Generating a local CA and server certificate for $cert_cn"
rm -f "$cert_dir/ca.crt" "$cert_dir/ca.key" "$cert_dir/server.crt" "$cert_dir/server.key" "$cert_dir/server.csr"

umask 077
openssl req -x509 -newkey rsa:3072 -sha256 -nodes \
  -days "$cert_days" \
  -subj "/CN=PharmaSmart MQTT Development CA" \
  -keyout "$cert_dir/ca.key" \
  -out "$cert_dir/ca.crt"

openssl req -newkey rsa:2048 -sha256 -nodes \
  -subj "/CN=$cert_cn" \
  -keyout "$cert_dir/server.key" \
  -out "$cert_dir/server.csr"

cat > /tmp/server.ext <<EOF
subjectAltName=DNS:mosquitto,DNS:localhost,$cert_san
extendedKeyUsage=serverAuth
keyUsage=digitalSignature,keyEncipherment
EOF

openssl x509 -req -sha256 \
  -in "$cert_dir/server.csr" \
  -CA "$cert_dir/ca.crt" \
  -CAkey "$cert_dir/ca.key" \
  -CAcreateserial \
  -days "$cert_days" \
  -extfile /tmp/server.ext \
  -out "$cert_dir/server.crt"

rm -f "$cert_dir/server.csr" "$cert_dir/ca.srl"
chmod 644 "$cert_dir/ca.crt" "$cert_dir/server.crt"
chmod 600 "$cert_dir/ca.key"
chmod 640 "$cert_dir/server.key"
chown 1883:1883 "$cert_dir/ca.crt" "$cert_dir/server.crt" "$cert_dir/server.key"

echo "[MQTT Certs] Certificates generated in $cert_dir"

