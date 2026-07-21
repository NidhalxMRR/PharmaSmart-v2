from __future__ import annotations

import json
import logging
import os
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import paho.mqtt.client as mqtt
import psycopg
from pydantic import BaseModel, ConfigDict, Field, model_validator


logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO").upper(),
    format="%(asctime)s %(levelname)s %(message)s",
)
logger = logging.getLogger("pharmasmart-ingestion")

READY_FILE = Path("/tmp/pharmasmart-ingestion-ready")


@dataclass(frozen=True)
class Settings:
    database_url: str
    mqtt_host: str
    mqtt_port: int
    mqtt_username: str
    mqtt_password: str
    mqtt_client_id: str
    mqtt_topic_filter: str
    mqtt_topic_prefix: str
    warning_margin_c: float
    max_payload_bytes: int

    @classmethod
    def from_environment(cls) -> "Settings":
        required = {
            "DATABASE_URL": os.getenv("DATABASE_URL"),
            "MQTT_HOST": os.getenv("MQTT_HOST", "mosquitto"),
            "MQTT_INGEST_USERNAME": os.getenv("MQTT_INGEST_USERNAME"),
            "MQTT_INGEST_PASSWORD": os.getenv("MQTT_INGEST_PASSWORD"),
        }
        missing = [name for name, value in required.items() if not value]
        if missing:
            raise RuntimeError(f"Missing required environment variables: {', '.join(missing)}")

        return cls(
            database_url=required["DATABASE_URL"] or "",
            mqtt_host=required["MQTT_HOST"] or "mosquitto",
            mqtt_port=int(os.getenv("MQTT_INTERNAL_PORT", "1883")),
            mqtt_username=required["MQTT_INGEST_USERNAME"] or "",
            mqtt_password=required["MQTT_INGEST_PASSWORD"] or "",
            mqtt_client_id=os.getenv(
                "MQTT_INGEST_CLIENT_ID", "pharmasmart-ingestion"
            ),
            mqtt_topic_filter=os.getenv(
                "MQTT_TOPIC_FILTER", "pharmasmart/+/devices/+/telemetry"
            ),
            mqtt_topic_prefix=os.getenv("MQTT_TOPIC_PREFIX", "pharmasmart"),
            warning_margin_c=float(os.getenv("IOT_WARNING_MARGIN_C", "0.5")),
            max_payload_bytes=int(os.getenv("MQTT_MAX_PAYLOAD_BYTES", "4096")),
        )


class Telemetry(BaseModel):
    model_config = ConfigDict(extra="ignore")

    temperature: float = Field(ge=-80, le=100)
    humidity: float | None = Field(default=None, ge=0, le=100)
    measured_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    sequence: int | None = Field(default=None, ge=0)
    battery_percent: float | None = Field(default=None, ge=0, le=100)
    signal_dbm: int | None = Field(default=None, ge=-150, le=0)
    firmware_version: str | None = Field(default=None, max_length=100)

    @model_validator(mode="before")
    @classmethod
    def accept_device_aliases(cls, value: Any) -> Any:
        if not isinstance(value, dict):
            return value

        normalized = dict(value)
        aliases = {
            "temperature": ("temperature", "temperature_c", "temp", "temp_c"),
            "humidity": ("humidity", "humidity_percent"),
            "measured_at": ("measured_at", "measuredAt", "timestamp"),
            "sequence": ("sequence", "sequence_number", "seq"),
            "battery_percent": ("battery_percent", "battery"),
            "signal_dbm": ("signal_dbm", "rssi"),
            "firmware_version": ("firmware_version", "firmware"),
        }
        for target, candidates in aliases.items():
            if target not in normalized:
                for candidate in candidates:
                    if candidate in normalized:
                        normalized[target] = normalized[candidate]
                        break
        return normalized

    @model_validator(mode="after")
    def ensure_timezone(self) -> "Telemetry":
        if self.measured_at.tzinfo is None:
            self.measured_at = self.measured_at.replace(tzinfo=timezone.utc)
        if self.measured_at > datetime.now(timezone.utc) + timedelta(minutes=5):
            raise ValueError("measured_at cannot be more than 5 minutes in the future")
        return self


def parse_topic(topic: str, prefix: str = "pharmasmart") -> tuple[str, str]:
    parts = topic.split("/")
    if (
        len(parts) != 5
        or parts[0] != prefix
        or parts[2] != "devices"
        or parts[4] != "telemetry"
        or not parts[1]
        or not parts[3]
    ):
        raise ValueError(f"Unsupported telemetry topic: {topic}")
    return parts[1], parts[3]


def calculate_status(
    temperature: float,
    min_temp: float,
    max_temp: float,
    warning_margin_c: float,
) -> str:
    if temperature < min_temp or temperature > max_temp:
        return "Critical"
    if (
        temperature <= min_temp + warning_margin_c
        or temperature >= max_temp - warning_margin_c
    ):
        return "Warning"
    return "Normal"


def record_ingestion_error(
    database_url: str, topic: str, raw_payload: str, error: Exception
) -> None:
    try:
        with psycopg.connect(database_url) as connection:
            connection.execute(
                """
                INSERT INTO iot_ingestion_errors (topic, payload, error_message)
                VALUES (%s, %s, %s)
                """,
                (topic[:500], raw_payload[:10000], str(error)[:2000]),
            )
    except Exception:
        logger.exception("Could not persist ingestion error")


def persist_telemetry(
    database_url: str,
    pharmacy_id: str,
    device_id: str,
    telemetry: Telemetry,
    warning_margin_c: float,
) -> bool:
    with psycopg.connect(database_url) as connection:
        device = connection.execute(
            """
            SELECT
              d.sensor_id,
              s.min_temp::float8,
              s.max_temp::float8,
              (
                SELECT sr.humidity::float8
                FROM sensor_readings sr
                WHERE sr.sensor_id = d.sensor_id
                ORDER BY sr.measured_at DESC
                LIMIT 1
              ) AS latest_humidity
            FROM iot_devices d
            JOIN sensors s ON s.id = d.sensor_id
            WHERE d.id = %s
              AND d.pharmacy_id = %s
              AND d.is_active = TRUE
            FOR UPDATE OF d
            """,
            (device_id, pharmacy_id),
        ).fetchone()

        if device is None:
            raise ValueError(
                f"Unknown or inactive IoT device '{device_id}' for pharmacy '{pharmacy_id}'"
            )

        sensor_id, min_temp, max_temp, latest_humidity = device
        humidity = telemetry.humidity
        if humidity is None:
            humidity = latest_humidity
        if humidity is None:
            raise ValueError("Humidity is required until the sensor has a previous reading")

        status = calculate_status(
            telemetry.temperature,
            float(min_temp),
            float(max_temp),
            warning_margin_c,
        )

        inserted = connection.execute(
            """
            INSERT INTO sensor_readings (
              sensor_id,
              device_id,
              measured_at,
              temperature,
              humidity,
              sequence_number
            )
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT (sensor_id, sequence_number) DO NOTHING
            RETURNING id
            """,
            (
                sensor_id,
                device_id,
                telemetry.measured_at,
                telemetry.temperature,
                humidity,
                telemetry.sequence,
            ),
        ).fetchone()

        connection.execute(
            """
            UPDATE iot_devices
            SET
              last_seen_at = NOW(),
              firmware_version = COALESCE(%s, firmware_version),
              battery_percent = COALESCE(%s, battery_percent),
              signal_dbm = COALESCE(%s, signal_dbm),
              updated_at = NOW()
            WHERE id = %s
            """,
            (
                telemetry.firmware_version,
                telemetry.battery_percent,
                telemetry.signal_dbm,
                device_id,
            ),
        )

        if inserted is not None:
            connection.execute(
                "UPDATE sensors SET status = %s, updated_at = NOW() WHERE id = %s",
                (status, sensor_id),
            )

        return inserted is not None


def create_client(settings: Settings) -> mqtt.Client:
    client = mqtt.Client(
        callback_api_version=mqtt.CallbackAPIVersion.VERSION2,
        client_id=settings.mqtt_client_id,
        protocol=mqtt.MQTTv311,
    )
    client.username_pw_set(settings.mqtt_username, settings.mqtt_password)
    client.reconnect_delay_set(min_delay=1, max_delay=30)

    def on_connect(
        connected_client: mqtt.Client,
        _userdata: Any,
        _flags: mqtt.ConnectFlags,
        reason_code: mqtt.ReasonCode,
        _properties: mqtt.Properties | None,
    ) -> None:
        if reason_code.is_failure:
            logger.error("MQTT connection rejected: %s", reason_code)
            return
        connected_client.subscribe(settings.mqtt_topic_filter, qos=1)
        READY_FILE.touch()
        logger.info(
            "Connected to MQTT broker and subscribed to %s",
            settings.mqtt_topic_filter,
        )

    def on_disconnect(
        _client: mqtt.Client,
        _userdata: Any,
        _disconnect_flags: mqtt.DisconnectFlags,
        reason_code: mqtt.ReasonCode,
        _properties: mqtt.Properties | None,
    ) -> None:
        READY_FILE.unlink(missing_ok=True)
        if reason_code.is_failure:
            logger.warning("Unexpected MQTT disconnect: %s", reason_code)

    def on_message(
        connected_client: mqtt.Client,
        _userdata: Any,
        message: mqtt.MQTTMessage,
    ) -> None:
        raw_payload = ""
        try:
            if len(message.payload) > settings.max_payload_bytes:
                raise ValueError(
                    f"Payload exceeds {settings.max_payload_bytes} bytes"
                )

            raw_payload = message.payload.decode("utf-8")
            pharmacy_id, device_id = parse_topic(
                message.topic, settings.mqtt_topic_prefix
            )
            telemetry = Telemetry.model_validate_json(raw_payload)
            inserted = persist_telemetry(
                settings.database_url,
                pharmacy_id,
                device_id,
                telemetry,
                settings.warning_margin_c,
            )

            ack_topic = (
                f"{settings.mqtt_topic_prefix}/{pharmacy_id}/devices/"
                f"{device_id}/ack"
            )
            connected_client.publish(
                ack_topic,
                json.dumps(
                    {
                        "accepted": True,
                        "duplicate": not inserted,
                        "sequence": telemetry.sequence,
                        "received_at": datetime.now(timezone.utc).isoformat(),
                    }
                ),
                qos=1,
            )
            READY_FILE.touch()
            logger.info(
                "Telemetry %s for device=%s temperature=%.2f",
                "stored" if inserted else "deduplicated",
                device_id,
                telemetry.temperature,
            )
        except Exception as error:
            logger.warning(
                "Rejected telemetry topic=%s error=%s", message.topic, error
            )
            record_ingestion_error(
                settings.database_url, message.topic, raw_payload, error
            )

    client.on_connect = on_connect
    client.on_disconnect = on_disconnect
    client.on_message = on_message
    return client


def main() -> None:
    settings = Settings.from_environment()
    client = create_client(settings)
    logger.info(
        "Starting ingestion worker broker=%s:%s",
        settings.mqtt_host,
        settings.mqtt_port,
    )
    client.connect(settings.mqtt_host, settings.mqtt_port, keepalive=60)
    client.loop_forever(retry_first_connection=True)


if __name__ == "__main__":
    main()
