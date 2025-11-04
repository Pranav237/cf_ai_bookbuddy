export class MyDurableObject {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request) {
    return new Response("Durable Object placeholder active", { status: 200 });
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/wishlist/add" && request.method === "POST") {
      try {
        const body = await request.json();
        if (!body.title) {
          return new Response("Missing title", { status: 400 });
        }

        const note = body.note || "";
        await env.BOOKBUDDY_KV.put(body.title, note);

        return new Response(JSON.stringify({ ok: true }), {
          headers: { "Content-Type": "application/json" },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    if (url.pathname === "/wishlist/remove" && request.method === "POST") {
      try {
        const body = await request.json();
        if (!body.title) {
          return new Response("Missing title", { status: 400 });
        }

        await env.BOOKBUDDY_KV.delete(body.title);

        return new Response(
          JSON.stringify({ ok: true, deleted: body.title }),
          { headers: { "Content-Type": "application/json" } }
        );
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    if (url.pathname === "/wishlist" && request.method === "GET") {
      try {
        const list = await env.BOOKBUDDY_KV.list({ cacheTtl: 0 });
        const wishlist = [];

        for (const k of list.keys) {
          const note = await env.BOOKBUDDY_KV.get(k.name);
          if (note !== null) {
            wishlist.push({ title: k.name, note });
          }
        }

        return new Response(JSON.stringify({ wishlist }), {
          headers: { "Content-Type": "application/json" },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    return new Response("BookBuddy worker active!", { status: 200 });
  },
};
