const port = Number(Bun.env.PORT ?? 3001);

Bun.serve({
  port,
  fetch(request) {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/health") {
      return Response.json({
        ok: true,
        service: "agent-valley-api"
      });
    }

    return Response.json({ error: "Not found" }, { status: 404 });
  }
});

console.log(`Agent Valley API listening on http://localhost:${port}`);
