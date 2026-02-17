/**
 * Tests for MetricsBuffer
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MetricsBuffer, MultiMetricsBuffer, calculateRPS, calculateErrorRate } from './metrics-buffer.js';

describe('MetricsBuffer', () => {
  let buffer: MetricsBuffer;

  beforeEach(() => {
    buffer = new MetricsBuffer({ maxSize: 10, retentionMs: 1000 });
  });

  it('should add and retrieve values', () => {
    buffer.add(10);
    buffer.add(20);
    buffer.add(30);

    const values = buffer.getValues();
    expect(values).toEqual([10, 20, 30]);
  });

  it('should respect max size', () => {
    for (let i = 0; i < 15; i++) {
      buffer.add(i);
    }

    expect(buffer.size()).toBe(10);
    expect(buffer.getValues()[0]).toBe(5); // First 5 removed
  });

  it('should get latest value', () => {
    buffer.add(10);
    buffer.add(20);

    expect(buffer.getLatest()).toBe(20);
  });

  it('should calculate average', () => {
    buffer.add(10);
    buffer.add(20);
    buffer.add(30);

    expect(buffer.getAverage()).toBe(20);
  });

  it('should get min and max', () => {
    buffer.add(10);
    buffer.add(5);
    buffer.add(30);

    expect(buffer.getMin()).toBe(5);
    expect(buffer.getMax()).toBe(30);
  });

  it('should clear buffer', () => {
    buffer.add(10);
    buffer.add(20);
    buffer.clear();

    expect(buffer.size()).toBe(0);
  });
});

describe('MultiMetricsBuffer', () => {
  let buffer: MultiMetricsBuffer;

  beforeEach(() => {
    buffer = new MultiMetricsBuffer({ maxSize: 10 });
  });

  it('should add and retrieve multiple metrics', () => {
    buffer.add('rps', 100);
    buffer.add('latency', 50);

    expect(buffer.getLatest('rps')).toBe(100);
    expect(buffer.getLatest('latency')).toBe(50);
  });

  it('should add snapshot', () => {
    buffer.addSnapshot({
      rps: 100,
      blocks: 10,
      latencyMs: 50,
      errorRate: 5,
    });

    expect(buffer.getLatest('rps')).toBe(100);
    expect(buffer.getLatest('blocks')).toBe(10);
    expect(buffer.getLatest('latency')).toBe(50);
    expect(buffer.getLatest('errorRate')).toBe(5);
  });

  it('should get metric names', () => {
    buffer.add('rps', 100);
    buffer.add('latency', 50);

    const metrics = buffer.getMetrics();
    expect(metrics).toContain('rps');
    expect(metrics).toContain('latency');
  });

  it('should clear all metrics', () => {
    buffer.add('rps', 100);
    buffer.add('latency', 50);
    buffer.clear();

    expect(buffer.getLatest('rps')).toBeNull();
    expect(buffer.getLatest('latency')).toBeNull();
  });
});

describe('Utility functions', () => {
  it('should calculate RPS correctly', () => {
    const rps = calculateRPS(150, 100, 1000); // 50 requests in 1 second
    expect(rps).toBe(50);
  });

  it('should calculate error rate correctly', () => {
    const errorRate = calculateErrorRate(10, 100); // 10 errors out of 100
    expect(errorRate).toBe(10);
  });

  it('should handle zero total count in error rate', () => {
    const errorRate = calculateErrorRate(10, 0);
    expect(errorRate).toBe(0);
  });
});
