import { describe, expect, it } from 'vitest';
import {
  CONSIDERATIONS,
  NOMINABLE,
  NOT_MEASURED,
  PER_SEASON,
  REPEATABLE,
  THE_PALMA,
  THE_PALMA_CRITERION,
  conferralObjections,
  nameObjections,
} from '@/domain/the-palma';

const SOUND = {
  existingThisSeason: 0,
  creatorHeldIn: [],
  creatorIsVerified: true,
  creatorIsPublished: true,
  citation:
    'For a body of work that changed how a generation of creators understood what the form could carry, and for two decades of showing them it could be done without asking permission.',
};

describe('the name', () => {
  it('is two words', () => {
    expect(THE_PALMA).toBe('THE PALMA');
  });

  it('accepts the name used correctly', () => {
    expect(nameObjections('Who is getting THE PALMA this year?')).toEqual([]);
    expect(nameObjections('She won THE PALMA in 2027.')).toEqual([]);
    expect(nameObjections('THE PALMA is conferred once a year.')).toEqual([]);
  });

  it('refuses the qualifiers that would turn it back into a category', () => {
    expect(nameObjections('The PALMA Creator Legacy Award')).not.toEqual([]);
    expect(nameObjections('the palma legacy award')).not.toEqual([]);
    expect(nameObjections('The PALMA Award for Outstanding Contribution')).not.toEqual([]);
    expect(nameObjections('winner of the PALMA Award')).not.toEqual([]);
  });

  it('refuses "lifetime achievement" in any copy', () => {
    // The one misdescription that changes what the honour *is*: a lifetime
    // achievement award says the career is over, and THE PALMA is meant to be
    // won by someone in the middle of theirs.
    const objections = nameObjections('PALMA’s lifetime achievement award');
    expect(objections).toHaveLength(1);
    expect(objections[0]).toMatch(/active creator/);
  });

  it('is case-insensitive about the wrong forms', () => {
    expect(nameObjections('THE PALMA LIFETIME ACHIEVEMENT')).not.toEqual([]);
  });
});

describe('what it is', () => {
  it('states the criterion as a career contribution, not a season', () => {
    expect(THE_PALMA_CRITERION).toMatch(/body of work/);
    expect(THE_PALMA_CRITERION).toMatch(/career/);
  });

  it('publishes eight considerations, each with a detail', () => {
    expect(CONSIDERATIONS).toHaveLength(8);
    expect(CONSIDERATIONS.every((entry) => entry.detail.length > 20)).toBe(true);
    expect(new Set(CONSIDERATIONS.map((entry) => entry.key)).size).toBe(8);
  });

  it('names what it is not measured on', () => {
    const terms = NOT_MEASURED.map((entry) => entry.term);
    expect(terms).toContain('Popularity');
    expect(terms).toContain('Follower count');
    expect(terms).toContain('Earnings');
    expect(terms).toContain('Nomination volume');
  });

  it('is not nominable, not repeatable, and singular', () => {
    expect(NOMINABLE).toBe(false);
    expect(REPEATABLE).toBe(false);
    expect(PER_SEASON).toBe(1);
  });
});

describe('conferral', () => {
  it('raises nothing against a sound conferral', () => {
    expect(conferralObjections(SOUND)).toEqual([]);
  });

  it('refuses a second PALMA in the same season', () => {
    const objections = conferralObjections({ ...SOUND, existingThisSeason: 1 });
    expect(objections).toHaveLength(1);
    expect(objections[0]).toMatch(/already been conferred/);
  });

  it('refuses a creator who has had it before, and says when', () => {
    const objections = conferralObjections({ ...SOUND, creatorHeldIn: [2027, 2029] });
    expect(objections[0]).toMatch(/2027, 2029/);
  });

  it('refuses an unverified or unpublished creator', () => {
    expect(conferralObjections({ ...SOUND, creatorIsVerified: false })[0]).toMatch(/not verified/);
    expect(conferralObjections({ ...SOUND, creatorIsPublished: false })[0]).toMatch(
      /not published/,
    );
  });

  it('refuses a conferral with no written citation', () => {
    expect(conferralObjections({ ...SOUND, citation: null })[0]).toMatch(/citation/);
    expect(
      conferralObjections({ ...SOUND, citation: 'For services to the industry.' }),
    ).toHaveLength(1);
    // Whitespace is not a citation.
    expect(conferralObjections({ ...SOUND, citation: ' '.repeat(200) })).toHaveLength(1);
  });

  it('returns every objection at once rather than the first', () => {
    const objections = conferralObjections({
      existingThisSeason: 1,
      creatorHeldIn: [2026],
      creatorIsVerified: false,
      creatorIsPublished: false,
      citation: null,
    });
    expect(objections).toHaveLength(5);
  });
});
