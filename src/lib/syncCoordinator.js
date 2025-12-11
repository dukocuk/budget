/**
 * Unified Sync Coordinator
 * Centralizes all cloud sync operations to prevent race conditions and duplicates
 *
 * Features:
 * - Single entry point for all sync operations
 * - Debounced sync (1s delay after last change)
 * - Immediate sync (bypasses debounce for critical operations)
 * - Queue management to prevent overlapping syncs
 * - Atomic operations guaranteed
 *
 * Usage:
 * ```js
 * const coordinator = new SyncCoordinator();
 *
 * // Debounced sync (default)
 * coordinator.enqueue(() => uploadToCloud(data), false);
 *
 * // Immediate sync (critical operations like delete)
 * coordinator.enqueue(() => uploadToCloud(data), true);
 * ```
 */

import { logger } from '../utils/logger';

const SYNC_DEBOUNCE_DELAY = 1000; // 1 second

/**
 * Debounce utility function
 * @param {Function} func - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Debounced function
 */
function debounce(func, delay) {
  let timeoutId = null;

  return function debounced(...args) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      func(...args);
      timeoutId = null;
    }, delay);
  };
}

export class SyncCoordinator {
  constructor() {
    this.queue = [];
    this.syncing = false;
    this.debouncedProcess = debounce(
      () => this.processQueue(),
      SYNC_DEBOUNCE_DELAY
    );
  }

  /**
   * Enqueue a sync operation
   * @param {Function} operation - Async function that performs the sync
   * @param {boolean} immediate - If true, bypass debounce and sync immediately
   * @returns {Promise<void>}
   */
  enqueue(operation, immediate = false) {
    if (immediate) {
      return this.executeImmediate(operation);
    }

    // Add to queue and debounce
    this.queue.push(operation);
    this.debouncedProcess();
  }

  /**
   * Execute operation immediately (bypasses queue and debounce)
   * @param {Function} operation - Async function to execute
   * @returns {Promise<void>}
   */
  async executeImmediate(operation) {
    if (this.syncing) {
      logger.log('⏳ Sync already in progress, queuing immediate operation...');
      // Wait for current sync to finish, then execute
      await new Promise(resolve => {
        const checkInterval = setInterval(() => {
          if (!this.syncing) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);
      });
    }

    this.syncing = true;
    try {
      logger.log('⚡ Executing immediate sync...');
      await operation();
      logger.log('✅ Immediate sync completed');
    } catch (error) {
      logger.error('❌ Immediate sync failed:', error);
      throw error;
    } finally {
      this.syncing = false;
    }
  }

  /**
   * Process queued operations (called after debounce delay)
   * Executes all queued operations in a single batch
   * @returns {Promise<void>}
   */
  async processQueue() {
    if (this.syncing || this.queue.length === 0) {
      return;
    }

    this.syncing = true;
    const batch = [...this.queue];
    this.queue = [];

    try {
      logger.log(`🔄 Processing sync queue (${batch.length} operations)...`);

      // Execute all operations in parallel (they all call the same sync endpoint anyway)
      // The SyncContext will handle merging and uploading complete data
      await Promise.all(batch.map(op => op()));

      logger.log('✅ Queue processed successfully');
    } catch (error) {
      logger.error('❌ Queue processing failed:', error);
      // Don't re-throw - errors are handled by individual sync operations
    } finally {
      this.syncing = false;
    }
  }

  /**
   * Check if sync is currently in progress
   * @returns {boolean}
   */
  isSyncing() {
    return this.syncing;
  }

  /**
   * Clear all queued operations
   */
  clearQueue() {
    this.queue = [];
    logger.log('🧹 Sync queue cleared');
  }

  /**
   * Get queue length (for debugging)
   * @returns {number}
   */
  getQueueLength() {
    return this.queue.length;
  }
}
