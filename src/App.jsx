import { useState, useEffect, useRef, useCallback } from "react";

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

Recommend exactly 10 badges sorted by match_percent (75-98). Be opinionated and specific.`;

const QUESTIONS = [
  { id: "age", type: "age_range", question: "How old are you?",
    subtitle: "This helps us find badges that match your experience level.",
    options: [
      { label: "10-12", value: "10-12" }, { label: "13-14", value: "13-14" },
      { label: "15-16", value: "15-16" }, { label: "17-18", value: "17-18" },
      { label: "Parent / Leader", value: "parent" },
    ],
  },
  { id: "saturday_pick", type: "image_pick",
    question: "It's Saturday morning with nothing planned. What sounds best?",
    options: [
      { label: "Hit the trail", value: "outdoors", icon: "mountain" },
      { label: "Build something", value: "maker", icon: "hammer" },
      { label: "Learn something new", value: "learner", icon: "book" },
      { label: "Get competitive", value: "competitive", icon: "trophy" },
    ],
  },
  { id: "environment", type: "single",
    question: "Where do you feel most in your element?",
    options: [
      { label: "Deep in the woods or up on a mountain", value: "wilderness" },
      { label: "On or near the water", value: "water" },
      { label: "In a workshop, lab, or garage", value: "workshop" },
      { label: "In front of a screen or with a good book", value: "indoor-brain" },
      { label: "Honestly, I like a mix of everything", value: "mixed" },
    ],
  },
  { id: "hands_vs_brain", type: "slider",
    question: "Are you more of a hands-on builder or a sit-down thinker?",
    subtitle: "Slide to show your balance.",
    min: 1, max: 5, defaultValue: 3, leftLabel: "Hands-on doer", rightLabel: "Research thinker",
  },
  { id: "interests", type: "multi_select",
    question: "Which of these grab your attention? Pick all that apply.",
    options: [
      { label: "Wildlife and ecosystems", value: "wildlife" },
      { label: "Survival skills", value: "survival" },
      { label: "Coding, AI, or robots", value: "tech" },
      { label: "Art, film, or music", value: "creative" },
      { label: "Cooking or food", value: "cooking" },
      { label: "First aid or emergency response", value: "emergency" },
      { label: "Shooting sports", value: "shooting" },
      { label: "Woodworking or metalwork", value: "trades" },
      { label: "Space, weather, or geology", value: "earth-space" },
      { label: "Business or leadership", value: "business" },
      { label: "History or world cultures", value: "history" },
      { label: "Water sports or boating", value: "water-sports" },
    ],
  },
  { id: "scenario", type: "single",
    question: "Your troop is planning a service project. You volunteer to...",
    options: [
      { label: "Lead the planning and organize the team", value: "leader" },
      { label: "Handle the hands-on building and setup", value: "builder" },
      { label: "Research what the community actually needs", value: "researcher" },
      { label: "Keep everyone motivated and having fun", value: "morale" },
      { label: "Document it with photos or video", value: "creative-doc" },
    ],
  },
  { id: "challenge_level", type: "difficulty_pick",
    question: "What kind of challenge are you looking for?",
    subtitle: "Be honest. There is no wrong answer here!",
    options: [
      { label: "Quick wins I can knock out fast", value: "easy", detail: "Difficulty 1-4" },
      { label: "A solid challenge but nothing crazy", value: "moderate", detail: "Difficulty 4-7" },
      { label: "Push me. I want something hard.", value: "hard", detail: "Difficulty 7-10" },
      { label: "Mix it up with easy and hard", value: "mixed", detail: "All levels" },
    ],
  },
  { id: "time_available", type: "single",
    question: "How much time can you give to your next badge?",
    options: [
      { label: "A weekend or a single day", value: "weekend" },
      { label: "A couple of weeks", value: "few-weeks" },
      { label: "A month or two", value: "month-plus" },
      { label: "However long it takes, I am patient", value: "no-rush" },
    ],
  },
  { id: "priorities", type: "ranking",
    question: "What matters most to you in a merit badge?",
    subtitle: "Drag to reorder, or tap the arrows. Top = most important.",
    options: [
      { label: "Fun and enjoyment", value: "fun" },
      { label: "Useful life skills", value: "useful" },
      { label: "Impressive on applications", value: "impressive" },
      { label: "Quick to finish", value: "quick" },
    ],
  },
  { id: "superpower", type: "single",
    question: "Last one! Pick your secret superpower:",
    options: [
      { label: "I notice details others miss", value: "observant" },
      { label: "I can talk to anyone about anything", value: "communicator" },
      { label: "I figure things out by taking them apart", value: "tinkerer" },
      { label: "I am the first to volunteer", value: "go-getter" },
    ],
  },
];

const TOPO_BG = `data:image/svg+xml,${encodeURIComponent(`<svg width="600" height="600" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="t" patternUnits="userSpaceOnUse" width="200" height="200"><path d="M0 80Q50 60 100 80T200 80" fill="none" stroke="rgba(45,125,70,0.04)" stroke-width="1.2"/><path d="M0 40Q50 20 100 40T200 40" fill="none" stroke="rgba(45,125,70,0.03)" stroke-width="1"/><path d="M0 120Q50 100 100 120T200 120" fill="none" stroke="rgba(45,125,70,0.035)" stroke-width="1"/><path d="M0 160Q50 140 100 160T200 160" fill="none" stroke="rgba(45,125,70,0.025)" stroke-width="1"/><circle cx="150" cy="90" r="30" fill="none" stroke="rgba(45,125,70,0.03)" stroke-width="0.8"/><circle cx="50" cy="150" r="20" fill="none" stroke="rgba(45,125,70,0.025)" stroke-width="0.8"/></pattern></defs><rect width="600" height="600" fill="url(#t)"/></svg>`)}`;

const CATEGORY_COLORS = {
  "Outdoor/Nature": { bg: "rgba(45,125,70,0.08)", color: "#2d7d46" },
  "Water": { bg: "rgba(30,120,180,0.08)", color: "#1e78b4" },
  "STEM/Tech": { bg: "rgba(120,70,180,0.08)", color: "#7846b4" },
  "Trades/Hands-on": { bg: "rgba(160,90,30,0.08)", color: "#a05a1e" },
  "Creative/Arts": { bg: "rgba(200,60,120,0.08)", color: "#c83c78" },
  "Sports/Fitness": { bg: "rgba(220,120,20,0.08)", color: "#dc7814" },
  "Civic/Service": { bg: "rgba(50,100,160,0.08)", color: "#3264a0" },
  "Life Skills": { bg: "rgba(100,130,70,0.08)", color: "#648246" },
};

function getCatColor(cat) {
  return CATEGORY_COLORS[cat] || { bg: "rgba(45,125,70,0.08)", color: "#2d7d46" };
}

// ============ ICONS ============
function MountainIcon() {
  return (<svg viewBox="0 0 56 56" fill="none" style={{ width: 44, height: 44 }}>
    <path d="M8 44l16-30 8 15 4-7 12 22H8z" fill="#2d7d46" opacity="0.85"/>
    <path d="M20 44l10-19 6 11 4-7 8 15H20z" fill="#3a9b5c"/>
    <path d="M24 14l4-6 3 5-2 3-5-2z" fill="#f0f0f0"/>
    <circle cx="42" cy="12" r="5" fill="#f5b731" opacity="0.9"/>
  </svg>);
}
function HammerIcon() {
  return (<svg viewBox="0 0 56 56" fill="none" style={{ width: 44, height: 44 }}>
    <rect x="24" y="22" width="6" height="26" rx="2" fill="#8B6914" transform="rotate(-30 27 35)"/>
    <rect x="18" y="8" width="18" height="12" rx="3" fill="#555" transform="rotate(-30 27 14)"/>
  </svg>);
}
function BookIcon() {
  return (<svg viewBox="0 0 56 56" fill="none" style={{ width: 44, height: 44 }}>
    <path d="M10 12c0-2 1-3 3-3h12v34H13c-2 0-3-1-3-3V12z" fill="#2d7d46" opacity="0.8"/>
    <path d="M25 9h12c2 0 3 1 3 3v28c0 2-1 3-3 3H25V9z" fill="#2d7d46"/>
    <path d="M25 9v34" stroke="#1a5c30" strokeWidth="1.5"/><path d="M29 18h7M29 23h5M29 28h6" stroke="#fff" strokeWidth="1.5" opacity="0.7"/>
  </svg>);
}
function TrophyIcon() {
  return (<svg viewBox="0 0 56 56" fill="none" style={{ width: 44, height: 44 }}>
    <path d="M18 10h20v16c0 6-4 10-10 10s-10-4-10-10V10z" fill="#f5b731"/>
    <path d="M18 14h-6c0 0 0 10 6 12" fill="#f5b731" opacity="0.6"/>
    <path d="M38 14h6c0 0 0 10-6 12" fill="#f5b731" opacity="0.6"/>
    <rect x="24" y="36" width="8" height="6" fill="#d4a020"/><rect x="20" y="42" width="16" height="4" rx="2" fill="#d4a020"/>
  </svg>);
}
const ICON_MAP = { mountain: MountainIcon, hammer: HammerIcon, book: BookIcon, trophy: TrophyIcon };

// ============ RANKING ============
function RankingQ({ options: initOpts, value, onChange }) {
  const items = value && value.length === initOpts.length ? value : initOpts.map(o => o.value);
  const labels = {}; initOpts.forEach(o => { labels[o.value] = o.label; });
  const [dragIdx, setDragIdx] = useState(null);
  const [overIdx, setOverIdx] = useState(null);
  const move = (from, to) => { const n = [...items]; const [it] = n.splice(from, 1); n.splice(to, 0, it); onChange(n); };
  const rc = ["#2d7d46", "#4a9e3a", "#7a8b6e", "#aaa"];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {items.map((val, i) => (
        <div key={val} draggable
          onDragStart={e => { setDragIdx(i); e.dataTransfer.effectAllowed = "move"; }}
          onDragOver={e => { e.preventDefault(); setOverIdx(i); }}
          onDragLeave={() => setOverIdx(null)}
          onDrop={() => { if (dragIdx !== null && dragIdx !== i) move(dragIdx, i); setDragIdx(null); setOverIdx(null); }}
          onDragEnd={() => { setDragIdx(null); setOverIdx(null); }}
          style={{
            display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 10,
            background: dragIdx === i ? "rgba(45,125,70,0.08)" : overIdx === i ? "rgba(245,183,49,0.08)" : "#fff",
            border: overIdx === i ? "1.5px dashed #f5b731" : "1.5px solid #e0ddd4",
            cursor: "grab", userSelect: "none",
            transform: dragIdx === i ? "scale(1.02)" : "scale(1)",
            boxShadow: dragIdx === i ? "0 4px 20px rgba(0,0,0,0.08)" : "none",
            transition: "transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease",
            opacity: dragIdx === i ? 0.85 : 1,
          }}>
          <div style={{ width: 26, height: 26, borderRadius: 7, flexShrink: 0, background: rc[i], color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "'Nunito Sans', sans-serif", fontSize: 12, fontWeight: 800 }}>{i + 1}</div>
          <span style={{ fontFamily: "'Nunito Sans', sans-serif", fontSize: 14, color: "#2c3e1f", fontWeight: 600, flex: 1 }}>{labels[val]}</span>
          <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
            <button onClick={e => { e.stopPropagation(); if (i > 0) move(i, i-1); }} disabled={i === 0}
              style={{ background: "none", border: "1px solid #e0ddd4", borderRadius: 6,
                cursor: i === 0 ? "default" : "pointer", padding: "3px 7px",
                fontSize: 11, color: i === 0 ? "#ddd" : "#7a8b6e", lineHeight: 1 }}>&#9650;</button>
            <button onClick={e => { e.stopPropagation(); if (i < items.length-1) move(i, i+1); }} disabled={i === items.length-1}
              style={{ background: "none", border: "1px solid #e0ddd4", borderRadius: 6,
                cursor: i === items.length-1 ? "default" : "pointer", padding: "3px 7px",
                fontSize: 11, color: i === items.length-1 ? "#ddd" : "#7a8b6e", lineHeight: 1 }}>&#9660;</button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============ SHARED COMPONENTS ============
function ProgressBar({ current, total }) {
  const pct = (current / total) * 100;
  return (<div style={{ width: "100%", marginBottom: 28 }}>
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6,
      fontFamily: "'Nunito Sans', sans-serif", fontSize: 12, color: "#7a8b6e", fontWeight: 600 }}>
      <span>{current + 1} of {total}</span><span>{Math.round(pct)}%</span></div>
    <div style={{ width: "100%", height: 5, background: "#ddd9ce", borderRadius: 3, overflow: "hidden" }}>
      <div style={{ width: `${pct}%`, height: "100%", background: "linear-gradient(90deg, #2d7d46, #3a9b5c)",
        borderRadius: 3, transition: "width 0.4s cubic-bezier(0.22, 1, 0.36, 1)" }} /></div>
  </div>);
}
function AgeRangeQ({ options, value, onChange }) {
  return (<div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
    {options.map(o => <button key={o.value} onClick={() => onChange(o.value)} style={{
      padding: "15px 20px", borderRadius: 10, textAlign: "left",
      border: value === o.value ? "2px solid #2d7d46" : "1.5px solid #d6d3c8",
      background: value === o.value ? "rgba(45,125,70,0.07)" : "#fff",
      cursor: "pointer", fontFamily: "'Nunito Sans', sans-serif", fontSize: 16,
      color: "#2c3e1f", fontWeight: value === o.value ? 700 : 500, transition: "all 0.2s ease",
    }}>{o.label}</button>)}</div>);
}
function ImagePickQ({ options, value, onChange }) {
  return (<div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
    {options.map(o => { const Icon = ICON_MAP[o.icon]; return (<button key={o.value} onClick={() => onChange(o.value)} style={{
      padding: "18px 10px", borderRadius: 14, border: value === o.value ? "2px solid #2d7d46" : "1.5px solid #d6d3c8",
      background: value === o.value ? "rgba(45,125,70,0.07)" : "#fff", cursor: "pointer",
      display: "flex", flexDirection: "column", alignItems: "center", gap: 8, transition: "all 0.2s ease",
    }}><Icon /><span style={{ fontFamily: "'Nunito Sans', sans-serif", fontSize: 13, fontWeight: 600,
      color: "#2c3e1f", textAlign: "center" }}>{o.label}</span></button>); })}</div>);
}
function SingleQ({ options, value, onChange }) {
  return (<div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
    {options.map(o => <button key={o.value} onClick={() => onChange(o.value)} style={{
      padding: "14px 18px", borderRadius: 10, textAlign: "left",
      border: value === o.value ? "2px solid #2d7d46" : "1.5px solid #d6d3c8",
      background: value === o.value ? "rgba(45,125,70,0.07)" : "#fff", cursor: "pointer",
      fontFamily: "'Nunito Sans', sans-serif", fontSize: 14, color: "#2c3e1f",
      fontWeight: value === o.value ? 600 : 400, transition: "all 0.2s ease", lineHeight: 1.4,
    }}>{o.label}</button>)}</div>);
}
function DifficultyPickQ({ options, value, onChange }) {
  return (<div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
    {options.map(o => <button key={o.value} onClick={() => onChange(o.value)} style={{
      padding: "14px 18px", borderRadius: 10, textAlign: "left",
      border: value === o.value ? "2px solid #2d7d46" : "1.5px solid #d6d3c8",
      background: value === o.value ? "rgba(45,125,70,0.07)" : "#fff", cursor: "pointer", transition: "all 0.2s ease",
      display: "flex", justifyContent: "space-between", alignItems: "center",
    }}><span style={{ fontFamily: "'Nunito Sans', sans-serif", fontSize: 14, color: "#2c3e1f",
      fontWeight: value === o.value ? 600 : 400 }}>{o.label}</span>
      <span style={{ fontFamily: "'Nunito Sans', sans-serif", fontSize: 11, color: "#7a8b6e", fontWeight: 600 }}>{o.detail}</span>
    </button>)}</div>);
}
function MultiSelectQ({ options, value, onChange }) {
  const sel = value || [];
  const toggle = v => onChange(sel.includes(v) ? sel.filter(x => x !== v) : [...sel, v]);
  return (<div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 9 }}>
    {options.map(o => { const on = sel.includes(o.value); return (<button key={o.value} onClick={() => toggle(o.value)} style={{
      padding: "12px 14px", borderRadius: 10, textAlign: "left",
      border: on ? "2px solid #2d7d46" : "1.5px solid #d6d3c8",
      background: on ? "rgba(45,125,70,0.07)" : "#fff", cursor: "pointer",
      fontFamily: "'Nunito Sans', sans-serif", fontSize: 13, color: "#2c3e1f",
      fontWeight: on ? 600 : 400, transition: "all 0.2s ease", lineHeight: 1.3,
    }}>{on ? "* " : ""}{o.label}</button>); })}</div>);
}
function SliderQ({ question, value, onChange }) {
  return (<div>
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16,
      fontFamily: "'Nunito Sans', sans-serif", fontSize: 13, color: "#7a8b6e", fontWeight: 600 }}>
      <span>{question.leftLabel}</span><span>{question.rightLabel}</span></div>
    <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
      {[1,2,3,4,5].map(n => <button key={n} onClick={() => onChange(n)} style={{
        width: 52, height: 52, borderRadius: 12, border: value === n ? "2.5px solid #2d7d46" : "1.5px solid #d6d3c8",
        background: value === n ? "#2d7d46" : "#fff", color: value === n ? "#fff" : "#2c3e1f",
        fontFamily: "'Nunito Sans', sans-serif", fontSize: 18, fontWeight: 700, cursor: "pointer", transition: "all 0.2s ease",
      }}>{n}</button>)}</div></div>);
}
function YesNoQ({ value, onChange }) {
  return (<div style={{ display: "flex", gap: 14, justifyContent: "center" }}>
    {[{l:"Yes!",v:"yes"},{l:"Nope",v:"no"}].map(o => <button key={o.v} onClick={() => onChange(o.v)} style={{
      padding: "18px 44px", borderRadius: 12, border: value === o.v ? "2px solid #2d7d46" : "1.5px solid #d6d3c8",
      background: value === o.v ? "rgba(45,125,70,0.07)" : "#fff", cursor: "pointer",
      fontFamily: "'Nunito Sans', sans-serif", fontSize: 20, fontWeight: 700, color: "#2c3e1f",
      transition: "all 0.2s ease", minWidth: 110 }}>{o.l}</button>)}</div>);
}

// ============ LOADING (~60s) ============
function LoadingScreen() {
  const steps = [
    "Scanning all 140 merit badges",
    "Cross-referencing your interests",
    "Evaluating difficulty matches",
    "Checking Eagle requirements",
    "Analyzing time commitments",
    "Consulting a fellow Eagle Scout",
    "Comparing across 8 categories",
    "Ranking your top 10 picks",
    "Writing personalized tips",
    "Polishing the final results",
  ];
  const [active, setActive] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const tick = setInterval(() => setElapsed(p => p + 1), 1000);
    return () => clearInterval(tick);
  }, []);
  useEffect(() => {
    // ~6s per step = ~60s total
    const t = setInterval(() => setActive(p => Math.min(p + 1, steps.length - 1)), 6000);
    return () => clearInterval(t);
  }, []);
  const pct = Math.min(((elapsed / 65) * 100), active === steps.length - 1 ? 95 : ((active + 1) / steps.length) * 100);

  return (
    <div className="quiz-container" style={{ maxWidth: 560, margin: "0 auto", padding: "48px 24px" }}>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ fontFamily: "'Nunito Sans', sans-serif", fontSize: 22, fontWeight: 800, color: "#2c3e1f", marginBottom: 4 }}>
          Finding your perfect badges...</div>
        <div style={{ fontFamily: "'Nunito Sans', sans-serif", fontSize: 12, color: "#aaa" }}>
          This takes about a minute. Hang tight!</div>
      </div>
      <div style={{ width: "100%", height: 8, background: "#ddd9ce", borderRadius: 4, overflow: "hidden", marginBottom: 24 }}>
        <div style={{ width: `${pct}%`, height: "100%",
          background: "linear-gradient(90deg, #2d7d46, #3a9b5c, #7abf4c, #f5b731)",
          borderRadius: 4, transition: "width 1s cubic-bezier(0.22, 1, 0.36, 1)" }} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {steps.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "7px 12px",
            borderRadius: 8, transition: "all 0.5s ease",
            background: i <= active ? "rgba(45,125,70,0.03)" : "transparent",
            opacity: i <= active ? 1 : 0.25 }}>
            <div style={{ width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: i < active ? "#2d7d46" : i === active ? "#f5b731" : "#e0ddd4",
              color: i < active ? "#fff" : i === active ? "#2c3e1f" : "#aaa",
              fontFamily: "'Nunito Sans', sans-serif", fontSize: 11, fontWeight: 800,
              transition: "all 0.4s ease" }}>
              {i < active ? "\u2713" : i + 1}
            </div>
            <span style={{ fontFamily: "'Nunito Sans', sans-serif", fontSize: 13,
              color: i <= active ? "#2c3e1f" : "#aaa",
              fontWeight: i === active ? 700 : 400, transition: "all 0.3s ease" }}>{s}</span>
            {i === active && <div style={{ width: 12, height: 12, border: "2px solid transparent",
              borderTop: "2px solid #2d7d46", borderRadius: "50%",
              animation: "spin 0.7s linear infinite", marginLeft: "auto" }} />}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ RESULTS ============
function MatchRing({ percent, size = 52 }) {
  const s = 3.5, r = (size - s) / 2, c = 2 * Math.PI * r;
  const off = c - (percent / 100) * c;
  const col = percent >= 90 ? "#2d7d46" : percent >= 82 ? "#5a9e3a" : "#7a8b6e";
  return (<svg width={size} height={size} style={{ transform: "rotate(-90deg)", flexShrink: 0 }}>
    <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e0ddd4" strokeWidth={s}/>
    <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={col} strokeWidth={s}
      strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off}
      style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.22, 1, 0.36, 1)" }}/>
    <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="central"
      style={{ transform: "rotate(90deg)", transformOrigin: "center",
        fontFamily: "'Nunito Sans', sans-serif", fontSize: 13, fontWeight: 800, fill: "#2c3e1f" }}>{percent}%</text>
  </svg>);
}

function BadgeCard({ badge, index }) {
  const [open, setOpen] = useState(false);
  const cc = getCatColor(badge.category);
  return (
    <div onClick={() => setOpen(!open)} style={{
      background: "#fff", border: "1.5px solid #e0ddd4", borderRadius: 14,
      padding: "16px 16px 12px", cursor: "pointer", transition: "all 0.3s ease",
      opacity: 0, animation: "fadeUp 0.4s ease forwards", animationDelay: `${index * 0.06 + 0.15}s`,
    }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <MatchRing percent={badge.match_percent} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "'Nunito Sans', sans-serif", fontSize: 16, fontWeight: 800,
            color: "#2c3e1f", marginBottom: 4 }}>{badge.name}</div>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            <span style={{ fontFamily: "'Nunito Sans', sans-serif", fontSize: 10, fontWeight: 700,
              color: cc.color, background: cc.bg, padding: "2px 7px",
              borderRadius: 20, textTransform: "uppercase", letterSpacing: "0.04em" }}>{badge.category}</span>
            {badge.eagle_required && <span style={{ fontFamily: "'Nunito Sans', sans-serif", fontSize: 10,
              fontWeight: 700, color: "#b8860b", background: "rgba(245,183,49,0.12)", padding: "2px 7px",
              borderRadius: 20, textTransform: "uppercase", letterSpacing: "0.04em" }}>Eagle Required</span>}
            <span style={{ fontFamily: "'Nunito Sans', sans-serif", fontSize: 10, color: "#999", padding: "2px 0" }}>
              {badge.difficulty}/10 | {badge.time_estimate}</span>
          </div>
        </div>
        <span style={{ fontSize: 16, color: "#bbb", transform: open ? "rotate(180deg)" : "", transition: "transform 0.2s", flexShrink: 0 }}>&#9662;</span>
      </div>
      {open && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #eee" }}>
          <p style={{ fontFamily: "'Nunito Sans', sans-serif", fontSize: 14, color: "#3a4a2e",
            lineHeight: 1.65, margin: "0 0 12px" }}>{badge.why}</p>
          <div style={{ background: "rgba(45,125,70,0.04)", borderRadius: 10, padding: "10px 14px", marginBottom: 10 }}>
            <span style={{ fontFamily: "'Nunito Sans', sans-serif", fontSize: 11, fontWeight: 800,
              color: "#2d7d46", textTransform: "uppercase", letterSpacing: "0.04em" }}>Cole's Pro Tip:</span>
            <p style={{ fontFamily: "'Nunito Sans', sans-serif", fontSize: 13, color: "#3a4a2e",
              lineHeight: 1.5, margin: "5px 0 0" }}>{badge.pro_tip}</p>
          </div>
          <a href={`https://scoutsmarts.com/${badge.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "")}-merit-badge-guide/`}
            target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
            style={{ display: "inline-block", marginTop: 4, fontFamily: "'Nunito Sans', sans-serif",
              fontSize: 13, fontWeight: 700, color: "#2d7d46", textDecoration: "underline", textUnderlineOffset: 3 }}>
            Read the full ScoutSmarts guide</a>
        </div>
      )}
    </div>
  );
}

function EmailGate({ isUnder13, onSubmit, onSkipForMinor }) {
  const [email, setEmail] = useState("");
  const [isParent, setIsParent] = useState(null);
  const [err, setErr] = useState("");
  if (isUnder13 && isParent === null) {
    return (<div className="quiz-container" style={{ maxWidth: 640, margin: "0 auto", padding: "48px 24px", textAlign: "center",
      opacity: 0, animation: "fadeUp 0.4s ease forwards" }}>
      <div style={{ fontFamily: "'Nunito Sans', sans-serif", fontSize: 24, fontWeight: 800, color: "#2c3e1f", marginBottom: 10 }}>One quick question!</div>
      <p style={{ fontFamily: "'Nunito Sans', sans-serif", fontSize: 15, color: "#5a6b4e", lineHeight: 1.6, marginBottom: 28 }}>
        Since you selected 10-12, is a parent or guardian here with you?</p>
      <div style={{ display: "flex", gap: 14, justifyContent: "center" }}>
        <button onClick={() => setIsParent(true)} style={{ padding: "16px 36px", borderRadius: 10, border: "none",
          background: "#2d7d46", color: "#fff", cursor: "pointer", fontFamily: "'Nunito Sans', sans-serif", fontSize: 16, fontWeight: 700 }}>Yes, parent here</button>
        <button onClick={() => { setIsParent(false); onSkipForMinor(); }} style={{ padding: "16px 36px", borderRadius: 10,
          border: "1.5px solid #d6d3c8", background: "#fff", color: "#2c3e1f", cursor: "pointer",
          fontFamily: "'Nunito Sans', sans-serif", fontSize: 16, fontWeight: 600 }}>Nope, just me</button>
      </div></div>);
  }
  if (isUnder13 && isParent === false) return null;
  const submit = () => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { setErr("Please enter a valid email address."); return; }
    setErr(""); onSubmit(email);
  };
  return (<div className="quiz-container" style={{ maxWidth: 640, margin: "0 auto", padding: "48px 24px", textAlign: "center",
    opacity: 0, animation: "fadeUp 0.4s ease forwards" }}>
    <div style={{ fontFamily: "'Nunito Sans', sans-serif", fontSize: 24, fontWeight: 800, color: "#2c3e1f", marginBottom: 10 }}>Almost there!</div>
    <p style={{ fontFamily: "'Nunito Sans', sans-serif", fontSize: 15, color: "#5a6b4e", lineHeight: 1.6, marginBottom: 24 }}>
      {isParent
        ? "Enter your email and we will send your Scout's personalized badge recommendations. That way you will have them saved even if you lose this page."
        : "Enter your email and we will send your personalized results. That way you will have them saved even if you close this tab."}</p>
    <div style={{ display: "flex", gap: 10, maxWidth: 480, margin: "0 auto 12px" }}>
      <input type="email" value={email} onChange={e => setEmail(e.target.value)}
        onKeyDown={e => e.key === "Enter" && submit()}
        placeholder={isParent ? "parent@email.com" : "you@email.com"}
        style={{ flex: 1, padding: "14px 16px", borderRadius: 10, border: "1.5px solid #d6d3c8",
          fontFamily: "'Nunito Sans', sans-serif", fontSize: 15, outline: "none", color: "#2c3e1f", background: "#fff" }} />
      <button onClick={submit} style={{ padding: "14px 24px", borderRadius: 10, border: "none", background: "#2d7d46",
        color: "#fff", cursor: "pointer", fontFamily: "'Nunito Sans', sans-serif", fontSize: 15, fontWeight: 700, whiteSpace: "nowrap" }}>Send Results</button>
    </div>
    {err && <p style={{ fontFamily: "'Nunito Sans', sans-serif", fontSize: 13, color: "#c0392b" }}>{err}</p>}
    <p style={{ fontFamily: "'Nunito Sans', sans-serif", fontSize: 11, color: "#aaa", marginTop: 12, lineHeight: 1.5 }}>
      By entering your email you agree to receive your results and occasional Scouting tips from ScoutSmarts. No spam, ever. Unsubscribe anytime.</p>
  </div>);
}

function ResultsScreen({ results, onRetake }) {
  return (
    <div className="quiz-container" style={{ maxWidth: 800, margin: "0 auto", padding: "0 20px 60px" }}>
      <div style={{ textAlign: "center", marginBottom: 28, paddingTop: 8, opacity: 0, animation: "fadeUp 0.5s ease forwards" }}>
        <div style={{ fontFamily: "'Nunito Sans', sans-serif", fontSize: 12, fontWeight: 800,
          color: "#2d7d46", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Your Scout Personality</div>
        <h2 style={{ fontFamily: "'Nunito Sans', sans-serif", fontSize: 32, fontWeight: 900,
          color: "#2c3e1f", margin: "0 0 12px", lineHeight: 1.2 }}>{results.scout_type}</h2>
        <p style={{ fontFamily: "'Nunito Sans', sans-serif", fontSize: 15, color: "#4a5a3e",
          lineHeight: 1.65, maxWidth: 640, margin: "0 auto" }}>{results.personality_description}</p>
      </div>
      <div style={{ fontFamily: "'Nunito Sans', sans-serif", fontSize: 20, fontWeight: 800,
        color: "#2c3e1f", marginBottom: 12, opacity: 0, animation: "fadeUp 0.5s ease forwards", animationDelay: "0.1s" }}>
        Your Top 10 Merit Badges</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
        {results.badges.map((b, i) => <BadgeCard key={b.name} badge={b} index={i} />)}
      </div>
      {results.eagle_tip && (
        <div style={{ background: "rgba(245,183,49,0.06)", border: "1.5px solid rgba(245,183,49,0.2)",
          borderRadius: 12, padding: "18px 20px", marginBottom: 24,
          opacity: 0, animation: "fadeUp 0.4s ease forwards", animationDelay: "0.7s" }}>
          <div style={{ fontFamily: "'Nunito Sans', sans-serif", fontSize: 11, fontWeight: 800,
            color: "#b8860b", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Eagle Scout Tip</div>
          <p style={{ fontFamily: "'Nunito Sans', sans-serif", fontSize: 14, color: "#3a4a2e",
            lineHeight: 1.6, margin: 0 }}>{results.eagle_tip}</p>
        </div>
      )}
      <div style={{ background: "#2c3e1f", borderRadius: 14, padding: "26px 22px", textAlign: "center",
        marginBottom: 18, opacity: 0, animation: "fadeUp 0.4s ease forwards", animationDelay: "0.78s" }}>
        <div style={{ fontFamily: "'Nunito Sans', sans-serif", fontSize: 19, fontWeight: 800, color: "#f5f3eb", marginBottom: 8 }}>
          Ready to fast-track your Eagle journey?</div>
        <p style={{ fontFamily: "'Nunito Sans', sans-serif", fontSize: 13, color: "rgba(245,243,235,0.7)",
          lineHeight: 1.6, marginBottom: 16 }}>
          My Trailmap to Eagle course gives you the strategy, planning tools, and accountability
          to rank up faster and make the most of your time in Scouting.</p>
        <a href="https://scoutsmarts.gumroad.com/l/trailmaptoeagle" target="_blank" rel="noopener noreferrer"
          style={{ display: "inline-block", padding: "13px 30px", background: "#f5b731",
            color: "#2c3e1f", borderRadius: 10, fontFamily: "'Nunito Sans', sans-serif",
            fontSize: 14, fontWeight: 800, textDecoration: "none" }}>Check Out the Trailmap to Eagle</a>
      </div>
      {/* LOGO PLACEHOLDER - 240x180px, replace src with actual ScoutSmarts logo */}
      <div style={{ textAlign: "center", marginBottom: 16, opacity: 0, animation: "fadeUp 0.4s ease forwards", animationDelay: "0.85s" }}>
        <img
          src="/logo.webp"
          alt="ScoutSmarts"
          style={{ height: 60, width: "auto", opacity: 0.8 }}
          onError={e => {
            e.target.onerror = null;
            e.target.style.display = "none";
            e.target.parentElement.innerHTML = '<div style="width:240px;height:80px;margin:0 auto;border:2px dashed #d6d3c8;border-radius:12px;display:flex;align-items:center;justify-content:center;font-family:Nunito Sans,sans-serif;font-size:12px;color:#aaa;">ScoutSmarts Logo (240 x 80)</div>';
          }}
        />
      </div>
      <div style={{ textAlign: "center", opacity: 0, animation: "fadeUp 0.4s ease forwards", animationDelay: "0.9s" }}>
        <a href="https://scoutsmarts.com/every-merit-badge-explained/" target="_blank" rel="noopener noreferrer"
          style={{ fontFamily: "'Nunito Sans', sans-serif", fontSize: 13, color: "#7a8b6e",
            textDecoration: "underline", textUnderlineOffset: 3, marginBottom: 12, display: "inline-block" }}>
          Explore all 140 merit badges on ScoutSmarts</a>
        <div><button onClick={onRetake} style={{ background: "none", border: "1.5px solid #d6d3c8", borderRadius: 10,
          padding: "10px 24px", fontFamily: "'Nunito Sans', sans-serif", fontSize: 13,
          fontWeight: 600, color: "#7a8b6e", cursor: "pointer", marginTop: 8 }}>Retake Quiz</button></div>
      </div>
    </div>
  );
}

// ============ MAIN ============
export default function MeritBadgeQuiz() {
  const [screen, setScreen] = useState("intro");
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [animating, setAnimating] = useState(false);
  const [userEmail, setUserEmail] = useState(null);
  const ref = useRef(null);
  const q = QUESTIONS[step];
  const isUnder13 = answers.age === "10-12";
  const scrollTop = useCallback(() => { ref.current?.scrollTo({ top: 0, behavior: "smooth" }); }, []);
  const transition = useCallback((fn) => {
    setAnimating(true);
    setTimeout(() => { fn(); scrollTop(); setTimeout(() => setAnimating(false), 50); }, 220);
  }, [scrollTop]);

  const handleAnswer = useCallback((val) => {
    const next = { ...answers, [q.id]: val }; setAnswers(next);
    if (["single","yes_no","age_range","image_pick","difficulty_pick"].includes(q.type)) {
      setTimeout(() => {
        if (step < QUESTIONS.length - 1) transition(() => setStep(step + 1));
        else setScreen("email_gate");
      }, 280);
    }
  }, [answers, q, step, transition]);

  const handleContinue = useCallback(() => {
    if (step < QUESTIONS.length - 1) transition(() => setStep(step + 1));
    else setScreen("email_gate");
  }, [step, transition]);
  const handleBack = useCallback(() => { if (step > 0) transition(() => setStep(step - 1)); }, [step, transition]);

  const fetchResults = useCallback(async (emailOverride) => {
    setScreen("loading"); setError(null);
    try {
      const resp = await fetch("/.netlify/functions/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers, email: emailOverride || null }),
      });
      if (!resp.ok) { const e = await resp.text(); console.error("HTTP", resp.status, e); throw new Error("API returned " + resp.status); }
      const data = await resp.json();
      if (data.error) { console.error("API error:", data.error); throw new Error(data.error.message || "API error"); }
      const text = data.content?.filter(b => b.type === "text").map(b => b.text).join("") || "";
      if (!text) throw new Error("Empty response");
      const parsed = JSON.parse(text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim());
      if (!parsed.badges || !Array.isArray(parsed.badges)) throw new Error("Invalid format");
      setResults(parsed); setScreen("results");
    } catch (e) { console.error("Full error:", e); setError(e.message || "Something went wrong."); setScreen("error"); }
  }, [answers]);

  const handleRetake = useCallback(() => { setAnswers({}); setStep(0); setResults(null); setError(null); setScreen("intro"); }, []);

  const canContinue = (() => {
    if (!q) return false; const val = answers[q.id];
    if (q.type === "multi_select") return Array.isArray(val) && val.length > 0;
    if (q.type === "ranking") return Array.isArray(val) && val.length > 0;
    if (q.type === "slider") return val !== undefined;
    return val !== undefined;
  })();
  const needsBtn = q?.type === "multi_select" || q?.type === "slider" || q?.type === "ranking";
  const isLast = step === QUESTIONS.length - 1;

  return (
    <div ref={ref} style={{ minHeight: "100vh", overflowY: "auto", background: `#f5f3eb url("${TOPO_BG}") repeat` }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito+Sans:opsz,wght@6..12,400;6..12,500;6..12,600;6..12,700;6..12,800;6..12,900&display=swap');
        @keyframes fadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin { to { transform:rotate(360deg); } }
        * { box-sizing: border-box; } input::placeholder { color: #b0b0a0; }
        @media (max-width: 600px) { .quiz-container { max-width: 100% !important; padding-left: 16px !important; padding-right: 16px !important; } }
      `}</style>
      <div style={{ padding: "12px 20px", borderBottom: "1px solid #e0ddd4",
        display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
        background: "rgba(245,243,235,0.92)", backdropFilter: "blur(10px)", position: "sticky", top: 0, zIndex: 10 }}>
        <img src="/logo.webp"
          alt="ScoutSmarts" style={{ height: 32, width: "auto" }} onError={e => { e.target.style.display = "none"; }} />
        <span style={{
          fontFamily: "'Nunito Sans', sans-serif", fontSize: 17, fontWeight: 900, color: "#2c3e1f" }}>ScoutSmarts</span>
      </div>

      {screen === "intro" && (
        <div className="quiz-container" style={{ maxWidth: 690, margin: "0 auto", padding: "44px 24px", textAlign: "center", opacity: 0, animation: "fadeUp 0.5s ease forwards" }}>
          <div style={{ display: "inline-block", padding: "4px 14px", borderRadius: 20, background: "rgba(45,125,70,0.1)",
            fontFamily: "'Nunito Sans', sans-serif", fontSize: 12, fontWeight: 700, color: "#2d7d46",
            textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>Merit Badge Finder</div>
          <h1 style={{ fontFamily: "'Nunito Sans', sans-serif", fontSize: 42, fontWeight: 900, color: "#2c3e1f", margin: "0 0 14px", lineHeight: 1.2 }}>
            What Merit Badge Should You Earn Next?</h1>
          <p style={{ fontFamily: "'Nunito Sans', sans-serif", fontSize: 16, color: "#4a5a3e", lineHeight: 1.7, maxWidth: 580, margin: "0 auto 28px" }}>
            Answer 10 quick questions about your interests, personality, and goals.
            We will match you with the 10 best merit badges for you, plus insider tips on how to earn each one.</p>
          <div style={{ display: "flex", gap: 24, justifyContent: "center", marginBottom: 32,
            fontFamily: "'Nunito Sans', sans-serif", fontSize: 13, color: "#7a8b6e", fontWeight: 600 }}>
            <span>~3 min</span><span style={{ color: "#d6d3c8" }}>|</span>
            <span>10 questions</span><span style={{ color: "#d6d3c8" }}>|</span><span>10 matches</span></div>
          <button onClick={() => setScreen("quiz")} style={{
            padding: "15px 44px", borderRadius: 11, border: "none", background: "#2d7d46", color: "#fff", cursor: "pointer",
            fontFamily: "'Nunito Sans', sans-serif", fontSize: 16, fontWeight: 800,
            boxShadow: "0 2px 10px rgba(45,125,70,0.25)", transition: "transform 0.15s ease" }}
            onMouseEnter={e => e.target.style.transform = "translateY(-1px)"}
            onMouseLeave={e => e.target.style.transform = "translateY(0)"}>Take the Quiz</button>
          <p style={{ fontFamily: "'Nunito Sans', sans-serif", fontSize: 11, color: "#aaa", marginTop: 20 }}>Built by Cole at ScoutSmarts.com</p>
        </div>
      )}

      {screen === "quiz" && (
        <div className="quiz-container" style={{ maxWidth: 690, margin: "0 auto", padding: "28px 24px",
          opacity: animating ? 0 : 1, transform: animating ? "translateY(10px)" : "translateY(0)",
          transition: "all 0.22s cubic-bezier(0.22, 1, 0.36, 1)" }}>
          <ProgressBar current={step} total={QUESTIONS.length} />
          <h2 style={{ fontFamily: "'Nunito Sans', sans-serif", fontSize: 28, fontWeight: 800, color: "#2c3e1f", margin: "0 0 4px", lineHeight: 1.25 }}>{q.question}</h2>
          {q.subtitle && <p style={{ fontFamily: "'Nunito Sans', sans-serif", fontSize: 13, color: "#7a8b6e", margin: "0 0 20px" }}>{q.subtitle}</p>}
          {!q.subtitle && <div style={{ height: 20 }} />}
          {q.type === "age_range" && <AgeRangeQ options={q.options} value={answers[q.id]} onChange={handleAnswer} />}
          {q.type === "single" && <SingleQ options={q.options} value={answers[q.id]} onChange={handleAnswer} />}
          {q.type === "image_pick" && <ImagePickQ options={q.options} value={answers[q.id]} onChange={handleAnswer} />}
          {q.type === "difficulty_pick" && <DifficultyPickQ options={q.options} value={answers[q.id]} onChange={handleAnswer} />}
          {q.type === "multi_select" && <MultiSelectQ options={q.options} value={answers[q.id]} onChange={v => setAnswers({...answers,[q.id]:v})} />}
          {q.type === "slider" && <SliderQ question={q} value={answers[q.id] ?? q.defaultValue} onChange={v => setAnswers({...answers,[q.id]:v})} />}
          {q.type === "yes_no" && <YesNoQ value={answers[q.id]} onChange={handleAnswer} />}
          {q.type === "ranking" && <RankingQ options={q.options} value={answers[q.id]} onChange={v => setAnswers({...answers,[q.id]:v})} />}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 28, gap: 12 }}>
            <button onClick={handleBack} disabled={step === 0} style={{ padding: "11px 20px", borderRadius: 10,
              border: "1.5px solid #d6d3c8", background: "transparent", fontFamily: "'Nunito Sans', sans-serif",
              fontSize: 13, fontWeight: 600, color: "#7a8b6e", cursor: step === 0 ? "default" : "pointer", opacity: step === 0 ? 0.3 : 1 }}>Back</button>
            {(needsBtn || isLast) && (
              <button onClick={isLast && canContinue ? () => setScreen("email_gate") : handleContinue}
                disabled={!canContinue} style={{ padding: "11px 26px", borderRadius: 10, border: "none",
                  background: canContinue ? "#2d7d46" : "#d6d3c8", color: canContinue ? "#fff" : "#aaa",
                  fontFamily: "'Nunito Sans', sans-serif", fontSize: 13, fontWeight: 700,
                  cursor: canContinue ? "pointer" : "default" }}>
                {isLast ? "See My Badges!" : "Continue"}</button>)}
          </div>
        </div>
      )}

      {screen === "email_gate" && <EmailGate isUnder13={isUnder13} onSubmit={(email) => {
  setUserEmail(email);
  fetchResults(email);
}} onSkipForMinor={() => fetchResults()} />}
      {screen === "loading" && <LoadingScreen />}
      {screen === "results" && results && <ResultsScreen results={results} onRetake={handleRetake} />}
      {screen === "error" && (
        <div style={{ textAlign: "center", padding: "60px 24px" }}>
          <div style={{ fontFamily: "'Nunito Sans', sans-serif", fontSize: 22, fontWeight: 800, color: "#2c3e1f", marginBottom: 10 }}>Hmm, something went wrong</div>
          <p style={{ fontFamily: "'Nunito Sans', sans-serif", fontSize: 14, color: "#7a8b6e", marginBottom: 8 }}>{error}</p>
          <p style={{ fontFamily: "'Nunito Sans', sans-serif", fontSize: 12, color: "#aaa", marginBottom: 20 }}>This usually means the AI service is temporarily busy. Try again in a moment.</p>
          <button onClick={() => fetchResults(userEmail)} style={{ padding: "13px 30px", borderRadius: 10, border: "none",
            background: "#2d7d46", color: "#fff", cursor: "pointer", marginRight: 10,
            fontFamily: "'Nunito Sans', sans-serif", fontSize: 14, fontWeight: 700 }}>Try Again</button>
          <button onClick={handleRetake} style={{ padding: "13px 30px", borderRadius: 10, border: "1.5px solid #d6d3c8",
            background: "#fff", color: "#2c3e1f", cursor: "pointer",
            fontFamily: "'Nunito Sans', sans-serif", fontSize: 14, fontWeight: 600 }}>Start Over</button>
        </div>
      )}
    </div>
  );
}
