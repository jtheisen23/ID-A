// ── ID-A Daily Bid Fetcher ─────────────────────────────────────────────────
// Queries SAM.gov for Kentucky opportunities matching our verticals
// Writes results to data/auto-projects.json for the dashboard to consume
// ──────────────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Dynamic import for node-fetch
const fetch = (await import('node-fetch')).default;

// ── Config ─────────────────────────────────────────────────────────────────

const SAM_API_KEY = process.env.SAM_API_KEY || '';
const SAM_BASE    = 'https://api.sam.gov/prod/opportunities/v2/search';

// NAICS codes relevant to our verticals
// 236220 = Commercial/Institutional Building Construction
// 238390 = Other Building Finishing Contractors (casework, headwalls, etc)
// 238990 = All Other Specialty Trade Contractors
// 337127 = Institutional Furniture Manufacturing
// 337211 = Wood Office Furniture Manufacturing
// 541310 = Architectural Services (interior design)
// 236210 = Industrial Building Construction
const NAICS_CODES = ['236220','238390','238990','337127','337211','541310','236210'];

// Keywords to search in titles
const KEYWORD_SEARCHES = [
  'furniture',
  'interior',
  'casework',
  'renovation',
  'construction',
  'healthcare facility',
  'school renovation',
  'office renovation',
  'medical center',
  'hospital',
  'university',
  'college',
  'government building',
];

// Kentucky markets we care about — used to score/tag results
const MARKET_MAP = [
  { key: 'Louisville',    tier: 1, terms: ['louisville','jefferson county','jefferson co'] },
  { key: 'Lexington',     tier: 1, terms: ['lexington','fayette county','fayette co'] },
  { key: 'N. Kentucky',   tier: 1, terms: ['florence','union','covington','newport','boone county','kenton county','campbell county','northern kentucky','n. kentucky','nky'] },
  { key: 'Frankfort',     tier: 1, terms: ['frankfort','franklin county','franklin co'] },
  { key: 'Georgetown',    tier: 2, terms: ['georgetown','scott county','scott co'] },
  { key: 'Elizabethtown', tier: 2, terms: ['elizabethtown','hardin county','hardin co','e-town'] },
  { key: 'Bowling Green', tier: 2, terms: ['bowling green','warren county','warren co'] },
];

// Vertical detection from title/description
const VERTICAL_MAP = [
  { key: 'health', terms: ['hospital','medical','health','clinic','patient','healthcare','nursing','dental','pharmacy','surgical','behavioral health'] },
  { key: 'gov',    terms: ['government','courthouse','municipal','federal','state office','city hall','county','police','fire station','corrections','justice'] },
  { key: 'edu',    terms: ['university','college','campus','higher ed','community college','wku','uk ','eku','nku','morehead','murray state'] },
  { key: 'k12',    terms: ['school','elementary','middle school','high school','k-12','k12','district','preschool','kindergarten'] },
  { key: 'corp',   terms: ['office','corporate','commercial','warehouse','manufacturing','plant','industrial','headquarters'] },
];

// ── Helpers ────────────────────────────────────────────────────────────────

function detectMarket(text) {
  const lc = text.toLowerCase();
  for (const m of MARKET_MAP) {
    if (m.terms.some(t => lc.includes(t))) return { market: m.key, tier: String(m.tier) };
  }
  // Default — somewhere in KY
  return { market: 'Other KY', tier: '1' };
}

function detectVertical(text) {
  const lc = text.toLowerCase();
  for (const v of VERTICAL_MAP) {
    if (v.terms.some(t => lc.includes(t))) return v.key;
  }
  return 'corp';
}

function detectStage(opp) {
  const type = (opp.type || '').toLowerCase();
  const deadline = opp.responseDeadLine;
  if (!deadline) return 'watch';
  const daysLeft = (new Date(deadline) - new Date()) / 86400000;
  if (type.includes('award')) return 'watch';
  if (daysLeft < 7)  return 'hot';
  if (daysLeft < 21) return 'warm';
  return 'bid';
}

function formatValue(opp) {
  const award = opp.award?.amount;
  if (award) {
    const n = parseFloat(award);
    if (!isNaN(n)) return n >= 1000000 ? `$${(n/1000000).toFixed(1)}M` : `$${(n/1000).toFixed(0)}K`;
  }
  return '—';
}

function formatDate(str) {
  if (!str) return '';
  try {
    return new Date(str).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return str; }
}

function oppToProject(opp) {
  const fullText = `${opp.title || ''} ${opp.description || ''} ${opp.officeAddress?.city || ''} ${opp.placeOfPerformance?.city?.name || ''} ${opp.placeOfPerformance?.state?.name || ''}`;
  const { market, tier } = detectMarket(fullText);

  return {
    id:       `sam-${opp.noticeId}`,
    name:     opp.title || 'Untitled',
    market,
    tier,
    vertical: detectVertical(fullText),
    value:    formatValue(opp),
    gc:       opp.fullParentPathName?.split('.').pop()?.trim() || opp.department || '',
    stage:    detectStage(opp),
    notes:    [
      opp.type ? `Type: ${opp.type}` : '',
      opp.responseDeadLine ? `Due: ${formatDate(opp.responseDeadLine)}` : '',
      opp.solicitationNumber ? `Solicitation: ${opp.solicitationNumber}` : '',
    ].filter(Boolean).join(' · '),
    products: [],
    added:    formatDate(opp.postedDate),
    source:   'SAM.gov',
    url:      opp.uiLink || `https://sam.gov/opp/${opp.noticeId}/view`,
    bc:       '',
  };
}

// ── Fetch from SAM.gov ─────────────────────────────────────────────────────

async function fetchSAM(params) {
  if (!SAM_API_KEY) {
    console.warn('⚠️  No SAM_API_KEY set — skipping SAM.gov fetch');
    return [];
  }

  const today = new Date();
  const from  = new Date(today - 30 * 86400000); // last 30 days
  const fmt   = d => `${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}/${d.getFullYear()}`;

  const baseParams = {
    api_key:    SAM_API_KEY,
    limit:      '100',
    state:      'KY',
    ptype:      'o,p,k',   // solicitations, presolicitations, combined
    postedFrom: fmt(from),
    postedTo:   fmt(today),
    ...params,
  };

  const url = `${SAM_BASE}?${new URLSearchParams(baseParams)}`;
  console.log(`  Fetching: ${url.replace(SAM_API_KEY, '***')}`);

  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) {
      console.error(`  SAM.gov error: ${res.status} ${res.statusText}`);
      return [];
    }
    const data = await res.json();
    return data.opportunitiesData || [];
  } catch (err) {
    console.error(`  Fetch error: ${err.message}`);
    return [];
  }
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('🔍 ID-A Daily Bid Fetcher starting...');
  const allOpps = new Map(); // noticeId → opp (dedupe)

  // Query 1: By NAICS code (most precise)
  for (const ncode of NAICS_CODES) {
    console.log(`  NAICS ${ncode}...`);
    const opps = await fetchSAM({ ncode });
    opps.forEach(o => allOpps.set(o.noticeId, o));
    // Rate limit: ~2 req/sec
    await new Promise(r => setTimeout(r, 600));
  }

  // Query 2: By keywords in title (catch things NAICS misses)
  for (const title of KEYWORD_SEARCHES) {
    console.log(`  Keyword "${title}"...`);
    const opps = await fetchSAM({ title });
    opps.forEach(o => allOpps.set(o.noticeId, o));
    await new Promise(r => setTimeout(r, 600));
  }

  console.log(`\n📦 Total unique opportunities from SAM.gov: ${allOpps.size}`);

  // Convert to our project format
  const projects = Array.from(allOpps.values())
    .map(oppToProject)
    .filter(p => p.name && p.name !== 'Untitled');

  // Sort: hot first, then warm, then bid, then watch
  const stageOrder = { hot: 0, warm: 1, bid: 2, watch: 3 };
  projects.sort((a, b) => (stageOrder[a.stage] ?? 4) - (stageOrder[b.stage] ?? 4));

  console.log(`✅ Processed ${projects.length} projects for Kentucky markets`);

  // Load existing file to preserve any manually-added auto projects
  const dataPath = 'data/auto-projects.json';
  let existing = [];
  if (existsSync(dataPath)) {
    try { existing = JSON.parse(readFileSync(dataPath, 'utf8')).projects || []; }
    catch { existing = []; }
  }

  // Merge: keep existing manual entries, replace SAM entries
  const manual = existing.filter(p => p.source !== 'SAM.gov');
  const merged  = [...projects, ...manual];

  // Write output
  writeFileSync(dataPath, JSON.stringify({
    lastFetched: new Date().toISOString(),
    count:       merged.length,
    samCount:    projects.length,
    projects:    merged,
  }, null, 2));

  // Write fetch log
  const logPath = 'data/fetch-log.json';
  let log = [];
  if (existsSync(logPath)) {
    try { log = JSON.parse(readFileSync(logPath, 'utf8')); } catch { log = []; }
  }
  log.unshift({
    date:     new Date().toISOString(),
    samCount: projects.length,
    total:    merged.length,
    status:   'success',
  });
  writeFileSync(logPath, JSON.stringify(log.slice(0, 30), null, 2)); // keep 30 days

  console.log(`\n💾 Wrote ${merged.length} projects to ${dataPath}`);
  console.log('🎉 Done!');
}

main().catch(err => {
  console.error('Fatal error:', err);
  // Write failure to log
  const logPath = 'data/fetch-log.json';
  let log = [];
  try { log = JSON.parse(readFileSync(logPath, 'utf8')); } catch {}
  log.unshift({ date: new Date().toISOString(), status: 'error', error: err.message });
  writeFileSync(logPath, JSON.stringify(log.slice(0, 30), null, 2));
  process.exit(1);
});
