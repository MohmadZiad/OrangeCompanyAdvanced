// api/docs.ts
import fs from 'fs';
import path from 'path';

export default function handler(req: any, res: any) {
  try {
    const file = path.join(process.cwd(), 'shared', 'docs.json');
    const raw = fs.readFileSync(file, 'utf-8');
    const json = JSON.parse(raw);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(json));
  } catch (e: any) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: e?.message || 'docs error' }));
  }
}
