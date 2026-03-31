#!/usr/bin/env node
// Checks which quiz emails are Kit subscribers.
// Run with: node --env-file=.env scripts/check-kit-subscribers.js

const KIT_SECRET = process.env.CONVERTKIT_API_SECRET;
if (!KIT_SECRET) { console.error("Missing CONVERTKIT_API_SECRET"); process.exit(1); }

const emails = [
  "catherine.skena@dcinternationalschool.org",
  "aurorapickell@gmail.com",
  "dylanmbergeron@gmail.com",
  "lilybugm2011@gmail.com",
  "lukeweaker27@gmail.com",
  "julian.ottl2012@gmail.com",
  "gibboneycollin@gmail.com",
  "mathiskruger@gmail.com",
  "slgwhit81@gmail.com",
  "itucek1@mvwsd.net",
  "athomasgeo@gmail.com",
  "subbulak@gmail.com",
  "cjmeade4@gmail.com",
  "ethamachicho@gmail.com",
  "ishanthp23@gmail.com",
  "hyrena98@gmail.com",
  "krishnakumardhanvin@troop941.org",
  "coltrane.kubo@gmail.com",
];

for (const email of emails) {
  const res = await fetch(
    `https://api.kit.com/v4/subscribers?email_address=${encodeURIComponent(email)}`,
    { headers: { Authorization: `Bearer ${KIT_SECRET}`, "Content-Type": "application/json" } }
  );
  const json = await res.json();
  if (!res.ok) {
    console.log(`ERROR ${res.status}  ${email}  —  ${JSON.stringify(json)}`);
    continue;
  }
  const sub = json.subscribers?.[0];
  if (sub) {
    console.log(`✓  ${email.padEnd(50)} state: ${sub.state}  created: ${sub.created_at?.slice(0,10)}`);
  } else {
    console.log(`✗  ${email}`);
  }
}
