// Loads data/rally_all_studies.csv, derives the fields the app needs for
// matching/filtering/display, and exposes matching helpers.

const CSV_PATH = "data/rally_all_studies.csv";

const IMAGING_ACTIVITIES = ["MRI scan", "CT scan", "PET scan", "X-ray", "Ultrasound"];
const INVASIVE_ACTIVITIES = [
  "Blood draw",
  "Injection or IV",
  "Biopsy",
  "Surgical procedure",
  "Endoscopy",
  "Sedation",
];

const CONDITION_LABELS = {
  mental_cognitive: "Mental & Cognitive Health",
  cardiovascular: "Cardiovascular Health",
  womens_health: "Women's Health",
  eye: "Eye Health",
  cancer: "Cancer",
};

const CONDITION_KEYWORDS = {
  mental_cognitive: [
    "depress", "anxiety", "bipolar", "psychot", "schizophren", "mental health",
    "mental disorder", "ptsd", "post-traumatic", "stress", "suicide", "autism",
    "adhd", "cognit", "memory", "dementia", "alzheimer", "brain diseases",
    "neurolog", "parkinson", "sleep disorder", "eating disorder", "substance",
    "addiction", "marijuana", "opioid", "learning disabilit",
  ],
  cardiovascular: [
    "heart", "cardiac", "cardio", "vascular", "blood pressure", "cholesterol",
    "stroke", "atheroscleros",
  ],
  womens_health: [
    "women's health", "women", "pregnan", "menopause", "endometriosis",
    "obstetric", "gynecolog", "maternal",
  ],
  eye: ["eye", "vision", "ophthalm", "retina", "glaucoma", "macular", "blind"],
  cancer: ["cancer", "oncolog", "tumor", "leukemia", "lymphoma", "carcinoma"],
};

const COMP_CATEGORY_LABELS = {
  payment: "Cash payment",
  giftCard: "Gift card",
  meal: "Meal provided",
  other: "Other compensation",
  none: "No compensation",
};

let _studiesCache = null;

async function loadStudies() {
  if (_studiesCache) return _studiesCache;
  const res = await fetch(CSV_PATH);
  const text = await res.text();
  const rows = window.parseCSV(text);
  _studiesCache = rows.map(deriveStudy);
  return _studiesCache;
}

function deriveStudy(raw) {
  const activities = (raw.activities_may_be_required || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const organizations = (raw.organizations || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const therapeuticAreas = (raw.therapeutic_areas || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const ageMin = raw.age_min ? Number(raw.age_min) : null;
  const ageMax = raw.age_max ? Number(raw.age_max) : null;

  const genders = (raw.genders || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const compCash = raw.compensation_cash_usd ? Number(raw.compensation_cash_usd) : 0;
  const compCoupon = raw.compensation_coupon_usd ? Number(raw.compensation_coupon_usd) : 0;
  const compCategories = (raw.compensation_categories || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const { days: durationDays, bucket: durationBucket } = parseDuration(
    raw.estimated_time_commitment
  );

  const haystack = (
    therapeuticAreas.join(" ") + " " + raw.title + " " + raw.summary
  ).toLowerCase();
  const conditionTags = Object.keys(CONDITION_KEYWORDS).filter((key) =>
    CONDITION_KEYWORDS[key].some((kw) => haystack.includes(kw))
  );

  return {
    ...raw,
    activities,
    organizations,
    therapeuticAreas,
    ageMin,
    ageMax,
    genders,
    compCash,
    compCoupon,
    compCategories,
    durationDays,
    durationBucket,
    conditionTags,
    isImaging: activities.some((a) => IMAGING_ACTIVITIES.includes(a)),
    isInvasive: activities.some((a) => INVASIVE_ACTIVITIES.includes(a)),
    isHealthyVolunteers: raw.healthy_volunteers === "TRUE",
  };
}

// "1 hours over 2 sessions" / "42 visits over 7 years" / "4 hours over null"
function parseDuration(raw) {
  if (!raw) return { days: null, bucket: "unclear" };
  const TIME_UNIT_DAYS = { day: 1, days: 1, week: 7, weeks: 7, month: 30, months: 30, year: 365, years: 365 };
  const match = raw.match(/^([\d.]+)\s+(\w+)\s+over\s+(?:([\d.]+)\s+(\w+)|null)$/i);
  if (!match) return { days: null, bucket: "unclear" };

  const [, amt1, unit1, amt2, unit2] = match;
  const u1 = unit1.toLowerCase();
  const u2 = (unit2 || "").toLowerCase();

  let days = null;
  if (u2 && TIME_UNIT_DAYS[u2]) {
    days = Number(amt2) * TIME_UNIT_DAYS[u2];
  } else if (TIME_UNIT_DAYS[u1]) {
    days = Number(amt1) * TIME_UNIT_DAYS[u1];
  }

  let bucket;
  if (days === null) bucket = "single";
  else if (days <= 1) bucket = "single";
  else if (days <= 30) bucket = "short";
  else if (days <= 180) bucket = "medium";
  else bucket = "long";

  return { days, bucket };
}

const DURATION_BUCKET_LABELS = {
  single: "Single visit",
  short: "Short-term (up to 1 month)",
  medium: "Medium-term (1–6 months)",
  long: "Long-term (6+ months)",
  unclear: "Duration varies",
};

// The source data uses the literal string "null over null" (and similar)
// when no time commitment was recorded — clean that up for display.
function durationLabel(study) {
  const raw = (study.estimated_time_commitment || "").trim();
  if (!raw || /^null\s+over\s+null$/i.test(raw)) return "Not specified";
  return raw.replace(/\s+over\s+null$/i, "").trim();
}

function compensationValue(study) {
  return study.compCash || study.compCoupon || 0;
}

function compensationLabel(study) {
  const parts = [];
  if (study.compCash) parts.push(`$${study.compCash.toLocaleString()} cash`);
  if (study.compCoupon) parts.push(`$${study.compCoupon.toLocaleString()} gift card`);
  if (parts.length) return parts.join(" + ");
  if (study.compCategories.length && !study.compCategories.includes("none")) {
    return study.compCategories.map((c) => COMP_CATEGORY_LABELS[c] || c).join(", ");
  }
  return "Not specified";
}

// Returns the closest of a study's sites to (lat, lon), since a study can
// list several campuses and the nearest one isn't always listed first.
function nearestOrg(study, lat, lon) {
  let best = null;
  study.organizations.forEach((org) => {
    const coords = window.HOSPITAL_COORDS[org];
    if (!coords) return;
    const distance = window.haversineMiles(lat, lon, coords[0], coords[1]);
    if (!best || distance < best.distance) best = { name: org, distance };
  });
  return best;
}

function nearestDistanceMiles(study, lat, lon) {
  const nearest = nearestOrg(study, lat, lon);
  return nearest ? nearest.distance : null;
}

function normalizeGender(text) {
  const t = (text || "").toLowerCase().trim();
  if (!t) return null;
  if (/trans.*(wom|female)/.test(t)) return "Transgender Female";
  if (/trans.*(man|male)/.test(t)) return "Transgender Male";
  if (/non.?binary|enby|\bnb\b/.test(t)) return "Nonbinary";
  if (/intersex/.test(t)) return "Intersex";
  if (/genderqueer|gender.?expansive|genderfluid|agender/.test(t)) return "Gender-expansive";
  if (/^f(emale)?$|woman|girl|cis.?female/.test(t)) return "Female";
  if (/^m(ale)?$|^man$|boy|cis.?male/.test(t)) return "Male";
  return "Other Genders";
}

// Core eligibility match against the initial screening + location answers.
function matchStudy(study, screening, location) {
  if (screening && screening.age) {
    const age = Number(screening.age);
    if (study.ageMin !== null && age < study.ageMin) return false;
    if (study.ageMax !== null && age > study.ageMax) return false;
  }

  if (screening && screening.gender && study.genders.length) {
    const normalized = normalizeGender(screening.gender);
    if (normalized && !study.genders.includes(normalized) && !study.genders.includes("Other Genders")) {
      return false;
    }
  }

  if (screening && screening.imaging === "no" && study.isImaging) return false;
  if (screening && screening.invasive === "no" && study.isInvasive) return false;

  // Condition-of-interest is treated as an adjustable UI filter on the
  // listing page (see listing.js), not a hard eligibility gate here.

  if (location && location.lat != null && location.maxDistance && location.maxDistance !== "any") {
    const dist = nearestDistanceMiles(study, location.lat, location.lon);
    if (dist !== null && dist > Number(location.maxDistance)) return false;
  }

  return true;
}

window.StudyData = {
  loadStudies,
  matchStudy,
  normalizeGender,
  nearestOrg,
  nearestDistanceMiles,
  compensationValue,
  compensationLabel,
  durationLabel,
  parseDuration,
  CONDITION_LABELS,
  DURATION_BUCKET_LABELS,
};
