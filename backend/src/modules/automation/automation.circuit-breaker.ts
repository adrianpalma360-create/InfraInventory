/**
 * InfraInventory V11 - Circuit Breaker Manager
 * Automatically trips and stops workflow execution if consecutive failures exceed threshold.
 */

export interface CircuitBreakerState {
  workflowId: string;
  consecutiveFailures: number;
  isOpen: boolean;
  lastFailureAt: number | null;
  lastResetAt: number | null;
  trippedReason?: string;
}

export class CircuitBreakerManager {
  private states: Map<string, CircuitBreakerState> = new Map();
  private readonly defaultCooldownMs = 5 * 60 * 1000; // 5 minutes cool down

  public getState(workflowId: string, threshold: number = 5): CircuitBreakerState {
    let state = this.states.get(workflowId);
    if (!state) {
      state = {
        workflowId,
        consecutiveFailures: 0,
        isOpen: false,
        lastFailureAt: null,
        lastResetAt: Date.now(),
      };
      this.states.set(workflowId, state);
    }

    // Auto-recover after cooldown
    if (state.isOpen && state.lastFailureAt && Date.now() - state.lastFailureAt > this.defaultCooldownMs) {
      state.isOpen = false;
      state.consecutiveFailures = 0;
      state.lastResetAt = Date.now();
      state.trippedReason = undefined;
    }

    return state;
  }

  public recordSuccess(workflowId: string): void {
    const state = this.getState(workflowId);
    state.consecutiveFailures = 0;
    state.isOpen = false;
    state.trippedReason = undefined;
  }

  public recordFailure(workflowId: string, threshold: number = 5, reason?: string): { tripped: boolean; state: CircuitBreakerState } {
    const state = this.getState(workflowId, threshold);
    state.consecutiveFailures += 1;
    state.lastFailureAt = Date.now();

    if (state.consecutiveFailures >= threshold) {
      state.isOpen = true;
      state.trippedReason = reason || `Umbral de fallos consecutivos alcanzado (${state.consecutiveFailures}/${threshold})`;
      return { tripped: true, state };
    }

    return { tripped: false, state };
  }

  public reset(workflowId: string): void {
    const state = this.getState(workflowId);
    state.consecutiveFailures = 0;
    state.isOpen = false;
    state.lastResetAt = Date.now();
    state.trippedReason = undefined;
  }

  public getAllStates(): CircuitBreakerState[] {
    return Array.from(this.states.values());
  }
}

export const circuitBreakerManager = new CircuitBreakerManager();
