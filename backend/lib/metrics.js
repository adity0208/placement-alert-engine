/**
 * Prometheus metrics for Placement Alert Engine
 *
 * Metrics exposed at GET /metrics (scraped by Prometheus every 15s)
 *
 * Metric registry:
 *   notices_ingested_total    Counter   — total Telegram notices persisted to DB
 *   parse_duration_seconds    Histogram — AI/local parser latency (labelled by tier)
 *   parse_failures_total      Counter   — parser failures per tier
 *   queue_depth               Gauge     — BullMQ pending + waiting job count
 *   gemini_retries_total      Counter   — number of Gemini calls that failed and triggered failover
 */

import { Registry, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';

// Dedicated registry (avoids polluting global registry in tests)
export const registry = new Registry();
registry.setDefaultLabels({ app: 'placement-alert-engine' });

// Collect default Node.js process metrics (heap, GC, event loop lag, etc.)
collectDefaultMetrics({ register: registry });

// ── Custom metrics ─────────────────────────────────────────────────────────

/**
 * Total notices successfully ingested into MongoDB.
 * Labelled by type (job | hackathon) and source (gemini | groq | local).
 */
export const noticesIngestedTotal = new Counter({
  name: 'notices_ingested_total',
  help: 'Total Telegram notices persisted to MongoDB, by type and parsing source',
  labelNames: ['type', 'source'],
  registers: [registry],
});

/**
 * AI / local parser latency in seconds.
 * Observe once per parseJobMessage() call, labelled by tier used.
 *
 * tier: 'gemini' | 'groq' | 'local'
 */
export const parseDurationSeconds = new Histogram({
  name: 'parse_duration_seconds',
  help: 'Time taken to parse a Telegram message, in seconds, by parser tier',
  labelNames: ['tier'],
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10],
  registers: [registry],
});

/**
 * Count of parsing failures per tier.
 * Incremented when a tier throws and the next tier is attempted.
 */
export const parseFailuresTotal = new Counter({
  name: 'parse_failures_total',
  help: 'Number of AI parsing failures per tier',
  labelNames: ['tier'],
  registers: [registry],
});

/**
 * Current BullMQ queue depth (waiting + delayed jobs).
 * Updated periodically by a gauge-refresh interval in server.js.
 */
export const queueDepth = new Gauge({
  name: 'queue_depth',
  help: 'Current number of waiting and delayed jobs in the BullMQ parse-message queue',
  registers: [registry],
});

/**
 * Number of Gemini API calls that failed and triggered Groq/local failover.
 */
export const geminiRetriesTotal = new Counter({
  name: 'gemini_retries_total',
  help: 'Number of times Gemini parsing failed and caused a failover to the next tier',
  registers: [registry],
});

