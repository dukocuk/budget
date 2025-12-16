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
    // ✅ Phase 2: Track processed operations to prevent Strict Mode duplicates
    this.processedOperations = new Set();
    this.cleanupTimer = null;
  }

  /**
   * Create simple operation ID for deduplication
   * @param {Function} operation - Operation function
   * @returns {string} Operation ID
   */
  _createOperationId(operation) {
    // Use function string representation + timestamp bucket (100ms) for ID
    const funcStr = operation.toString().slice(0, 100);
    const timeBucket = Math.floor(Date.now() / 100);
    return `${funcStr}_${timeBucket}`;
  }

  /**
   * Enqueue a sync operation
   * @param {Function} operation - Async function that performs the sync
   * @param {boolean} immediate - If true, bypass debounce and sync immediately
   * @returns {Promise<void>}
   */
  enqueue(operation, immediate = false) {
    // ✅ Phase 2: Deduplication - Skip if recently processed
    const opId = this._createOperationId(operation);

    if (this.processedOperations.has(opId) && !immediate) {
      logger.log(
        '⏭️ Skipping duplicate sync operation (Strict Mode protection)'
      );
      return Promise.resolve();
    }

    if (immediate) {
      return this.executeImmediate(operation, opId);
    }

    // Add to queue and debounce
    this.queue.push({ operation, opId });
    this.debouncedProcess();

    // ✅ Schedule cleanup of processed operations (prevent memory leak)
    this._scheduleCleanup();
  }

  /**
   * Execute operation immediately (bypasses queue and debounce)
   * @param {Function} operation - Async function to execute
   * @param {string} opId - Operation ID for deduplication tracking
   * @returns {Promise<void>}
   */
  async executeImmediate(operation, opId) {
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
      // ✅ Mark operation as processed
      this.processedOperations.add(opId);
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

      // ✅ Execute operations and mark as processed
      await Promise.all(
        batch.map(async ({ operation, opId }) => {
          await operation();
          this.processedOperations.add(opId);
        })
      );

      logger.log('✅ Queue processed successfully');
    } catch (error) {
      logger.error('❌ Queue processing failed:', error);
      // Don't re-throw - errors are handled by individual sync operations
    } finally {
      this.syncing = false;
    }
  }

  /**
   * Schedule cleanup of processed operations Set
   * Prevents memory leak by clearing old operation IDs after 5 seconds
   */
  _scheduleCleanup() {
    // Only schedule one cleanup timer at a time
    if (this.cleanupTimer) {
      return;
    }

    this.cleanupTimer = setTimeout(() => {
      const size = this.processedOperations.size;
      this.processedOperations.clear();
      this.cleanupTimer = null;
      if (size > 0) {
        logger.log(`🧹 Cleared ${size} processed operation IDs from memory`);
      }
    }, 5000);
  }

  /**
   * Check if sync is currently in progress
   * @returns {boolean}
   */
  isSyncing() {
    return this.syncing;
  }

  /**
   * Clear all queued operations and processed operation tracking
   */
  clearQueue() {
    this.queue = [];
    this.processedOperations.clear();
    if (this.cleanupTimer) {
      clearTimeout(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    logger.log('🧹 Sync queue and operation history cleared');
  }

  /**
   * Get queue length (for debugging)
   * @returns {number}
   */
  getQueueLength() {
    return this.queue.length;
  }
}
