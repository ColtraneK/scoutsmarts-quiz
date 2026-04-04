// netlify/functions/generate.js
// Proxies the OpenAI API call so the API key stays secret.
// Set OPENAI_API_KEY in Netlify Environment Variables.

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const ALLOWED_ORIGIN = "https://merit-badge-quiz.scoutsmarts.com";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const SYSTEM_PROMPT = `You are Cole, the founder of ScoutSmarts (scoutsmarts.com), an Eagle Scout who earned the rank in 2014. You are THE expert on all 140 BSA merit badges.

COMPLETE MERIT BADGE DATABASE:

DIFFICULTY 1-2: Fingerprinting(1), American Cultures(2), Art(2), Collections(2), Scholarship(2)
DIFFICULTY 3: Basketry(3), Coin Collecting(3), Leatherwork(3), Painting(3), Pets(3), Photography(3), Salesmanship(3), Sculpture(3), Wood Carving(3)
DIFFICULTY 4: American Heritage(4), American Labor(4), Animation(4), Architecture(4), Dentistry(4), Farm Mechanics(4), Fishing(4), Genealogy(4), Journalism(4), Landscape Architecture(4), Mammal Study(4), Moviemaking(4), Music(4), Public Speaking(4), Pulp and Paper(4), Railroading(4), Reading(4), Safety(4), Scouting Heritage(4), Swimming[Eagle-option](4), Textile(4), Truck Transportation(4), Veterinary Medicine(4)
DIFFICULTY 5: Aviation(5), Chemistry(5), Chess(5), Citizenship in the World[Eagle](5), Crime Prevention(5), Cybersecurity(5), Digital Technology(5), Disabilities Awareness(5), Electricity(5), Emergency Preparedness[Eagle-option](5), Fire Safety(5), Geocaching(5), Golf(5), Graphic Arts(5), Insect Study(5), Kayaking(5), Law(5), Mining in Society(5), Model Design and Building(5), Pottery(5), Signs Signals and Codes(5), Skating(5), Stamp Collecting(5), Theater(5), Traffic Safety(5), Weather(5)
DIFFICULTY 6: American Business(6), Archaeology(6), Archery(6), Artificial Intelligence(6), Automotive Maintenance(6), Bird Study(6), Canoeing(6), Citizenship in the Nation[Eagle](6), Composite Materials(6), Drafting(6), Electronics(6), Engineering(6), Entrepreneurship(6), Exploration(6), Family Life[Eagle](6), First Aid[Eagle](6), Fish and Wildlife Management(6), Fly Fishing(6), Forestry(6), Geology(6), Home Repairs(6), Lifesaving[Eagle-option](6), Motorboating(6), Nature(6), Nuclear Science(6), Oceanography(6), Plumbing(6), Programming(6), Public Health(6), Radio(6), Reptile and Amphibian Study(6), Rifle Shooting(6), Rowing(6), Search and Rescue(6), Shotgun Shooting(6), Snow Sports(6), Soil and Water Conservation(6), Space Exploration(6), Sports(6), Surveying(6), Astronomy(6)
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

Recommend exactly 10 badges sorted by match_percent descending. Each badge MUST have a unique match_percent. Use specific non-round numbers (e.g., 94, 87, 81, 76 — NEVER generic multiples of 5 like 95, 90, 85, 80). Spread them realistically across the 75-97 range based on how strongly each badge actually matches the scout's answers. Be opinionated and specific.`;

export default async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": ALLOWED_ORIGIN },
    });
  }

  try {
    const body = await req.json();
    const { answers, email } = body;

    if (!answers || typeof answers !== "object" || JSON.stringify(answers).length > 5000) {
      return new Response(JSON.stringify({ error: "Invalid request body" }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": ALLOWED_ORIGIN },
      });
    }

    if (email && (typeof email !== "string" || email.length > 254 || !EMAIL_RE.test(email))) {
      return new Response(JSON.stringify({ error: "Invalid email address" }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": ALLOWED_ORIGIN },
      });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error("OPENAI_API_KEY not set");
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": ALLOWED_ORIGIN },
      });
    }

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
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
      return new Response(JSON.stringify({ error: "Something went wrong generating your results. Please try again." }), {
        status: 502,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": ALLOWED_ORIGIN },
      });
    }

    const text = data.choices?.[0]?.message?.content || "";

    // If email provided, send Kit subscriber + Resend results email
    if (email) {
      let parsed;
      try { parsed = JSON.parse(text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim()); } catch {}

      const sideEffects = [];

      // Add subscriber to Kit (ConvertKit) via v4 API with custom fields for segmentation
      const kitSecret = process.env.CONVERTKIT_API_SECRET;
      if (kitSecret) {
        const topBadges = parsed?.badges?.slice(0, 3).map(b => b.name).join(", ") || "";
        const interests = Array.isArray(answers.interests) ? answers.interests.join(", ") : "";
        sideEffects.push(
          fetch("https://api.kit.com/v4/subscribers", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${kitSecret}`,
            },
            body: JSON.stringify({
              email_address: email,
              first_name: "",
              fields: {
                scout_type: parsed?.scout_type || "",
                age_range: answers.age || "",
                interests: interests,
                top_badges: topBadges,
                challenge_level: answers.challenge_level || "",
                environment: answers.environment || "",
              },
            }),
          }).catch(err => console.error("Kit error:", err))
        );
      }

      // Send results email via Resend
      const resendKey = process.env.RESEND_API_KEY;
      if (resendKey && parsed?.badges) {
        const badgeRows = parsed.badges.map((b, i) => `
          <tr>
            <td style="padding:12px 16px;border-bottom:1px solid #e8e5dc;">
              <strong style="color:#2c3e1f;font-size:15px;">${i + 1}. ${escapeHtml(b.name)}</strong>
              ${b.eagle_required ? '<span style="background:#2d7d46;color:#fff;font-size:10px;padding:2px 6px;border-radius:4px;margin-left:6px;">EAGLE</span>' : ""}
              <br><span style="color:#7a8b6e;font-size:13px;">${parseInt(b.match_percent) || 0}% match &middot; ${escapeHtml(b.category)} &middot; ${escapeHtml(b.time_estimate)}</span>
              <br><span style="color:#555;font-size:13px;">${escapeHtml(b.why)}</span>
              <br><span style="color:#2d7d46;font-size:12px;font-style:italic;">Pro tip: ${escapeHtml(b.pro_tip)}</span>
            </td>
          </tr>`).join("");

        const html = `
          <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f5f3eb;padding:32px 24px;">
            <div style="text-align:center;margin-bottom:24px;">
              <h1 style="color:#2c3e1f;font-size:22px;margin:0;">Your Merit Badge Results</h1>
              <p style="color:#2d7d46;font-size:18px;margin:8px 0 4px;">${escapeHtml(parsed.scout_type)}</p>
              <p style="color:#7a8b6e;font-size:14px;margin:0;">${escapeHtml(parsed.personality_description)}</p>
            </div>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:10px;overflow:hidden;">
              ${badgeRows}
            </table>
            ${parsed.eagle_tip ? `<div style="background:#2d7d46;color:#fff;padding:16px;border-radius:8px;margin-top:16px;font-size:13px;"><strong>Eagle Tip:</strong> ${escapeHtml(parsed.eagle_tip)}</div>` : ""}
            <p style="text-align:center;color:#b0b0a0;font-size:11px;margin-top:24px;">Sent by <a href="https://scoutsmarts.com" style="color:#2d7d46;">ScoutSmarts</a></p>
          </div>`;

        sideEffects.push(
          fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${resendKey}`,
            },
            body: JSON.stringify({
              from: "Cole from ScoutSmarts <cole@scoutsmarts.com>",
              to: email,
              subject: `You're ${parsed.scout_type || "a Scout"} — Your Top 10 Merit Badges`,
              html,
            }),
          }).catch(err => console.error("Resend error:", err))
        );
      }

      // Await side effects so Netlify doesn't kill them on function exit
      await Promise.allSettled(sideEffects);
    }

    const normalized = { content: [{ type: "text", text }] };

    return new Response(JSON.stringify(normalized), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
      },
    });
  } catch (err) {
    console.error("Function error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": ALLOWED_ORIGIN },
    });
  }
};

export const config = {
  method: "POST",
};
