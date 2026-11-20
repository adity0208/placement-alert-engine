/**
 * Unit tests for models/Job.js
 *
 * Tests Mongoose schema validations, enum constraints, virtual fields,
 * and the 3-day TTL pre-save hook in-memory without requiring an external DB.
 */

import { jest } from '@jest/globals';
import mongoose from 'mongoose';
import Job from '../models/Job.js';

describe('Job model — Schema validation', () => {
  const validData = () => ({
    type: 'job',
    title: 'Google SWE Intern',
    message: 'Hiring alert: Google SWE Intern. Apply: https://careers.google.com',
    telegramMessageId: 12345,
    groupId: '-1001234567890',
  });

  test('validates successfully with required fields', async () => {
    const job = new Job(validData());
    const err = job.validateSync();
    expect(err).toBeUndefined();
    expect(job.type).toBe('job');
  });

  test('fails validation when title is missing', () => {
    const data = validData();
    delete data.title;
    const job = new Job(data);
    const err = job.validateSync();
    expect(err).toBeDefined();
    expect(err.errors.title).toBeDefined();
  });

  test('fails validation when message is missing', () => {
    const data = validData();
    delete data.message;
    const job = new Job(data);
    const err = job.validateSync();
    expect(err).toBeDefined();
    expect(err.errors.message).toBeDefined();
  });

  test('fails validation when telegramMessageId is missing', () => {
    const data = validData();
    delete data.telegramMessageId;
    const job = new Job(data);
    const err = job.validateSync();
    expect(err).toBeDefined();
    expect(err.errors.telegramMessageId).toBeDefined();
  });

  test('fails validation when groupId is missing', () => {
    const data = validData();
    delete data.groupId;
    const job = new Job(data);
    const err = job.validateSync();
    expect(err).toBeDefined();
    expect(err.errors.groupId).toBeDefined();
  });

  test('rejects invalid type enum value', () => {
    const job = new Job({ ...validData(), type: 'newsletter' });
    const err = job.validateSync();
    expect(err).toBeDefined();
    expect(err.errors.type).toBeDefined();
  });

  test('accepts valid "hackathon" enum value', () => {
    const job = new Job({ ...validData(), type: 'hackathon', title: 'MLH Hackathon' });
    const err = job.validateSync();
    expect(err).toBeUndefined();
    expect(job.type).toBe('hackathon');
  });
});

describe('Job model — Pre-save hook & TTL logic', () => {
  test('sets expiresAt to ~3 days (72 hours) in future if not provided', async () => {
    const job = new Job({
      type: 'job',
      title: 'Amazon SDE',
      message: 'Amazon is hiring',
      telegramMessageId: 101,
      groupId: '-100111',
    });

    const before = Date.now();
    // Invoke pre-save hook manually
    await new Promise((resolve, reject) => {
      job.schema.s.hooks.execPre('save', job, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    const after = Date.now();

    expect(job.expiresAt).toBeDefined();
    const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
    expect(job.expiresAt.getTime()).toBeGreaterThanOrEqual(before + threeDaysMs - 1000);
    expect(job.expiresAt.getTime()).toBeLessThanOrEqual(after + threeDaysMs + 1000);
  });

  test('preserves explicitly set expiresAt', async () => {
    const customDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const job = new Job({
      type: 'job',
      title: 'Amazon SDE',
      message: 'Amazon is hiring',
      telegramMessageId: 101,
      groupId: '-100111',
      expiresAt: customDate,
    });

    await new Promise((resolve, reject) => {
      job.schema.s.hooks.execPre('save', job, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    expect(job.expiresAt.getTime()).toBe(customDate.getTime());
  });
});

describe('Job model — Virtuals', () => {
  test('calculates timeRemaining virtual correctly', () => {
    const futureExpiry = new Date(Date.now() + 3600000); // 1 hour in future
    const job = new Job({
      type: 'job',
      title: 'Meta Research Intern',
      message: 'Apply at meta.com',
      telegramMessageId: 202,
      groupId: '-100222',
      expiresAt: futureExpiry,
    });

    expect(job.timeRemaining).toBeGreaterThan(0);
    expect(job.timeRemaining).toBeLessThanOrEqual(3600000);
  });

  test('returns 0 for expired job timeRemaining', () => {
    const pastExpiry = new Date(Date.now() - 3600000); // 1 hour in past
    const job = new Job({
      type: 'job',
      title: 'Old Job',
      message: 'Expired',
      telegramMessageId: 203,
      groupId: '-100222',
      expiresAt: pastExpiry,
    });

    expect(job.timeRemaining).toBe(0);
  });
});
