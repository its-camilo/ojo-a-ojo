/**
 * Escalera 1-up / 1-down (Martín et al., 2020; Levitt, 1971) para balance dicóptico al 50 %.
 */
export class Staircase1up1down {
  constructor({
    start = 0.5,
    step = 0.08,
    min = 0.05,
    max = 0.95,
    maxReversals = 16,
    maxTrials = 40,
    minValidReversals = 9,
    averageLastN = 4,
  } = {}) {
    this.value = start;
    this.step = step;
    this.min = min;
    this.max = max;
    this.maxReversals = maxReversals;
    this.maxTrials = maxTrials;
    this.minValidReversals = minValidReversals;
    this.averageLastN = averageLastN;
    this.trials = [];
    this.reversals = [];
    this.lastDirection = null;
    this.trialCount = 0;
    this.done = false;
  }

  record(reportDominantEyeIsRight) {
    if (this.done) return this.getEstimate();

    const prev = this.value;
    // Aumentar contraste ojo izquierdo si reporta dominancia derecha (simplificado IR)
    if (reportDominantEyeIsRight) {
      this.value = Math.min(this.max, this.value + this.step);
    } else {
      this.value = Math.max(this.min, this.value - this.step);
    }

    const direction = this.value > prev ? 1 : this.value < prev ? -1 : 0;
    if (direction !== 0 && this.lastDirection !== null && direction !== this.lastDirection) {
      this.reversals.push(this.value);
      if (this.reversals.length >= this.maxReversals) {
        this.done = true;
      }
    }
    if (direction !== 0) this.lastDirection = direction;

    this.trials.push({ value: this.value, reportDominantEyeIsRight });
    this.trialCount += 1;
    if (this.trialCount >= this.maxTrials) this.done = true;

    return this.getEstimate();
  }

  /** Usuario reporta equilibrio aparente entre ojos: converge hacia IR ≈ 1. */
  recordBalanced() {
    if (this.done) return this.getEstimate();
    const prev = this.value;
    const nudged = prev + (0.5 - prev) * 0.45;
    this.value = Math.max(this.min, Math.min(this.max, nudged));
    const direction = this.value > prev ? 1 : this.value < prev ? -1 : 0;
    if (direction !== 0 && this.lastDirection !== null && direction !== this.lastDirection) {
      this.reversals.push(this.value);
      if (this.reversals.length >= this.maxReversals) this.done = true;
    }
    if (direction !== 0) this.lastDirection = direction;
    this.trials.push({ value: this.value, balanced: true });
    this.trialCount += 1;
    if (this.trialCount >= this.maxTrials) this.done = true;
    return this.getEstimate();
  }

  getEstimate() {
    if (this.reversals.length >= this.averageLastN) {
      const tail = this.reversals.slice(-this.averageLastN);
      const mean = tail.reduce((a, b) => a + b, 0) / tail.length;
      return {
        imbalanceRatio: mean,
        valid: this.reversals.length > this.minValidReversals,
        reversals: this.reversals.length,
        trials: this.trialCount,
        done: this.done,
      };
    }
    return {
      imbalanceRatio: this.value,
      valid: false,
      reversals: this.reversals.length,
      trials: this.trialCount,
      done: this.done,
    };
  }
}