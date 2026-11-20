/**
 * Tests for aiParser.js — Gemini parser, Groq failover, and local regex fallback
 *
 * Strategy:
 *  - We mock @google/genai and groq-sdk using jest.unstable_mockModule so the
 *    real APIs are never called.
 *  - We test that Gemini response is used when available.
 *  - We test that Groq is used when Gemini throws.
 *  - We test that local fallback fires when both AI calls fail.
 *  - We test the local regex parser directly with representative message fixtures.
 */

import { jest } from '@jest/globals';

// ── Shared mocks ──────────────────────────────────────────────────────────────
const mockGeminiGenerateContent = jest.fn();
const mockGroqCreate = jest.fn();

jest.unstable_mockModule('@google/genai', () => ({
  GoogleGenAI: jest.fn().mockImplementation(() => ({
    models: {
      generateContent: mockGeminiGenerateContent,
    },
  })),
}));

jest.unstable_mockModule('groq-sdk', () => ({
  default: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: mockGroqCreate,
      },
    },
  })),
}));

// ── Import SUT after mocks ─────────────────────────────────────────────────────
let parseJobMessage;
beforeAll(async () => {
  // Set fake API keys so clients initialise
  process.env.GEMINI_API_KEY = 'fake-gemini-key';
  process.env.GROQ_API_KEY = 'fake-groq-key';

  const mod = await import('../aiParser.js');
  parseJobMessage = mod.parseJobMessage;
});

beforeEach(() => {
  jest.clearAllMocks();
});

// ── Fixtures ──────────────────────────────────────────────────────────────────
const JOB_MESSAGE = `
🚀 Hiring Alert — Google is hiring for SWE Intern!
Apply by: December 31, 2026
Link: https://careers.google.com/apply
Eligibility: B.Tech CS/IT — 2026/2027 batch
`;

const HACKATHON_MESSAGE = `
⚡ HackFest 2026 — 24-Hour Hackathon
Organized by: MLH
Prize Pool: $5000
Register: https://hackfest.mlh.io
`;

const RESULT_MESSAGE = `
Congratulations to the selected candidates for TCS drive!
`;

const EMPTY_MESSAGE = '';

// ── Tier 1: Gemini parses successfully ────────────────────────────────────────
describe('Tier 1 — Gemini', () => {
  test('returns Gemini result when API responds correctly', async () => {
    mockGeminiGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify({
        type: 'job',
        companyName: 'Google',
        jobRole: 'SWE Intern',
        deadline: 'December 31, 2026',
        applyLink: 'https://careers.google.com/apply',
        eligibility: 'B.Tech CS/IT — 2026/2027 batch',
        experience: null,
        targetBatch: '2026/2027',
        title: null,
        organizer: null,
        prizePool: null,
      }),
    });

    const result = await parseJobMessage(JOB_MESSAGE);

    expect(result.type).toBe('job');
    expect(result.companyName).toBe('Google');
    expect(result.jobRole).toBe('SWE Intern');
    expect(result.applyLink).toBe('https://careers.google.com/apply');
    expect(mockGeminiGenerateContent).toHaveBeenCalledTimes(1);
    expect(mockGroqCreate).not.toHaveBeenCalled();
  });

  test('returns "other" for result/congratulations messages', async () => {
    mockGeminiGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify({ type: 'other' }),
    });

    const result = await parseJobMessage(RESULT_MESSAGE);
    expect(result.type).toBe('other');
  });

  test('Gemini model 1 rejects with 503, model 2 succeeds and provides result', async () => {
    mockGeminiGenerateContent
      .mockRejectedValueOnce(new Error('503 Service Unavailable'))
      .mockResolvedValueOnce({
        text: JSON.stringify({
          type: 'job',
          companyName: 'Amazon',
          jobRole: 'SDE-1',
          deadline: 'January 15, 2027',
          applyLink: 'https://amazon.jobs/sde1',
          eligibility: 'B.Tech CS/IT',
          experience: null,
          targetBatch: '2027',
          title: null,
          organizer: null,
          prizePool: null,
        }),
      });

    const result = await parseJobMessage(JOB_MESSAGE);

    expect(result.type).toBe('job');
    expect(result.companyName).toBe('Amazon');
    expect(result.jobRole).toBe('SDE-1');
    expect(mockGeminiGenerateContent).toHaveBeenCalledTimes(2);
    expect(mockGeminiGenerateContent.mock.calls[0][0].model).toBe('gemini-3.8-flash');
    expect(mockGeminiGenerateContent.mock.calls[1][0].model).toBe('gemini-3.7-flash');
    expect(mockGroqCreate).not.toHaveBeenCalled();
  });
});

// ── Tier 2: Groq failover ─────────────────────────────────────────────────────
describe('Tier 2 — Groq failover', () => {
  test('falls over to Groq when Gemini throws', async () => {
    mockGeminiGenerateContent.mockRejectedValue(new Error('Rate limit exceeded'));
    mockGroqCreate.mockResolvedValueOnce({
      choices: [{
        message: {
          content: JSON.stringify({
            type: 'hackathon',
            companyName: null,
            title: 'HackFest 2026',
            organizer: 'MLH',
            prizePool: '$5000',
            applyLink: 'https://hackfest.mlh.io',
            jobRole: null,
            deadline: null,
            eligibility: null,
            experience: null,
            targetBatch: null,
          }),
        },
      }],
    });

    const result = await parseJobMessage(HACKATHON_MESSAGE);

    expect(result.type).toBe('hackathon');
    expect(result.organizer).toBe('MLH');
    expect(result.prizePool).toBe('$5000');
    expect(mockGeminiGenerateContent).toHaveBeenCalledTimes(2);
    expect(mockGroqCreate).toHaveBeenCalledTimes(1);
    expect(mockGroqCreate.mock.calls[0][0].model).toBe('openai/gpt-oss-120b');
  });

  test('Groq rejects, local fallback answers', async () => {
    mockGeminiGenerateContent.mockRejectedValue(new Error('All Gemini models failed'));
    mockGroqCreate.mockRejectedValue(new Error('Groq 500 Internal Server Error'));

    const result = await parseJobMessage(JOB_MESSAGE);

    expect(['job', 'hackathon', 'other']).toContain(result.type);
    expect(mockGeminiGenerateContent).toHaveBeenCalledTimes(2);
    expect(mockGroqCreate).toHaveBeenCalledTimes(1);
  });
});

// ── Tier 3: Local regex fallback ──────────────────────────────────────────────
describe('Tier 3 — Local regex fallback', () => {
  test('forceLocal=true skips AI and uses regex parser', async () => {
    const result = await parseJobMessage(JOB_MESSAGE, true);
    // Local parser should detect job keywords (apply, hiring)
    expect(['job', 'hackathon', 'other']).toContain(result.type);
    expect(mockGeminiGenerateContent).not.toHaveBeenCalled();
    expect(mockGroqCreate).not.toHaveBeenCalled();
  });

  test('local parser detects hackathon keyword', async () => {
    const result = await parseJobMessage(HACKATHON_MESSAGE, true);
    expect(result.type).toBe('hackathon');
  });

  test('local parser rejects result/congratulations messages', async () => {
    const result = await parseJobMessage(RESULT_MESSAGE, true);
    expect(result.type).toBe('other');
  });

  test('local parser falls back to "other" for unclassifiable text', async () => {
    const result = await parseJobMessage('Good morning everyone!', true);
    expect(result.type).toBe('other');
  });

  test('returns fallback structure for empty string', async () => {
    const result = await parseJobMessage(EMPTY_MESSAGE);
    expect(result.type).toBe('other');
    expect(result.companyName).toBeNull();
  });

  test('both AI fail → falls back to local parser', async () => {
    mockGeminiGenerateContent.mockRejectedValue(new Error('Gemini down'));
    mockGroqCreate.mockRejectedValue(new Error('Groq down'));

    const result = await parseJobMessage(JOB_MESSAGE);
    // Should still return a result from local parser
    expect(['job', 'hackathon', 'other']).toContain(result.type);
    expect(mockGeminiGenerateContent).toHaveBeenCalledTimes(2);
    expect(mockGroqCreate).toHaveBeenCalledTimes(1);
  });

  test('provider that never resolves must not hang and local fallback answers within timeout', async () => {
    const origTimeout = process.env.PROVIDER_TIMEOUT_MS;
    process.env.PROVIDER_TIMEOUT_MS = '50';

    try {
      mockGeminiGenerateContent.mockImplementation(() => new Promise(() => {}));
      mockGroqCreate.mockImplementation(() => new Promise(() => {}));

      const startTime = Date.now();
      const result = await parseJobMessage(JOB_MESSAGE);
      const elapsed = Date.now() - startTime;

      expect(['job', 'hackathon', 'other']).toContain(result.type);
      expect(elapsed).toBeLessThan(3000);
    } finally {
      if (origTimeout !== undefined) {
        process.env.PROVIDER_TIMEOUT_MS = origTimeout;
      } else {
        delete process.env.PROVIDER_TIMEOUT_MS;
      }
    }
  }, 10000);
});
