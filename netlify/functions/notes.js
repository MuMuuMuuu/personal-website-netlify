// Netlify Function to handle CRUD operations for notes.
//
// This function uses Netlify DB (powered by Neon) to store and retrieve
// notes. When the project is built on Netlify and the `@netlify/neon`
// package is installed, Netlify will provision a Postgres database and
// automatically set the `NETLIFY_DATABASE_URL` environment variable. The
// Neon client from `@netlify/neon` uses this variable to connect.

import { neon } from '@netlify/neon';
import type { Context, Config } from '@netlify/functions';

// Initialize the Neon client. Connection details are read from
// process.env.NETLIFY_DATABASE_URL automatically.
const sql = neon();

/**
 * Ensure that the `notes` table exists. If it does not exist, it is
 * created with columns for an auto-incrementing primary key, a title,
 * and content.
 */
async function ensureTable() {
  await sql(`
    CREATE TABLE IF NOT EXISTS notes (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL
    )
  `);
}

/**
 * The handler function responds to HTTP requests. It supports GET to
 * retrieve all notes and POST to insert a new note. Additional methods
 * return a 405 status.
 *
 * @param {Request} req The incoming HTTP request
 * @param {Context} context Function execution context (unused)
 * @returns {Promise<Response>} A promise resolving to the HTTP response
 */
export default async function handler(req: Request, context: Context) {
  await ensureTable();

  if (req.method === 'GET') {
    // Fetch all notes from the database, ordered by most recent first
    const rows = await sql('SELECT * FROM notes ORDER BY id DESC');
    return new Response(JSON.stringify(rows), {
      headers: { 'Content-Type': 'application/json' },
    });
  } else if (req.method === 'POST') {
    // Add a new note to the database
    const { title, content } = await req.json();
    if (!title || !content) {
      return new Response(JSON.stringify({ error: 'Missing fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    await sql('INSERT INTO notes (title, content) VALUES ($1, $2)', [title, content]);
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // For unsupported methods, return 405 Method Not Allowed
  return new Response('Method Not Allowed', { status: 405 });
}

// Configure the function to run at the `/api/notes` path
export const config: Config = {
  path: '/api/notes',
};
