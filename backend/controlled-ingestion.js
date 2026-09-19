'use strict';

const { randomUUID } = require('node:crypto');

const ALLOWED_HOSTS = new Map([
  ['science.nasa.gov', { publisher: 'NASA Science', type: 'Official science source', category: 'SCIENCE' }],
  ['www.who.int', { publisher: 'World Health Organization', type: 'Official health source', category: 'HEALTH' }],
]);

const ALLOWED_CATEGORIES = new Set([
  'HEALTH',
  'EDUCATION',
  'ENVIRONMENT',
  'TECHNOLOGY',
  'CULTURE',
  'SCIENCE',
  'INFRASTRUCTURE',
  'HUMANITARIAN',
]);

const ALLOWED_SIGNAL_TYPES = new Set([
  'PROGRESS',
  'BREAKTHROUGH',
  'NEEDS_ATTENTION',
  'RECOVERY',
]);

function parseAllowedUrl(value) {
  if (typeof value !== 'string' || value.trim() === '') return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url;
  } catch {
    return null;
  }
}

function normaliseUrl(value) {
  const url = parseAllowedUrl(value);
  if (!url) return null;
  url.hash = '';
  url.hostname = url.hostname.toLowerCase();
  if ((url.protocol === 'https:' && url.port === '443') || (url.protocol === 'http:' && url.port === '80')) {
    url.port = '';
  }
  if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/, '');
  return url.toString();
}

function sourcePolicy(value) {
  const url = parseAllowedUrl(value);
  if (!url) return { ok: false, status: 'REJECTED', httpStatus: 400, reason: 'INVALID_URL' };
  const identity = ALLOWED_HOSTS.get(url.hostname.toLowerCase());
  if (!identity) {
    return { ok: false, status: 'REJECTED', httpStatus: 400, reason: 'DOMAIN_NOT_ALLOWED' };
  }
  return { ok: true, url, identity };
}

function extractMainHtml(html) {
  const text = String(html);
  const main = text.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
  const article = text.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i);
  return (main && main[1]) || (article && article[1]) || text;
}

function decodeHtml(value) {
  return String(value)
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#8217;|&#x2019;/gi, '’')
    .replace(/&ndash;|&#8211;/gi, '–')
    .replace(/&mdash;|&#8212;/gi, '—');
}

function normaliseHtmlText(html) {
  return decodeHtml(String(html)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim());
}

function metaContent(html, names) {
  for (const name of names) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const patterns = [
      new RegExp(`<meta[^>]+(?:name|property)=["']${escaped}["'][^>]+content=["']([^"']+)["']`, 'i'),
      new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["']${escaped}["']`, 'i'),
    ];
    for (const pattern of patterns) {
      const match = String(html).match(pattern);
      if (match && match[1]) return decodeHtml(match[1]).trim();
    }
  }
  return undefined;
}

function extractTitle(html) {
  const metadataTitle = metaContent(html, ['og:title', 'twitter:title']);
  if (metadataTitle) return metadataTitle;
  const plain = String(html).match(/<title[^>]*>\s*([\s\S]*?)\s*<\/title>/i);
  return plain ? normaliseHtmlText(plain[1]) : undefined;
}

function extractDate(html) {
  const value = metaContent(html, [
    'article:published_time',
    'article:modified_time',
    'datePublished',
    'dateModified',
    'date',
  ]);
  if (!value || Number.isNaN(Date.parse(value))) return undefined;
  return new Date(value).toISOString();
}

function sentences(text) {
  return text
    .match(/[^.!?]+[.!?]+/g)
    ?.map((sentence) => sentence.replace(/\s+/g, ' ').trim())
    .filter((sentence) => sentence.length >= 35 && sentence.length <= 360) || [];
}

function chooseEvidence(text, hostname) {
  const rows = sentences(text);
  const terms = hostname === 'science.nasa.gov'
    ? ['citizen', 'galax', 'launch', 'image', 'science', 'participant']
    : ['global', 'vaccin', 'health', 'coverage', 'disease', 'death'];
  const selected = rows.filter((sentence) => {
    const lower = sentence.toLowerCase();
    return terms.some((term) => lower.includes(term));
  }).slice(0, 3);
  return selected.map((sentence) => sentence.slice(0, 280));
}

function proposedType(text, hostname) {
  const lower = text.toLowerCase();
  if (hostname === 'science.nasa.gov') {
    if (/\b(?:launched|launches|new initiative|new project|first)\b/.test(lower)) return 'BREAKTHROUGH';
    if (/\b(?:improved|advance|progress|developed)\b/.test(lower)) return 'PROGRESS';
    return undefined;
  }
  if (/\b(?:below|decline|deaths?|outbreak|unresolved|deficit|worsen)\b/.test(lower)) return 'NEEDS_ATTENTION';
  if (/\b(?:recovery|recovered|restored)\b/.test(lower)) return 'RECOVERY';
  if (/\b(?:increase|improved|progress|reached)\b/.test(lower)) return 'PROGRESS';
  return undefined;
}

function sourceGeography(text) {
  const lower = text.toLowerCase();
  if (/\b(global|globally|worldwide|around the world)\b/.test(lower)) {
    return { country: 'Global', region: 'Global' };
  }
  return undefined;
}

function safeTitle(sourceTitle) {
  const cleaned = sourceTitle
    .replace(/\s*[|–—-]\s*(NASA Science|World Health Organization|WHO)\s*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned || cleaned.length > 120) return undefined;
  if (/\b(revolutionary|historic|game-changing|world-changing|miracle|catastrophic)\b/i.test(cleaned)) {
    return undefined;
  }
  return cleaned;
}

function buildSummary(evidenceQuotes) {
  const summary = evidenceQuotes.slice(0, 2).join(' ').trim();
  return summary && summary.length <= 560 ? summary : undefined;
}

function buildMainClaim(evidenceQuotes) {
  return evidenceQuotes[0] || undefined;
}

function makeCandidate({ title, summary, mainClaim, category, type, geography, identity, url, sourceTitle, sourceDate, evidenceQuotes }) {
  return {
    id: `ingest-source-${randomUUID().slice(0, 8)}`,
    title,
    shortDescription: summary,
    category,
    signalType: type,
    geography: { ...geography, latitude: 0, longitude: 0 },
    timestamp: sourceDate,
    importance: 3,
    status: 'pending',
    sourceStatus: 'DEVELOPING',
    evidenceStatus: 'DEVELOPING',
    reviewStatus: 'PENDING',
    mainClaim,
    evidenceQuotes,
    sources: [{
      id: `src-ingest-${randomUUID().slice(0, 8)}`,
      title: sourceTitle,
      publisher: identity.publisher,
      url,
      type: identity.type,
      ...(sourceDate ? { date: sourceDate.slice(0, 10) } : {}),
      primary: true,
    }],
    missions: [],
  };
}

async function createGuardedCandidate(rawUrl) {
  const policy = sourcePolicy(rawUrl);
  if (!policy.ok) return policy;

  let response;
  try {
    response = await fetch(policy.url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(12_000),
      headers: { 'user-agent': 'GlobalPulse-Guarded-Ingestion/1.0' },
    });
  } catch {
    return { ok: false, httpStatus: 200, status: 'NOT_READY', reason: 'SOURCE_UNREACHABLE' };
  }
  if (!response.ok) {
    return { ok: false, httpStatus: 200, status: 'NOT_READY', reason: 'SOURCE_UNREACHABLE' };
  }

  const finalUrl = normaliseUrl(response.url);
  const finalPolicy = sourcePolicy(finalUrl);
  if (!finalPolicy.ok) {
    return { ok: false, httpStatus: 200, status: 'NOT_READY', reason: 'SOURCE_UNREACHABLE' };
  }

  const html = await response.text();
  const sourceTitle = extractTitle(html);
  const sourceDate = extractDate(html);
  const readableText = normaliseHtmlText(extractMainHtml(html));
  const evidenceQuotes = chooseEvidence(readableText, finalPolicy.url.hostname);
  const title = sourceTitle && safeTitle(sourceTitle);
  const category = finalPolicy.identity.category;
  const type = proposedType(readableText, finalPolicy.url.hostname);
  const geography = sourceGeography(readableText);

  if (!sourceTitle || !title || !readableText || !buildMainClaim(evidenceQuotes) || !buildSummary(evidenceQuotes)) {
    return { ok: false, httpStatus: 200, status: 'NOT_READY', reason: 'NO_FACTUAL_CLAIM' };
  }
  if (!ALLOWED_CATEGORIES.has(category)) {
    return { ok: false, httpStatus: 200, status: 'NOT_READY', reason: 'INVALID_CATEGORY' };
  }
  if (!type || !ALLOWED_SIGNAL_TYPES.has(type)) {
    return { ok: false, httpStatus: 200, status: 'NOT_READY', reason: 'INVALID_SIGNAL_TYPE' };
  }
  if (!geography) {
    return { ok: false, httpStatus: 200, status: 'NOT_READY', reason: 'GEOGRAPHY_UNCLEAR' };
  }

  return {
    ok: true,
    canonicalUrl: finalUrl,
    candidate: makeCandidate({
      title,
      summary: buildSummary(evidenceQuotes),
      mainClaim: buildMainClaim(evidenceQuotes),
      category,
      type,
      geography,
      identity: finalPolicy.identity,
      url: finalUrl,
      sourceTitle,
      sourceDate,
      evidenceQuotes,
    }),
  };
}

module.exports = {
  ALLOWED_HOSTS,
  ALLOWED_CATEGORIES,
  ALLOWED_SIGNAL_TYPES,
  normaliseUrl,
  sourcePolicy,
  createGuardedCandidate,
};
