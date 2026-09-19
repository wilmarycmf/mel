'use strict';

const { randomUUID } = require('node:crypto');

const CONTROLLED_SOURCE_URL =
  'https://science.nasa.gov/citizen-science/galaxy-zoo-clump-scout-ii/';

function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function normaliseHtmlText(html) {
  return String(html)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#8217;|&#x2019;/gi, '’')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractTitle(html) {
  const og = String(html).match(
    /<meta[^>]+(?:property|name)=["']og:title["'][^>]+content=["']([^"']+)["']/i,
  );
  const plain = String(html).match(/<title[^>]*>\s*([\s\S]*?)\s*<\/title>/i);
  return (og && og[1]) || (plain && normaliseHtmlText(plain[1])) || 'Galaxy Zoo: Clump Scout II';
}

function evidenceIsSufficient(text) {
  const compact = text.toLowerCase();
  const launched2026 = /launched\s+(?:in\s+)?2026/.test(compact);
  const online = /where\s*online|online\s+citizen[\s-]+science/.test(compact);
  const galaxyImages = /(?:images?|imagery)\s+(?:of\s+)?galax/.test(compact);
  const machineClumps =
    /star-forming clumps/.test(compact) &&
    (/(?:identified|identify|machine-in-training|machine learning)/.test(compact));
  const participantFeedback =
    /give feedback/.test(compact) ||
    /feedback to help train/.test(compact) ||
    /setting the model straight/.test(compact) ||
    /review[\s\S]{0,100}(?:box|clump)/.test(compact) ||
    /correct[\s\S]{0,100}(?:box|clump)/.test(compact);

  return launched2026 && online && galaxyImages && machineClumps && participantFeedback;
}

async function createControlledCandidate(rawUrl) {
  if (!isHttpUrl(rawUrl)) {
    return { ok: false, httpStatus: 400, status: 'REJECTED', reason: 'INVALID_URL' };
  }
  if (rawUrl !== CONTROLLED_SOURCE_URL) {
    return {
      ok: false,
      httpStatus: 400,
      status: 'REJECTED',
      reason: 'UNSUPPORTED_SOURCE_FOR_PHASE_4',
    };
  }

  let response;
  try {
    response = await fetch(CONTROLLED_SOURCE_URL, {
      redirect: 'follow',
      signal: AbortSignal.timeout(12_000),
      headers: { 'user-agent': 'GlobalPulse-Controlled-Ingestion/1.0' },
    });
  } catch {
    return { ok: false, httpStatus: 200, status: 'NOT_READY', reason: 'SOURCE_UNREACHABLE' };
  }
  if (!response.ok) {
    return { ok: false, httpStatus: 200, status: 'NOT_READY', reason: 'SOURCE_UNREACHABLE' };
  }

  const html = await response.text();
  const text = normaliseHtmlText(html);
  if (!evidenceIsSufficient(text)) {
    return { ok: false, httpStatus: 200, status: 'NOT_READY', reason: 'INSUFFICIENT_EVIDENCE' };
  }

  return {
    ok: true,
    candidate: {
      id: `ingest-clump-scout-${randomUUID().slice(0, 8)}`,
      title: 'Galaxy Zoo Clump Scout II invites people to review star-forming regions in galaxy images',
      shortDescription:
        'Galaxy Zoo: Clump Scout II is an online citizen-science project launched in 2026. Participants review galaxy images with machine-identified star-forming clumps and provide feedback.',
      category: 'SCIENCE',
      signalType: 'BREAKTHROUGH',
      geography: { country: 'Global', region: 'Global', latitude: 0, longitude: 0 },
      timestamp: new Date().toISOString(),
      importance: 3,
      status: 'pending',
      sourceStatus: 'DEVELOPING',
      evidenceStatus: 'DEVELOPING',
      reviewStatus: 'PENDING',
      sources: [
        {
          id: 'src-ingest-nasa-clump-scout',
          title: extractTitle(html),
          publisher: 'NASA Science',
          url: CONTROLLED_SOURCE_URL,
          type: 'Official citizen science project page',
          primary: true,
        },
      ],
      missions: [],
    },
  };
}

module.exports = {
  CONTROLLED_SOURCE_URL,
  createControlledCandidate,
};
