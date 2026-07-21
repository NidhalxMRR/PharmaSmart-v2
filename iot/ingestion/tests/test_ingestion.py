import unittest
from datetime import datetime, timezone

from app import Telemetry, calculate_status, parse_topic
from pydantic import ValidationError


class TelemetryTests(unittest.TestCase):
    def test_accepts_esp32_aliases(self):
        reading = Telemetry.model_validate(
            {
                "temp_c": 4.25,
                "humidity_percent": 48,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "seq": 42,
                "battery": 87,
                "rssi": -61,
                "firmware": "1.2.0",
            }
        )

        self.assertEqual(reading.temperature, 4.25)
        self.assertEqual(reading.sequence, 42)
        self.assertEqual(reading.measured_at.tzinfo, timezone.utc)

    def test_rejects_impossible_temperature(self):
        with self.assertRaises(ValidationError):
            Telemetry.model_validate({"temperature": 250})

    def test_rejects_future_device_clock(self):
        with self.assertRaises(ValidationError):
            Telemetry.model_validate(
                {
                    "temperature": 4.2,
                    "measured_at": "2099-01-01T00:00:00Z",
                }
            )

    def test_parses_expected_topic(self):
        self.assertEqual(
            parse_topic("pharmasmart/main/devices/esp32-fridge-01/telemetry"),
            ("main", "esp32-fridge-01"),
        )

    def test_rejects_unexpected_topic(self):
        with self.assertRaises(ValueError):
            parse_topic("other/main/devices/device/telemetry")

    def test_calculates_threshold_status(self):
        self.assertEqual(calculate_status(4.2, 2, 8, 0.5), "Normal")
        self.assertEqual(calculate_status(7.7, 2, 8, 0.5), "Warning")
        self.assertEqual(calculate_status(9.4, 2, 8, 0.5), "Critical")


if __name__ == "__main__":
    unittest.main()
