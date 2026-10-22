import { Field, Float, Int, ObjectType } from "@nestjs/graphql";
import { createDataResponseDto } from "../../../../common/responses/factories/create-data-response.dto";
import {
  BallotOptionDto,
  CandidateDto,
} from "../../../candidates/dtos/get-candidates-response.dto";

@ObjectType()
export class CandidateResultDto extends CandidateDto {
  @Field(() => Int)
  votes!: number;

  @Field(() => Float, {
    description: "Percentual dos votos válidos (0–100), como no TSE.",
  })
  percentage!: number;
}

@ObjectType()
export class StateCandidateResultDto {
  @Field()
  slug!: string;

  @Field(() => Int)
  votes!: number;

  @Field(() => Float, { description: "Percentual dos votos válidos." })
  percentage!: number;
}

/** Totals split like the TSE: valid (candidates) vs. blank vs. null. */
@ObjectType({ isAbstract: true })
export abstract class VoteCountsDto {
  @Field(() => Int, {
    description: "Todos os votos, incluindo brancos e nulos.",
  })
  totalVotes!: number;

  @Field(() => Int, { description: "Votos em candidatos." })
  validVotes!: number;

  @Field(() => Int)
  blankVotes!: number;

  @Field(() => Int)
  nullVotes!: number;
}

@ObjectType()
export class StateResultDto extends VoteCountsDto {
  @Field()
  state!: string;

  @Field(() => [StateCandidateResultDto])
  candidates!: StateCandidateResultDto[];
}

@ObjectType()
export class ElectionResultsDto extends VoteCountsDto {
  @Field(() => Float, { description: "Brancos sobre o total de votos (%)." })
  blankPercentage!: number;

  @Field(() => Float, { description: "Nulos sobre o total de votos (%)." })
  nullPercentage!: number;

  @Field()
  votingOpen!: boolean;

  @Field({
    description:
      "Instante oficial de encerramento (ISO 8601, UTC). Igual para todos os estados.",
  })
  votingClosesAt!: string;

  @Field()
  updatedAt!: string;

  @Field(() => [CandidateResultDto])
  candidates!: CandidateResultDto[];

  @Field(() => [BallotOptionDto], {
    description: "Opções além dos candidatos: voto em branco e voto nulo.",
  })
  otherOptions!: BallotOptionDto[];

  @Field(() => [StateResultDto])
  states!: StateResultDto[];
}

export const ElectionResultsQueryResponseDto = createDataResponseDto(
  ElectionResultsDto,
  "ElectionResultsQueryResponseDto",
);
