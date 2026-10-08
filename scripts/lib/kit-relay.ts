import http from "node:http";
import { type RelayDeps, relayMove } from "@/lib/relay/handle";

/**
 * THE KIT'S RELAYER ENDPOINT, IN THIS PROCESS, exactly as `/api/relay/kit` runs it: the kit's
 * wire shape ({ func, auth } in, { success, data: { hash } } out) and `relayMove`'s checks, so a
 * script moving out of a Face ID wallet goes through the same inspection as the app.
 */
export async function kitRelay(deps: RelayDeps, ip: string): Promise<{ readonly url: string; readonly close: () => void }> {
  const server = http.createServer(async (req, res) => {
    let raw = "";
    for await (const c of req) raw += c;
    let body: Record<string, unknown> | null = null;
    try {
      body = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      body = null;
    }
    res.setHeader("content-type", "application/json");
    if (!body || typeof body.func !== "string") {
      res.statusCode = 400;
      res.end(JSON.stringify({ success: false, error: "Only a { func, auth } transfer is accepted here." }));
      return;
    }
    const r = await relayMove(deps, body, ip);
    res.statusCode = r.ok ? 200 : 422;
    res.end(JSON.stringify(r.ok ? { success: true, data: { hash: r.value.tx, status: "SUCCESS" } } : { success: false, error: r.why }));
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", () => r()));
  return { url: `http://127.0.0.1:${(server.address() as { port: number }).port}`, close: () => server.close() };
}
