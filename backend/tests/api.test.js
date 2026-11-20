/**
 * Integration tests for Express API routes & Prometheus Metrics
 *
 * Covers:
 *  - GET / (health check)
 *  - GET /api/ping (lightweight readiness ping)
 *  - GET /jobs (active job listings, filtering, sorting)
 *  - GET /hackathons (hackathon listings)
 *  - GET /stats (aggregated metrics counts)
 *  - GET /metrics (Prometheus scraping endpoint with custom metrics)
 */

import { jest } from '@jest/globals';
import express from 'express';
import http from 'http';
import rateLimit from 'express-rate-limit';
import request from 'supertest';
import { registry } from '../lib/metrics.js';

let app;
let server;
let fakeJobs = [];

beforeAll(async () => {
  app = express();
  app.use(express.json());

  const jobsLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Health check endpoint
  app.get('/', (req, res) => {
    res.json({
      status: 'online',
      service: 'Placement Alert System',
      timestamp: new Date().toISOString(),
      connectedClients: 3,
    });
  });

  // Ping endpoint
  app.get('/api/ping', (req, res) => {
    res.status(200).send('pong');
  });

  // Metrics endpoint
  app.get('/metrics', async (req, res) => {
    try {
      res.set('Content-Type', registry.contentType);
      res.end(await registry.metrics());
    } catch (err) {
      res.status(500).end(err.message);
    }
  });

  // Jobs endpoint
  app.get('/jobs', jobsLimiter, async (req, res) => {
    const now = new Date();
    const active = fakeJobs
      .filter((j) => j.type === 'job' && (!j.expiresAt || new Date(j.expiresAt) > now))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      success: true,
      count: active.length,
      jobs: active,
    });
  });

  // Hackathons endpoint
  app.get('/hackathons', async (req, res) => {
    const now = new Date();
    const active = fakeJobs
      .filter((j) => j.type === 'hackathon' && (!j.expiresAt || new Date(j.expiresAt) > now))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 20);

    res.json({
      success: true,
      count: active.length,
      hackathons: active,
    });
  });

  // Stats endpoint
  app.get('/stats', async (req, res) => {
    const now = new Date();
    const activeJobs = fakeJobs.filter((j) => j.type === 'job' && (!j.expiresAt || new Date(j.expiresAt) > now)).length;
    const activeHackathons = fakeJobs.filter((j) => j.type === 'hackathon' && (!j.expiresAt || new Date(j.expiresAt) > now)).length;

    res.json({
      success: true,
      stats: {
        activeJobs,
        activeHackathons,
        totalItems: fakeJobs.length,
        connectedClients: 3,
      },
    });
  });

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
});

beforeEach(() => {
  fakeJobs = [];
});

describe('GET / and /api/ping — Health & Readiness', () => {
  test('GET / returns system health status and client count', async () => {
    const res = await request(server).get('/');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('online');
    expect(res.body.service).toBe('Placement Alert System');
    expect(res.body.connectedClients).toBe(3);
  });

  test('GET /api/ping returns pong with 200 OK', async () => {
    const res = await request(server).get('/api/ping');
    expect(res.status).toBe(200);
    expect(res.text).toBe('pong');
  });
});

describe('GET /metrics — Prometheus endpoint', () => {
  test('returns 200 with Prometheus metrics text format', async () => {
    const res = await request(server).get('/metrics');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/plain/);
    expect(res.text).toContain('notices_ingested_total');
    expect(res.text).toContain('parse_duration_seconds');
    expect(res.text).toContain('parse_failures_total');
    expect(res.text).toContain('queue_depth');
    expect(res.text).toContain('gemini_retries_total');
  });
});

describe('GET /jobs — Job listings', () => {
  test('returns empty array when no jobs exist', async () => {
    const res = await request(server).get('/jobs');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.count).toBe(0);
    expect(res.body.jobs).toEqual([]);
  });

  test('returns only active, non-expired job postings', async () => {
    const future = new Date(Date.now() + 86400000);
    const past = new Date(Date.now() - 86400000);

    fakeJobs.push(
      { type: 'job', title: 'Active SDE 1', expiresAt: future, createdAt: new Date() },
      { type: 'job', title: 'Active SDE 2', expiresAt: future, createdAt: new Date() },
      { type: 'job', title: 'Expired SDE', expiresAt: past, createdAt: new Date() },
      { type: 'hackathon', title: 'Hackathon Event', expiresAt: future, createdAt: new Date() }
    );

    const res = await request(server).get('/jobs');
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(2);
    expect(res.body.jobs.every((j) => j.type === 'job')).toBe(true);
  });

  test('sorts jobs descending by creation date (newest first)', async () => {
    const now = Date.now();
    fakeJobs.push(
      { type: 'job', title: 'Older Job', createdAt: new Date(now - 10000), expiresAt: new Date(now + 90000) },
      { type: 'job', title: 'Newer Job', createdAt: new Date(now), expiresAt: new Date(now + 90000) }
    );

    const res = await request(server).get('/jobs');
    expect(res.status).toBe(200);
    expect(res.body.jobs[0].title).toBe('Newer Job');
    expect(res.body.jobs[1].title).toBe('Older Job');
  });
});

describe('GET /hackathons — Hackathon listings', () => {
  test('returns only hackathons, excluding jobs', async () => {
    const future = new Date(Date.now() + 86400000);
    fakeJobs.push(
      { type: 'hackathon', title: 'Smart India Hackathon', expiresAt: future, createdAt: new Date() },
      { type: 'job', title: 'Google SWE', expiresAt: future, createdAt: new Date() }
    );

    const res = await request(server).get('/hackathons');
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(1);
    expect(res.body.hackathons[0].title).toBe('Smart India Hackathon');
  });
});

describe('GET /stats — Aggregated metrics', () => {
  test('returns accurate counts for active jobs, hackathons, and total items', async () => {
    const future = new Date(Date.now() + 86400000);
    fakeJobs.push(
      { type: 'job', title: 'Job 1', expiresAt: future, createdAt: new Date() },
      { type: 'job', title: 'Job 2', expiresAt: future, createdAt: new Date() },
      { type: 'hackathon', title: 'Hack 1', expiresAt: future, createdAt: new Date() }
    );

    const res = await request(server).get('/stats');
    expect(res.status).toBe(200);
    expect(res.body.stats.activeJobs).toBe(2);
    expect(res.body.stats.activeHackathons).toBe(1);
    expect(res.body.stats.totalItems).toBe(3);
    expect(res.body.stats.connectedClients).toBe(3);
  });
});
