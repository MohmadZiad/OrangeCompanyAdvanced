// api/docs.ts
import fs from "fs";
import path from "path";

export default function handler(req: any, res: any) {
  try {
    if (req.method !== "GET") {
      res.statusCode = 405;
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({ error: "Method not allowed" }));
    }

    const filePath = path.join(__dirname, "../../shared/docs.json");
    const raw = fs.readFileSync(filePath, "utf-8");
    const docs = JSON.parse(raw);

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ docs }));
  } catch (e: any) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: e?.message || "docs error" }));
  }
}
