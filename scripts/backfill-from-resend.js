#!/usr/bin/env node
// Backfills quiz_completions from Resend sent emails.
// Run with: node --env-file=.env scripts/backfill-from-resend.js
//
// What it can recover from Resend:
//   email, scout_type (parsed from subject), created_at
//   badges/answers/etc. are unavailable — those columns will be null.

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!RESEND_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing env vars. Need: RESEND_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY");
  process.exit(1);
}

// Subject format: "You're <scout_type> — Your Top 10 Merit Badge Matches"
const SUBJECT_RE = /^You're (.+?) [—\-–] Your Top 10 Merit Badge Matches$/;

// ── Fetch all quiz emails from Resend (paginated) ──────────────────────────────
async function fetchAllResendEmails() {
  const emails = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const res = await fetch(
      `https://api.resend.com/emails?limit=${limit}&offset=${offset}`,
      { headers: { Authorization: `Bearer ${RESEND_API_KEY}` } }
    );

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Resend API error ${res.status}: ${body}`);
    }

    const json = await res.json();
    const page = json.data ?? json.emails ?? [];

    if (page.length === 0) break;

    for (const email of page) {
      const subject = email.subject || "";
      const match = subject.match(SUBJECT_RE);
      if (match) emails.push(email);
    }

    console.log(`  Fetched ${offset + page.length} emails from Resend (${emails.length} quiz emails so far)...`);

    if (page.length < limit) break;
    offset += limit;
  }

  return emails;
}

// ── Fetch existing rows from Supabase to avoid duplicates ─────────────────────
async function fetchExistingRows() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/quiz_completions?select=email,scout_type,created_at`,
    {
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
    }
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Supabase fetch error ${res.status}: ${body}`);
  }

  return await res.json();
}

// ── Insert a row into Supabase ─────────────────────────────────────────────────
async function insertRow(row) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/quiz_completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      Prefer: "return=minimal",
    },
    body: JSON.stringify(row),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Insert failed ${res.status}: ${body}`);
  }
}

// ── Main ───────────────────────────────────────────────────────────────────────
(async () => {
  console.log("Fetching quiz emails from Resend...");
  const resendEmails = await fetchAllResendEmails();
  console.log(`Found ${resendEmails.length} quiz emails in Resend.\n`);

  console.log("Fetching existing rows from Supabase...");
  const existing = await fetchExistingRows();
  // Build a dedup key: email+scout_type (closest we can get without a Resend ID column)
  const existingKeys = new Set(
    existing.map((r) => `${(r.email || "").toLowerCase()}|${r.scout_type || ""}`)
  );
  console.log(`Found ${existing.length} existing rows in Supabase.\n`);

  let inserted = 0;
  let skipped = 0;

  for (const email of resendEmails) {
    const toEmail = Array.isArray(email.to) ? email.to[0] : email.to;
    const match = (email.subject || "").match(SUBJECT_RE);
    const scoutType = match ? match[1] : null;
    const key = `${(toEmail || "").toLowerCase()}|${scoutType || ""}`;

    if (existingKeys.has(key)) {
      console.log(`  SKIP  ${toEmail} — already in Supabase`);
      skipped++;
      continue;
    }

    const row = {
      email: toEmail || null,
      scout_type: scoutType || null,
      created_at: email.created_at || null,
      // badges, answers, personality_description, eagle_tip, age_range unavailable from Resend
    };

    try {
      await insertRow(row);
      existingKeys.add(key); // prevent re-inserting if email appears twice in Resend
      console.log(`  INSERT ${toEmail} — ${scoutType}`);
      inserted++;
    } catch (err) {
      console.error(`  ERROR  ${toEmail}: ${err.message}`);
    }
  }

  console.log(`\nDone. Inserted: ${inserted}, Skipped: ${skipped}`);
})();
