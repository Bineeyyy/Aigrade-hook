// api/submit.js
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// Small helper to escape HTML (avoid injection in emails)
const esc = (s = '') =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

export default async function handler(req, res) {
  const allowOrigin = process.env.ALLOWED_ORIGIN || '*';

  // CORS
  res.setHeader('Access-Control-Allow-Origin', allowOrigin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  // Optional origin check (supports CSV of domains)
  try {
    const origin = req.headers.origin || '';
    const allowed = (process.env.ALLOWED_ORIGIN || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    if (allowed.length && !allowed.includes(origin)) {
      return res.status(403).json({ ok: false, error: 'Origin not allowed' });
    }
  } catch (_) {}

  // Parse body (supports fetch without Content-Type)
  let data = {};
  try {
    data = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  } catch (e) {
    return res.status(400).json({ ok: false, error: 'Invalid JSON body' });
  }

  const {
    name = '',
    email = '',
    what = '',
    url = '',
    repo = '',
    desc = '',
    attach = '',
    email_me = '',
    agree = '',
    page_url = '',
    referrer = ''
  } = data;

  if (!name || !email) {
    return res.status(400).json({ ok: false, error: 'Missing name or email' });
  }

  // Build HTML email (to team)
  const htmlTeam = `
    <h2>New AIGRADE Instant Preview</h2>
    <p><strong>Name:</strong> ${esc(name)}<br/>
       <strong>Email:</strong> ${esc(email)}</p>

    <h3>Summary</h3>
    <ul>
      <li><strong>Type:</strong> ${esc(what)}</li>
      <li><strong>URL:</strong> ${esc(url)}</li>
      <li><strong>Model/Repo:</strong> ${esc(repo)}</li>
      <li><strong>Attachment:</strong> ${esc(attach)}</li>
    </ul>

    <h3>Description</h3>
    <pre style="white-space:pre-wrap;">${esc(desc)}</pre>

    <p style="font-size:12px;color:#6B7280;">
      Submitted from: ${esc(page_url)}<br/>
      Referrer: ${esc(referrer)}<br/>
      Email me results?: ${esc(email_me)} • Consent: ${esc(agree)}
    </p>
  `;

  // Build HTML email (to user)
  const htmlUser = `
    <p>Hi ${esc(name)},</p>
    <p>Thanks for sending your info for a quick AIGRADE preview.
       We’ll process it shortly and email you an automated snapshot
       based on the info you provided. If you attached a brief/NDA link,
       we’ll respect it.</p>

    <h3>Summary</h3>
    <ul>
      <li><strong>Type:</strong> ${esc(what) || '-'}</li>
      <li><strong>URL:</strong> ${esc(url) || '-'}</li>
      <li><strong>Model/Repo:</strong> ${esc(repo) || '-'}</li>
      <li><strong>Attachment:</strong> ${esc(attach) || '-'}</li>
    </ul>

    <p style="font-size:12px;color:#6B7280;">
      Submitted from: ${esc(page_url)}<br/>
      Referrer: ${esc(referrer)}
    </p>

    <p>— Team AIGRADE</p>
  `;

  try {
    // 1) Send to your team inbox
    await resend.emails.send({
      from: process.env.FROM_EMAIL || 'AIGRADE <onboarding@resend.dev>',
      to: [process.env.TO_EMAIL].filter(Boolean),
      reply_to: email,
      subject: `New AIGRADE submission — ${name}`,
      html: htmlTeam
    });

    // 2) Send confirmation to the user (optional)
    await resend.emails.send({
      from: process.env.FROM_EMAIL || 'AIGRADE <onboarding@resend.dev>',
      to: [email],
      subject: 'Thanks for your AIGRADE submission',
      html: htmlUser
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: 'Email send failed' });
  }
}
```0
