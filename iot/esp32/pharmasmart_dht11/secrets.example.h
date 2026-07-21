#pragma once

// Copy this file to secrets.h and replace every placeholder.
static const char WIFI_SSID[] = "YOUR_WIFI_SSID";
static const char WIFI_PASSWORD[] = "YOUR_WIFI_PASSWORD";

static const char MQTT_USERNAME[] = "esp32-fridge-01";
static const char MQTT_PASSWORD[] = "YOUR_MQTT_DEVICE_PASSWORD";

// Paste the complete CA certificate generated on the VPS from:
// iot/certs/ca.crt
static const char MQTT_CA_CERT[] = R"PEM(
-----BEGIN CERTIFICATE-----
PASTE_THE_COMPLETE_CA_CERTIFICATE_HERE
-----END CERTIFICATE-----
)PEM";

