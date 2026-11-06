// Vercel serverless proxy to the Django backend.
//
// Web requests stay on our own origin so the backend's SameSite=Lax cookies stay
// first-party. vercel.json rewrites /api/* and /media/* here with the original
// path in `__path`, and we forward the request (method, headers, body, cookies)
// and stream the response back.

const BACKEND = process.env.BACKEND_ORIGIN || "https://api.slanh.site";

// Hop-by-hop headers, plus ones fetch recomputes or that would break once
// Node's fetch has already decompressed the body.
const DROP_REQUEST = ["host", "connection", "content-length", "accept-encoding"];
const DROP_RESPONSE = ["content-encoding", "content-length", "transfer-encoding", "connection"];

async function proxy(request) {
  const url = new URL(request.url);
  const path = url.searchParams.get("__path") || "";
  url.searchParams.delete("__path");
  const search = url.searchParams.toString();
  // Django URLs end in "/"; the rewrite drops it, so put it back for /api.
  const target = `${BACKEND}/${path}${path.startsWith("api/") && !path.endsWith("/") ? "/" : ""}${search ? `?${search}` : ""}`;

  const headers = new Headers(request.headers);
  DROP_REQUEST.forEach((h) => headers.delete(h));

  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  let res;
  try {
    res = await fetch(target, {
      method: request.method,
      headers,
      body: hasBody ? await request.arrayBuffer() : undefined,
      redirect: "manual",
    });
  } catch {
    return Response.json({ detail: "Backend server is unreachable." }, { status: 502 });
  }

  const out = new Headers(res.headers);
  DROP_RESPONSE.forEach((h) => out.delete(h));
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: out });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const OPTIONS = proxy;
