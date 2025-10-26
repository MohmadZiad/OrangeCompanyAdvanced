// api/docs.ts
import fs from "fs";
import path from "path";

export default function handler(req: any, res: any) {
  try {
    // استخدم __dirname ليتعامل bundler مع الملف بشكل صحيح داخل السيرفر
    const filePath = path.join(__dirname, "../../shared/docs.json");
    const raw = fs.readFileSync(filePath, "utf-8");
    const docs = JSON.parse(raw);

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ docs })); // <<<<<< واجهة الـ UI تتوقع { docs }
  } catch (e: any) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: e?.message || "docs error" }));
  }
}
