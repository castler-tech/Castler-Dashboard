const { neon } = require("@neondatabase/serverless");

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  try {
    const sql = neon(process.env.NETLIFY_DATABASE_URL);

    // Create tables if they don't exist
    await sql`
      CREATE TABLE IF NOT EXISTS castler_data (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;

    const { key } = event.queryStringParameters || {};
    if (!key) return { statusCode: 400, headers, body: JSON.stringify({ error: "Missing key" }) };

    if (event.httpMethod === "GET") {
      const rows = await sql`SELECT value FROM castler_data WHERE key = ${key}`;
      const data = rows.length > 0 ? JSON.parse(rows[0].value) : null;
      return { statusCode: 200, headers, body: JSON.stringify({ data }) };
    }

    if (event.httpMethod === "POST") {
      const { data } = JSON.parse(event.body || "{}");
      await sql`
        INSERT INTO castler_data (key, value, updated_at)
        VALUES (${key}, ${JSON.stringify(data)}, NOW())
        ON CONFLICT (key) DO UPDATE SET value = ${JSON.stringify(data)}, updated_at = NOW()
      `;
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };

  } catch (err) {
    console.error(err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
