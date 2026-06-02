import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = ({ params, redirect }) => {
  const filename = params.filename || '';
  if (!filename || filename.includes('..') || filename.includes('/')) {
    return new Response('Not found', { status: 404 });
  }
  return redirect(`/agreements/${filename}`, 301);
};