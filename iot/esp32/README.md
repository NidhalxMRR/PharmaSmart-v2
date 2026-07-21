# ESP32 + DHT11 setup

The ready-to-flash Arduino sketch is in:

```text
iot/esp32/pharmasmart_dht11/pharmasmart_dht11.ino
```

## Arduino IDE libraries

Install these from Library Manager:

- `DHT sensor library` by Adafruit
- `Adafruit Unified Sensor`
- `ArduinoMqttClient` by Arduino

`WiFi` and `WiFiClientSecure` are supplied by the ESP32 Arduino core.

## Configure secrets

1. Copy `secrets.example.h` to `secrets.h` in the same sketch folder.
2. Set the Wi-Fi SSID and password.
3. Set `MQTT_PASSWORD` to the VPS `MQTT_DEVICE_PASSWORD`.
4. Paste the complete VPS `iot/certs/ca.crt` PEM into
   `MQTT_CA_CERT`.

`secrets.h` is excluded from Git.

## Reproducible compile check

The repository includes an isolated Arduino CLI build that installs the ESP32
core and required libraries, injects only the placeholder secrets file, and
compiles the sketch:

~~~bash
docker build -f iot/esp32/Dockerfile.verify iot/esp32
~~~

This never copies your real `secrets.h` into the image build context.

## Compile and upload on the ESP32 host

Run these commands from the repository root on the machine where the ESP32 is
connected:

~~~bash
arduino-cli config init
arduino-cli config set board_manager.additional_urls https://espressif.github.io/arduino-esp32/package_esp32_index.json
arduino-cli core update-index
arduino-cli core install esp32:esp32
arduino-cli lib install "DHT sensor library"
arduino-cli lib install "Adafruit Unified Sensor"
arduino-cli lib install "ArduinoMqttClient"
arduino-cli board list
arduino-cli compile --fqbn esp32:esp32:esp32 iot/esp32/pharmasmart_dht11
arduino-cli upload --port /dev/ttyUSB0 --fqbn esp32:esp32:esp32 iot/esp32/pharmasmart_dht11
arduino-cli monitor --port /dev/ttyUSB0 --config baudrate=115200
~~~

Replace `/dev/ttyUSB0` with the port shown by `arduino-cli board list`
(for example `/dev/ttyACM0` on Linux or `COM4` on Windows).

## VPS requirements

The sketch connects to `37.59.98.157:8883`. On the VPS:

```env
MQTT_CERT_CN=37.59.98.157
MQTT_CERT_SAN=IP:37.59.98.157
MQTT_REGENERATE_CERTS=true
MQTT_DEVICE_PASSWORD=replace-with-a-long-random-password
MQTT_INGEST_PASSWORD=replace-with-another-long-random-password
```

Start/recreate the IoT services, then set
`MQTT_REGENERATE_CERTS=false` so the CA does not change on later restarts.
Allow inbound TCP `8883` in the VPS/provider firewall. Do not expose the
internal plaintext listener `1883`.

The exact MQTT configuration is:

```text
Host:       37.59.98.157
Port:       8883
Client ID:  esp32-fridge-01
Username:   esp32-fridge-01
Topic:      pharmasmart/main/devices/esp32-fridge-01/telemetry
QoS:        1
```

## Expected serial flow

```text
[WiFi] Connected. IP: ...
[Time] Clock synchronized
[MQTT] Connected with TLS
[DHT11] Humidity: 17.0% | Temperature: 32.7 C
[MQTT] Published QoS 1: {...}
[MQTT] ACK: {"accepted": true, ...}
```

At `32.7 C`, the currently linked refrigerator sensor `s1` will
correctly enter `Critical` because its configured range is `2-8 C`.
