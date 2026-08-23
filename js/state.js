// Shared localStorage-backed state used across all pages.
const STORAGE_KEYS = {
  screening: "studymatch.screening",
  location: "studymatch.location",
  saved: "studymatch.saved",
};

const StudyMatchState = {
  getScreening() {
    return readJSON(STORAGE_KEYS.screening, null);
  },
  setScreening(data) {
    localStorage.setItem(STORAGE_KEYS.screening, JSON.stringify(data));
  },

  getLocation() {
    return readJSON(STORAGE_KEYS.location, null);
  },
  setLocation(data) {
    localStorage.setItem(STORAGE_KEYS.location, JSON.stringify(data));
  },

  getSaved() {
    return readJSON(STORAGE_KEYS.saved, []);
  },
  isSaved(studyId) {
    return StudyMatchState.getSaved().includes(studyId);
  },
  toggleSaved(studyId) {
    const saved = StudyMatchState.getSaved();
    const idx = saved.indexOf(studyId);
    if (idx === -1) saved.push(studyId);
    else saved.splice(idx, 1);
    localStorage.setItem(STORAGE_KEYS.saved, JSON.stringify(saved));
    return saved.includes(studyId);
  },
};

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}

// Known MGB hospital / research-site campuses, used to compute an
// approximate real-world distance from the participant's location.
const HOSPITAL_COORDS = {
  "Massachusetts General Hospital": [42.3629, -71.0692],
  "Brigham and Women's Hospital": [42.3355, -71.1066],
  "Brigham and Women's Faulkner Hospital": [42.301, -71.1257],
  "Mass Eye and Ear": [42.3628, -71.0703],
  "McLean Hospital": [42.3753, -71.1786],
  "Spaulding Rehabilitation Network": [42.3735, -71.0567],
  "MGH Institute of Health Professions": [42.3735, -71.0567],
  "Newton-Wellesley Hospital": [42.3334, -71.2496],
  "Salem Hospital": [42.5195, -70.8967],
  "Cooley Dickinson Hospital": [42.3168, -72.6412],
  "Wentworth-Douglass Hospital": [43.1979, -70.8737],
  "Dana Farber Cancer Institute": [42.3376, -71.1069],
  "MGB Community Physicians Locations": [42.3629, -71.0692],
};

// Approximate city/town centroids for the free-text address field, since
// this prototype has no real geocoding service available. Covers the New
// England towns where MGB study sites are located.
const CITY_COORDS = {
  boston: [42.3601, -71.0589],
  cambridge: [42.3736, -71.1097],
  somerville: [42.3876, -71.0995],
  brookline: [42.3318, -71.1212],
  newton: [42.337, -71.2092],
  belmont: [42.3959, -71.1786],
  quincy: [42.2529, -71.0023],
  medford: [42.4184, -71.1062],
  malden: [42.4251, -71.0662],
  everett: [42.4084, -71.0537],
  chelsea: [42.3917, -71.0328],
  revere: [42.4084, -71.012],
  waltham: [42.3765, -71.2356],
  watertown: [42.3709, -71.1828],
  arlington: [42.4154, -71.1565],
  lexington: [42.443, -71.229],
  woburn: [42.4793, -71.1523],
  salem: [42.5195, -70.8967],
  lynn: [42.4668, -70.9495],
  beverly: [42.5584, -70.88],
  peabody: [42.5279, -70.9286],
  danvers: [42.5751, -70.937],
  worcester: [42.2626, -71.8023],
  springfield: [42.1015, -72.5898],
  lowell: [42.6334, -71.3162],
  lawrence: [42.707, -71.1631],
  framingham: [42.2793, -71.4162],
  natick: [42.2834, -71.3495],
  northampton: [42.3251, -72.6412],
  amherst: [42.3732, -72.5199],
  pittsfield: [42.4501, -73.2454],
  plymouth: [41.9584, -70.6673],
  brockton: [42.0834, -71.0184],
  "new bedford": [41.6362, -70.9342],
  "fall river": [41.7015, -71.155],
  providence: [41.824, -71.4128],
  manchester: [42.9956, -71.4548],
  portsmouth: [43.0718, -70.7626],
  dover: [43.1979, -70.8737],
  nashua: [42.7654, -71.4676],
  hartford: [41.7658, -72.6734],
};

// Very small, deliberately limited geocoder: matches a known town name
// inside whatever the user typed. Good enough for a New-England-only
// prototype; not a substitute for a real geocoding API.
function geocodeAddress(text) {
  if (!text) return null;
  const t = text.toLowerCase();
  let best = null;
  for (const [city, coords] of Object.entries(CITY_COORDS)) {
    if (t.includes(city) && (!best || city.length > best.city.length)) {
      best = { city, coords };
    }
  }
  if (!best) return null;
  return { lat: best.coords[0], lon: best.coords[1], matchedCity: best.city };
}

function haversineMiles(lat1, lon1, lat2, lon2) {
  const R = 3958.8; // Earth radius in miles
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

window.StudyMatchState = StudyMatchState;
window.HOSPITAL_COORDS = HOSPITAL_COORDS;
window.CITY_COORDS = CITY_COORDS;
window.geocodeAddress = geocodeAddress;
window.haversineMiles = haversineMiles;
