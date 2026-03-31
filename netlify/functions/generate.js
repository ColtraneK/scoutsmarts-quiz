// netlify/functions/generate.js
// Proxies OpenAI, sends Resend email, logs to Supabase, optionally adds Kit subscriber.
// Required env vars: OPENAI_API_KEY, RESEND_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY
// Optional env vars: CONVERTKIT_API_SECRET

// ── Badge guide URLs (only badges with actual guides on scoutsmarts.com) ──────
const BADGE_GUIDES = {
  "American Cultures": "https://scoutsmarts.com/american-cultures-merit-badge-guide/",
  "Archery": "https://scoutsmarts.com/archery-merit-badge-guide/",
  "Art": "https://scoutsmarts.com/art-merit-badge-guide/",
  "Backpacking": "https://scoutsmarts.com/backpacking-merit-badge-guide/",
  "Basketry": "https://scoutsmarts.com/basketry-merit-badge-guide/",
  "Camping": "https://scoutsmarts.com/camping-merit-badge-guide/",
  "Chemistry": "https://scoutsmarts.com/chemistry-merit-badge-guide/",
  "Chess": "https://scoutsmarts.com/chess-merit-badge-guide/",
  "Citizenship in the Community": "https://scoutsmarts.com/citizenship-in-the-community-merit-badge-guide/",
  "Citizenship in the Nation": "https://scoutsmarts.com/citizenship-in-the-nation-merit-badge-guide/",
  "Citizenship in Society": "https://scoutsmarts.com/citizenship-in-society-merit-badge-guide/",
  "Citizenship in the World": "https://scoutsmarts.com/citizenship-in-the-world-merit-badge-guide/",
  "Climbing": "https://scoutsmarts.com/climbing-merit-badge-guide/",
  "Communication": "https://scoutsmarts.com/communication-merit-badge-guide/",
  "Cooking": "https://scoutsmarts.com/cooking-merit-badge-guide/",
  "Crime Prevention": "https://scoutsmarts.com/crime-prevention-merit-badge-guide/",
  "Cycling": "https://scoutsmarts.com/cycling-merit-badge-guide/",
  "Digital Technology": "https://scoutsmarts.com/digital-technology-merit-badge-guide/",
  "Emergency Preparedness": "https://scoutsmarts.com/emergency-preparedness-merit-badge-guide/",
  "Environmental Science": "https://scoutsmarts.com/environmental-science-merit-badge-guide/",
  "Exploration": "https://scoutsmarts.com/exploration-merit-badge-guide/",
  "Family Life": "https://scoutsmarts.com/family-life-merit-badge-guide/",
  "Fingerprinting": "https://scoutsmarts.com/fingerprinting-merit-badge-guide/",
  "Fire Safety": "https://scoutsmarts.com/fire-safety-merit-badge-guide/",
  "First Aid": "https://scoutsmarts.com/first-aid-merit-badge-guide/",
  "Fishing": "https://scoutsmarts.com/fishing-merit-badge-guide/",
  "Geocaching": "https://scoutsmarts.com/geocaching-merit-badge-guide/",
  "Hiking": "https://scoutsmarts.com/hiking-merit-badge-guide/",
  "Indian Lore": "https://scoutsmarts.com/indian-lore-merit-badge-guide/",
  "Lifesaving": "https://scoutsmarts.com/lifesaving-merit-badge-guide/",
  "Mammal Study": "https://scoutsmarts.com/mammal-study-merit-badge-guide/",
  "Oceanography": "https://scoutsmarts.com/oceanography-merit-badge-guide/",
  "Orienteering": "https://scoutsmarts.com/orienteering-merit-badge-guide/",
  "Painting": "https://scoutsmarts.com/painting-merit-badge-guide/",
  "Personal Fitness": "https://scoutsmarts.com/personal-fitness-merit-badge-guide/",
  "Personal Management": "https://scoutsmarts.com/personal-management-merit-badge-guide-2025/",
  "Photography": "https://scoutsmarts.com/photography-merit-badge-guide/",
  "Programming": "https://scoutsmarts.com/programming-merit-badge-guide/",
  "Public Health": "https://scoutsmarts.com/public-health-merit-badge-guide/",
  "Rifle Shooting": "https://scoutsmarts.com/rifle-shooting-merit-badge-guide/",
  "Salesmanship": "https://scoutsmarts.com/salesmanship-merit-badge-guide/",
  "Scholarship": "https://scoutsmarts.com/scholarship-merit-badge-guide/",
  "Space Exploration": "https://scoutsmarts.com/space-exploration-merit-badge-guide/",
  "Sustainability": "https://scoutsmarts.com/sustainability-merit-badge-guide/",
  "Swimming": "https://scoutsmarts.com/swimming-merit-badge-guide/",
  "Weather": "https://scoutsmarts.com/weather-merit-badge-guide/",
  "Wilderness Survival": "https://scoutsmarts.com/wilderness-survival-merit-badge-guide/",
};

// ── Curated articles for the "Your Eagle Journey" section ─────────────────────
const SCOUT_ARTICLES = [
  { title: "Eagle Scout Project Roadmap", url: "https://scoutsmarts.com/eagle-scout-project-roadmap/", tags: ["eagle","project"] },
  { title: "Timeline for Becoming an Eagle Scout", url: "https://scoutsmarts.com/timeline-and-info-for-becoming-an-eagle-scout/", tags: ["eagle"] },
  { title: "Fastest Path to Eagle Scout Rank", url: "https://scoutsmarts.com/fastest-path-to-eagle-scout-rank/", tags: ["eagle","quick"] },
  { title: "What Scouts Wish They'd Known About Earning Eagle", url: "https://scoutsmarts.com/what-scouts-wish-theyd-known-about-earning-eagle/", tags: ["eagle"] },
  { title: "Eagle-Required Merit Badges Explained", url: "https://scoutsmarts.com/eagle-required-merit-badges-explained/", tags: ["eagle","merit-badge"] },
  { title: "Easiest and Hardest Eagle-Required Merit Badges", url: "https://scoutsmarts.com/easiest-and-hardest-eagle-required-merit-badges/", tags: ["eagle","merit-badge","difficulty"] },
  { title: "Eagle Merit Badge Difficulty Rankings", url: "https://scoutsmarts.com/eagle-merit-badge-difficulty-rankings/", tags: ["eagle","merit-badge","difficulty"] },
  { title: "Benefits of Earning Eagle Scout Rank", url: "https://scoutsmarts.com/benefits-of-earning-eagle-scout-rank/", tags: ["eagle","impressive"] },
  { title: "Eagle Scout College Admissions Tips", url: "https://scoutsmarts.com/eagle-scout-college-admissions-tips/", tags: ["eagle","impressive"] },
  { title: "Listing Eagle Scout on Your Resume", url: "https://scoutsmarts.com/listing-eagle-scout-on-your-resume/", tags: ["eagle","impressive","business"] },
  { title: "Eagle Scout Scholarships", url: "https://scoutsmarts.com/eagle-scout-scolarships/", tags: ["eagle","impressive","business"] },
  { title: "Eagle Scout Project Ideas", url: "https://scoutsmarts.com/eagle-scout-project-ideas/", tags: ["eagle","project","service"] },
  { title: "Merit Badges Scouts Recommend", url: "https://scoutsmarts.com/merit-badges-scouts-recommend/", tags: ["merit-badge"] },
  { title: "Interesting Merit Badges to Earn", url: "https://scoutsmarts.com/interesting-merit-badges-to-earn/", tags: ["merit-badge"] },
  { title: "The 3 Easiest Merit Badges", url: "https://scoutsmarts.com/the-3-easiest-merit-badges/", tags: ["merit-badge","easy"] },
  { title: "Most Difficult Merit Badges in Scouting", url: "https://scoutsmarts.com/most-difficult-merit-badges-in-scouting/", tags: ["merit-badge","hard","challenge"] },
  { title: "Rarest and Strangest Merit Badges", url: "https://scoutsmarts.com/rarest-strangest-merit-badges/", tags: ["merit-badge"] },
  { title: "Swimming vs Hiking vs Cycling — Full Comparison", url: "https://scoutsmarts.com/swimming-vs-hiking-vs-cycling-a-full-comparison/", tags: ["eagle","outdoor","water"] },
  { title: "Emergency Preparedness vs Lifesaving — Pros and Cons", url: "https://scoutsmarts.com/emergency-preparedness-or-lifesaving-the-pros-and-cons/", tags: ["eagle","emergency","water"] },
  { title: "Environmental Science vs Sustainability Merit Badge", url: "https://scoutsmarts.com/environmental-science-vs-sustainability-merit-badge/", tags: ["eagle","outdoor","stem"] },
  { title: "Scout Camping Packing List", url: "https://scoutsmarts.com/scout-camping-packing-list/", tags: ["outdoor","camping","gear"] },
  { title: "Scout Backpacking Trip Prep", url: "https://scoutsmarts.com/scout-backpacking-trip-prep/", tags: ["outdoor","backpacking","hiking"] },
  { title: "Winter Camping Tips from Scouts", url: "https://scoutsmarts.com/winter-camping-tips-from-scouts/", tags: ["outdoor","camping"] },
  { title: "Scouting Knots with Uses", url: "https://scoutsmarts.com/scouting-knots-with-uses/", tags: ["outdoor","skills","survival"] },
  { title: "Scout Lashings with Uses", url: "https://scoutsmarts.com/scout-lashings-with-uses/", tags: ["outdoor","skills","trades"] },
  { title: "Hiking Tips and Games for Scout Troops", url: "https://scoutsmarts.com/hiking-tips-and-games-for-scout-troops/", tags: ["outdoor","hiking"] },
  { title: "BSA Swim Test Guide", url: "https://scoutsmarts.com/bsa-swim-test-guide/", tags: ["water","swimming"] },
  { title: "Scout Summer Camp", url: "https://scoutsmarts.com/scout-summer-camp/", tags: ["outdoor","camping","merit-badge"] },
  { title: "Scout Advancement Keys", url: "https://scoutsmarts.com/scout-advancement-keys/", tags: ["eagle","rank"] },
  { title: "Order of the Arrow Explained", url: "https://scoutsmarts.com/order-of-the-arrow-explained/", tags: ["eagle","honor"] },
  { title: "Merit Badge Prerequisites", url: "https://scoutsmarts.com/merit-badge-prerequisites/", tags: ["merit-badge"] },
];

// ── Article scoring based on quiz answers ─────────────────────────────────────
function pickArticles(answers) {
  const interests = Array.isArray(answers.interests) ? answers.interests : [];
  const env = answers.environment || "";
  const saturday = answers.saturday_pick || "";
  const challenge = answers.challenge_level || "";
  const priorities = Array.isArray(answers.priorities) ? answers.priorities : [];
  const topPriority = priorities[0] || "";

  const scored = SCOUT_ARTICLES.map(a => {
    let score = 0;
    const t = a.tags;
    // Eagle journey always relevant
    if (t.includes("eagle")) score += 1;
    // Interests
    if (interests.includes("wildlife") && (t.includes("outdoor") || t.includes("merit-badge"))) score += 2;
    if (interests.includes("survival") && (t.includes("survival") || t.includes("outdoor"))) score += 3;
    if (interests.includes("tech") && t.includes("stem")) score += 3;
    if (interests.includes("water-sports") && t.includes("water")) score += 3;
    if (interests.includes("shooting") && t.includes("shooting")) score += 2;
    if (interests.includes("trades") && t.includes("trades")) score += 3;
    if (interests.includes("earth-space") && t.includes("stem")) score += 2;
    if (interests.includes("business") && (t.includes("business") || t.includes("impressive"))) score += 3;
    if (interests.includes("emergency") && t.includes("emergency")) score += 3;
    // Environment
    if (env === "wilderness" && t.includes("outdoor")) score += 2;
    if (env === "water" && t.includes("water")) score += 2;
    if (env === "workshop" && t.includes("trades")) score += 2;
    // Saturday pick
    if (saturday === "outdoors" && t.includes("outdoor")) score += 1;
    if (saturday === "maker" && t.includes("trades")) score += 1;
    // Challenge level
    if (challenge === "easy" && t.includes("easy")) score += 2;
    if (challenge === "hard" && (t.includes("hard") || t.includes("challenge"))) score += 2;
    // Top priority
    if (topPriority === "impressive" && t.includes("impressive")) score += 3;
    if (topPriority === "quick" && t.includes("easy")) score += 3;
    if (topPriority === "useful" && t.includes("skills")) score += 2;
    return { ...a, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 5);
}

// ── System prompt ──────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are Cole, the founder of ScoutSmarts (scoutsmarts.com), an Eagle Scout who earned the rank in 2014. You are THE expert on all 140 BSA merit badges.

COMPLETE MERIT BADGE DATABASE:

DIFFICULTY 1-2: Fingerprinting(1), American Cultures(2), Art(2), Collections(2), Scholarship(2)
DIFFICULTY 3: Basketry(3), Coin Collecting(3), Leatherwork(3), Painting(3), Pets(3), Photography(3), Salesmanship(3), Sculpture(3), Wood Carving(3)
DIFFICULTY 4: American Heritage(4), American Labor(4), Animation(4), Architecture(4), Dentistry(4), Farm Mechanics(4), Fishing(4), Genealogy(4), Journalism(4), Landscape Architecture(4), Mammal Study(4), Moviemaking(4), Music(4), Public Speaking(4), Pulp and Paper(4), Railroading(4), Reading(4), Safety(4), Scouting Heritage(4), Swimming[Eagle-option](4), Textile(4), Truck Transportation(4), Veterinary Medicine(4)
DIFFICULTY 5: Aviation(5), Chemistry(5), Chess(5), Citizenship in the World[Eagle](5), Crime Prevention(5), Cybersecurity(5), Digital Technology(5), Disabilities Awareness(5), Electricity(5), Emergency Preparedness[Eagle-option](5), Fire Safety(5), Geocaching(5), Golf(5), Graphic Arts(5), Insect Study(5), Kayaking(5), Law(5), Mining in Society(5), Model Design and Building(5), Pottery(5), Signs Signals and Codes(5), Skating(5), Stamp Collecting(5), Theater(5), Traffic Safety(5), Weather(5)
DIFFICULTY 6: American Business(6), Archaeology(6), Archery(6), Artificial Intelligence(6), Automotive Maintenance(6), Bird Study(6), Canoeing(6), Citizenship in the Nation[Eagle](6), Composite Materials(6), Drafting(6), Electronics(6), Engineering(6), Entrepreneurship(6), Exploration(6), Family Life[Eagle](6), First Aid[Eagle](6), Fish and Wildlife Management(6), Fly Fishing(6), Forestry(6), Geology(6), Health Care Professions(6), Home Repairs(6), Lifesaving[Eagle-option](6), Motorboating(6), Nature(6), Nuclear Science(6), Oceanography(6), Plumbing(6), Programming(6), Public Health(6), Radio(6), Reptile and Amphibian Study(6), Rifle Shooting(6), Rowing(6), Search and Rescue(6), Shotgun Shooting(6), Snow Sports(6), Soil and Water Conservation(6), Space Exploration(6), Sports(6), Surveying(6), Astronomy(6)
DIFFICULTY 7: Animal Science(7), Athletics(7), Camping[Eagle](7), Citizenship in the Community[Eagle](7), Climbing(7), Communication[Eagle](7), Cooking[Eagle](7), Environmental Science[Eagle-option](7), Energy(7), Game Design(7), Inventing(7), Metalwork(7), Multisport(7), Orienteering(7), Pioneering(7), Plant Science(7), Robotics(7), Water Sports(7), Welding(7), Wilderness Survival(7), Woodwork(7)
DIFFICULTY 8: Dog Care(8), Gardening(8), Personal Fitness[Eagle](8), Small-Boat Sailing(8), Sustainability[Eagle-option](8)
DIFFICULTY 9: Bugling(9), Hiking[Eagle-option](9), Personal Management[Eagle](9)
DIFFICULTY 10: Backpacking(10), Cycling[Eagle-option](10), Whitewater(10)

EAGLE-REQUIRED BADGES (all must be flagged eagle_required: true):
Required: First Aid, Citizenship in the Community, Citizenship in the Nation, Citizenship in the World, Communication, Cooking, Personal Fitness, Personal Management, Camping, Family Life
Eagle-option (choose one from each pair): Emergency Preparedness OR Lifesaving, Environmental Science OR Sustainability, Swimming OR Hiking OR Cycling

ALL of the above (both required AND option badges) should have eagle_required: true.

BADGE CATEGORIES (use these as the "category" field):
- Outdoor/Nature, Water, STEM/Tech, Trades/Hands-on, Creative/Arts, Sports/Fitness, Civic/Service, Life Skills

MATCHING RULES:
- Use their "priorities" ranking heavily
- Match environment preference to badge setting
- Match hands-on vs thinker to badge learning style
- Match interests directly to badge categories
- Mix difficulty levels based on their stated challenge preference
- Consider age: younger scouts (10-12) get more accessible badges
- Factor in time commitment
- Include at least 2 Eagle-required badges in the 10
- NEVER recommend the same category more than 3 times out of 10

Respond ONLY with a JSON object (no markdown, no backticks, no preamble):

{
  "scout_type": "Fun 2-4 word label like 'The Wilderness Navigator'",
  "personality_description": "4-5 sentences. Reference SPECIFIC quiz answers. Warm, encouraging. No em dashes or en dashes.",
  "badges": [
    {
      "name": "Exact Merit Badge Name",
      "match_percent": 95,
      "category": "One of: Outdoor/Nature, Water, STEM/Tech, Trades/Hands-on, Creative/Arts, Sports/Fitness, Civic/Service, Life Skills",
      "difficulty": 7,
      "eagle_required": true,
      "why": "3-4 sentences. Reference 2+ specific quiz answers. No em dashes or en dashes.",
      "pro_tip": "One genuinely useful insider tip. Specific. No em dashes or en dashes.",
      "time_estimate": "1-2 weekends" or "A few weekends" or "2-4 weeks" or "1-3 months" or "3+ months"
    }
  ],
  "eagle_tip": "1-2 sentences of personalized Eagle advice. No em dashes or en dashes."
}

Recommend exactly 10 badges sorted by match_percent (75-98). Be opinionated and specific.`;

// ── Constants ──────────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = new Set([
  "https://merit-badge-quiz.scoutsmarts.com",
  "http://localhost:5173",
  "http://localhost:8888",
]);

const VALID_AGES        = new Set(["10-12", "13-15", "16-17", "18+"]);
const VALID_ENVS        = new Set(["wilderness", "water", "workshop", "urban", "anywhere"]);
const VALID_CHALLENGES  = new Set(["easy", "medium", "hard"]);

function validateAnswers(a) {
  if (!a || typeof a !== "object")           return false;
  if (!VALID_AGES.has(a.age))                return false;
  if (!VALID_ENVS.has(a.environment))        return false;
  if (!VALID_CHALLENGES.has(a.challenge_level)) return false;
  if (!Array.isArray(a.interests) || a.interests.length === 0) return false;
  if (!Array.isArray(a.priorities) || a.priorities.length === 0) return false;
  return true;
}

// ── Main handler ───────────────────────────────────────────────────────────────
export default async (req) => {
  const origin = req.headers.get("origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.has(origin) ? origin : null;

  // CORS preflight
  if (req.method === "OPTIONS") {
    if (!allowedOrigin) return new Response(null, { status: 403 });
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": allowedOrigin,
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { "Content-Type": "application/json" },
    });
  }

  if (!allowedOrigin) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403, headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const { answers, email } = await req.json();

    if (!validateAnswers(answers)) {
      return new Response(JSON.stringify({ error: "Invalid request body" }), {
        status: 400, headers: { "Content-Type": "application/json" },
      });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error("OPENAI_API_KEY not set");
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500, headers: { "Content-Type": "application/json" },
      });
    }

    // ── Call OpenAI ──────────────────────────────────────────────────────────
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-4.1",
        max_tokens: 4096,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: JSON.stringify(answers) },
        ],
      }),
    });

    const data = await resp.json();
    if (!resp.ok) {
      console.error("OpenAI error:", data);
      return new Response(JSON.stringify({ error: data.error?.message || "OpenAI error" }), {
        status: resp.status, headers: { "Content-Type": "application/json" },
      });
    }

    const text = data.choices?.[0]?.message?.content || "";
    const normalized = { content: [{ type: "text", text }] };

    // ── Parse results ────────────────────────────────────────────────────────
    let results = null;
    try {
      results = JSON.parse(text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim());
    } catch (e) {
      console.error("JSON parse error:", e);
    }

    // ── Side effects: Kit, Resend, Supabase — all in parallel ───────────────
    await Promise.allSettled([

      // Kit subscriber (v3 API)
      (async () => {
        if (!email || !results || !process.env.CONVERTKIT_API_SECRET) return;
        const secret = process.env.CONVERTKIT_API_SECRET;
        const topBadges = results.badges?.slice(0, 3).map(b => b.name).join(", ") || "";

        // Subscribe to quiz form (triggers confirmation email) for non-active subscribers only
        const checkRes = await fetch(
          `https://api.convertkit.com/v3/subscribers?api_secret=${secret}&email_address=${encodeURIComponent(email)}`
        );
        const checkJson = checkRes.ok ? await checkRes.json() : {};
        const alreadyActive = checkJson.subscribers?.[0]?.state === "active";

        if (!alreadyActive) {
          const formRes = await fetch("https://api.convertkit.com/v3/forms/9269203/subscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              api_secret: secret,
              email,
              fields: {
                scout_type: results.scout_type || "",
                age_range: answers.age || "",
                interests: Array.isArray(answers.interests) ? answers.interests.join(", ") : "",
                top_badges: topBadges,
                challenge_level: answers.challenge_level || "",
                environment: answers.environment || "",
              },
            }),
          });
          if (!formRes.ok) console.error("Kit form subscribe failed:", formRes.status, await formRes.text());
        }

        // Always tag as quiz completer
        const completerRes = await fetch("https://api.convertkit.com/v3/tags/18445554/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ api_secret: secret, email }),
        });
        if (!completerRes.ok) console.error("Kit completer tag failed:", completerRes.status, await completerRes.text());
      })(),

      // Resend results email
      (async () => {
        if (!email || !results || !process.env.RESEND_API_KEY) return;

        const articles = pickArticles(answers);

        const badgeRows = (results.badges || []).map((b, i) => {
          const guideUrl = BADGE_GUIDES[b.name];
          const nameHtml = guideUrl
            ? `<a href="${guideUrl}" style="color:#2c3e1f;text-decoration:none;font-weight:700;font-size:15px;">${b.name} &rarr;</a>`
            : `<span style="font-weight:700;color:#2c3e1f;font-size:15px;">${b.name}</span>`;
          return `
          <tr>
            <td style="padding:14px 20px;border-bottom:1px solid #f0ede4;">
              <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:4px;">
                <span style="font-weight:800;color:#2d7d46;font-size:14px;min-width:20px;">${i + 1}.</span>
                <div style="flex:1;">
                  ${nameHtml}${b.eagle_required ? ' <span style="background:#2d7d46;color:#fff;font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px;vertical-align:middle;">EAGLE</span>' : ""}
                  <div style="font-size:12px;color:#7a8b6e;margin-top:3px;">${b.category} &bull; Difficulty ${b.difficulty}/10 &bull; ${b.time_estimate} &bull; ${b.match_percent}% match</div>
                  <div style="font-size:13px;color:#555;margin-top:5px;line-height:1.5;">${b.why}</div>
                  <div style="font-size:12px;color:#2d7d46;margin-top:4px;font-style:italic;">Pro tip: ${b.pro_tip}</div>
                </div>
              </div>
            </td>
          </tr>`;
        }).join("");

        const articleRows = articles.map(a => `
          <tr>
            <td style="padding:8px 20px;">
              <a href="${a.url}" style="color:#2d7d46;font-size:14px;font-weight:600;text-decoration:none;">&#8594; ${a.title}</a>
            </td>
          </tr>`).join("");

        const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f5f3eb;font-family:'Helvetica Neue',Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:32px 16px;">
  <div style="text-align:center;margin-bottom:24px;">
    <a href="https://scoutsmarts.com"><img src="https://scoutsmarts.com/wp-content/uploads/2019/11/PNG-Transparent-300x224.png" alt="ScoutSmarts" style="height:48px;" /></a>
  </div>
  <div style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.07);">

    <div style="background:linear-gradient(135deg,#2d7d46,#3a9b5c);padding:28px 24px;text-align:center;">
      <div style="font-size:12px;color:rgba(255,255,255,0.75);font-weight:700;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:6px;">Your Scout Type</div>
      <div style="font-size:26px;font-weight:900;color:#fff;">${results.scout_type || "The Scout"}</div>
    </div>

    <div style="padding:20px 24px;background:#fffdf7;border-bottom:1px solid #f0ede4;">
      <p style="margin:0;font-size:14px;color:#444;line-height:1.7;">${results.personality_description || ""}</p>
    </div>

    <div style="padding:14px 20px 6px;">
      <div style="font-size:11px;font-weight:800;color:#7a8b6e;letter-spacing:1px;text-transform:uppercase;">Your Top 10 Merit Badge Matches</div>
    </div>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">${badgeRows}</table>

    ${results.eagle_tip ? `
    <div style="margin:16px 20px;padding:14px 16px;background:#fffbee;border-radius:10px;border-left:3px solid #f5b731;">
      <div style="font-size:11px;font-weight:800;color:#d4a020;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px;">Eagle Tip</div>
      <div style="font-size:13px;color:#444;line-height:1.6;">${results.eagle_tip}</div>
    </div>` : ""}

    <div style="padding:16px 20px 6px;border-top:1px solid #f0ede4;margin-top:8px;">
      <div style="font-size:11px;font-weight:800;color:#7a8b6e;letter-spacing:1px;text-transform:uppercase;margin-bottom:2px;">Your Eagle Journey — Recommended Reading</div>
    </div>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;padding-bottom:8px;">${articleRows}</table>

    <div style="padding:20px 24px;text-align:center;border-top:1px solid #f0ede4;margin-top:8px;">
      <a href="https://scoutsmarts.com" style="display:inline-block;padding:12px 28px;background:#2d7d46;color:#fff;text-decoration:none;border-radius:8px;font-weight:700;font-size:14px;">Explore All ScoutSmarts Guides</a>
    </div>
  </div>
  <p style="text-align:center;font-size:11px;color:#aaa;margin-top:20px;">ScoutSmarts &bull; Built by an Eagle Scout &bull; <a href="https://scoutsmarts.com" style="color:#aaa;">scoutsmarts.com</a></p>
</div>
</body></html>`;

        const sendRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.RESEND_API_KEY}` },
          body: JSON.stringify({
            from: "Cole at ScoutSmarts <cole@scoutsmarts.com>",
            to: [email],
            subject: `You're ${results.scout_type || "a Scout"} — Your Top 10 Merit Badge Matches`,
            html,
          }),
        });
        if (!sendRes.ok) {
          const body = await sendRes.text();
          console.error("Resend failed:", sendRes.status, body);
        }
      })(),

      // Supabase logging
      (async () => {
        if (!results) return;
        if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
          console.error("Supabase env vars not set — skipping log");
          return;
        }
        const sbRes = await fetch(`${process.env.SUPABASE_URL}/rest/v1/quiz_completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": process.env.SUPABASE_SERVICE_KEY,
            "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
            "Prefer": "return=minimal",
          },
          body: JSON.stringify({
            email: email || null,
            scout_type: results.scout_type || null,
            personality_description: results.personality_description || null,
            badges: results.badges || [],
            eagle_tip: results.eagle_tip || null,
            answers,
            age_range: answers.age || null,
          }),
        });
        if (!sbRes.ok) {
          const body = await sbRes.text();
          console.error("Supabase insert failed:", sbRes.status, body);
        }
      })(),

    ]);

    return new Response(JSON.stringify(normalized), {
      status: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": allowedOrigin },
    });

  } catch (err) {
    console.error("Function error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
};

export const config = { method: "POST" };
