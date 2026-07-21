# PharmaSmart IoT temperature ingestion

## Runtime flow

```text
ESP32
  -> MQTT/TLS :8883 (QoS 1)
  -> Mosquitto ACL and authentication
  -> Python ingestion worker
  -> PostgreSQL sensor_readings + iot_devices
  -> Express /api/sensors
  -> PharmaSmart dashboard (10-second refresh)
```

The unencrypted MQTT listener on port `1883` is internal to the Docker
network and is not published on the host. ESP32 devices must use TLS port
`8883`.

## Default development device

| Setting | Value |
|---|---|
| Pharmacy ID | `main` |
| Device/client ID | `esp32-fridge-01` |
| Linked sensor | `s1` |
| Username | `esp32-fridge-01` |
| Topic | `pharmasmart/main/devices/esp32-fridge-01/telemetry` |
| QoS | `1` |
| CA certificate | `iot/certs/ca.crt` |

Set the password and certificate hostname values in the root `.env` before
connecting a physical device.

## Telemetry payload

`temperature` (or `temperature_c`) is required. The other fields are
optional. When humidity is omitted, the ingestion worker preserves the
sensor's latest humidity value.

```json
{
  "temperature_c": 4.2,
  "humidity": 48,
  "measured_at": "2026-07-21T12:30:00Z",
  "sequence": 1842,
  "battery_percent": 87,
  "signal_dbm": -61,
  "firmware_version": "1.2.0"
}
```

Accepted aliases include `temp`, `temp_c`, `timestamp`, `seq`,
`battery`, `rssi`, and `firmware`.

The sequence number provides idempotency. Re-sending the same sequence for
the same sensor does not create a duplicate database row. Device timestamps
more than five minutes in the future and physically invalid measurements are
rejected.

## Acknowledgements

The worker publishes processing results with QoS 1 to:

```text
pharmasmart/main/devices/esp32-fridge-01/ack
```

Example:

```json
{
  "accepted": true,
  "duplicate": false,
  "sequence": 1842,
  "received_at": "2026-07-21T12:30:01Z"
}
```

## TLS certificates

On the first Compose startup, `mqtt-certgen` creates a local development CA
and server certificate in `iot/certs`. Configure `MQTT_CERT_CN` and
`MQTT_CERT_SAN` before the first VPS startup:

```env
MQTT_CERT_CN=mqtt.example.com
MQTT_CERT_SAN=DNS:mqtt.example.com
```

For a VPS, replace the generated development certificate with a
publicly/privately managed production certificate and keep private keys out of
Git. The ESP32 must trust the issuing CA and have a reasonably accurate clock
for TLS certificate validation.

## Operations

```bash
docker compose up -d --build
docker compose ps -a
docker compose logs -f mosquitto ingestion
```

Device state is available from:

```text
GET /api/iot/devices
```

Rejected messages are logged and recorded in `iot_ingestion_errors` for
diagnostics.
