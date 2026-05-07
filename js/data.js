// ── Constants ──────────────────────────────────────────────────────────────
const VERT_LABELS  = { health:'Healthcare', gov:"Gov't", edu:'Higher Ed', k12:'K-12', corp:'Corporate' };
const VERT_COLORS  = { health:'#1D9E75', gov:'#378ADD', edu:'#EF9F27', k12:'#D4537E', corp:'#888780' };
const VERT_CLASS   = { health:'v-health', gov:'v-gov', edu:'v-edu', k12:'v-k12', corp:'v-corp' };
const STAGE_LABELS = { hot:'Act now', warm:'Warm lead', watch:'Watch', bid:'Out to bid' };
const STAGE_CLASS  = { hot:'pill-hot', warm:'pill-warm', watch:'pill-watch', bid:'pill-bid' };

const MARKETS = [
  { key:'Louisville',    tier:1,    x:202, y:205 },
  { key:'Lexington',     tier:1,    x:400, y:195 },
  { key:'N. Kentucky',   tier:1,    x:318, y:122 },
  { key:'Frankfort',     tier:null, x:352, y:172 },
  { key:'Georgetown',    tier:2,    x:432, y:155 },
  { key:'Elizabethtown', tier:2,    x:235, y:232 },
  { key:'Bowling Green', tier:2,    x:268, y:272 },
  { key:'Other KY',      tier:null, x:500, y:170 },
];

const SOURCES = [
  { icon:'ti-building-bank', bg:'#E6F1FB', ic:'#185FA5', name:'State funding allocations', desc:'Kentucky Finance Cabinet · Biennial budget', count:'Frankfort' },
  { icon:'ti-file-certificate', bg:'#EAF3DE', ic:'#3B6D11', name:'Building permits', desc:'City/county clerk portals · KBPR', count:'All markets' },
  { icon:'ti-gavel', bg:'#FAEEDA', ic:'#854F0B', name:'Bid boards', desc:'Dodge, BuildingConnected, Lynn Imaging', count:'Active bids' },
  { icon:'ti-school', bg:'#FBEAF0', ic:'#993556', name:'Higher Ed capital plans', desc:'CPE · UK, WKU, NKU, EKU plans', count:'Public docs' },
  { icon:'ti-building', bg:'#E1F5EE', ic:'#0F6E56', name:'Commercial RE listings', desc:'CoStar · broker impact sheets', count:'Pre-market' },
  { icon:'ti-news', bg:'#F1EFE8', ic:'#5F5E5A', name:'Local business press', desc:"Lex Herald-Leader · C-J · BG Daily News", count:'Monitor' },
];

const QUICK_LINKS = [
  { icon:'ti-school',         label:'Search KY higher ed capital plans',     url:'https://cpe.ky.gov/data/capitalprojects.html' },
  { icon:'ti-file-text',      label:'Search permits in Tier 2 cities',        url:'https://dept-hbc-ky.smartgovcommunity.com/' },
  { icon:'ti-building-bank',  label:'Check Frankfort state funding',          url:'https://finance.ky.gov/Pages/default.aspx' },
  { icon:'ti-building',       label:'Find building sales in growth markets',  url:'https://apps.lrc.ky.gov/LegislativeRecord/' },
  { icon:'ti-gavel',          label:'BuildingConnected bid board',            url:'https://buildingconnected.com' },
  { icon:'ti-map-pin',        label:'KY commercial real estate — CoStar',     url:'https://www.costar.com' },
];

// ── Seed projects (replace with localStorage data if present) ──────────────
const SEED_PROJECTS = [
  { id:1, name:'NKY Medical Center Expansion',     market:'N. Kentucky',   vertical:'health', value:'$4.2M', stage:'hot',   tier:'1', gc:'Turner Construction',  bc:'', products:['Headwalls','Casework'], notes:'Strong healthcare vertical fit', added:'Apr 28' },
  { id:2, name:'Ford Battery Plant Campus Interiors', market:'Elizabethtown', vertical:'corp',   value:'$3.8M', stage:'hot',   tier:'2', gc:'Messer Construction',  bc:'', products:['Furniture','Prefab walls'], notes:'Ford BlueOval SK battery campus', added:'Apr 28' },
  { id:3, name:'WKU Student Union Renovation',     market:'Bowling Green', vertical:'edu',    value:'$2.1M', stage:'hot',   tier:'2', gc:'',                     bc:'', products:['Furniture','Glass fronts'], notes:'Western Kentucky University', added:'Apr 28' },
  { id:4, name:'Fayette County Schools HQ',        market:'Lexington',     vertical:'k12',    value:'$1.6M', stage:'hot',   tier:'1', gc:'',                     bc:'', products:['Casework','Furniture'], notes:'', added:'Apr 28' },
  { id:5, name:'Frankfort State Office Building',  market:'Frankfort',     vertical:'gov',    value:'$2.9M', stage:'warm',  tier:'1', gc:'',                     bc:'', products:['Furniture'], notes:'State-funded, keep eye on budget allocation', added:'Apr 28' },
  { id:6, name:'Toyota Georgetown Admin Complex',  market:'Georgetown',    vertical:'corp',   value:'$1.4M', stage:'hot',   tier:'2', gc:'',                     bc:'', products:['Furniture','Interior design'], notes:'Toyota Manufacturing KY expansion', added:'Apr 28' },
  { id:7, name:'UK Healthcare Pavilion F',         market:'Lexington',     vertical:'health', value:'$5.1M', stage:'bid',   tier:'1', gc:'Whiting-Turner',       bc:'', products:['Headwalls','Casework','Glass fronts'], notes:'University of Kentucky Health', added:'Apr 28' },
  { id:8, name:'Jefferson County Public Schools',  market:'Louisville',    vertical:'k12',    value:'$1.2M', stage:'warm',  tier:'1', gc:'',                     bc:'', products:['Furniture','Casework'], notes:'', added:'Apr 28' },
  { id:9, name:'Norton Children\'s Hospital Wing', market:'Louisville',    vertical:'health', value:'$3.3M', stage:'watch', tier:'1', gc:'Gilbane Building',     bc:'', products:['Headwalls','Casework'], notes:'', added:'Apr 28' },
  { id:10, name:'KY Community College NKY Campus', market:'N. Kentucky',   vertical:'edu',    value:'$1.8M', stage:'bid',   tier:'1', gc:'',                     bc:'', products:['Furniture','Glass fronts'], notes:'KCTCS NKY campus build-out', added:'Apr 28' },
  { id:11, name:'Louisville Metro Gov\'t Center',  market:'Louisville',    vertical:'gov',    value:'$2.2M', stage:'watch', tier:'1', gc:'',                     bc:'', products:['Furniture'], notes:'', added:'Apr 28' },
  { id:12, name:'CHI St. Joseph Hospital Reno',    market:'Lexington',     vertical:'health', value:'$2.7M', stage:'warm',  tier:'1', gc:'',                     bc:'', products:['Headwalls','Casework'], notes:'', added:'Apr 28' },
];
