const SCHEMA = `CREATE TABLE IF NOT EXISTS trip_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  state TEXT NOT NULL,
  updated_at TEXT NOT NULL
)`;

function headers() {
  return { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };
}

async function ensureSchema(db) {
  await db.prepare(SCHEMA).run();
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/state") {
      if (!env.DB) return new Response(JSON.stringify({ error: "Storage is not configured." }), { status: 503, headers: headers() });
      await ensureSchema(env.DB);

      if (request.method === "GET") {
        const row = await env.DB.prepare("SELECT state FROM trip_state WHERE id = 1").first();
        return new Response(row ? row.state : "{}", { headers: headers() });
      }

      if (request.method === "PUT") {
        let state;
        try { state = await request.json(); } catch { return new Response(JSON.stringify({ error: "Invalid state." }), { status: 400, headers: headers() }); }
        if (!state || typeof state !== "object" || Array.isArray(state)) return new Response(JSON.stringify({ error: "Invalid state." }), { status: 400, headers: headers() });
        const payload = JSON.stringify(state);
        if (payload.length > 20000) return new Response(JSON.stringify({ error: "State is too large." }), { status: 413, headers: headers() });
        await env.DB.prepare("INSERT INTO trip_state (id, state, updated_at) VALUES (1, ?, ?) ON CONFLICT(id) DO UPDATE SET state = excluded.state, updated_at = excluded.updated_at").bind(payload, new Date().toISOString()).run();
        return new Response(payload, { headers: headers() });
      }

      return new Response(JSON.stringify({ error: "Method not allowed." }), { status: 405, headers: headers() });
    }

    return env.ASSETS.fetch(request);
  }
};
