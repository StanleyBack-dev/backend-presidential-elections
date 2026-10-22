import { Args, Query, Resolver } from "@nestjs/graphql";
import { RESPONSE_MESSAGES } from "../../../common/responses/catalogs/response-messages.catalog";
import { buildDataResponse } from "../../../common/responses/helpers/response.helper";
import { ElectionAnalyticsFilterInput } from "../dtos/analytics/election-analytics-filter.input";
import { ElectionAnalyticsQueryResponseDto } from "../dtos/analytics/election-analytics-response.dto";
import { GetElectionAnalyticsService } from "../services/analytics/get-election-analytics.service";

@Resolver()
export class GetElectionAnalyticsResolver {
  constructor(
    private readonly getElectionAnalyticsService: GetElectionAnalyticsService,
  ) {}

  @Query(() => ElectionAnalyticsQueryResponseDto, { name: "electionAnalytics" })
  async electionAnalytics(
    @Args("filter", { nullable: true }) filter?: ElectionAnalyticsFilterInput,
  ) {
    const analytics = await this.getElectionAnalyticsService.execute(
      filter ?? {},
    );
    return buildDataResponse(
      analytics,
      RESPONSE_MESSAGES.votes.analyticsFetched,
    );
  }
}
