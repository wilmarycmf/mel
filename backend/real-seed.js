'use strict';

/**
 * GlobalPulse — REAL, verified seed (MVP).
 *
 * These 3 records are the ONLY real signals shown on the public globe by
 * default (see seed.js / INCLUDE_TEST_DATA).  Every source URL below was
 * fetched live during this build and returned HTTP 200; every quoted fact
 * is copied from the fetched page text, not invented.
 *
 * Verification log (fetched 2026-09-19):
 *   - https://science.nasa.gov/citizen-science/galaxy-zoo/            -> HTTP 200
 *       "Classify images of galaxies taken by NASA's James Webb Space
 *       Telescope. For anyone with a smartphone or laptop."
 *       "Requirements  Time: ten minutes to learn the basics.
 *       Equipment: an internet-connected device.  Knowledge: None."
 *       "launched 2007", "where Online"
 *   - https://www.zooniverse.org/projects/zookeeper/Galaxy-Zoo         -> HTTP 200
 *       Live "Active Stats" panel (percent complete, classifications,
 *       subjects) confirms the workflow is currently active.
 *   - https://www.who.int/news-room/fact-sheets/detail/measles         -> HTTP 200
 *       "The proportion of children receiving a first dose of measles
 *       vaccine was 84% in 2025, slightly below the 2019 level of 86%."
 *       "an estimated 95 000 measles deaths globally" (2024).
 *       "averted nearly 59 million deaths between 2000 and 2024."
 *       Page dateModified: 2026-07-15.
 *       Reference list item 1: "Progress towards measles elimination —
 *       worldwide, 2000-2024, Weekly epidemiological record, No 48,
 *       2025, 100, 591-604" — no direct article URL is given on the page,
 *       and a guessed WER article URL (WER-9848-591-604) returned HTTP
 *       404, so it is NOT used. The WER journal index page below is used
 *       instead because it was independently verified live (HTTP 200).
 *   - https://www.who.int/publications/journals/weekly-epidemiological-record -> HTTP 200
 *       Confirms WER is a real, ongoing WHO publication ("first issued
 *       in 1926... WER" per page text) — used as the supporting source
 *       for the WER citation named on the measles fact sheet.
 *   - https://science.nasa.gov/citizen-science/galaxy-zoo-clump-scout-ii/ -> HTTP 200
 *       "Identify star-forming clumps in galaxy images, and help train
 *       machines to do the same. For anyone with a smartphone or laptop."
 *       "launched 2026", "where Online"
 *       "the model isn't doing its job well enough! The scientists need
 *       your help spotting the clumps and setting the model straight!"
 *       (confirms human review/correction of machine-generated boxes.)
 *
 * NOT verified / not used (per instructions, no data invented):
 *   - Any specific volunteer counts or classification totals for Galaxy
 *     Zoo — the source pages do not state a specific number, so none is
 *     claimed here.
 */

const REAL_SIGNALS = [
  // ------------------------------------------------------------------
  // Signal 1 — SCIENCE / BREAKTHROUGH — the mission-carrying signal
  // ------------------------------------------------------------------
  {
    id: 'real-galaxy-zoo',
    title: 'People can help scientists classify real galaxies',
    shortDescription:
      'NASA’s Galaxy Zoo asks participants to answer questions about galaxy images from the James Webb Space Telescope. NASA says anyone with a smartphone or laptop can participate and lists no prior knowledge as a requirement.',
    category: 'SCIENCE',
    signalType: 'BREAKTHROUGH',
    // "Global" signals have no single real location, so they are anchored
    // at distinct open-ocean points (no landmass) rather than (0,0), which
    // sits in the Gulf of Guinea and would visually clump every global
    // signal on top of West Africa. Each anchor is spaced apart so the
    // globe doesn't stack them either.
    geography: { country: 'World', region: 'Global', latitude: -60, longitude: -140 },
    timestamp: '2026-01-14T00:00:00.000Z',
    importance: 4,
    status: 'active',
    sourceStatus: 'VERIFIED',
    sources: [
      {
        id: 'src-nasa-galaxy-zoo',
        title: 'Galaxy Zoo — NASA Science',
        publisher: 'NASA Science',
        url: 'https://science.nasa.gov/citizen-science/galaxy-zoo/',
        type: 'Official citizen science page',
        date: '2026-01-14',
        primary: true,
      },
      {
        id: 'src-zooniverse-galaxy-zoo',
        title: 'Galaxy Zoo — Zooniverse project platform',
        publisher: 'Zooniverse',
        url: 'https://www.zooniverse.org/projects/zookeeper/Galaxy-Zoo',
        type: 'Official project platform',
        primary: false,
      },
    ],
    realityCheck: {
      question: 'What do you need to participate in Galaxy Zoo?',
      options: [
        { id: 'a', label: 'A professional telescope' },
        { id: 'b', label: 'A university astronomy degree' },
        { id: 'c', label: 'A smartphone or laptop' },
        { id: 'd', label: 'Special NASA credentials' },
      ],
      correctAnswer: 'c',
      explanation:
        'NASA describes Galaxy Zoo as an online citizen-science project: "For anyone with a smartphone or laptop." Its own Requirements list "Knowledge: None."',
      sourceId: 'src-nasa-galaxy-zoo',
      // legacy fields kept for the backend validator's generic realityCheck shape
      claim: 'Anyone with a smartphone or laptop can participate in Galaxy Zoo — no prior knowledge is required.',
      supported:
        'NASA\u2019s Galaxy Zoo page states: "For anyone with a smartphone or laptop" and lists Requirements as "Equipment: an internet-connected device. Knowledge: None."',
      notSupported:
        'The page does not state how many volunteers have completed classifications to date; no such number is claimed here.',
      confidence: 'high',
    },
    worldEffect:
      'Completing this mission through the GlobalPulse prototype adds one star to your personal Human Constellation. This is a prototype visual only — it does not represent a real global counter.',
    missions: [
      {
        id: 'mission-galaxy-zoo',
        title: 'Classify a real galaxy',
        description:
          'Help researchers classify galaxy images through the active Galaxy Zoo project.',
        duration: '10 minutes',
        cost: '$0',
        remote: true,
        local: false,
        skills: ['none'],
        url: 'https://www.zooniverse.org/projects/zookeeper/Galaxy-Zoo',
        verificationType: 'SELF_REPORTED',
      },
    ],
  },

  // ------------------------------------------------------------------
  // Signal 2 — HEALTH / NEEDS_ATTENTION — no mission attached, by design
  // ------------------------------------------------------------------
  {
    id: 'real-measles-coverage',
    title: 'Global first-dose measles vaccination coverage remains below its 2019 level',
    shortDescription:
      'WHO reports that 84% of children globally received a first dose of measles vaccine in 2025, below the 2019 level of 86%. WHO estimates about 95,000 measles deaths occurred globally in 2024 and that vaccination averted nearly 59 million deaths between 2000 and 2024.',
    category: 'HEALTH',
    signalType: 'NEEDS_ATTENTION',
    // See Signal 1's comment: anchored off any landmass, spaced apart from
    // the other "Global" signals so they don't clump on the globe.
    geography: { country: 'World', region: 'Global', latitude: 20, longitude: 40 },
    timestamp: '2026-07-15T00:00:00.000Z',
    importance: 5,
    status: 'active',
    sourceStatus: 'VERIFIED',
    sources: [
      {
        id: 'src-who-measles-factsheet',
        title: 'Measles — WHO Fact Sheet',
        publisher: 'World Health Organization',
        url: 'https://www.who.int/news-room/fact-sheets/detail/measles',
        type: 'Official fact sheet',
        date: '2026-07-15',
        primary: true,
      },
      {
        id: 'src-who-wer-index',
        title: 'Weekly Epidemiological Record (WER) — journal index',
        publisher: 'World Health Organization',
        url: 'https://www.who.int/publications/journals/weekly-epidemiological-record',
        type: 'Official journal index',
        primary: false,
      },
    ],
    // Intentionally no missions[]: not every real-world signal needs a
    // forced action attached to it.
    missions: [],
  },

  // ------------------------------------------------------------------
  // Signal 3 — SCIENCE / PROGRESS — second real science data point
  // ------------------------------------------------------------------
  {
    id: 'real-clump-scout',
    title: 'Citizen scientists can help identify star-forming regions in galaxies',
    shortDescription:
      'NASA’s Galaxy Zoo: Clump Scout II, launched in 2026, asks participants to review galaxy images with machine-identified star-forming clumps and provide feedback. The project is online.',
    category: 'SCIENCE',
    signalType: 'PROGRESS',
    // See Signal 1's comment: anchored off any landmass, spaced apart from
    // the other "Global" signals so they don't clump on the globe.
    geography: { country: 'World', region: 'Global', latitude: 50, longitude: -160 },
    timestamp: '2026-01-01T00:00:00.000Z',
    importance: 3,
    status: 'active',
    sourceStatus: 'VERIFIED',
    sources: [
      {
        id: 'src-nasa-clump-scout',
        title: 'Galaxy Zoo: Clump Scout II — NASA Science',
        publisher: 'NASA Science',
        url: 'https://science.nasa.gov/citizen-science/galaxy-zoo-clump-scout-ii/',
        type: 'Official citizen science page',
        primary: true,
      },
    ],
    // No mission wired for this signal in the MVP per instructions —
    // it exists only to give the globe a second real SCIENCE/PROGRESS point.
    missions: [],
  },
];

module.exports = { REAL_SIGNALS };
