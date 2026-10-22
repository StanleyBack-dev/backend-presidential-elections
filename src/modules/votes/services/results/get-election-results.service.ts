import { Injectable } from "@nestjs/common";
import { BRAZILIAN_STATES } from "../../../../common/constants/brazilian-states.constant";
import {
  GetCandidatesService,
  toCandidateDto,
} from "../../../candidates/services/get-candidates.service";
import { ElectionResultsDto } from "../../dtos/results/election-results-response.dto";
import { percentage } from "../../utils/tally-math.util";
import {
  addToBreakdown,
  breakdownCounts,
  candidateShares,
  emptyBreakdown,
  VoteBreakdown,
} from "../../utils/vote-breakdown.util";
import { VoteTallyService } from "../tally/vote-tally.service";
import { VotingWindowService } from "../voting-window.service";

@Injectable()
export class GetElectionResultsService {
  constructor(
    private readonly voteTallyService: VoteTallyService,
    private readonly getCandidatesService: GetCandidatesService,
    private readonly votingWindowService: VotingWindowService,
  ) {}

  async execute(): Promise<ElectionResultsDto> {
    const [options, candidates, otherOptions, rows] = await Promise.all([
      this.getCandidatesService.findAll(),
      this.getCandidatesService.findCandidates(),
      this.getCandidatesService.findOtherOptions(),
      this.voteTallyService.rows(),
    ]);

    const optionById = new Map(options.map((o) => [o.idCandidates, o]));
    const slugs = candidates.map((c) => c.slug);
    const national = emptyBreakdown();
    const byState = new Map<string, VoteBreakdown>();

    for (const row of rows) {
      const option = optionById.get(row.idCandidates);
      if (!option) continue;

      addToBreakdown(national, option, row.votes);
      const state = byState.get(row.state) ?? emptyBreakdown();
      addToBreakdown(state, option, row.votes);
      byState.set(row.state, state);
    }

    const shares = new Map(
      candidateShares(national, slugs).map((share) => [share.slug, share]),
    );

    return {
      ...breakdownCounts(national),
      blankPercentage: percentage(national.blankVotes, national.totalVotes),
      nullPercentage: percentage(national.nullVotes, national.totalVotes),
      // Always computed live (the tally is cached) so it flips exactly at
      // the closing instant.
      votingOpen: this.votingWindowService.isOpen(),
      votingClosesAt: this.votingWindowService.closesAt.toISOString(),
      updatedAt: new Date().toISOString(),
      candidates: candidates.map((candidate) => ({
        ...toCandidateDto(candidate),
        votes: shares.get(candidate.slug)!.votes,
        percentage: shares.get(candidate.slug)!.percentage,
      })),
      otherOptions,
      states: BRAZILIAN_STATES.map((state) => {
        const breakdown = byState.get(state) ?? emptyBreakdown();
        return {
          state,
          ...breakdownCounts(breakdown),
          candidates: candidateShares(breakdown, slugs),
        };
      }),
    };
  }
}
