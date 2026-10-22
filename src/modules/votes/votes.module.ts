import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CaptchaModule } from "../captcha/captcha.module";
import { CandidatesModule } from "../candidates/candidates.module";
import { CpfVerificationModule } from "../cpf-verification/cpf-verification.module";
import { VoteEntity } from "./entities/vote.entity";
import { VoterEntity } from "./entities/voter.entity";
import { CastVoteService } from "./services/cast/cast-vote.service";
import { VoteFailureTrackerService } from "./services/cast/vote-failure-tracker.service";
import { GetElectionResultsService } from "./services/results/get-election-results.service";
import { VotingWindowService } from "./services/voting-window.service";
import { VoteTallyService } from "./services/tally/vote-tally.service";
import { GetElectionAnalyticsService } from "./services/analytics/get-election-analytics.service";
import { GetElectionAnalyticsResolver } from "./resolvers/get-election-analytics.resolver";
import { CastVoteResolver } from "./resolvers/cast-vote.resolver";
import { GetElectionResultsResolver } from "./resolvers/get-election-results.resolver";

@Module({
  imports: [
    TypeOrmModule.forFeature([VoterEntity, VoteEntity]),
    CandidatesModule,
    CaptchaModule,
    CpfVerificationModule,
  ],
  providers: [
    VotingWindowService,
    VoteTallyService,
    GetElectionAnalyticsService,
    GetElectionAnalyticsResolver,
    CastVoteService,
    VoteFailureTrackerService,
    CastVoteResolver,
    GetElectionResultsService,
    GetElectionResultsResolver,
  ],
})
export class VotesModule {}
