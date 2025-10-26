// api/docs.ts
import { readDocs } from "../server/docs";

export default async function handler(req: any, res: any) {
  try {
    if (req.method && req.method !== "GET") {
      res.statusCode = 405;
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({ error: "Method not allowed" }));
    }

    const docs = await readDocs();

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    // مهم: الواجهة تتوقع { docs }
    res.end(JSON.stringify({ docs }));
  } catch (e: any) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: e?.message || "docs error" }));
  }
}
