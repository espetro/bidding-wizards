/**
 * BidBench AI proxy.
 *
 * Holds the TypeSafe API key server-side and forwards structured
 * System One requests from the static BidBench page.
 *
 *   GET  /api/health   -> { ok, hasKey }
 *   POST /api/typesafe -> { state, questions, model? } -> TypeSafe System One response
 */

const TYPESAFE_ENDPOINT = "https://api.typesafe.ai/v1/systemone";

function json(body, status, cors) {
  return new Response(JSON.stringify(body), {
    status: status,
    headers: Object.assign({ "Content-Type": "application/json" }, cors),
  });
}

function corsHeaders(request, env) {
  const origin = request.headers.get("Origin") || "";
  const allowed = String(env.ALLOWED_ORIGINS || "*")
    .split(",")
    .map(function (s) { return s.trim(); })
    .filter(Boolean);
  var allow = "*";
  if (allowed.indexOf("*") === -1) {
    allow = allowed.indexOf(origin) !== -1 ? origin : allowed[0];
  }
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

export default {
  async fetch(request, env) {
    var cors = corsHeaders(request, env);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    if (new URL(request.url).pathname === "/api/health") {
      return json({ ok: true, hasKey: !!env.TYPESAFE_API_KEY }, 200, cors);
    }

    if (new URL(request.url).pathname !== "/api/typesafe") {
      return json({ error: "Not found" }, 404, cors);
    }

    if (request.method !== "POST") {
      return json({ error: "Use POST" }, 405, cors);
    }

    if (!env.TYPESAFE_API_KEY) {
      return json({ error: "Server is missing TYPESAFE_API_KEY" }, 500, cors);
    }

    var body;
    try {
      body = await request.json();
    } catch (e) {
      return json({ error: "Invalid JSON body" }, 400, cors);
    }

    if (!body || typeof body.state !== "string" || !body.state.trim()) {
      return json({ error: "state is required" }, 400, cors);
    }
    if (!body.questions || typeof body.questions !== "object" || !Object.keys(body.questions).length) {
      return json({ error: "questions is required" }, 400, cors);
    }

    var payload = {
      model: body.model || "jev-latest",
      state: body.state,
      questions: body.questions,
    };

    var upstream = await fetch(TYPESAFE_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + env.TYPESAFE_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    var text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: Object.assign({ "Content-Type": "application/json" }, cors),
    });
  },
};
