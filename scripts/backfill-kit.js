#!/usr/bin/env node
// Backfills Kit for all quiz completers:
//   - Subscribes missing emails to the quiz form (9269203)
//   - Tags all completers with merit-badge-quiz-completer (18445554)
// Run with: node --env-file=.env scripts/backfill-kit.js

const secret = process.env.CONVERTKIT_API_SECRET;
if (!secret) { console.error("Missing CONVERTKIT_API_SECRET"); process.exit(1); }

const FORM_ID = 9269203;
const TAG_ID = 18445554;

const completers = [
  { email: "catherine.skena@dcinternationalschool.org", inKit: true },
  { email: "aurorapickell@gmail.com",                  inKit: true },
  { email: "dylanmbergeron@gmail.com",                 inKit: true },
  { email: "lilybugm2011@gmail.com",                   inKit: true },
  { email: "lukeweaker27@gmail.com",                   inKit: true },
  { email: "julian.ottl2012@gmail.com",                inKit: true },
  { email: "gibboneycollin@gmail.com",                 inKit: true },
  { email: "mathiskruger@gmail.com",                   inKit: true },
  { email: "slgwhit81@gmail.com",                      inKit: true },
  { email: "itucek1@mvwsd.net",                        inKit: true },
  { email: "athomasgeo@gmail.com",                     inKit: true },
  { email: "subbulak@gmail.com",                       inKit: true },
  { email: "cjmeade4@gmail.com",                       inKit: true },
  { email: "ethamachicho@gmail.com",                   inKit: true },
  { email: "ishanthp23@gmail.com",                     inKit: true },
  { email: "hyrena98@gmail.com",                       inKit: false },
  { email: "krishnakumardhanvin@troop941.org",         inKit: false },
  { email: "coltrane.kubo@gmail.com",                  inKit: true },
];

for (const { email, inKit } of completers) {
  // Subscribe to form (creates subscriber if missing, no-ops if already subscribed)
  if (!inKit) {
    const res = await fetch(`https://api.convertkit.com/v3/forms/${FORM_ID}/subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_secret: secret, email }),
    });
    const json = await res.json();
    if (res.ok) console.log(`  SUBSCRIBED  ${email}`);
    else console.error(`  ERROR subscribing ${email}: ${res.status} ${JSON.stringify(json)}`);
  }

  // Tag all completers
  const tagRes = await fetch(`https://api.convertkit.com/v3/tags/${TAG_ID}/subscribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_secret: secret, email }),
  });
  const tagJson = await tagRes.json();
  if (tagRes.ok) console.log(`  TAGGED      ${email}`);
  else console.error(`  ERROR tagging ${email}: ${tagRes.status} ${JSON.stringify(tagJson)}`);
}

console.log("\nDone.");
