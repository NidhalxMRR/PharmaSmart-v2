import 'dotenv/config';
import { Pool, PoolClient } from 'pg';
import type { Product, SensorReading, StaffShift, SupplierProfile } from '../types';

const connectionString =
  process.env.DATABASE_URL ??
  'postgresql://pharmasmart:pharmasmart_dev_password@localhost:5432/pharmasmart';

export const pool = new Pool({
  connectionString,
  max: Number(process.env.PG_POOL_MAX ?? 10),
  ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined,
});

pool.on('error', (error) => {
  console.error('[Database] Unexpected PostgreSQL pool error:', error);
});

const delay = (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

export async function waitForDatabase(maxAttempts = 20, delayMs = 1500) {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await pool.query('SELECT 1');
      console.log('[Database] PostgreSQL connection established');
      return;
    } catch (error) {
      lastError = error;
      console.warn(`[Database] Connection attempt ${attempt}/${maxAttempts} failed`);
      if (attempt < maxAttempts) {
        await delay(delayMs);
      }
    }
  }

  throw lastError;
}

export async function databaseIsHealthy() {
  await pool.query('SELECT 1');
}

export async function getIotDevices() {
  const result = await pool.query(`
    SELECT
      d.id,
      d.pharmacy_id AS "pharmacyId",
      d.sensor_id AS "sensorId",
      d.display_name AS "displayName",
      d.mqtt_client_id AS "mqttClientId",
      d.is_active AS "isActive",
      d.last_seen_at AS "lastSeenAt",
      d.firmware_version AS "firmwareVersion",
      d.battery_percent::float8 AS "batteryPercent",
      d.signal_dbm AS "signalDbm",
      CASE
        WHEN d.last_seen_at >= NOW() - INTERVAL '2 minutes' THEN 'Online'
        ELSE 'Offline'
      END AS "connectionStatus",
      s.status AS "sensorStatus"
    FROM iot_devices d
    JOIN sensors s ON s.id = d.sensor_id
    ORDER BY d.id
  `);
  return result.rows;
}

const productColumns = `
  id,
  name,
  code,
  category,
  stock,
  min_stock AS "minStock",
  camv,
  price::float8 AS price,
  margin::float8 AS margin,
  expiry_date::text AS "expiryDate",
  grossist,
  is_out_of_stock AS "isOutOfStock"
`;

export async function getProducts(): Promise<Product[]> {
  const result = await pool.query<Product>(
    `SELECT ${productColumns} FROM products ORDER BY length(id), id`,
  );
  return result.rows;
}

export async function updateProduct(id: string, changes: Partial<Product>) {
  const columnMap: Partial<Record<keyof Product, string>> = {
    name: 'name',
    code: 'code',
    category: 'category',
    stock: 'stock',
    minStock: 'min_stock',
    camv: 'camv',
    price: 'price',
    margin: 'margin',
    expiryDate: 'expiry_date',
    grossist: 'grossist',
  };

  const assignments: string[] = [];
  const values: unknown[] = [];

  for (const [key, column] of Object.entries(columnMap)) {
    const value = changes[key as keyof Product];
    if (value !== undefined) {
      values.push(value);
      assignments.push(`${column} = $${values.length}`);
    }
  }

  if (assignments.length === 0) {
    const current = await pool.query<Product>(
      `SELECT ${productColumns} FROM products WHERE id = $1`,
      [id],
    );
    return current.rows[0];
  }

  values.push(id);
  const result = await pool.query<Product>(
    `UPDATE products
       SET ${assignments.join(', ')}, updated_at = NOW()
       WHERE id = $${values.length}
       RETURNING ${productColumns}`,
    values,
  );
  return result.rows[0];
}

type SensorRow = Omit<SensorReading, 'temperature' | 'humidity' | 'history'>;
type ReadingRow = {
  sensorId: string;
  time: string;
  temperature: number;
  humidity: number;
};

export async function getSensors(): Promise<SensorReading[]> {
  const [sensorResult, readingResult] = await Promise.all([
    pool.query<SensorRow>(`
      SELECT
        id,
        name,
        location,
        min_temp::float8 AS "minTemp",
        max_temp::float8 AS "maxTemp",
        status
      FROM sensors
      ORDER BY id
    `),
    pool.query<ReadingRow>(`
      SELECT
        sensor_id AS "sensorId",
        to_char(measured_at AT TIME ZONE 'UTC', 'HH24:MI') AS time,
        temperature::float8 AS temperature,
        humidity::float8 AS humidity
      FROM (
        SELECT
          sensor_id,
          measured_at,
          temperature,
          humidity,
          row_number() OVER (PARTITION BY sensor_id ORDER BY measured_at DESC) AS reading_rank
        FROM sensor_readings
      ) recent
      WHERE reading_rank <= 48
      ORDER BY sensor_id, measured_at
    `),
  ]);

  return sensorResult.rows.map((sensor) => {
    const history = readingResult.rows
      .filter((reading) => reading.sensorId === sensor.id)
      .map(({ time, temperature, humidity }) => ({ time, temperature, humidity }));
    const latest = history.at(-1) ?? { temperature: 0, humidity: 0 };

    return {
      ...sensor,
      temperature: latest.temperature,
      humidity: latest.humidity,
      history,
    };
  });
}

export async function updateSensor(id: string, changes: Partial<SensorReading>) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const sensorAssignments: string[] = [];
    const sensorValues: unknown[] = [];
    const sensorColumnMap: Partial<Record<keyof SensorReading, string>> = {
      name: 'name',
      location: 'location',
      minTemp: 'min_temp',
      maxTemp: 'max_temp',
      status: 'status',
    };

    for (const [key, column] of Object.entries(sensorColumnMap)) {
      const value = changes[key as keyof SensorReading];
      if (value !== undefined) {
        sensorValues.push(value);
        sensorAssignments.push(`${column} = $${sensorValues.length}`);
      }
    }

    if (sensorAssignments.length > 0) {
      sensorValues.push(id);
      await client.query(
        `UPDATE sensors
         SET ${sensorAssignments.join(', ')}, updated_at = NOW()
         WHERE id = $${sensorValues.length}`,
        sensorValues,
      );
    }

    if (changes.temperature !== undefined || changes.humidity !== undefined) {
      const latest = await client.query<{ temperature: number; humidity: number }>(
        `SELECT temperature::float8 AS temperature, humidity::float8 AS humidity
         FROM sensor_readings
         WHERE sensor_id = $1
         ORDER BY measured_at DESC
         LIMIT 1`,
        [id],
      );

      const previous = latest.rows[0] ?? { temperature: 0, humidity: 0 };
      await client.query(
        `INSERT INTO sensor_readings (sensor_id, temperature, humidity)
         VALUES ($1, $2, $3)`,
        [
          id,
          changes.temperature ?? previous.temperature,
          changes.humidity ?? previous.humidity,
        ],
      );
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  return (await getSensors()).find((sensor) => sensor.id === id);
}

type StaffRow = Omit<StaffShift, 'schedule'>;
type ScheduleRow = { staffId: string; day: string; shift: string };

export async function getStaff(): Promise<StaffShift[]> {
  const [staffResult, scheduleResult] = await Promise.all([
    pool.query<StaffRow>('SELECT id, name, email, avatar, role FROM staff ORDER BY id'),
    pool.query<ScheduleRow>(`
      SELECT staff_id AS "staffId", day_of_week AS day, shift
      FROM staff_schedules
      ORDER BY staff_id,
        array_position(ARRAY['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'], day_of_week)
    `),
  ]);

  return staffResult.rows.map((member) => ({
    ...member,
    schedule: Object.fromEntries(
      scheduleResult.rows
        .filter((entry) => entry.staffId === member.id)
        .map((entry) => [entry.day, entry.shift]),
    ) as StaffShift['schedule'],
  }));
}

export async function updateStaff(id: string, changes: Partial<StaffShift>) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const assignments: string[] = [];
    const values: unknown[] = [];
    const columnMap: Partial<Record<keyof StaffShift, string>> = {
      name: 'name',
      email: 'email',
      avatar: 'avatar',
      role: 'role',
    };

    for (const [key, column] of Object.entries(columnMap)) {
      const value = changes[key as keyof StaffShift];
      if (value !== undefined) {
        values.push(value);
        assignments.push(`${column} = $${values.length}`);
      }
    }

    if (assignments.length > 0) {
      values.push(id);
      await client.query(
        `UPDATE staff
         SET ${assignments.join(', ')}, updated_at = NOW()
         WHERE id = $${values.length}`,
        values,
      );
    }

    if (changes.schedule) {
      for (const [day, shift] of Object.entries(changes.schedule)) {
        await client.query(
          `INSERT INTO staff_schedules (staff_id, day_of_week, shift)
           VALUES ($1, $2, $3)
           ON CONFLICT (staff_id, day_of_week)
           DO UPDATE SET shift = EXCLUDED.shift`,
          [id, day, shift],
        );
      }
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  return (await getStaff()).find((member) => member.id === id);
}

type SupplierRow = SupplierProfile;

export async function getSuppliers() {
  const [supplierResult, products] = await Promise.all([
    pool.query<SupplierRow>(`
      SELECT
        grossist,
        region,
        contact_name AS "contactName",
        phone,
        email,
        lead_time_days AS "leadTimeDays",
        service_level AS "serviceLevel",
        notes
      FROM suppliers
      ORDER BY grossist
    `),
    getProducts(),
  ]);

  return supplierResult.rows.map((supplier) => {
    const supplierProducts = products.filter(
      (product) => product.grossist === supplier.grossist,
    );
    const outOfStock = supplierProducts.filter(
      (product) => product.isOutOfStock,
    ).length;
    const expiringSoon = supplierProducts.filter((product) => {
      const diffMonths =
        (new Date(product.expiryDate).getTime() - Date.now()) /
        (1000 * 60 * 60 * 24 * 30);
      return diffMonths > 0 && diffMonths <= 3;
    }).length;

    return {
      ...supplier,
      productCount: supplierProducts.length,
      outOfStock,
      expiringSoon,
      stockValue: supplierProducts.reduce(
        (total, product) => total + product.stock * product.price,
        0,
      ),
      topCategories: Array.from(
        new Set(supplierProducts.map((product) => product.category)),
      ),
    };
  });
}

type OrderRow = {
  id: string;
  date: Date;
  grossist: string;
  status: string;
  totalPrice: number;
};

type OrderItemRow = {
  orderId: string;
  name: string;
  quantity: number;
  price: number;
};

export async function getOrders() {
  const [orderResult, itemResult] = await Promise.all([
    pool.query<OrderRow>(`
      SELECT
        id,
        ordered_at AS date,
        grossist,
        status,
        total_price::float8 AS "totalPrice"
      FROM purchase_orders
      ORDER BY ordered_at DESC
    `),
    pool.query<OrderItemRow>(`
      SELECT
        order_id AS "orderId",
        name,
        quantity,
        unit_price::float8 AS price
      FROM purchase_order_items
      ORDER BY id
    `),
  ]);

  return orderResult.rows.map((order) => {
    const items = itemResult.rows
      .filter((item) => item.orderId === order.id)
      .map(({ name, quantity, price }) => ({ name, quantity, price }));
    return { ...order, totalItems: items.length, items };
  });
}

type NewOrderItem = {
  productId?: string;
  name: string;
  quantity: number;
  price: number;
};

async function rollbackAndRelease(client: PoolClient, error: unknown): Promise<never> {
  await client.query('ROLLBACK');
  client.release();
  throw error;
}

export async function createOrder(input: {
  grossist: string;
  items: NewOrderItem[];
  totalPrice?: number;
}) {
  const items = input.items.filter((item) => Number(item.quantity) > 0);
  if (!input.grossist || items.length === 0) {
    throw new Error('A supplier and at least one order item are required');
  }

  const id = `ord-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const totalPrice =
    input.totalPrice ??
    items.reduce(
      (total, item) => total + Number(item.price) * Number(item.quantity),
      0,
    );
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO purchase_orders (id, grossist, status, total_price)
       VALUES ($1, $2, 'Envoyé', $3)`,
      [id, input.grossist, totalPrice],
    );

    for (const item of items) {
      const productResult = await client.query<{ id: string; name: string }>(
        `SELECT id, name
         FROM products
         WHERE id = $1 OR name = $2
         ORDER BY CASE WHEN id = $1 THEN 0 ELSE 1 END
         LIMIT 1
         FOR UPDATE`,
        [item.productId ?? null, item.name],
      );
      const product = productResult.rows[0];

      await client.query(
        `INSERT INTO purchase_order_items
          (order_id, product_id, name, quantity, unit_price)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          id,
          product?.id ?? null,
          product?.name ?? item.name,
          Number(item.quantity),
          Number(item.price),
        ],
      );

      if (product) {
        await client.query(
          'UPDATE products SET stock = stock + $1, updated_at = NOW() WHERE id = $2',
          [Number(item.quantity), product.id],
        );
      }
    }

    await client.query('COMMIT');
    client.release();
  } catch (error) {
    return rollbackAndRelease(client, error);
  }

  return {
    id,
    date: new Date().toISOString(),
    grossist: input.grossist,
    status: 'Envoyé',
    totalItems: items.length,
    totalPrice,
    items: items.map(({ name, quantity, price }) => ({ name, quantity, price })),
  };
}
