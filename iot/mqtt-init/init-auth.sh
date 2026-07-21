#!/bin/sh
set -eu

: "${MQTT_DEVICE_USERNAME:?MQTT_DEVICE_USERNAME is required}"
: "${MQTT_DEVICE_PASSWORD:?MQTT_DEVICE_PASSWORD is required}"
: "${MQTT_INGEST_USERNAME:?MQTT_INGEST_USERNAME is required}"
: "${MQTT_INGEST_PASSWORD:?MQTT_INGEST_PASSWORD is required}"
: "${IOT_PHARMACY_ID:?IOT_PHARMACY_ID is required}"
: "${IOT_DEVICE_ID:?IOT_DEVICE_ID is required}"

auth_dir=/mosquitto/auth
password_file="$auth_dir/passwords"
acl_file="$auth_dir/acl"

mkdir -p "$auth_dir"
rm -f "$password_file"

mosquitto_passwd -b -c "$password_file" "$MQTT_DEVICE_USERNAME" "$MQTT_DEVICE_PASSWORD"
mosquitto_passwd -b "$password_file" "$MQTT_INGEST_USERNAME" "$MQTT_INGEST_PASSWORD"

cat > "$acl_file" <<EOF
user $MQTT_DEVICE_USERNAME
topic write pharmasmart/$IOT_PHARMACY_ID/devices/$IOT_DEVICE_ID/telemetry
topic read pharmasmart/$IOT_PHARMACY_ID/devices/$IOT_DEVICE_ID/commands
topic read pharmasmart/$IOT_PHARMACY_ID/devices/$IOT_DEVICE_ID/ack

user $MQTT_INGEST_USERNAME
topic read pharmasmart/+/devices/+/telemetry
topic write pharmasmart/+/devices/+/ack
EOF

chmod 0640 "$password_file" "$acl_file"
chown 1883:1883 "$password_file" "$acl_file"

echo "[MQTT Auth] Password and ACL files initialized"
