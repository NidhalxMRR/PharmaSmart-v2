#include <Arduino.h>
#include <ArduinoMqttClient.h>
#include <DHT.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <time.h>

#include "secrets.h"

#define DHTPIN 17
#define DHTTYPE DHT11

static const char MQTT_HOST[] = "37.59.98.157";
static const uint16_t MQTT_PORT = 8883;
static const char MQTT_CLIENT_ID[] = "esp32-fridge-01";
static const char MQTT_TOPIC[] =
    "pharmasmart/main/devices/esp32-fridge-01/telemetry";
static const char MQTT_ACK_TOPIC[] =
    "pharmasmart/main/devices/esp32-fridge-01/ack";

static const unsigned long TELEMETRY_INTERVAL_MS = 30000;
static const unsigned long RECONNECT_INTERVAL_MS = 5000;
static const time_t MIN_VALID_UNIX_TIME = 1700000000;

DHT dht(DHTPIN, DHTTYPE);
WiFiClientSecure tlsClient;
MqttClient mqttClient(tlsClient);

unsigned long lastPublishAt = 0;
unsigned long lastReconnectAttemptAt = 0;
bool clockSynchronized = false;

bool connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) {
    return true;
  }

  Serial.print(F("[WiFi] Connecting to "));
  Serial.println(WIFI_SSID);

  mqttClient.stop();
  WiFi.disconnect();
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  const unsigned long startedAt = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startedAt < 20000) {
    delay(500);
    Serial.print('.');
  }
  Serial.println();

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println(F("[WiFi] Connection failed"));
    return false;
  }

  Serial.print(F("[WiFi] Connected. IP: "));
  Serial.println(WiFi.localIP());
  return true;
}

bool synchronizeClock() {
  if (clockSynchronized && time(nullptr) >= MIN_VALID_UNIX_TIME) {
    return true;
  }

  Serial.println(F("[Time] Synchronizing with NTP"));
  configTime(0, 0, "pool.ntp.org", "time.nist.gov");

  const unsigned long startedAt = millis();
  while (time(nullptr) < MIN_VALID_UNIX_TIME &&
         millis() - startedAt < 30000) {
    delay(500);
    Serial.print('.');
  }
  Serial.println();

  clockSynchronized = time(nullptr) >= MIN_VALID_UNIX_TIME;
  Serial.println(
      clockSynchronized ? F("[Time] Clock synchronized")
                        : F("[Time] NTP synchronization failed"));
  return clockSynchronized;
}

bool connectMqtt() {
  if (mqttClient.connected()) {
    return true;
  }

  if (!connectWiFi() || !synchronizeClock()) {
    return false;
  }

  Serial.print(F("[MQTT] Connecting securely to "));
  Serial.print(MQTT_HOST);
  Serial.print(':');
  Serial.println(MQTT_PORT);

  mqttClient.stop();
  mqttClient.setId(MQTT_CLIENT_ID);
  mqttClient.setUsernamePassword(MQTT_USERNAME, MQTT_PASSWORD);
  mqttClient.setKeepAliveInterval(30000);
  mqttClient.setConnectionTimeout(10000);
  mqttClient.setTxPayloadSize(512);

  if (!mqttClient.connect(MQTT_HOST, MQTT_PORT)) {
    Serial.print(F("[MQTT] Connection failed. Error: "));
    Serial.println(mqttClient.connectError());
    return false;
  }

  if (!mqttClient.subscribe(MQTT_ACK_TOPIC, 1)) {
    Serial.println(F("[MQTT] Connected, but ACK subscription failed"));
  }

  Serial.println(F("[MQTT] Connected with TLS"));
  return true;
}

void printAcknowledgement() {
  const int messageSize = mqttClient.parseMessage();
  if (messageSize <= 0) {
    return;
  }

  Serial.print(F("[MQTT] ACK: "));
  while (mqttClient.available()) {
    Serial.print(static_cast<char>(mqttClient.read()));
  }
  Serial.println();
}

bool publishTelemetry() {
  const float humidity = dht.readHumidity();
  const float temperatureC = dht.readTemperature();

  if (isnan(humidity) || isnan(temperatureC)) {
    Serial.println(F("[DHT11] Read failed; telemetry not published"));
    return false;
  }

  const time_t measuredAt = time(nullptr);
  if (measuredAt < MIN_VALID_UNIX_TIME) {
    Serial.println(F("[Time] Invalid clock; telemetry not published"));
    clockSynchronized = false;
    return false;
  }

  struct tm utcTime;
  gmtime_r(&measuredAt, &utcTime);

  char timestamp[25];
  strftime(timestamp, sizeof(timestamp), "%Y-%m-%dT%H:%M:%SZ", &utcTime);

  // A Unix timestamp is monotonic across normal reboots and works as the
  // ingestion sequence number at this 30-second publishing interval.
  const uint32_t sequence = static_cast<uint32_t>(measuredAt);

  char payload[320];
  const int payloadLength = snprintf(
      payload,
      sizeof(payload),
      R"JSON({"temperature_c":%.1f,"humidity":%.1f,"measured_at":"%s","sequence":%lu,"signal_dbm":%ld,"firmware_version":"esp32-dht11-1.0.0"})JSON",
      temperatureC,
      humidity,
      timestamp,
      static_cast<unsigned long>(sequence),
      static_cast<long>(WiFi.RSSI()));

  if (payloadLength <= 0 ||
      payloadLength >= static_cast<int>(sizeof(payload))) {
    Serial.println(F("[MQTT] Telemetry payload overflow"));
    return false;
  }

  Serial.print(F("[DHT11] Humidity: "));
  Serial.print(humidity, 1);
  Serial.print(F("% | Temperature: "));
  Serial.print(temperatureC, 1);
  Serial.println(F(" C"));

  // ArduinoMqttClient waits for PUBACK when QoS is set to 1.
  if (!mqttClient.beginMessage(
          MQTT_TOPIC,
          static_cast<unsigned long>(payloadLength),
          false,
          1,
          false)) {
    Serial.println(F("[MQTT] Could not start telemetry message"));
    mqttClient.stop();
    return false;
  }

  mqttClient.write(
      reinterpret_cast<const uint8_t *>(payload),
      static_cast<size_t>(payloadLength));

  if (!mqttClient.endMessage()) {
    Serial.println(F("[MQTT] Publish failed or PUBACK timed out"));
    mqttClient.stop();
    return false;
  }

  Serial.print(F("[MQTT] Published QoS 1: "));
  Serial.println(payload);
  return true;
}

void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println(F("\n[PharmaSmart] ESP32 DHT11 telemetry starting"));

  dht.begin();
  WiFi.setHostname(MQTT_CLIENT_ID);
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  tlsClient.setCACert(MQTT_CA_CERT);

  connectWiFi();
  synchronizeClock();
  connectMqtt();

  // Publish soon after a successful startup.
  lastPublishAt = millis() - TELEMETRY_INTERVAL_MS;
}

void loop() {
  if (WiFi.status() != WL_CONNECTED || !mqttClient.connected()) {
    if (millis() - lastReconnectAttemptAt >= RECONNECT_INTERVAL_MS) {
      lastReconnectAttemptAt = millis();
      connectMqtt();
    }
    delay(20);
    return;
  }

  printAcknowledgement();

  if (millis() - lastPublishAt >= TELEMETRY_INTERVAL_MS) {
    lastPublishAt = millis();
    publishTelemetry();
  }

  delay(10);
}
