import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const TO_EMAIL = process.env.TO_EMAIL; // πχ info@aigrade.site
const FROM_EMAIL = process.env.FROM_EMAIL || 'AIGRADE <onboarding@resend.dev>';
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // CORS έλεγχος
  const origin = req.headers.origin || '';
  if (ALLOWED_ORIGIN && origin !== ALLOWED_ORIGIN) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  // Parse body (χωρίς custom headers από client)
  let data = {};
  try {
    data = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  const {
    name = '', email = '', what = '', url = '', repo = '',
    desc = '', attach = '', email_me = '', agree = '',
    page_url = '', referrer = '',
    utm_source = '', utm_medium = '', utm_campaign = '', utm_term = '', utm_content = ''
  } = data;

  const utm = [utm_source, utm_medium, utm_campaign, utm_term, utm_content]
    .filter(Boolean).join(' / ') || '/';

  const esc = s => (s || '').toString().replace(/[<>&]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;'}[c]));

  const html = `
    <p>Hi <strong>${esc(name)}</strong>,</p>
    <p>Thanks for sending your <strong>${esc(what)}</strong> for a quick AIGRADE preview.
    We'll process it shortly and email you an automated snapshot based on the info you provided.</p>
    <p>If you attached a brief/NDA link, we'll respect it.</p>
    <hr />
    <p><strong>Summary</strong></p>
    <ul>
      <li><strong>Type:</strong> ${esc(what) || '-'}</li>
      <li><strong>URL:</strong> ${esc(url) || '-'}</li>
      <li><strong>Model/Repo:</strong> ${esc(repo) || '-'}</li>
      <li><strong>Attachment:</strong> ${esc(attach) || '-'}</li>
    </ul>
    <p><strong>Description</strong></p>
    <p style="white-space:pre-wrap">${esc(desc)}</p>
    <p>Submitted from: ${esc(page_url)}<br>
       Referrer: ${esc(referrer)}<br>
       UTM: ${esc(utm)}<br>
       Email me results?: ${email_me ? 'on' : 'off'} • Consent: ${agree ? 'on' : 'off'}
    </p>
    <p>— Team AIGRADE</p>
  `;

  const sends = [];
  if (email) sends.push(resend.emails.send({
    from: FROM_EMAIL, to: email,
    subject: 'Thanks for your AIGRADE submission', html
  }));
  if (TO_EMAIL) sends.push(resend.emails.send({
    from: FROM_EMAIL, to: TO_EMAIL,
    subject: `[AIGRADE] New instant preview: ${name || '-'} • ${what || '-'}`, html
  }));

  try {
    await Promise.all(sends);
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
