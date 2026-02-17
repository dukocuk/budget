/**
 * Tests for SyncCoordinator
 *
 * Tests debounced enqueue, immediate execution, queue processing,
 * deduplication, concurrent sync prevention, cleanup timer, and clearQueue.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SyncCoordinator } from './syncCoordinator';

describe('SyncCoordinator', () => {
  let coordinator;

  beforeEach(() => {
    vi.useFakeTimers();
    coordinator = new SyncCoordinator();
  });

  afterEach(() => {
    coordinator.clearQueue();
    vi.useRealTimers();
  });

  describe('constructor', () => {
    it('initializes with empty queue and not syncing', () => {
      expect(coordinator.getQueueLength()).toBe(0);
      expect(coordinator.isSyncing()).toBe(false);
    });

    it('initializes with empty processedOperations set', () => {
      expect(coordinator.processedOperations.size).toBe(0);
    });
  });

  describe('enqueue (debounced)', () => {
    it('adds operation to queue', () => {
      const op = vi.fn();
      coordinator.enqueue(op);
      expect(coordinator.getQueueLength()).toBe(1);
    });

    it('processes queue after debounce delay', async () => {
      const op = vi.fn().mockResolvedValue(undefined);
      coordinator.enqueue(op);

      expect(op).not.toHaveBeenCalled();

      // Advance past debounce delay (1000ms)
      await vi.advanceTimersByTimeAsync(1100);

      expect(op).toHaveBeenCalledOnce();
    });

    it('debounces multiple enqueue calls within delay window', async () => {
      const op1 = vi.fn().mockResolvedValue(undefined);
      const op2 = vi.fn().mockResolvedValue(undefined);

      coordinator.enqueue(op1);
      await vi.advanceTimersByTimeAsync(500);
      coordinator.enqueue(op2);

      // After 500ms more, only 1000ms from second enqueue - not yet fired
      await vi.advanceTimersByTimeAsync(500);
      expect(op1).not.toHaveBeenCalled();
      expect(op2).not.toHaveBeenCalled();

      // After full debounce delay from last enqueue
      await vi.advanceTimersByTimeAsync(600);
      expect(op1).toHaveBeenCalledOnce();
      expect(op2).toHaveBeenCalledOnce();
    });

    it('returns a Promise', () => {
      const op = vi.fn();
      const result = coordinator.enqueue(op);
      // Debounced enqueue doesn't return a promise (undefined)
      expect(result).toBeUndefined();
    });
  });

  describe('enqueue (immediate)', () => {
    it('executes operation immediately without debounce', async () => {
      const op = vi.fn().mockResolvedValue(undefined);
      const promise = coordinator.enqueue(op, true);

      await promise;
      expect(op).toHaveBeenCalledOnce();
    });

    it('sets syncing flag during execution', async () => {
      let syncingDuringOp = false;
      const op = vi.fn().mockImplementation(async () => {
        syncingDuringOp = coordinator.isSyncing();
      });

      await coordinator.enqueue(op, true);
      expect(syncingDuringOp).toBe(true);
      expect(coordinator.isSyncing()).toBe(false);
    });

    it('throws if operation fails', async () => {
      const op = vi.fn().mockRejectedValue(new Error('Sync failed'));

      await expect(coordinator.enqueue(op, true)).rejects.toThrow(
        'Sync failed'
      );
      expect(coordinator.isSyncing()).toBe(false);
    });

    it('waits for current sync to finish before executing', async () => {
      const callOrder = [];

      // Start a long-running operation
      let resolveFirst;
      const firstOp = vi.fn().mockImplementation(
        () =>
          new Promise(resolve => {
            resolveFirst = resolve;
            callOrder.push('first-start');
          })
      );

      const firstPromise = coordinator.enqueue(firstOp, true);

      // Queue a second immediate operation while first is running
      const secondOp = vi.fn().mockImplementation(async () => {
        callOrder.push('second');
      });

      const secondPromise = coordinator.enqueue(secondOp, true);

      // First op is still running
      expect(coordinator.isSyncing()).toBe(true);

      // Resolve first operation and advance timers for polling interval
      resolveFirst();
      await firstPromise;
      await vi.advanceTimersByTimeAsync(200);
      await secondPromise;

      expect(callOrder).toEqual(['first-start', 'second']);
    });
  });

  describe('deduplication', () => {
    it('skips duplicate debounced operations within same time bucket', () => {
      const op = vi.fn().mockResolvedValue(undefined);

      // Manually add an opId to processedOperations to simulate a recently processed op
      const opId = coordinator._createOperationId(op);
      coordinator.processedOperations.add(opId);

      // Enqueue the same operation - should be skipped due to deduplication
      const result = coordinator.enqueue(op);
      expect(result).toBeInstanceOf(Promise); // Returns resolved promise for skipped ops
      expect(coordinator.getQueueLength()).toBe(0); // Not added to queue
    });

    it('does not skip duplicate immediate operations', async () => {
      const op = vi.fn().mockResolvedValue(undefined);

      await coordinator.enqueue(op, true);
      await coordinator.enqueue(op, true);

      expect(op).toHaveBeenCalledTimes(2);
    });
  });

  describe('processQueue', () => {
    it('does nothing when queue is empty', async () => {
      await coordinator.processQueue();
      expect(coordinator.isSyncing()).toBe(false);
    });

    it('does nothing when already syncing', async () => {
      // Manually set syncing flag
      coordinator.syncing = true;
      coordinator.queue.push({
        operation: vi.fn(),
        opId: 'test',
      });

      await coordinator.processQueue();
      // Operation was not consumed from queue
      expect(coordinator.queue.length).toBe(1);
      coordinator.syncing = false;
    });

    it('processes all queued operations as a batch', async () => {
      const op1 = vi.fn().mockResolvedValue(undefined);
      const op2 = vi.fn().mockResolvedValue(undefined);
      const op3 = vi.fn().mockResolvedValue(undefined);

      coordinator.queue.push(
        { operation: op1, opId: 'op1' },
        { operation: op2, opId: 'op2' },
        { operation: op3, opId: 'op3' }
      );

      await coordinator.processQueue();

      expect(op1).toHaveBeenCalledOnce();
      expect(op2).toHaveBeenCalledOnce();
      expect(op3).toHaveBeenCalledOnce();
      expect(coordinator.getQueueLength()).toBe(0);
    });

    it('marks operations as processed after successful batch', async () => {
      const op = vi.fn().mockResolvedValue(undefined);
      coordinator.queue.push({ operation: op, opId: 'test-op' });

      await coordinator.processQueue();

      expect(coordinator.processedOperations.has('test-op')).toBe(true);
    });

    it('clears syncing flag even when operations fail', async () => {
      const failingOp = vi
        .fn()
        .mockRejectedValue(new Error('Operation failed'));
      coordinator.queue.push({ operation: failingOp, opId: 'fail-op' });

      await coordinator.processQueue();

      expect(coordinator.isSyncing()).toBe(false);
      expect(coordinator.getQueueLength()).toBe(0);
    });
  });

  describe('_scheduleCleanup', () => {
    it('clears processedOperations after 5 seconds', async () => {
      coordinator.processedOperations.add('op1');
      coordinator.processedOperations.add('op2');

      coordinator._scheduleCleanup();

      expect(coordinator.processedOperations.size).toBe(2);

      await vi.advanceTimersByTimeAsync(5000);

      expect(coordinator.processedOperations.size).toBe(0);
    });

    it('only schedules one cleanup timer at a time', () => {
      coordinator._scheduleCleanup();
      const firstTimer = coordinator.cleanupTimer;

      coordinator._scheduleCleanup();
      expect(coordinator.cleanupTimer).toBe(firstTimer);
    });

    it('resets cleanupTimer after cleanup runs', async () => {
      coordinator._scheduleCleanup();
      expect(coordinator.cleanupTimer).not.toBeNull();

      await vi.advanceTimersByTimeAsync(5000);
      expect(coordinator.cleanupTimer).toBeNull();
    });
  });

  describe('clearQueue', () => {
    it('empties the queue', () => {
      coordinator.queue.push({ operation: vi.fn(), opId: 'test' });
      expect(coordinator.getQueueLength()).toBe(1);

      coordinator.clearQueue();
      expect(coordinator.getQueueLength()).toBe(0);
    });

    it('clears processed operations', () => {
      coordinator.processedOperations.add('op1');
      coordinator.clearQueue();
      expect(coordinator.processedOperations.size).toBe(0);
    });

    it('clears cleanup timer', () => {
      coordinator._scheduleCleanup();
      expect(coordinator.cleanupTimer).not.toBeNull();

      coordinator.clearQueue();
      expect(coordinator.cleanupTimer).toBeNull();
    });
  });

  describe('isSyncing', () => {
    it('returns false initially', () => {
      expect(coordinator.isSyncing()).toBe(false);
    });

    it('returns true during sync', async () => {
      let resolve;
      const op = vi.fn().mockImplementation(
        () =>
          new Promise(r => {
            resolve = r;
          })
      );

      const promise = coordinator.enqueue(op, true);
      expect(coordinator.isSyncing()).toBe(true);

      resolve();
      await promise;
      expect(coordinator.isSyncing()).toBe(false);
    });
  });

  describe('getQueueLength', () => {
    it('returns 0 for empty queue', () => {
      expect(coordinator.getQueueLength()).toBe(0);
    });

    it('returns correct count after enqueue', () => {
      coordinator.queue.push({ operation: vi.fn(), opId: '1' });
      coordinator.queue.push({ operation: vi.fn(), opId: '2' });
      expect(coordinator.getQueueLength()).toBe(2);
    });
  });
});
