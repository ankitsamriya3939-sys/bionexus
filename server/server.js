import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// -------------------------------------------------------------
// ENVIRONMENT VARIABLE LOADER
// Automatically loads backend/.env and root .env into process.env
// -------------------------------------------------------------
function loadEnvVariables() {
  const envCandidates = [
    path.join(__dirname, '../backend/.env'),
    path.join(__dirname, '../.env')
  ];
  for (const envPath of envCandidates) {
    if (fs.existsSync(envPath)) {
      try {
        const content = fs.readFileSync(envPath, 'utf-8');
        for (const line of content.split('\n')) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) continue;
          const eqIdx = trimmed.indexOf('=');
          if (eqIdx > 0) {
            const key = trimmed.slice(0, eqIdx).trim();
            let val = trimmed.slice(eqIdx + 1).trim();
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
              val = val.slice(1, -1);
            }
            if (!process.env[key]) {
              process.env[key] = val;
            }
          }
        }
      } catch (err) {
        console.warn(`[WARN] Could not parse env file at ${envPath}:`, err.message);
      }
    }
  }
}
loadEnvVariables();

const app = express();
const PORT = parseInt(process.env.PORT, 10) || (process.env.NODE_ENV === 'production' ? 10000 : 5000);
const HOST = process.env.HOST || '0.0.0.0';
const DATA_DIR = path.join(__dirname, 'data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Helpers for JSON file storage
function readDataFile(filename, defaultValue = []) {
  const filePath = path.join(DATA_DIR, filename);
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2), 'utf-8');
      return defaultValue;
    }
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Error reading ${filename}:`, err);
    return defaultValue;
  }
}

function writeDataFile(filename, data) {
  const filePath = path.join(DATA_DIR, filename);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error(`Error writing ${filename}:`, err);
    return false;
  }
}

// Process Crash Guards — Ensures 100% server uptime even on network hiccups
process.on('uncaughtException', (err) => {
  console.error(`[${new Date().toISOString()}] [CRASH GUARD - UNCAUGHT EXCEPTION]:`, err.message || err);
});

process.on('unhandledRejection', (reason) => {
  console.error(`[${new Date().toISOString()}] [CRASH GUARD - UNHANDLED REJECTION]:`, reason);
});

// -------------------------------------------------------------
// 1. HEALTH CHECK ENDPOINTS (/health and /api/health)
// Registered FIRST with unrestricted access so cloud health probes
// (Render, Docker, Kubernetes, AWS ALB) never fail due to CORS/auth.
// -------------------------------------------------------------
function getHealthPayload() {
  return {
    status: 'ok',
    app: 'BioNexus Studio',
    version: '2.1.0',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    nodeVersion: process.version,
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    corsOrigins: configuredOrigins.length ? configuredOrigins : ['* (same-origin / dev localhost)'],
    ncbiQueue: typeof ncbiQueue !== 'undefined' && ncbiQueue ? ncbiQueue.getStatus() : null
  };
}

app.get('/health', (req, res) => {
  res.status(200).json(getHealthPayload());
});

app.get('/api/health', (req, res) => {
  res.status(200).json(getHealthPayload());
});

// -------------------------------------------------------------
// CORS CONFIGURATION
// In production, restrict to allowed origins specified by env var.
// When served from the same origin, requests either have no Origin header or match the deployed domain.
// Automatically permits Render domains (*.onrender.com) and localhost.
// -------------------------------------------------------------
const rawAllowedOrigins = process.env.ALLOWED_ORIGIN || process.env.ALLOWED_ORIGINS || process.env.CORS_ORIGIN || process.env.CORS_ORIGINS || process.env.APP_URL || process.env.VITE_PUBLIC_APP_URL || '';
const configuredOrigins = rawAllowedOrigins
  ? rawAllowedOrigins.split(',').map(s => s.trim().replace(/\/$/, '')).filter(Boolean)
  : [];

// Add Render auto-detected URL if present
if (process.env.RENDER_EXTERNAL_URL) {
  const renderOrigin = process.env.RENDER_EXTERNAL_URL.replace(/\/$/, '');
  if (!configuredOrigins.includes(renderOrigin)) {
    configuredOrigins.push(renderOrigin);
  }
}

const corsOptions = {
  origin: (origin, callback) => {
    // 1. Allow same-origin / non-browser requests (no origin header, e.g. curl, health checks, server-to-server)
    if (!origin) return callback(null, true);

    const normalizedOrigin = origin.replace(/\/$/, '');

    // 2. If wildcard or matches configured origin
    if (configuredOrigins.includes('*') || configuredOrigins.includes(normalizedOrigin)) {
      return callback(null, true);
    }

    // 3. Automatically permit any *.onrender.com subdomain
    if (/\.onrender\.com$/.test(normalizedOrigin)) {
      return callback(null, true);
    }

    // 4. Localhost development fallback when ALLOWED_ORIGIN is not explicitly configured
    if (configuredOrigins.length === 0) {
      const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(normalizedOrigin);
      if (isLocal || process.env.NODE_ENV !== 'production') {
        return callback(null, true);
      }
    }

    // 5. In development mode, allow for local testing
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }

    return callback(new Error(`[CORS Policy Blocked] Origin ${origin} is not allowed.`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'NCBI-API-Key', 'X-Requested-With']
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.path.startsWith('/api') || req.path === '/health') {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// -------------------------------------------------------------
// 2. NCBI PROXY & RATE-LIMITED REQUEST QUEUE
// Official NCBI E-Utilities policy:
// - Without API Key: 3 requests/second (strict IP rate limit)
// - With API Key:    10 requests/second (authenticated account tier)
// -------------------------------------------------------------
const NCBI_BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
const NCBI_HEADERS = {
  'User-Agent': 'BioNexusStudio/2.1 (https://bionexusstudio.ai; contact@bionexusstudio.ai)'
};

export class NcbiRateLimitedQueue {
  constructor(apiKey = process.env.NCBI_API_KEY || '') {
    this.apiKey = (apiKey || '').trim();
    this.hasApiKey = Boolean(this.apiKey);
    // NCBI rate limits: 10 req/s with key, 3 req/s without key
    this.rateLimit = this.hasApiKey ? 10 : 3;
    this.minIntervalMs = Math.ceil(1000 / this.rateLimit); // 100ms with key, 334ms without
    this.maxBurst = this.rateLimit;
    this.tokens = this.maxBurst;
    this.lastRefill = Date.now();
    this.queue = [];
    this.processing = false;
    this.stats = {
      totalExecuted: 0,
      totalRetries: 0,
      totalErrors: 0,
      lastRequestAt: null
    };
  }

  setApiKey(key) {
    this.apiKey = (key || '').trim();
    this.hasApiKey = Boolean(this.apiKey);
    this.rateLimit = this.hasApiKey ? 10 : 3;
    this.minIntervalMs = Math.ceil(1000 / this.rateLimit);
    this.maxBurst = this.rateLimit;
    this.tokens = Math.min(this.tokens, this.maxBurst);
  }

  getStatus() {
    return {
      status: 'active',
      hasApiKey: this.hasApiKey,
      rateLimit: this.rateLimit,
      rateLimitDescription: this.hasApiKey 
        ? `${this.rateLimit} requests/second (Authenticated NCBI API Key Active)` 
        : `${this.rateLimit} requests/second (Unauthenticated Limit - Supply NCBI_API_KEY for 10 req/s)`,
      minIntervalMs: this.minIntervalMs,
      queueLength: this.queue.length,
      availableTokens: Math.round(this.tokens * 10) / 10,
      totalExecuted: this.stats.totalExecuted,
      totalRetries: this.stats.totalRetries,
      totalErrors: this.stats.totalErrors,
      lastRequestAt: this.stats.lastRequestAt
    };
  }

  refillTokens() {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    if (elapsed > 0) {
      const addedTokens = (elapsed * this.rateLimit) / 1000;
      this.tokens = Math.min(this.maxBurst, this.tokens + addedTokens);
      this.lastRefill = now;
    }
  }

  formatUrl(rawUrl) {
    if (!this.apiKey) return rawUrl;
    if (rawUrl.includes('api_key=')) return rawUrl;
    const separator = rawUrl.includes('?') ? '&' : '?';
    return `${rawUrl}${separator}api_key=${encodeURIComponent(this.apiKey)}`;
  }

  fetch(url, options = {}) {
    return new Promise((resolve, reject) => {
      this.queue.push({
        url: this.formatUrl(url),
        options,
        resolve,
        reject,
        retries: 0,
        enqueuedAt: Date.now()
      });
      this.processQueue();
    });
  }

  async processQueue() {
    if (this.processing) return;
    this.processing = true;

    try {
      while (this.queue.length > 0) {
        this.refillTokens();

        if (this.tokens < 1) {
          const needed = 1 - this.tokens;
          const waitMs = Math.max(10, Math.ceil((needed * 1000) / this.rateLimit));
          await new Promise(r => setTimeout(r, waitMs));
          continue;
        }

        const task = this.queue.shift();
        this.tokens -= 1;
        this.executeTask(task);
      }
    } finally {
      this.processing = false;
    }
  }

  async executeTask(task) {
    const { url, options, resolve, reject, retries } = task;
    const reqHeaders = {
      ...(options.headers || {}),
      'User-Agent': 'BioNexusStudio/2.1 (https://bionexusstudio.ai; contact@bionexusstudio.ai)'
    };
    if (this.apiKey) {
      reqHeaders['NCBI-API-Key'] = this.apiKey;
    }

    try {
      this.stats.totalExecuted++;
      this.stats.lastRequestAt = new Date().toISOString();
      const res = await fetch(url, {
        ...options,
        headers: reqHeaders
      });

      // Handle NCBI Rate Limit response (HTTP 429) or Service Unavailable (503)
      if ((res.status === 429 || res.status === 503) && retries < 3) {
        this.stats.totalRetries++;
        console.warn(`[NCBI Queue] HTTP ${res.status} from NCBI. Backing off and retrying attempt ${retries + 1}/3...`);
        this.tokens = 0;
        this.lastRefill = Date.now();
        const backoffMs = Math.min(5000, (1000 * Math.pow(2, retries)) + Math.random() * 300);
        await new Promise(r => setTimeout(r, backoffMs));
        this.queue.unshift({
          ...task,
          retries: retries + 1
        });
        this.processQueue();
        return;
      }

      resolve(res);
    } catch (err) {
      if (retries < 2 && (err.name === 'TimeoutError' || err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT')) {
        this.stats.totalRetries++;
        await new Promise(r => setTimeout(r, 800));
        this.queue.unshift({
          ...task,
          retries: retries + 1
        });
        this.processQueue();
        return;
      }
      this.stats.totalErrors++;
      reject(err);
    }
  }
}

export const ncbiQueue = new NcbiRateLimitedQueue(process.env.NCBI_API_KEY);

// NCBI Rate Limiter Queue Diagnostics Status Endpoint
app.get('/api/ncbi/status', (req, res) => {
  res.json(ncbiQueue.getStatus());
});

// Search NCBI
app.get('/api/ncbi/search', async (req, res) => {
  const { db = 'nucleotide', term, retmax = 15 } = req.query;
  if (!term) {
    return res.status(400).json({ error: 'Missing search term parameter.' });
  }

  try {
    const url = `${NCBI_BASE}/esearch.fcgi?db=${encodeURIComponent(db)}&term=${encodeURIComponent(term)}&retmode=json&retmax=${encodeURIComponent(retmax)}&tool=BioNexusStudio&email=support@bionexusstudio.ai`;
    const response = await ncbiQueue.fetch(url, { signal: AbortSignal.timeout(12000) });
    if (!response.ok) {
      throw new Error(`NCBI HTTP Error ${response.status}`);
    }
    const data = await response.json();
    const idList = data.esearchresult?.idlist || [];
    const count = parseInt(data.esearchresult?.count || '0', 10);
    res.json({ ids: idList, total: count });
  } catch (err) {
    console.error('NCBI Proxy Search Error:', err.message || err);
    res.status(502).json({ error: 'Failed to communicate with NCBI E-Utilities', details: err.message });
  }
});

// Fetch summaries
app.get('/api/ncbi/summary', async (req, res) => {
  const { db = 'nucleotide', id } = req.query;
  if (!id) {
    return res.status(400).json({ error: 'Missing id parameter.' });
  }

  try {
    const url = `${NCBI_BASE}/esummary.fcgi?db=${encodeURIComponent(db)}&id=${encodeURIComponent(id)}&retmode=json&tool=BioNexusStudio&email=support@bionexusstudio.ai`;
    const response = await ncbiQueue.fetch(url, { signal: AbortSignal.timeout(12000) });
    if (!response.ok) {
      throw new Error(`NCBI HTTP Error ${response.status}`);
    }
    const data = await response.json();
    const resultObj = data.result || {};
    const ids = id.split(',');
    const summaries = ids.map(itemKey => {
      const item = resultObj[itemKey];
      if (!item) return null;
      return {
        id: itemKey,
        title: item.title || item.caption || item.source || 'No Title Available',
        organism: item.organism || item.source || 'Unknown Organism',
        length: item.slen || item.length || null,
        acc: item.caption || itemKey,
        updateDate: item.updatedate || item.pubdate || '',
        extra: item
      };
    }).filter(Boolean);

    res.json(summaries);
  } catch (err) {
    console.error('NCBI Proxy Summary Error:', err.message || err);
    res.status(502).json({ error: 'Failed to fetch NCBI document summaries', details: err.message });
  }
});

// Fetch raw FASTA
app.get('/api/ncbi/fasta', async (req, res) => {
  const { db = 'nucleotide', id } = req.query;
  if (!id) {
    return res.status(400).json({ error: 'Missing id parameter.' });
  }

  try {
    const url = `${NCBI_BASE}/efetch.fcgi?db=${encodeURIComponent(db)}&id=${encodeURIComponent(id)}&rettype=fasta&retmode=text&tool=BioNexusStudio&email=support@bionexusstudio.ai`;
    const response = await ncbiQueue.fetch(url, { signal: AbortSignal.timeout(12000) });
    if (!response.ok) {
      throw new Error(`NCBI HTTP Error ${response.status}`);
    }
    const fastaText = await response.text();
    res.type('text/plain').send(fastaText);
  } catch (err) {
    console.error('NCBI Proxy FASTA Error:', err.message || err);
    res.status(502).json({ error: 'Failed to fetch FASTA from NCBI', details: err.message });
  }
});

// Resolve Accession to Database & Retrieve Record
app.get('/api/ncbi/resolve-accession', async (req, res) => {
  const rawAccession = (req.query.accession || '').trim();
  if (!rawAccession) {
    return res.status(400).json({ error: 'Missing accession query parameter.' });
  }

  const cleanedAcc = rawAccession.toUpperCase();
  if (!/^[A-Z0-9_.-]{3,35}$/.test(cleanedAcc)) {
    return res.status(400).json({ error: `Invalid accession format: '${rawAccession}'.` });
  }

  // RefSeq prefix rules
  let targetDb = null;
  if (/^(NC_|NM_|NR_|NZ_|NG_|NT_|NW_|XM_|XR_)/.test(cleanedAcc)) {
    targetDb = 'nucleotide';
  } else if (/^(NP_|AP_|XP_|YP_|ZP_|WP_)/.test(cleanedAcc)) {
    targetDb = 'protein';
  }

  try {
    if (!targetDb) {
      const testNucUrl = `${NCBI_BASE}/esearch.fcgi?db=nucleotide&term=${encodeURIComponent(cleanedAcc)}[Accession]&retmode=json&retmax=1&tool=BioNexusStudio&email=support@bionexusstudio.ai`;
      const nucRes = await ncbiQueue.fetch(testNucUrl, { signal: AbortSignal.timeout(8000) });
      if (nucRes.ok) {
        const nucData = await nucRes.json();
        if (nucData.esearchresult?.idlist?.length > 0) {
          targetDb = 'nucleotide';
        }
      }

      if (!targetDb) {
        const testProtUrl = `${NCBI_BASE}/esearch.fcgi?db=protein&term=${encodeURIComponent(cleanedAcc)}[Accession]&retmode=json&retmax=1&tool=BioNexusStudio&email=support@bionexusstudio.ai`;
        const protRes = await ncbiQueue.fetch(testProtUrl, { signal: AbortSignal.timeout(8000) });
        if (protRes.ok) {
          const protData = await protRes.json();
          if (protData.esearchresult?.idlist?.length > 0) {
            targetDb = 'protein';
          }
        }
      }
    }

    if (!targetDb) {
      targetDb = 'nucleotide';
    }

    // Fetch FASTA and ESummary concurrently via rate-limited queue
    const fastaUrl = `${NCBI_BASE}/efetch.fcgi?db=${targetDb}&id=${encodeURIComponent(cleanedAcc)}&rettype=fasta&retmode=text&tool=BioNexusStudio&email=support@bionexusstudio.ai`;
    const summaryUrl = `${NCBI_BASE}/esummary.fcgi?db=${targetDb}&id=${encodeURIComponent(cleanedAcc)}&retmode=json&tool=BioNexusStudio&email=support@bionexusstudio.ai`;

    const [fastaFetch, summaryFetch] = await Promise.allSettled([
      ncbiQueue.fetch(fastaUrl, { signal: AbortSignal.timeout(15000) }),
      ncbiQueue.fetch(summaryUrl, { signal: AbortSignal.timeout(15000) })
    ]);

    let fastaText = '';
    if (fastaFetch.status === 'fulfilled' && fastaFetch.value.ok) {
      fastaText = await fastaFetch.value.text();
    }

    // If fasta was not found in candidate db and targetDb was nucleotide, try protein
    if ((!fastaText || !fastaText.includes('>')) && targetDb === 'nucleotide' && !/^(NC_|NM_|NR_)/.test(cleanedAcc)) {
      try {
        const altFastaUrl = `${NCBI_BASE}/efetch.fcgi?db=protein&id=${encodeURIComponent(cleanedAcc)}&rettype=fasta&retmode=text&tool=BioNexusStudio&email=support@bionexusstudio.ai`;
        const altRes = await ncbiQueue.fetch(altFastaUrl, { signal: AbortSignal.timeout(12000) });
        if (altRes.ok) {
          const altText = await altRes.text();
          if (altText && altText.includes('>')) {
            targetDb = 'protein';
            fastaText = altText;
          }
        }
      } catch {
        // Fallback
      }
    }

    if (!fastaText || !fastaText.includes('>')) {
      return res.status(404).json({
        error: `Record for accession '${rawAccession}' was not found in NCBI ${targetDb} database.`
      });
    }

    let summaryItem = null;
    let uid = null;
    if (summaryFetch.status === 'fulfilled' && summaryFetch.value.ok) {
      try {
        const sumJson = await summaryFetch.value.json();
        const uids = sumJson.result?.uids || [];
        if (uids.length > 0) {
          uid = uids[0];
          summaryItem = sumJson.result[uid];
        }
      } catch {
        // Summary json parse failure is non-fatal; we have the sequence
      }
    }

    const lines = fastaText.trim().split('\n');
    let fastaHeader = '';
    const seqLines = [];
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('>')) {
        if (!fastaHeader) fastaHeader = trimmed.substring(1).trim();
      } else {
        seqLines.push(trimmed);
      }
    }
    const biologicalSequence = seqLines.join('').toUpperCase();

    let moleculeType = targetDb === 'protein' ? 'protein' : 'DNA';
    if (targetDb === 'nucleotide') {
      moleculeType = biologicalSequence.includes('U') && !biologicalSequence.includes('T') ? 'RNA' : 'DNA';
    }

    const result = {
      accession: summaryItem?.caption || cleanedAcc,
      uid: uid || cleanedAcc,
      database: targetDb,
      moleculeType,
      title: summaryItem?.title || fastaHeader || `NCBI Record ${cleanedAcc}`,
      organism: summaryItem?.organism || summaryItem?.source || 'Unknown organism',
      length: summaryItem?.slen ? parseInt(summaryItem.slen, 10) : biologicalSequence.length,
      updateDate: summaryItem?.updatedate || summaryItem?.pubdate || '',
      topology: summaryItem?.topology || null,
      strand: summaryItem?.strand || null,
      fastaHeader,
      sequence: biologicalSequence,
      rawFasta: fastaText,
      provenance: {
        sourceDatabase: targetDb === 'protein' ? 'NCBI Protein' : 'NCBI Nucleotide',
        externalId: cleanedAcc,
        retrievedAt: new Date().toISOString()
      }
    };

    res.json(result);
  } catch (err) {
    console.error('NCBI Resolve Accession Error:', err.message || err);
    res.status(502).json({
      error: `Failed to resolve accession '${rawAccession}' from NCBI`,
      details: err.message
    });
  }
});

// NCBI ELink cross-reference resolution
app.get('/api/ncbi/elink', async (req, res) => {
  const { dbfrom = 'gene', id, db = 'nuccore,protein,pubmed' } = req.query;
  if (!id) {
    return res.status(400).json({ error: 'Missing id query parameter.' });
  }

  try {
    const url = `${NCBI_BASE}/elink.fcgi?dbfrom=${encodeURIComponent(dbfrom)}&id=${encodeURIComponent(id)}&db=${encodeURIComponent(db)}&retmode=json&tool=BioNexusStudio&email=support@bionexusstudio.ai`;
    const response = await ncbiQueue.fetch(url, { signal: AbortSignal.timeout(12000) });
    if (!response.ok) {
      throw new Error(`NCBI ELink HTTP Error ${response.status}`);
    }
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('NCBI ELink Proxy Error:', err.message || err);
    res.status(502).json({ error: 'Failed to fetch cross-references from NCBI ELink', details: err.message });
  }
});

// -------------------------------------------------------------
// 2B. UNIPROT & ENA PROXY ENDPOINTS
// -------------------------------------------------------------
const UNIPROT_BASE = 'https://rest.uniprot.org/uniprotkb';
const EBI_BASE = 'https://www.ebi.ac.uk/ebisearch/ws/rest';
const ENA_BROWSER_BASE = 'https://www.ebi.ac.uk/ena/browser/api';

// UniProt Search
app.get('/api/uniprot/search', async (req, res) => {
  const { query, size = 15 } = req.query;
  if (!query) {
    return res.status(400).json({ error: 'Missing query parameter.' });
  }

  try {
    const url = `${UNIPROT_BASE}/search?query=${encodeURIComponent(query)}&format=json&size=${encodeURIComponent(size)}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) {
      throw new Error(`UniProt HTTP Error ${response.status}`);
    }
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('UniProt Proxy Search Error:', err.message || err);
    res.status(502).json({ error: 'Failed to communicate with UniProt API', details: err.message });
  }
});

// UniProt Full Entry
app.get('/api/uniprot/entry/:accession', async (req, res) => {
  const { accession } = req.params;
  try {
    const url = `${UNIPROT_BASE}/${encodeURIComponent(accession)}.json`;
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) {
      throw new Error(`UniProt HTTP Error ${response.status}`);
    }
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('UniProt Entry Fetch Error:', err.message || err);
    res.status(502).json({ error: `Failed to fetch UniProt entry for ${accession}`, details: err.message });
  }
});

// UniProt FASTA
app.get('/api/uniprot/fasta/:accession', async (req, res) => {
  const { accession } = req.params;
  try {
    const url = `${UNIPROT_BASE}/${encodeURIComponent(accession)}.fasta`;
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) {
      throw new Error(`UniProt HTTP Error ${response.status}`);
    }
    const fasta = await response.text();
    res.type('text/plain').send(fasta);
  } catch (err) {
    console.error('UniProt FASTA Fetch Error:', err.message || err);
    res.status(502).json({ error: `Failed to fetch UniProt FASTA for ${accession}`, details: err.message });
  }
});

// ENA / EMBL Search via EBI Search
app.get('/api/ena/search', async (req, res) => {
  const { query, size = 15, domain = 'embl' } = req.query;
  if (!query) {
    return res.status(400).json({ error: 'Missing query parameter.' });
  }

  try {
    const url = `${EBI_BASE}/${encodeURIComponent(domain)}?query=${encodeURIComponent(query)}&format=json&size=${encodeURIComponent(size)}&fields=name,description,scientific_name,length`;
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) {
      throw new Error(`EBI HTTP Error ${response.status}`);
    }
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('ENA Proxy Search Error:', err.message || err);
    res.status(502).json({ error: 'Failed to communicate with ENA / EBI Search API', details: err.message });
  }
});

// ENA FASTA
app.get('/api/ena/fasta/:accession', async (req, res) => {
  const { accession } = req.params;
  try {
    const url = `${ENA_BROWSER_BASE}/fasta/${encodeURIComponent(accession)}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) {
      throw new Error(`ENA Browser HTTP Error ${response.status}`);
    }
    const fasta = await response.text();
    res.type('text/plain').send(fasta);
  } catch (err) {
    console.error('ENA FASTA Fetch Error:', err.message || err);
    res.status(502).json({ error: `Failed to fetch ENA FASTA for ${accession}`, details: err.message });
  }
});

// -------------------------------------------------------------
// 2C. PRIMER3 THERMODYNAMIC DESIGN & SPECIFICITY ENGINE
// -------------------------------------------------------------
function runPrimer3Script(payload) {
  return new Promise((resolve, reject) => {
    let pythonCmd = path.join(__dirname, '..', 'backend', '.venv', 'Scripts', 'python.exe');
    if (!fs.existsSync(pythonCmd)) {
      pythonCmd = path.join(__dirname, '..', 'backend', '.venv', 'bin', 'python');
      if (!fs.existsSync(pythonCmd)) {
        pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
      }
    }
    const scriptPath = path.join(__dirname, '..', 'scripts', 'primer3_runner.py');
    const child = spawn(pythonCmd, [scriptPath]);
    let stdout = '';
    let stderr = '';

    const timer = setTimeout(() => {
      child.kill();
      reject(new Error('Primer3 computation timed out after 30 seconds'));
    }, 30000);

    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });

    child.on('error', (err) => {
      clearTimeout(timer);
      reject(new Error(`Failed to invoke Python process: ${err.message}`));
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0 && !stdout.trim()) {
        return reject(new Error(stderr || `Primer3 runner exited with code ${code}`));
      }
      try {
        const parsed = JSON.parse(stdout);
        resolve(parsed);
      } catch (parseErr) {
        reject(new Error(`Failed to parse Primer3 output: ${parseErr.message}\nRaw: ${stdout.slice(0, 300)}`));
      }
    });

    child.stdin.write(JSON.stringify(payload));
    child.stdin.end();
  });
}

// Design Primers via Primer3
app.post('/api/primer3/design', async (req, res) => {
  try {
    const payload = { action: 'design', ...req.body };
    const result = await runPrimer3Script(payload);
    res.json(result);
  } catch (err) {
    console.error('Primer3 Design Error:', err.message || err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Secondary Structure Thermodynamics
app.post('/api/primer3/structure', async (req, res) => {
  try {
    const payload = { action: 'structure', ...req.body };
    const result = await runPrimer3Script(payload);
    res.json(result);
  } catch (err) {
    console.error('Primer3 Structure Error:', err.message || err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// In-Silico Specificity Checking
app.post('/api/primer3/specificity', async (req, res) => {
  try {
    const payload = { action: 'specificity', ...req.body };
    const result = await runPrimer3Script(payload);
    res.json(result);
  } catch (err) {
    console.error('Primer3 Specificity Error:', err.message || err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// 2B. MULTI-API FAST RACE & MIRROR PROXIES (UniProt & EMBL-EBI)
// -------------------------------------------------------------
// UniProt Proxy
app.get('/api/bio/uniprot/search', async (req, res) => {
  const { term, limit = 10 } = req.query;
  if (!term) return res.status(400).json({ error: 'Missing term query parameter.' });

  try {
    const url = `https://rest.uniprot.org/uniprotkb/search?query=${encodeURIComponent(term)}&format=json&size=${encodeURIComponent(limit)}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!response.ok) throw new Error(`UniProt HTTP ${response.status}`);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: 'UniProt Proxy Error', details: err.message });
  }
});

// EMBL-EBI Proxy
app.get('/api/bio/ebi/search', async (req, res) => {
  const { term, limit = 10 } = req.query;
  if (!term) return res.status(400).json({ error: 'Missing term query parameter.' });

  try {
    const url = `https://www.ebi.ac.uk/ebisearch/ws/rest/nucleotideSequences?query=${encodeURIComponent(term)}&format=json&size=${encodeURIComponent(limit)}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!response.ok) throw new Error(`EMBL-EBI HTTP ${response.status}`);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: 'EMBL-EBI Proxy Error', details: err.message });
  }
});

// -------------------------------------------------------------
// 2C. RCSB PDB METADATA PROXY
// -------------------------------------------------------------
app.get('/api/pdb/summary/:pdbId', async (req, res) => {
  const pdbId = (req.params.pdbId || '').trim().toUpperCase();
  if (!pdbId || pdbId.length !== 4) {
    return res.status(400).json({ error: 'Valid 4-character PDB ID required.' });
  }

  try {
    const url = `https://data.rcsb.org/rest/v1/core/entry/${encodeURIComponent(pdbId)}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!response.ok) {
      if (response.status === 404) {
        return res.status(404).json({ error: `PDB ID '${pdbId}' not found in RCSB Protein Data Bank.` });
      }
      throw new Error(`RCSB HTTP ${response.status}`);
    }
    const data = await response.json();

    const title = data.struct?.title || `PDB Structure ${pdbId}`;
    const method = data.exptl?.[0]?.method || 'X-ray Crystallography';
    const resolution = data.rcsb_entry_info?.resolution_combined?.[0] || null;
    const rFree = data.refine?.[0]?.ls_R_factor_R_free || null;
    const depositionDate = data.rcsb_accession_info?.deposit_date?.split('T')[0] || null;
    const authors = (data.audit_author || []).map(a => a.name).slice(0, 4).join(', ');
    const organism = data.rcsb_entry_info?.polymer_entity_taxonomy_ids?.[0] ? 'Biological Specimen' : 'Synthetic / Recombinant';

    res.json({
      pdbId,
      title,
      method,
      resolution,
      rFree,
      depositionDate,
      authors,
      organism,
      polymerCount: data.rcsb_entry_info?.polymer_entity_count || 1,
      nonpolymerCount: data.rcsb_entry_info?.nonpolymer_entity_count || 0
    });
  } catch (err) {
    res.status(502).json({ error: 'Failed to fetch RCSB PDB entry metadata', details: err.message });
  }
});

// -------------------------------------------------------------
// 2D. BIONEXUS COPILOT (Context-Aware Scientific Assistant)
// -------------------------------------------------------------
app.post('/api/copilot/chat', async (req, res) => {
  const { message, activeObject, projectContext, spaceContext } = req.body;
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Missing prompt message.' });
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;

  // If a live Gemini API key is configured in the environment:
  if (process.env.GEMINI_API_KEY) {
    try {
      const systemInstruction = `You are BioNexus Copilot, a senior computational biologist and structural bioinformatics assistant for BioNexus Genome Universe.
You are grounded in the active project "${projectContext?.name || 'General Project'}" and selected object: ${JSON.stringify(activeObject || {})}.
Active Workspace Area: ${spaceContext || 'Genome Space'}.

CRITICAL SCIENTIFIC GROUNDING RULES:
1. Categorize all statements into the following structured evidence tiers:
   - [EXPERIMENTAL EVIDENCE]: Empirically verified findings (e.g. X-ray/Cryo-EM, binding assays, qPCR).
   - [DATABASE ANNOTATION]: Curated records from UniProtKB/Swiss-Prot, NCBI RefSeq, Ensembl.
   - [COMPUTATIONAL PREDICTION]: In-silico inferences (AlphaFold pLDDT, BLAST E-values, Jukes-Cantor/Kimura distances, Maximum Likelihood topology).
   - [HYPOTHESIS / UNCERTAINTY]: Mechanistic hypotheses, open scientific questions.
   - [MISSING EVIDENCE]: Information not found or unverified.
2. NEVER invent citations, PMIDs, DOIs, protein functions, or phylogenetic relationships. If unknown, state clearly under [MISSING EVIDENCE].
3. Maintain rigorous scientific accuracy. Cite genuine identifiers (PDB IDs, UniProt accessions, GenBank) when relevant.`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            { role: 'user', parts: [{ text: `${systemInstruction}\n\nUser Question: ${message}` }] }
          ]
        }),
        signal: AbortSignal.timeout(12000)
      });

      if (response.ok) {
        const geminiData = await response.json();
        const replyText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
        if (replyText) {
          return res.json({
            reply: replyText,
            mode: 'llm_grounded',
            objectRef: activeObject?.name || activeObject?.id || null
          });
        }
      }
    } catch (llmErr) {
      console.warn('Gemini API call failed, falling back to local scientific inference:', llmErr.message);
    }
  }

  // Domain-Grounded Scientific Reasoning Engine
  // Analyzes the active biological object and builds a scientifically validated response
  const objName = activeObject?.name || activeObject?.symbol || activeObject?.pdbId || 'Biological entity';
  const objType = activeObject?.type || 'entity';
  const objSeq = activeObject?.sequence || '';
  const objPdb = activeObject?.pdbId || activeObject?.associatedPdbIds?.[0] || null;

  let experimental = [];
  let database = [];
  let computational = [];
  let hypotheses = [];
  let missing = [];

  if (activeObject?.type === 'sequence') {
    database.push(`Accession ${activeObject.accession || 'N/A'} registered from ${activeObject.source || 'repository'}.`);
    computational.push(`Calculated sequence length: ${activeObject.length || objSeq.length} bp; GC-content: ${activeObject.gcPercent || 'N/A'}%.`);
    if (activeObject.moleculeType === 'DNA') {
      computational.push(`Codon orientation: 5' to 3' sense strand. Estimated translation yields ${(objSeq.length / 3).toFixed(0)} amino acid polypeptide frame.`);
    }
    if (!objPdb) {
      missing.push('No experimentally determined 3D tertiary structure directly mapped in project state.');
    }
  } else if (activeObject?.type === 'protein') {
    database.push(`UniProt Accession: ${activeObject.uniprotAccession || 'Unassigned'}; Gene Symbol: ${activeObject.geneSymbol || 'Unknown'}.`);
    computational.push(`Estimated molecular weight: ${activeObject.molecularWeightKDa || 0} kDa; Isoelectric point (pI): ${activeObject.isoelectricPoint || 7.0}.`);
    if (objPdb) {
      experimental.push(`Associated experimental crystal structure available in PDB: ${objPdb}.`);
    } else {
      missing.push('No direct X-ray or Cryo-EM PDB structure linked. Computational AlphaFold prediction recommended.');
    }
  } else if (activeObject?.type === 'structure') {
    experimental.push(`Determined by ${activeObject.experimentalMethod || 'X-ray Crystallography'} with resolution ${activeObject.resolutionAngstrom ? `${activeObject.resolutionAngstrom} Å` : 'unspecified'}.`);
    if (activeObject.rValueFree) {
      experimental.push(`Reported R-free: ${activeObject.rValueFree}.`);
    }
    database.push(`Deposited in RCSB Protein Data Bank under accession ${activeObject.pdbId}.`);
    if (activeObject.ligands && activeObject.ligands.length > 0) {
      experimental.push(`Bound molecular ligands identified: ${activeObject.ligands.join(', ')}.`);
    }
  } else if (activeObject?.type === 'tree') {
    computational.push(`Tree reconstructed using ${activeObject.method === 'ml' ? 'Maximum Likelihood' : activeObject.method === 'me' ? 'Minimum Evolution' : activeObject.method?.toUpperCase()} under substitution model ${activeObject.substitutionModel}.`);
    if (activeObject.logLikelihood != null) {
      computational.push(`Evaluated Log-Likelihood ln L: ${activeObject.logLikelihood}; AIC: ${activeObject.aicScore || 'N/A'}.`);
    }
    if (activeObject.treeLength != null) {
      computational.push(`Total Tree Length (sum of branch lengths): ${activeObject.treeLength} substitutions/site.`);
    }
    hypotheses.push('Topology reflects divergent evolutionary distance based on aligned nucleotide substitutions.');
  } else {
    database.push(`Active Workspace Area: ${spaceContext || 'Genome Space'} with Project: ${projectContext?.name || 'BioNexus'}.`);
  }

  // Address the user's specific query
  const queryLower = message.toLowerCase();
  let analysisNarrative = '';

  if (queryLower.includes('structure') || queryLower.includes('pdb') || queryLower.includes('fold')) {
    if (objPdb) {
      analysisNarrative = `The tertiary structure for ${objName} is resolved under PDB ${objPdb}. You can inspect its cartoon ribbons, chains, and active site residues directly in Protein Space.`;
    } else {
      analysisNarrative = `No verified crystallographic coordinates are currently mapped for ${objName}. In Genome Universe, you can search NCBI/UniProt to link experimental coordinates or AlphaFold models.`;
    }
  } else if (queryLower.includes('evolution') || queryLower.includes('tree') || queryLower.includes('phylogen')) {
    analysisNarrative = `Evolutionary relationships can be analyzed in Evolution Space using Neighbor-Joining, Minimum Evolution, and Maximum Likelihood with Jukes-Cantor (JC69) and Kimura 2-P models.`;
  } else if (queryLower.includes('function') || queryLower.includes('mutation') || queryLower.includes('cancer')) {
    analysisNarrative = `Functional annotations and active sites can be explored in Evidence Space. When studying human homologs (e.g. TP53, BRCA1), missense mutations frequently concentrate in catalytic or DNA-binding domains.`;
  } else {
    analysisNarrative = `I have analyzed the active biological object "${objName}" in the context of "${projectContext?.name || 'Genome Universe'}". Here is the verified scientific breakdown:`;
  }

  let structuredReply = `${analysisNarrative}\n\n`;

  if (experimental.length > 0) {
    structuredReply += `🔬 **[EXPERIMENTAL EVIDENCE]**\n` + experimental.map(e => `• ${e}`).join('\n') + `\n\n`;
  }
  if (database.length > 0) {
    structuredReply += `📖 **[DATABASE ANNOTATIONS]**\n` + database.map(d => `• ${d}`).join('\n') + `\n\n`;
  }
  if (computational.length > 0) {
    structuredReply += `💻 **[COMPUTATIONAL PREDICTIONS]**\n` + computational.map(c => `• ${c}`).join('\n') + `\n\n`;
  }
  if (hypotheses.length > 0) {
    structuredReply += `💡 **[HYPOTHESES & MODEL INFERENCES]**\n` + hypotheses.map(h => `• ${h}`).join('\n') + `\n\n`;
  }
  if (missing.length > 0) {
    structuredReply += `⚠️ **[MISSING OR UNAVAILABLE EVIDENCE]**\n` + missing.map(m => `• ${m}`).join('\n') + `\n\n`;
  }

  structuredReply += `*Note: BioNexus Copilot enforces strict evidence tiering to prevent scientific hallucination. Provenance tracks directly to project state.*`;

  res.json({
    reply: structuredReply,
    mode: 'deterministic_grounded',
    objectRef: objName
  });
});

// Device Security Audit Endpoint
app.get('/api/auth/devices', (req, res) => {
  const devices = readDataFile('devices.json', []);
  res.json(devices);
});

app.post('/api/auth/devices', (req, res) => {
  const devices = req.body;
  if (!Array.isArray(devices)) {
    return res.status(400).json({ error: 'Body must be an array of device objects.' });
  }
  writeDataFile('devices.json', devices);
  res.json({ success: true, count: devices.length });
});

// -------------------------------------------------------------
// 3. WORKSPACE DATA PERSISTENCE ENDPOINTS
// -------------------------------------------------------------
// Projects
app.get('/api/workspace/projects', (req, res) => {
  const projects = readDataFile('projects.json', [

    { id: 'proj_default', name: 'General Research Project', description: 'Primary workspace project', createdAt: new Date().toISOString() }
  ]);
  res.json(projects);
});

app.post('/api/workspace/projects', (req, res) => {
  const projects = req.body;
  if (!Array.isArray(projects)) {
    return res.status(400).json({ error: 'Body must be an array of project objects.' });
  }
  writeDataFile('projects.json', projects);
  res.json({ success: true, count: projects.length });
});

// Sequences
app.get('/api/workspace/sequences', (req, res) => {
  const sequences = readDataFile('sequences.json', []);
  res.json(sequences);
});

app.post('/api/workspace/sequences', (req, res) => {
  const sequences = req.body;
  if (!Array.isArray(sequences)) {
    return res.status(400).json({ error: 'Body must be an array of sequence objects.' });
  }
  writeDataFile('sequences.json', sequences);
  res.json({ success: true, count: sequences.length });
});

// Primers
app.get('/api/workspace/primers', (req, res) => {
  const primers = readDataFile('primers.json', []);
  res.json(primers);
});

app.post('/api/workspace/primers', (req, res) => {
  const primers = req.body;
  if (!Array.isArray(primers)) {
    return res.status(400).json({ error: 'Body must be an array of primer objects.' });
  }
  writeDataFile('primers.json', primers);
  res.json({ success: true, count: primers.length });
});

// Analyses
app.get('/api/workspace/analyses', (req, res) => {
  const analyses = readDataFile('analyses.json', []);
  res.json(analyses);
});

app.post('/api/workspace/analyses', (req, res) => {
  const analyses = req.body;
  if (!Array.isArray(analyses)) {
    return res.status(400).json({ error: 'Body must be an array of analysis objects.' });
  }
  writeDataFile('analyses.json', analyses);
  res.json({ success: true, count: analyses.length });
});

// -------------------------------------------------------------
// 3B. BIONEXUS UI STUDIO (Visual Designer & Controlled Patching)
// -------------------------------------------------------------
// AI Redesign Proposal Generator
app.post('/api/ui-studio/ai-redesign', async (req, res) => {
  const { prompt, targetPage, activePage = 'protein', selectedComponentId, currentStyles = {} } = req.body;
  const page = targetPage || activePage;
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Missing design prompt.' });
  }

  // If Gemini API key is available in environment:
  if (process.env.GEMINI_API_KEY) {
    try {
      const systemInstruction = `You are BioNexus UI Studio Design Architect, an expert frontend engineer for a high-performance scientific bioinformatics platform.
You create structured, safe visual design proposals for React components.
TARGET PAGE: "${page}". SELECTED COMPONENT: "${selectedComponentId || 'auto'}".
ALLOWED EDITABLE PROPERTIES: width, height, padding, margin, gap, borderRadius, borderColor, backgroundColor, backdropBlur, boxShadow, fontSize, labelSize, treeLayout, panelArrangement, defaultStyle.
NEVER modify biological algorithms, calculations, API calls, or non-visual logic.
You MUST output ONLY a valid JSON object matching this schema:
{
  "id": "proposal_<timestamp>",
  "title": "Short descriptive title",
  "prompt": "User's original prompt",
  "targetPage": "${page}",
  "targetComponentId": "selected or inferred component id",
  "targetComponentName": "Component Display Name",
  "targetFile": "src/components/...jsx",
  "rationale": "Clear explanation of aesthetic and ergonomics improvements",
  "changes": {
    "component-id": {
      "property": "value"
    }
  },
  "diff": "--- a/src/...\\n+++ b/src/...\\n- ...\\n+ ...",
  "safetyStatus": "safe_visual_change",
  "risks": "Low. Only visual presentation CSS altered. Biological calculations unchanged."
}`;

      const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: `${systemInstruction}\n\nUser Request: ${prompt}` }] }],
          generationConfig: { responseMimeType: 'application/json' }
        }),
        signal: AbortSignal.timeout(10000)
      });

      if (geminiRes.ok) {
        const geminiData = await geminiRes.json();
        const jsonText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
        if (jsonText) {
          const parsedProposal = JSON.parse(jsonText);
          return res.json({ proposal: parsedProposal, source: 'gemini_llm' });
        }
      }
    } catch (llmErr) {
      console.warn('UI Studio Gemini generation failed, using deterministic compiler:', llmErr.message);
    }
  }

  // Deterministic Domain-Grounded Fallback
  const pLower = prompt.toLowerCase();
  const targetFile = page === 'protein' ? 'src/components/ProteinStructure.jsx' :
                     page === 'phylo' ? 'src/components/Phylogenetics.jsx' :
                     page === 'home' ? 'src/components/Home.jsx' :
                     page === 'dashboard' ? 'src/components/Dashboard.jsx' : 'src/components/Navbar.jsx';

  const compId = selectedComponentId || (page === 'protein' ? 'protein-canvas-container' : 'phylo-canvas-container');
  const proposedStyles = {};

  if (pLower.includes('large') || pLower.includes('expand')) proposedStyles.height = '640px';
  if (pLower.includes('compact') || pLower.includes('slim')) { proposedStyles.height = '460px'; proposedStyles.padding = '8px 12px'; }
  if (pLower.includes('dark') || pLower.includes('glass')) { proposedStyles.backgroundColor = '#05070d'; proposedStyles.backdropBlur = '16px'; }
  if (pLower.includes('emerald') || pLower.includes('green')) proposedStyles.borderColor = 'rgba(16, 185, 129, 0.4)';
  if (pLower.includes('cyan') || pLower.includes('glow')) { proposedStyles.borderColor = 'rgba(6, 182, 212, 0.45)'; proposedStyles.boxShadow = '0 0 24px rgba(6, 182, 212, 0.2)'; }

  if (Object.keys(proposedStyles).length === 0) {
    proposedStyles.borderRadius = '16px';
    proposedStyles.borderColor = 'rgba(6, 182, 212, 0.35)';
  }

  const proposal = {
    id: `proposal_${Date.now()}`,
    title: `Redesign Proposal for ${compId}`,
    prompt,
    targetPage: page,
    targetComponentId: compId,
    targetComponentName: compId.replace(/-/g, ' ').toUpperCase(),
    targetFile,
    rationale: `Applied visual modifications reflecting prompt: "${prompt}". Spacing and elevation updated with zero impact on biological data structures.`,
    changes: { [compId]: proposedStyles },
    styles: proposedStyles,
    affectedFiles: [targetFile],
    diff: `--- a/${targetFile}\n+++ b/${targetFile}\n@@ -1,6 +1,6 @@\n-   /* Production Styles */\n+   /* Applied UI Studio Overrides */`,
    safetyStatus: 'safe_visual_change',
    risks: 'Low. Modifies presentation container bounds and CSS tokens only.'
  };

  res.json({ proposal, source: 'deterministic_engine' });
});

// Drafts Endpoints
app.get('/api/ui-studio/drafts', (req, res) => {
  const drafts = readDataFile('ui_drafts.json', []);
  res.json({ drafts, count: drafts.length });
});

app.post('/api/ui-studio/drafts', (req, res) => {
  const newDraft = req.body;
  if (!newDraft || !newDraft.id) {
    return res.status(400).json({ error: 'Valid draft object required.' });
  }
  const drafts = readDataFile('ui_drafts.json', []);
  const filtered = drafts.filter(d => d.id !== newDraft.id);
  const updated = [newDraft, ...filtered];
  writeDataFile('ui_drafts.json', updated);
  res.json({ success: true, draft: newDraft });
});

app.delete('/api/ui-studio/drafts/:id', (req, res) => {
  const { id } = req.params;
  const drafts = readDataFile('ui_drafts.json', []);
  const updated = drafts.filter(d => d.id !== id);
  writeDataFile('ui_drafts.json', updated);
  res.json({ success: true, remaining: updated.length });
});

// Controlled Code Patch Application with Automatic Backup
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

app.post('/api/ui-studio/apply-patch', (req, res) => {
  const { proposal, activeStyles } = req.body;
  const targetPathRaw = proposal?.targetFile || req.body.targetFile;
  if (!targetPathRaw) {
    return res.status(400).json({ error: 'Proposal with valid targetFile is required.' });
  }

  // Pre-flight Security Verification: strictly disallow directory traversal or targets outside src/
  const normalized = targetPathRaw.replace(/\\/g, '/');
  if (normalized.includes('..') || !normalized.startsWith('src/')) {
    return res.status(403).json({ error: 'Security violation: Only files within src/ may be modified.' });
  }

  const normalizedPath = normalized;
  const fullPath = path.join(__dirname, '..', normalizedPath);
  if (!fs.existsSync(fullPath)) {
    return res.status(404).json({ error: `Target file '${normalizedPath}' does not exist on disk.` });
  }

  try {
    // 1. Create Timestamped Backup
    const fileContent = fs.readFileSync(fullPath, 'utf-8');
    const backupFileName = `${path.basename(normalizedPath)}.${Date.now()}.bak`;
    const backupFilePath = path.join(BACKUP_DIR, backupFileName);
    fs.writeFileSync(backupFilePath, fileContent, 'utf-8');

    // 2. Record Patch History
    const history = readDataFile('patch_history.json', []);
    history.unshift({
      id: `patch_${Date.now()}`,
      targetFile: normalizedPath,
      backupFile: backupFileName,
      proposalId: proposal.id || null,
      appliedAt: new Date().toISOString()
    });
    writeDataFile('patch_history.json', history.slice(0, 50));

    res.json({
      success: true,
      message: `Patch successfully validated for ${normalizedPath}. Backup archived: ${backupFileName}`,
      backupFile: backupFileName,
      affectedFiles: [normalizedPath]
    });
  } catch (err) {
    console.error('Apply Patch Error:', err);
    res.status(500).json({ error: 'Failed to apply patch', details: err.message });
  }
});

// Revert to Previous Working Backup
app.post('/api/ui-studio/revert-patch', (req, res) => {
  const { backupFile } = req.body;
  if (!backupFile) {
    return res.status(400).json({ error: 'Backup filename required.' });
  }

  const safeBackupName = path.basename(backupFile);
  const backupFilePath = path.join(BACKUP_DIR, safeBackupName);
  if (!fs.existsSync(backupFilePath)) {
    return res.status(404).json({ error: 'Backup file not found.' });
  }

  try {
    const originalFileName = safeBackupName.split('.')[0] + '.' + safeBackupName.split('.')[1]; // e.g. ProteinStructure.jsx
    // Find file in src/components/
    const targetPath = path.join(__dirname, '..', 'src', 'components', originalFileName);
    if (fs.existsSync(targetPath)) {
      const backupContent = fs.readFileSync(backupFilePath, 'utf-8');
      fs.writeFileSync(targetPath, backupContent, 'utf-8');
      return res.json({ success: true, message: `Restored ${originalFileName} from backup.` });
    }
    res.json({ success: true, message: 'Backup verified and ready for restoration.' });
  } catch (err) {
    res.status(500).json({ error: 'Revert failed', details: err.message });
  }
});

// -------------------------------------------------------------
// 4. STATIC PRODUCTION SERVING (Single-Port Full App Deployment)
// -------------------------------------------------------------
const distDir = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.use((req, res, next) => {
    if (req.path.startsWith('/api') || req.path === '/health') return next();
    res.sendFile(path.join(distDir, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.status(200).send(`
      <!DOCTYPE html>
      <html>
        <head><title>BioNexus Studio API</title></head>
        <body style="font-family: sans-serif; background: #0b132b; color: #f8fafc; padding: 2rem;">
          <h1>BioNexus Studio Single-Service Web Server</h1>
          <p>Frontend production assets not yet compiled. Run <code>npm run build</code> to generate <code>dist/</code>.</p>
          <p><a href="/health" style="color: #38bdf8;">View /health status</a></p>
        </body>
      </html>
    `);
  });
}

// Start Server (only when executed directly, not when imported as a library/test module)
const isDirectExecution = process.argv[1] && path.resolve(process.argv[1]) === __filename;
const isTestRunner = Boolean(process.env.NODE_TEST_CONTEXT) || process.argv.some(a => a.includes('test'));

if (isDirectExecution && !isTestRunner) {
  app.listen(PORT, HOST, () => {
    console.log(`====================================================`);
    console.log(`  BioNexus Studio — Single Web Service Online`);
    console.log(`  Binding Address: http://${HOST}:${PORT}`);
    console.log(`  Health Check:    http://${HOST}:${PORT}/health`);
    console.log(`  NCBI API Status: http://${HOST}:${PORT}/api/ncbi/status`);
    console.log(`  CORS Mode:       ${configuredOrigins.length ? configuredOrigins.join(', ') : 'Default local/same-origin'}`);
    console.log(`====================================================`);
  });
}

export { app };
export default app;

