// ── State ──────────────────────────────────────────────────────────────────
let projects = [];
let activeStage = '';
let activeTier = '';
let mktChartInst = null;
let vertChartInst = null;

// ── Init ───────────────────────────────────────────────────────────────────
function init() {
  const stored = localStorage.getItem('ida_projects');
  projects = stored ? JSON.parse(stored) : JSON.parse(JSON.stringify(SEED_PROJECTS));
  renderAll();
  bindNav();
  bindForm();
  bindImport();
  bindFilters();
  renderSources();
  renderQuickLinks();
  bindExport();
}

function save() {
  localStorage.setItem('ida_projects', JSON.stringify(projects));
}

// ── Navigation ─────────────────────────────────────────────────────────────
function bindNav() {
  document.querySelectorAll('.nav-item').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      showView(a.dataset.view);
    });
  });
}

function showView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(a => a.classList.remove('active'));
  document.getElementById('view-' + name).classList.add('active');
  document.querySelector(`.nav-item[data-view="${name}"]`).classList.add('active');
  if (name === 'dashboard') renderAll();
  if (name === 'pipeline') renderPipelineView('all');
}

// ── Render all ─────────────────────────────────────────────────────────────
function renderAll(filter) {
  const f = filter || 'all';
  renderMetrics();
  renderMap(f);
  renderCharts(f);
  renderDashList(f);
}

// ── Metrics ────────────────────────────────────────────────────────────────
function renderMetrics() {
  const total = projects.length;
  const outsideLou = projects.filter(p => p.market !== 'Louisville').length;
  const hot = projects.filter(p => p.stage === 'hot' || p.stage === 'bid').length;
  const markets = new Set(projects.map(p => p.market)).size;
  const totalVal = projects.reduce((sum, p) => {
    const n = parseFloat(String(p.value).replace(/[$M,]/g, ''));
    return sum + (isNaN(n) ? 0 : n);
  }, 0);

  document.getElementById('dashMetrics').innerHTML = `
    <div class="metric"><div class="metric-label">Tracked opportunities</div><div class="metric-val">${total}</div><div class="metric-sub">${outsideLou} outside Louisville</div></div>
    <div class="metric"><div class="metric-label">Est. pipeline value</div><div class="metric-val">$${totalVal.toFixed(1)}M</div><div class="metric-sub">Across all markets</div></div>
    <div class="metric"><div class="metric-label">Hot / bid-ready</div><div class="metric-val">${hot}</div><div class="metric-sub">Action needed now</div></div>
    <div class="metric"><div class="metric-label">Markets active</div><div class="metric-val">${markets}</div><div class="metric-sub">Tier 1 &amp; 2 coverage</div></div>
  `;
}

// ── Map ────────────────────────────────────────────────────────────────────
function renderMap(filter) {
  const filtered = filter === 'all' ? projects : projects.filter(p => p.vertical === filter);
  const counts = {};
  MARKETS.forEach(m => counts[m.key] = 0);
  filtered.forEach(p => { if (counts[p.market] !== undefined) counts[p.market]++; });

  const maxCount = Math.max(...Object.values(counts), 1);
  const bubbles = MARKETS.map(m => {
    const c = counts[m.key] || 0;
    if (c === 0) return '';
    const r = Math.max(8, Math.round(10 + (c / maxCount) * 28));
    const color = m.tier === 1 ? '#185FA5' : m.tier === 2 ? '#EF9F27' : '#1D9E75';
    const labelY = m.lat + r + 14;
    return `
      <circle cx="${m.lng}" cy="${m.lat}" r="${r + 12}" fill="${color}" opacity="0.12"/>
      <circle cx="${m.lng}" cy="${m.lat}" r="${r + 4}" fill="${color}" opacity="0.22"/>
      <circle cx="${m.lng}" cy="${m.lat}" r="${r}" fill="${color}" opacity="0.85"/>
      <text x="${m.lng}" y="${labelY}" text-anchor="middle" font-size="11" font-weight="500" fill="#1a1917">${m.key}</text>
      <text x="${m.lng}" y="${labelY + 12}" text-anchor="middle" font-size="10" fill="#6b6a67">${c} project${c !== 1 ? 's' : ''}</text>
    `;
  }).join('');

  document.getElementById('mapContainer').innerHTML = `
    <svg viewBox="0 0 680 320" xmlns="http://www.w3.org/2000/svg">
      <path d="M60,100 L640,90 L650,130 L620,160 L600,170 L570,165 L540,175 L520,220 L500,240 L480,245 L460,240 L440,250 L420,260 L400,255 L380,265 L340,270 L300,260 L260,265 L220,255 L190,260 L160,250 L130,240 L100,235 L70,220 L55,200 L50,160 L60,100Z"
        fill="#f3f2ef" stroke="rgba(0,0,0,0.15)" stroke-width="1.5"/>
      ${bubbles}
      <text x="620" y="108" font-size="11" fill="#a09f9c">N↑</text>
      <line x1="195" y1="195" x2="230" y2="225" stroke="#EF9F27" stroke-width="1.5" stroke-dasharray="4,3" opacity="0.5"/>
      <line x1="230" y1="225" x2="270" y2="265" stroke="#EF9F27" stroke-width="1.5" stroke-dasharray="4,3" opacity="0.5"/>
      <text x="200" y="215" font-size="9" fill="#854F0B" opacity="0.7" transform="rotate(-30,200,215)">I-65 corridor</text>
    </svg>
  `;
}

// ── Charts ─────────────────────────────────────────────────────────────────
function renderCharts(filter) {
  const filtered = filter === 'all' ? projects : projects.filter(p => p.vertical === filter);

  // Market bar chart
  const mktLabels = MARKETS.map(m => m.key === 'N. Kentucky' ? 'N. KY' : m.key === 'Elizabethtown' ? "E'town" : m.key === 'Bowling Green' ? 'B. Green' : m.key).filter((_, i) => MARKETS[i].key !== 'Other KY');
  const mktKeys   = MARKETS.map(m => m.key).filter(k => k !== 'Other KY');
  const mktData   = mktKeys.map(k => filtered.filter(p => p.market === k).length);
  const mktColors = MARKETS.filter(m => m.key !== 'Other KY').map(m => m.tier === 1 ? '#185FA5' : m.tier === 2 ? '#854F0B' : '#3B6D11');

  if (mktChartInst) mktChartInst.destroy();
  mktChartInst = new Chart(document.getElementById('mktChart'), {
    type: 'bar',
    data: { labels: mktLabels, datasets: [{ data: mktData, backgroundColor: mktColors, borderRadius: 4, borderSkipped: false }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ` ${c.raw} projects` } } },
      scales: {
        x: { ticks: { color: '#6b6a67', font: { size: 10 } }, grid: { display: false }, border: { display: false } },
        y: { ticks: { color: '#6b6a67', font: { size: 10 }, stepSize: 1 }, grid: { color: 'rgba(0,0,0,0.05)' }, border: { display: false } }
      }
    }
  });

  // Vertical donut chart
  const vertKeys  = ['health','gov','edu','k12','corp'];
  const vertData  = vertKeys.map(k => filtered.filter(p => p.vertical === k).length);
  const vertCols  = ['#1D9E75','#378ADD','#EF9F27','#D4537E','#888780'];

  if (vertChartInst) vertChartInst.destroy();
  vertChartInst = new Chart(document.getElementById('vertChart'), {
    type: 'doughnut',
    data: { labels: vertKeys.map(k => VERT_LABELS[k]), datasets: [{ data: vertData, backgroundColor: vertCols, borderWidth: 0, hoverOffset: 6 }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { color: '#6b6a67', font: { size: 10 }, boxWidth: 10, padding: 10 } } },
      cutout: '60%'
    }
  });
}

// ── Project list helpers ───────────────────────────────────────────────────
function projRowHTML(p, withDelete) {
  const del = withDelete
    ? `<button class="del-btn" onclick="deleteProject(${p.id})">remove</button>`
    : '';
  return `
    <div class="proj-row">
      <div class="proj-dot" style="background:${VERT_COLORS[p.vertical]};"></div>
      <div class="proj-info">
        <div class="proj-name">${p.name}</div>
        <div class="proj-meta">
          ${p.market} &nbsp;·&nbsp;
          <span class="vert-tag ${VERT_CLASS[p.vertical]}">${VERT_LABELS[p.vertical]}</span>
          ${p.products && p.products.length ? '&nbsp;·&nbsp;' + p.products.slice(0,2).join(', ') + (p.products.length > 2 ? ' +' + (p.products.length-2) : '') : ''}
          ${p.gc ? '&nbsp;·&nbsp;' + p.gc : ''}
        </div>
        ${p.notes ? `<div class="proj-meta" style="font-style:italic;">${p.notes.slice(0,90)}${p.notes.length>90?'…':''}</div>` : ''}
        ${del}
      </div>
      <div class="proj-right">
        <div class="proj-val">${p.value}</div>
        <span class="proj-stage-pill ${STAGE_CLASS[p.stage]}">${STAGE_LABELS[p.stage]}</span>
        <div style="font-size:10px;color:#a09f9c;margin-top:2px;">${p.added || ''}</div>
      </div>
    </div>
  `;
}

function renderDashList(filter) {
  const filtered = filter === 'all' ? projects : projects.filter(p => p.vertical === filter);
  const el = document.getElementById('dashProjList');
  document.getElementById('projCount').textContent = filtered.length + ' project' + (filtered.length !== 1 ? 's' : '');
  el.innerHTML = filtered.length
    ? filtered.map(p => projRowHTML(p, true)).join('')
    : '<div style="padding:1.5rem;text-align:center;color:#a09f9c;font-size:13px;">No projects match this filter.</div>';
}

function renderPipelineView(filter) {
  const filtered = filter === 'all' ? projects : projects.filter(p => p.vertical === filter);
  const el = document.getElementById('pipelineFullList');
  const empty = document.getElementById('pipelineEmpty');
  if (!projects.length) {
    el.innerHTML = '';
    empty.style.display = 'block';
  } else {
    empty.style.display = 'none';
    el.innerHTML = filtered.length
      ? filtered.map(p => projRowHTML(p, true)).join('')
      : '<div style="padding:1.5rem;text-align:center;color:#a09f9c;font-size:13px;">No projects match this filter.</div>';
  }
}

function deleteProject(id) {
  if (!confirm('Remove this project from the pipeline?')) return;
  projects = projects.filter(p => p.id !== id);
  save();
  renderAll();
  renderPipelineView('all');
}

// ── Filters ────────────────────────────────────────────────────────────────
function bindFilters() {
  document.querySelectorAll('#dashFilters .filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#dashFilters .filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderAll(btn.dataset.filter);
    });
  });
  document.querySelectorAll('#pipeFilters .filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#pipeFilters .filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderPipelineView(btn.dataset.filter);
    });
  });
}

// ── Sources & quick links ──────────────────────────────────────────────────
function renderSources() {
  document.getElementById('sourceList').innerHTML = SOURCES.map(s => `
    <div class="source-row">
      <div class="source-icon" style="background:${s.bg};"><i class="ti ${s.icon}" style="color:${s.ic};"></i></div>
      <div>
        <div class="source-name">${s.name}</div>
        <div class="source-desc">${s.desc}</div>
      </div>
      <div class="source-count">${s.count}</div>
    </div>
  `).join('');
}

function renderQuickLinks() {
  document.getElementById('quickGrid').innerHTML = QUICK_LINKS.map(q => `
    <a href="${q.url}" target="_blank" rel="noopener" class="quick-btn">
      <i class="ti ${q.icon}"></i> ${q.label}
    </a>
  `).join('');
}

// ── Form ───────────────────────────────────────────────────────────────────
function bindForm() {
  document.querySelectorAll('.stage-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.stage-btn').forEach(b => b.className = 'stage-btn');
      btn.className = 'stage-btn active-' + btn.dataset.stage;
      activeStage = btn.dataset.stage;
    });
  });
  document.querySelectorAll('.tier-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tier-btn').forEach(b => b.className = 'tier-btn');
      btn.className = 'tier-btn active-t' + btn.dataset.tier;
      activeTier = btn.dataset.tier;
    });
  });
  document.querySelectorAll('.prod-check input').forEach(cb => {
    cb.addEventListener('change', () => {
      cb.closest('.prod-check').classList.toggle('selected', cb.checked);
    });
  });
  document.getElementById('btnSubmitProject').addEventListener('click', submitProject);
  document.getElementById('btnResetForm').addEventListener('click', resetForm);
}

function validate() {
  let ok = true;
  [['projName','errName'],['projMarket','errMarket'],['projVert','errVert']].forEach(([id, err]) => {
    const valid = document.getElementById(id).value.trim();
    document.getElementById(err).style.display = valid ? 'none' : 'block';
    if (!valid) ok = false;
  });
  return ok;
}

function submitProject() {
  if (!validate()) return;
  const products = Array.from(document.querySelectorAll('.prod-check input:checked')).map(c => c.value);
  const p = {
    id: Date.now(),
    name:     document.getElementById('projName').value.trim(),
    market:   document.getElementById('projMarket').value,
    vertical: document.getElementById('projVert').value,
    value:    document.getElementById('projVal').value.trim() || '—',
    gc:       document.getElementById('projGC').value.trim(),
    bc:       document.getElementById('projBC').value.trim(),
    notes:    document.getElementById('projNotes').value.trim(),
    stage:    activeStage || 'watch',
    tier:     activeTier  || '1',
    products,
    added: new Date().toLocaleDateString('en-US', { month:'short', day:'numeric' }),
    source: 'Manual',
  };
  projects.unshift(p);
  save();
  const msg = document.getElementById('addSuccessMsg');
  msg.textContent = p.name + ' added to pipeline.';
  const banner = document.getElementById('addSuccess');
  banner.style.display = 'flex';
  setTimeout(() => { banner.style.display = 'none'; }, 3000);
  resetForm();
}

function resetForm() {
  ['projName','projVal','projGC','projBC','projNotes'].forEach(id => { document.getElementById(id).value = ''; });
  document.getElementById('projMarket').value = '';
  document.getElementById('projVert').value = '';
  activeStage = ''; activeTier = '';
  document.querySelectorAll('.stage-btn').forEach(b => b.className = 'stage-btn');
  document.querySelectorAll('.tier-btn').forEach(b => b.className = 'tier-btn');
  document.querySelectorAll('.prod-check input').forEach(cb => { cb.checked = false; cb.closest('.prod-check').classList.remove('selected'); });
  ['errName','errMarket','errVert'].forEach(id => { document.getElementById(id).style.display = 'none'; });
}

// ── Export ─────────────────────────────────────────────────────────────────
function bindExport() {
  document.getElementById('btnExportDash').addEventListener('click', exportCSV);
  document.getElementById('btnExportPipeline').addEventListener('click', exportCSV);
}

function exportCSV() {
  const headers = ['Name','Market','Tier','Vertical','Value','GC/Owner','BC ID','Stage','Products','Notes','Added','Source'];
  const rows = projects.map(p => [
    p.name, p.market, p.tier, VERT_LABELS[p.vertical] || p.vertical, p.value, p.gc || '', p.bc || '',
    STAGE_LABELS[p.stage] || p.stage, (p.products||[]).join('; '), p.notes || '', p.added || '', p.source || ''
  ].map(v => '"' + String(v).replace(/"/g, '""') + '"').join(','));
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'ida-pipeline-' + new Date().toISOString().slice(0,10) + '.csv';
  a.click();
  URL.revokeObjectURL(url);
}

// ── CSV Import ─────────────────────────────────────────────────────────────
const PIPELINE_FIELDS = [
  { key:'name',     label:'Project name',          required:true,  hints:['project name','project','name','title','job name','job'] },
  { key:'market',   label:'Market / city',         required:true,  hints:['city','location','market','project location','address'] },
  { key:'value',    label:'Est. value / size',     required:false, hints:['project size','size','value','budget','bid amount','estimated value','amount'] },
  { key:'gc',       label:'GC / owner / client',   required:false, hints:['client','owner','gc','general contractor','customer','invited by'] },
  { key:'vertical', label:'Vertical / project type', required:false, hints:['project type','type','category','vertical','sector','building type'] },
  { key:'stage',    label:'Bid status / stage',    required:false, hints:['status','bid status','stage','phase','project status'] },
  { key:'notes',    label:'Notes',                 required:false, hints:['notes','description','details','summary','comments','scope'] },
];

let csvHeaders = [];
let csvRows = [];

function bindImport() {
  const dz = document.getElementById('dropZone');
  const fi = document.getElementById('fileInput');
  dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('dragover'); });
  dz.addEventListener('dragleave', () => dz.classList.remove('dragover'));
  dz.addEventListener('drop', e => { e.preventDefault(); dz.classList.remove('dragover'); handleFile(e.dataTransfer.files[0]); });
  fi.addEventListener('change', () => handleFile(fi.files[0]));
  document.getElementById('btnPreview').addEventListener('click', goPreview);
  document.getElementById('btnDoImport').addEventListener('click', doImport);
}

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return { headers:[], rows:[] };
  const parse = line => {
    const result = []; let cur = ''; let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') { inQ = !inQ; }
      else if (c === ',' && !inQ) { result.push(cur.trim()); cur = ''; }
      else cur += c;
    }
    result.push(cur.trim());
    return result;
  };
  return { headers: parse(lines[0]), rows: lines.slice(1).filter(l => l.trim()).map(parse) };
}

function bestMatch(header, hints) {
  const h = header.toLowerCase().trim();
  return hints.some(hint => h.includes(hint) || hint.includes(h));
}

function autoMap() {
  const m = {};
  PIPELINE_FIELDS.forEach(f => {
    const found = csvHeaders.find(h => bestMatch(h, f.hints));
    m[f.key] = found || '__skip__';
  });
  return m;
}

function handleFile(file) {
  if (!file) return;
  document.getElementById('fileInfo').style.display = 'block';
  document.getElementById('fileInfo').textContent = file.name + ' · ' + (file.size / 1024).toFixed(1) + ' KB · ' + 'ready to map';
  const reader = new FileReader();
  reader.onload = e => {
    const { headers, rows } = parseCSV(e.target.result);
    if (!headers.length) { alert('Could not read CSV. Please check the file format.'); return; }
    csvHeaders = headers;
    csvRows = rows;
    buildMappingUI();
    goImportStep(2);
  };
  reader.readAsText(file);
}

function buildMappingUI() {
  const auto = autoMap();
  const opts = ['__skip__', ...csvHeaders].map(h =>
    `<option value="${h}">${h === '__skip__' ? '— skip —' : h}</option>`
  ).join('');
  document.getElementById('mappingRows').innerHTML = PIPELINE_FIELDS.map(f => `
    <div class="map-grid">
      <div class="map-label">${f.label}${f.required ? '<span class="req-dot"></span>' : ''}</div>
      <div class="map-arrow">→</div>
      <select id="map_${f.key}">${opts}</select>
    </div>
  `).join('');
  PIPELINE_FIELDS.forEach(f => {
    document.getElementById('map_' + f.key).value = auto[f.key] || '__skip__';
  });
}

function getMapping() {
  const m = {};
  PIPELINE_FIELDS.forEach(f => { m[f.key] = document.getElementById('map_' + f.key).value; });
  return m;
}

function getVal(row, col) {
  if (col === '__skip__') return '';
  const idx = csvHeaders.indexOf(col);
  return idx >= 0 && row[idx] ? row[idx].replace(/^"|"$/g,'').trim() : '';
}

const marketGuess = v => {
  const lv = v.toLowerCase();
  if (lv.includes('louisville') || lv.includes('jefferson')) return 'Louisville';
  if (lv.includes('lexington')  || lv.includes('fayette'))  return 'Lexington';
  if (lv.includes('florence')   || lv.includes('union')     || lv.includes('covington') || lv.includes('northern ky') || lv.includes('boone') || lv.includes('kenton') || lv.includes('campbell')) return 'N. Kentucky';
  if (lv.includes('elizabethtown') || lv.includes("e'town") || lv.includes('hardin'))   return 'Elizabethtown';
  if (lv.includes('bowling green') || lv.includes('warren')) return 'Bowling Green';
  if (lv.includes('georgetown') || lv.includes('scott county')) return 'Georgetown';
  if (lv.includes('frankfort')  || lv.includes('franklin county')) return 'Frankfort';
  return v || 'Other KY';
};
const stageGuess = v => {
  const lv = v.toLowerCase();
  if (lv.includes('won') || lv.includes('awarded'))  return 'watch';
  if (lv.includes('bid') || lv.includes('submitted') || lv.includes('invited')) return 'bid';
  if (lv.includes('active') || lv.includes('open') || lv.includes('pending'))   return 'warm';
  return 'watch';
};
const vertGuess = v => {
  const lv = v.toLowerCase();
  if (lv.includes('health') || lv.includes('hospital') || lv.includes('medical') || lv.includes('clinic')) return 'health';
  if (lv.includes('gov')    || lv.includes('civic')    || lv.includes('municipal') || lv.includes('federal') || lv.includes('state')) return 'gov';
  if (lv.includes('k-12')   || lv.includes('k12')      || lv.includes('school')  || lv.includes('elementary') || lv.includes('high school')) return 'k12';
  if (lv.includes('university') || lv.includes('college') || lv.includes('campus')) return 'edu';
  return 'corp';
};

function rowToProject(row, mapping) {
  const rawMarket = getVal(row, mapping.market);
  const rawStage  = getVal(row, mapping.stage);
  const rawVert   = getVal(row, mapping.vertical);
  return {
    id: Date.now() + Math.random(),
    name:     getVal(row, mapping.name) || 'Unnamed project',
    market:   marketGuess(rawMarket),
    value:    getVal(row, mapping.value) || '—',
    gc:       getVal(row, mapping.gc),
    vertical: vertGuess(rawVert),
    stage:    stageGuess(rawStage),
    notes:    getVal(row, mapping.notes),
    tier:     '1',
    products: [],
    added:    new Date().toLocaleDateString('en-US', { month:'short', day:'numeric' }),
    source:   'BuildingConnected',
  };
}

function goPreview() {
  const mapping = getMapping();
  if (mapping.name === '__skip__') { alert('Please map the Project name field — it\'s required.'); return; }
  if (mapping.market === '__skip__') { alert('Please map the Market / city field — it\'s required.'); return; }
  const preview = csvRows.slice(0,5).map(r => rowToProject(r, mapping));
  document.getElementById('previewTable').innerHTML = `
    <table class="preview-table">
      <thead><tr>
        <th style="width:30%">Project name</th>
        <th style="width:18%">Market</th>
        <th style="width:14%">Vertical</th>
        <th style="width:12%">Value</th>
        <th style="width:12%">Stage</th>
        <th style="width:14%">GC / owner</th>
      </tr></thead>
      <tbody>
        ${preview.map(p => `<tr>
          <td title="${p.name}">${p.name}</td>
          <td>${p.market}</td>
          <td>${VERT_LABELS[p.vertical]}</td>
          <td>${p.value}</td>
          <td>${STAGE_LABELS[p.stage]}</td>
          <td>${p.gc || '—'}</td>
        </tr>`).join('')}
      </tbody>
    </table>
    ${csvRows.length > 5 ? `<p style="font-size:12px;color:#6b6a67;margin:8px 0 0;">Showing 5 of ${csvRows.length} rows. All will be imported.</p>` : ''}
  `;
  goImportStep(3);
}

function doImport() {
  const mapping = getMapping();
  const imported = csvRows.map(r => rowToProject(r, mapping)).filter(p => p.name !== 'Unnamed project' || p.gc);
  projects = [...imported, ...projects];
  save();
  document.getElementById('importMsg').textContent = imported.length + ' projects imported from BuildingConnected.';
  document.getElementById('importSuccess').style.display = 'flex';
  document.getElementById('importedList').innerHTML = imported.map(p => projRowHTML(p, false)).join('');
  goImportStep(4);
}

function goImportStep(n) {
  document.querySelectorAll('.import-step').forEach((s, i) => s.classList.toggle('active', i === n-1));
  ['ps1','ps2','ps3','ps4'].forEach((id, i) => {
    const el = document.getElementById(id);
    el.className = 'pstep' + (i+1 < n ? ' done' : i+1 === n ? ' active' : '');
  });
}

function resetImporter() {
  csvHeaders = []; csvRows = [];
  document.getElementById('fileInfo').style.display = 'none';
  document.getElementById('fileInput').value = '';
  document.getElementById('importSuccess').style.display = 'none';
  goImportStep(1);
}

// ── Boot ───────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);
