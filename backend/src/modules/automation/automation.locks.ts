/**
 * InfraInventory V11 - Target Lock Manager
 * Prevents concurrent colliding write operations on identical infrastructure targets.
 */

export class TargetLockManager {
  private locks: Map<string, { runId: string; lockedAt: number; target: string }> = new Map();
  private readonly defaultTimeoutMs = 10 * 60 * 1000; // 10 minutes max lock duration

  public acquireLock(target: string, runId: string): { acquired: boolean; currentHolder?: string } {
    const existing = this.locks.get(target);

    if (existing) {
      // Check if lock expired
      if (Date.now() - existing.lockedAt > this.defaultTimeoutMs) {
        this.locks.set(target, { runId, lockedAt: Date.now(), target });
        return { acquired: true };
      }
      return { acquired: false, currentHolder: existing.runId };
    }

    this.locks.set(target, { runId, lockedAt: Date.now(), target });
    return { acquired: true };
  }

  public releaseLock(target: string, runId: string): boolean {
    const existing = this.locks.get(target);
    if (existing && existing.runId === runId) {
      this.locks.delete(target);
      return true;
    }
    return false;
  }

  public isLocked(target: string): boolean {
    const existing = this.locks.get(target);
    if (!existing) return false;
    if (Date.now() - existing.lockedAt > this.defaultTimeoutMs) {
      this.locks.delete(target);
      return false;
    }
    return true;
  }

  public getActiveLocks(): Array<{ target: string; runId: string; ageSeconds: number }> {
    const now = Date.now();
    const result: Array<{ target: string; runId: string; ageSeconds: number }> = [];
    for (const [target, lock] of this.locks.entries()) {
      if (now - lock.lockedAt <= this.defaultTimeoutMs) {
        result.push({
          target,
          runId: lock.runId,
          ageSeconds: Math.floor((now - lock.lockedAt) / 1000),
        });
      }
    }
    return result;
  }
}

export const targetLockManager = new TargetLockManager();
