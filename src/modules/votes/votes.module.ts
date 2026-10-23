import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "../auth/auth.module";
import { CaptchaModule } from "../captcha/captcha.module";
import { CandidatesModule } from "../candidates/candidates.module";
import { VoteEntity } from "./entities/vote.entity";
import { VoterEntity } from "./entities/voter.entity";
import { CastVoteService } from "./services/cast/cast-vote.service";
import { VoteRecorderService } from "./services/cast/vote-recorder.service";
import { VoterSessionQueryService } from "./services/session/voter-session-query.service";
import { GetElectionResultsService } from "./services/results/get-election-results.service";
import { VotingWindowService } from "./services/voting-window.service";
import { VoteTallyService } from "./services/tally/vote-tally.service";
import { GetElectionAnalyticsService } from "./services/analytics/get-election-analytics.service";
import { GetElectionAnalyticsResolver } from "./resolvers/get-election-analytics.resolver";
import { CastVoteResolver } from "./resolvers/cast-vote.resolver";
import { GetElectionResultsResolver } from "./resolvers/get-election-results.resolver";
import { VoterSessionResolver } from "./resolvers/voter-session.resolver";

@Module({
  imports: [
    TypeOrmModule.forFeature([VoterEntity, VoteEntity]),
    AuthModule,
    CandidatesModule,
    CaptchaModule,
  ],
  providers: [
    VotingWindowService,
    VoteTallyService,
    GetElectionAnalyticsService,
    GetElectionAnalyticsResolver,
    VoteRecorderService,
    CastVoteService,
    CastVoteResolver,
    VoterSessionQueryService,
    VoterSessionResolver,
    GetElectionResultsService,
    GetElectionResultsResolver,
  ],
})
export class VotesModule {}
