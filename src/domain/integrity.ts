/**
 * Nomination integrity.
 *
 * PALMA expects creators to share their nomination links, and expects audiences
 * to answer. That is legitimate mobilisation, not fraud, and the safeguards
 * here are deliberately calibrated not to punish it.
 *
 * What they are for is narrower: one person's signal should count once, bots
 * should not manufacture signals, and coordinated automation should be visible
 * to a human. A weak signal flags for review; it does not reject.
 */

export type IntegritySignalInput = {
  /** Hidden field that only automated clients tend to complete. */
  honeypot: string | null | undefined;
  /** Milliseconds between the form being rendered and submitted. */
  elapsedMs: number | null | undefined;
  reason: string;
  email: string;
  /** Nominations already made by this address inside the current window. */
  recentByNominator: number;
  /** Nominations this candidacy received in the last few minutes. */
  recentForCandidacy?: number;
};

export type IntegrityAssessment = {
  /** 0 (clean) to 100 (almost certainly automated). */
  score: number;
  /** Refuse outright. Reserved for signals a person cannot trip by accident. */
  reject: boolean;
  /** Count it, and show it to a moderator. */
  flagForReview: boolean;
  signals: string[];
};

const MIN_HUMAN_COMPLETION_MS = 2500;

/**
 * Addresses from these providers are disposable by design. They are a review
 * signal, never an automatic refusal — some people use them for good reasons.
 */
const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com',
  'guerrillamail.com',
  '10minutemail.com',
  'yopmail.com',
  'trashmail.com',
  'temp-mail.org',
  'throwawaymail.com',
  'sharklasers.com',
  'getnada.com',
  'dispostable.com',
]);

export function isDisposableEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  return domain ? DISPOSABLE_DOMAINS.has(domain) : false;
}

export function assessIntegrity(input: IntegritySignalInput): IntegrityAssessment {
  const signals: string[] = [];
  let score = 0;

  // The only automatic refusal: a field no person can see was filled in.
  if (input.honeypot && input.honeypot.trim().length > 0) {
    signals.push('honeypot_filled');
    score += 100;
  }

  if (typeof input.elapsedMs === 'number' && input.elapsedMs >= 0) {
    if (input.elapsedMs < MIN_HUMAN_COMPLETION_MS) {
      signals.push('submitted_too_quickly');
      score += 35;
    }
  }

  const reason = input.reason.trim();
  if (reason.length > 0) {
    const words = reason.split(/\s+/);
    const unique = new Set(words.map((word) => word.toLowerCase()));
    if (words.length >= 12 && unique.size / words.length < 0.3) {
      signals.push('repetitive_reason');
      score += 20;
    }
    // Count links rather than matching a repeated group: URLs in real prose are
    // separated by whitespace, which a `{2,}` repetition never spans.
    const linkCount = reason.match(/https?:\/\/\S+/g)?.length ?? 0;
    if (linkCount >= 2) {
      signals.push('link_stuffed_reason');
      score += 25;
    }
    if (reason === reason.toUpperCase() && reason.length > 60) {
      signals.push('shouting_reason');
      score += 5;
    }
  }

  if (isDisposableEmail(input.email)) {
    signals.push('disposable_email');
    score += 30;
  }

  // A person nominating several creators in a sitting is ordinary. A person
  // doing it many times in an hour is worth a look.
  if (input.recentByNominator >= 5) {
    signals.push('high_nominator_rate');
    score += 10 * (input.recentByNominator - 4);
  }

  // A burst against one candidacy is the shape automation takes. It flags the
  // candidacy for review; it never refuses the person in front of us, who is
  // most likely a real member of that creator's audience.
  if (typeof input.recentForCandidacy === 'number' && input.recentForCandidacy >= 40) {
    signals.push('candidacy_burst');
    score += 15;
  }

  score = Math.min(100, score);

  return {
    score,
    reject: score >= 100,
    flagForReview: score >= 30 && score < 100,
    signals,
  };
}

/**
 * Near-duplicate detection across the nominations for one candidacy. Identical
 * wording from many addresses is the signature of a script, not a fanbase.
 */
export function looksLikeDuplicate(a: string, b: string): boolean {
  const normalise = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

  const left = normalise(a);
  const right = normalise(b);
  if (!left || !right) return false;
  if (left === right) return true;

  const leftWords = new Set(left.split(' '));
  const rightWords = new Set(right.split(' '));
  const intersection = [...leftWords].filter((word) => rightWords.has(word)).length;
  const union = new Set([...leftWords, ...rightWords]).size;
  return union > 0 && intersection / union > 0.85;
}

/**
 * Coordinated-activity heuristic for a candidacy, run by the integrity screen
 * rather than at submission time. Returns a reason to show a moderator, or null.
 */
export function assessCandidacyPattern(input: {
  nominationCount: number;
  distinctReasons: number;
  windowMinutes: number;
  disposableEmailCount: number;
}): string | null {
  if (input.nominationCount < 10) return null;

  const reasons: string[] = [];

  if (input.distinctReasons / input.nominationCount < 0.4) {
    reasons.push('many nominations share near-identical wording');
  }

  if (input.windowMinutes > 0 && input.nominationCount / input.windowMinutes > 20) {
    reasons.push('nominations arrived faster than an audience plausibly acts');
  }

  if (input.disposableEmailCount / input.nominationCount > 0.3) {
    reasons.push('a high share of disposable addresses');
  }

  return reasons.length > 0 ? `Flagged for review: ${reasons.join('; ')}.` : null;
}
