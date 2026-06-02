import type { APIRoute } from 'astro';
import { insertAgreement } from '../../../../lib/db';

export const prerender = false;

const OWNER = 'Hriday2311';
const REPO  = 'donny-crm';

export const POST: APIRoute = async ({ params, request, locals }) => {
  const db    = (locals as any).runtime.env.DB;
  const token = (locals as any).runtime.env.GITHUB_TOKEN;

  const jsonErr = (msg: string, status = 400) =>
    new Response(JSON.stringify({ error: msg }), { status, headers: { 'Content-Type': 'application/json' } });

  const clientId = parseInt(params.id!);
  if (!clientId) return jsonErr('Invalid client ID');
  if (!db)       return jsonErr('DB not configured', 500);
  if (!token)    return jsonErr('GITHUB_TOKEN not configured', 500);

  try {
    const form    = await request.formData();
    const file    = form.get('file') as File | null;
    const docType = String(form.get('doc_type') || 'Agreement').trim();

    if (!file || !file.name || file.size === 0) return jsonErr('No file provided');

    const allowedExt = ['.pdf', '.doc', '.docx', '.xlsx'];
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    if (!allowedExt.includes(ext)) return jsonErr('File type not allowed');
    if (file.size > 10 * 1024 * 1024) return jsonErr('File too large (max 10 MB)');

    const hex = Array.from(crypto.getRandomValues(new Uint8Array(4)))
      .map(b => b.toString(16).padStart(2, '0')).join('');
    const sanitized = file.name.replace(ext, '').replace(/[^a-zA-Z0-9_\-. ]/g, '_').replace(/\s+/g, '_').slice(0, 80);
    const filename  = `${clientId}_${hex}_${sanitized}${ext}`;
    const ghPath    = `public/agreements/${filename}`;

    const buf   = await file.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let binStr  = '';
    const CHUNK = 8192;
    for (let i = 0; i < bytes.length; i += CHUNK) {
      binStr += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
    }
    const b64 = btoa(binStr);

    const putRes = await fetch(
      `https://api.github.com/repos/${OWNER}/${REPO}/contents/${ghPath}`,
      {
        method: 'PUT',
        headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json', 'User-Agent': 'donny-crm', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Upload agreement for client ${clientId}: ${file.name}`,
          content: b64,
          committer: { name: 'Donny CRM', email: 'donny@vantagecircle.com' },
        }),
      }
    );
    if (!putRes.ok) {
      const errText = await putRes.text();
      return jsonErr(`GitHub upload failed: ${putRes.status} ${errText}`, 500);
    }

    const newId = await insertAgreement(db, clientId, filename, file.name, docType);
    return new Response(JSON.stringify({ success: true, filename, id: newId }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return jsonErr(String(err), 500);
  }
};