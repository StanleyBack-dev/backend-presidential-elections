import { BallotOptionKind } from "../../candidates/enums/ballot-option-kind.enum";
import { percentage } from "./tally-math.util";

export interface BallotOptionRef {
  slug: string;
  kind: BallotOptionKind;
}

/**
 * Vote counts for one slice (country, region, state, time bucket), split
 * the way the TSE reports them: valid votes (candidates) vs. blank vs. null.
 */
export interface VoteBreakdown {
  totalVotes: number;
  validVotes: number;
  blankVotes: number;
  nullVotes: number;
  byCandidate: Map<string, number>;
}

export function emptyBreakdown(): VoteBreakdown {
  return {
    totalVotes: 0,
    validVotes: 0,
    blankVotes: 0,
    nullVotes: 0,
    byCandidate: new Map(),
  };
}

export function addToBreakdown(
  breakdown: VoteBreakdown,
  option: BallotOptionRef,
  votes: number,
): void {
  breakdown.totalVotes += votes;

  switch (option.kind) {
    case BallotOptionKind.BLANK:
      breakdown.blankVotes += votes;
      break;
    case BallotOptionKind.NULL_VOTE:
      breakdown.nullVotes += votes;
      break;
    default:
      breakdown.validVotes += votes;
      breakdown.byCandidate.set(
        option.slug,
        (breakdown.byCandidate.get(option.slug) ?? 0) + votes,
      );
  }
}

export function mergeBreakdown(
  target: VoteBreakdown,
  source: VoteBreakdown,
): void {
  target.totalVotes += source.totalVotes;
  target.validVotes += source.validVotes;
  target.blankVotes += source.blankVotes;
  target.nullVotes += source.nullVotes;
  for (const [slug, votes] of source.byCandidate) {
    target.byCandidate.set(slug, (target.byCandidate.get(slug) ?? 0) + votes);
  }
}

/** Candidate shares, as a percentage of VALID votes (TSE convention). */
export function candidateShares(
  breakdown: VoteBreakdown,
  candidateSlugs: string[],
) {
  return candidateSlugs.map((slug) => {
    const votes = breakdown.byCandidate.get(slug) ?? 0;
    return {
      slug,
      votes,
      percentage: percentage(votes, breakdown.validVotes),
    };
  });
}

/** The count fields shared by every DTO that reports a breakdown. */
export function breakdownCounts(breakdown: VoteBreakdown) {
  return {
    totalVotes: breakdown.totalVotes,
    validVotes: breakdown.validVotes,
    blankVotes: breakdown.blankVotes,
    nullVotes: breakdown.nullVotes,
  };
}
