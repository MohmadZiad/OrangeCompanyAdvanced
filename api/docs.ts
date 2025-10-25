import type { VercelRequest, VercelResponse } from '@vercel/node';
import fs from 'fs';
import path from 'path';

export default function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const file = path.join(process.cwd(), 'shared', 'docs.json');
    const raw = fs.readFileSync(file, 'utf-8');
    const json = JSON.parse(raw);
    res.status(200).json(json);
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'docs error' });
  }
}
