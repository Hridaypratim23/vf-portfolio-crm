import type { APIRoute } from 'astro';
import { getAgreementById, deleteAgreementRow } from '../../../lib/db';

export const prerender = false;

const OWNER = 'Hriday2311';
const REPO  = 'donny-crm';

const ok  = () => new Response(JSON.stringify({ ok: true }),    { status: 200, headers: { 'Content-Type': 'application/json' } });
const err = (msg: string, s = 400) => new Response(JSON.stringify({ error: msg }), { status: s,   headers: { 'Content-Type': 'application/json' } });

export const POST: APIRoute = async ({ params, locals }) => {
  const db = (locals as any).runtime.env.DB;
  const id = parseInt(params.id!);
  if (!id) return err('Invalid agreement ID');

  try {
    const row = await getAgreementById(db, id);

    if (row?.filename) {
      const token = (locals as any).runtime.env.GITHUB_TOKEN;
      if (token) {
        try {
          const filePath = `public/agreements/${row.filename}`;
          const ghRes = await fetch(
            `https://api.github.com/repos/${OWNER}/${REPO}/contents/${filePath}`,
            { headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json', 'User-Agent': 'donny-crm' } }
          );
          if (ghRes.ok) {
            const ghFile = await ghRes.json();
            await fetch(
              `https://api.github.com/repos/${OWNER}/${REPO}/contents/${filePath}`,
              {
                method: 'DELETE',
                headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json', 'User-Agent': 'donny-crm', 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: `Delete agreement file ${row.filename}`, sha: ghFile.sha, committer: { name: 'Donny CRM', email: 'donny@vantagecircle.com' } }),
              }
            );
          }
        } catch {
          // File may already be gone — continue with DB delete
        }
      }
    }

    await deleteAgreementRow(db, id);
    return ok();
  } catch (e: any) {
    return err(String(e), 500);
  }
};