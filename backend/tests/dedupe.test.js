/**
 * Unit & Integration tests for Deduplication & Filtering logic
 *
 * Covers:
 *  1. Compound key uniqueness check ({ telegramMessageId, groupId })
 *  2. Cross-channel applyLink deduplication ({ applyLink, type })
 *  3. Ingestion deduplication store simulator (replicating worker & listener checks)
 *  4. Content filter & rejection keyword evaluation (filterMessage)
 */

import { jest } from '@jest/globals';
import { filterMessage } from '../utils/filter.js';

describe('Deduplication logic — Compound key & Link matching', () => {
  // In-memory notice repository simulating MongoDB indexed lookups
  class DedupeRepository {
    constructor() {
      this.records = [];
    }

    async findOne(query) {
      return this.records.find((doc) => {
        if (query.telegramMessageId !== undefined && query.groupId !== undefined) {
          return doc.telegramMessageId === query.telegramMessageId && doc.groupId === query.groupId;
        }
        if (query.applyLink !== undefined && query.type !== undefined) {
          return doc.applyLink === query.applyLink && doc.type === query.type;
        }
        if (query.applyLink !== undefined) {
          return doc.applyLink === query.applyLink;
        }
        return false;
      }) || null;
    }

    async insert(doc) {
      const duplicateMsg = await this.findOne({
        telegramMessageId: doc.telegramMessageId,
        groupId: doc.groupId,
      });
      if (duplicateMsg) {
        const error = new Error('E11000 duplicate key error collection: jobs index: telegramMessageId_1_groupId_1');
        error.code = 11000;
        throw error;
      }
      this.records.push({ ...doc, _id: `id_${Date.now()}_${Math.random()}` });
      return doc;
    }
  }

  let repo;
  beforeEach(() => {
    repo = new DedupeRepository();
  });

  const baseNotice = (overrides = {}) => ({
    type: 'job',
    title: 'Google SWE Intern',
    message: 'Apply at https://careers.google.com/swe',
    applyLink: 'https://careers.google.com/swe',
    telegramMessageId: 5001,
    groupId: '-1001234567890',
    ...overrides,
  });

  test('prevents inserting duplicate message from the same group (E11000 code)', async () => {
    await repo.insert(baseNotice());

    await expect(repo.insert(baseNotice())).rejects.toMatchObject({
      code: 11000,
    });
  });

  test('allows same telegramMessageId from a different group', async () => {
    await repo.insert(baseNotice({ groupId: '-1001111111111' }));
    const second = await repo.insert(baseNotice({ groupId: '-1002222222222' }));
    expect(second).toBeDefined();
    expect(repo.records.length).toBe(2);
  });

  test('allows different telegramMessageId in the same group', async () => {
    await repo.insert(baseNotice({ telegramMessageId: 8001 }));
    const second = await repo.insert(baseNotice({ telegramMessageId: 8002 }));
    expect(second).toBeDefined();
    expect(repo.records.length).toBe(2);
  });

  test('detects cross-channel duplicate job via applyLink lookup', async () => {
    const link = 'https://jobs.apple.com/us/details/200555';
    await repo.insert(baseNotice({
      title: 'Apple iOS Engineer',
      applyLink: link,
      telegramMessageId: 101,
      groupId: '-100AAA',
    }));

    // Another channel announces the same job with a different messageId & groupId
    const existing = await repo.findOne({ applyLink: link, type: 'job' });
    expect(existing).not.toBeNull();
    expect(existing.title).toBe('Apple iOS Engineer');
  });

  test('returns null when applyLink has not been seen yet', async () => {
    const existing = await repo.findOne({ applyLink: 'https://newcompany.com/apply', type: 'job' });
    expect(existing).toBeNull();
  });

  test('distinguishes between jobs and hackathons with the same link', async () => {
    const link = 'https://unstop.com/competitions/code-challenge';
    await repo.insert(baseNotice({
      type: 'hackathon',
      title: 'Unstop Code Challenge',
      applyLink: link,
    }));

    // Looking for a 'job' with this link should yield nothing
    const jobMatch = await repo.findOne({ applyLink: link, type: 'job' });
    expect(jobMatch).toBeNull();

    // Looking for 'hackathon' should match
    const hackMatch = await repo.findOne({ applyLink: link, type: 'hackathon' });
    expect(hackMatch).not.toBeNull();
  });
});

describe('Content filter — Keyword & rejection filtering (filterMessage)', () => {
  test('rejects messages containing congratulatory or selection keywords', () => {
    const result1 = filterMessage('Congratulations to all candidates selected in TCS NQT!');
    expect(result1).toBeNull();

    const result2 = filterMessage('Shortlisted students for Cognizant interview rounds:');
    expect(result2).toBeNull();

    const result3 = filterMessage('Selected candidate list attached below.');
    expect(result3).toBeNull();
  });

  test('accepts messages containing job opportunities and apply links', () => {
    const msg = 'Microsoft is hiring for Software Engineer! Apply at https://careers.microsoft.com';
    const result = filterMessage(msg);

    expect(result).not.toBeNull();
    expect(result.link).toBe('https://careers.microsoft.com');
    expect(result.title).toBeDefined();
  });

  test('rejects empty or non-string inputs gracefully', () => {
    expect(filterMessage('')).toBeNull();
    expect(filterMessage(null)).toBeNull();
    expect(filterMessage(undefined)).toBeNull();
  });
});
