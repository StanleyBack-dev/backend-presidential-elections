import { Query, Resolver } from "@nestjs/graphql";
import { RESPONSE_MESSAGES } from "../../../common/responses/catalogs/response-messages.catalog";
import { buildDataResponse } from "../../../common/responses/helpers/response.helper";
import { ElectionResultsQueryResponseDto } from "../dtos/results/election-results-response.dto";
import { GetElectionResultsService } from "../services/results/get-election-results.service";

@Resolver()
export class GetElectionResultsResolver {
  constructor(
    private readonly getElectionResultsService: GetElectionResultsService,
  ) {}

  @Query(() => ElectionResultsQueryResponseDto, { name: "electionResults" })
  async electionResults() {
    const results = await this.getElectionResultsService.execute();
    return buildDataResponse(results, RESPONSE_MESSAGES.votes.resultsFetched);
  }
}
