import { Field, Int, ObjectType } from "@nestjs/graphql";
import { BaseResponseDto } from "../../../common/responses/dtos/base-response.dto";
import { BallotOptionKind } from "../enums/ballot-option-kind.enum";

@ObjectType()
export class CandidateDto {
  @Field()
  slug!: string;

  @Field({ description: "Nome de urna." })
  name!: string;

  @Field({ description: "Nome completo registrado no TSE." })
  fullName!: string;

  @Field(() => String, {
    nullable: true,
    description: "Foto oficial da candidatura (TSE).",
  })
  photoUrl!: string | null;

  @Field()
  party!: string;

  @Field(() => Int)
  ballotNumber!: number;

  @Field()
  color!: string;
}

/** Non-candidate ballot options: voto em branco / voto nulo. */
@ObjectType()
export class BallotOptionDto {
  @Field()
  slug!: string;

  @Field()
  name!: string;

  @Field()
  fullName!: string;

  @Field(() => BallotOptionKind)
  kind!: BallotOptionKind;

  @Field()
  color!: string;
}

@ObjectType()
export class GetCandidatesQueryResponseDto extends BaseResponseDto {
  @Field(() => [CandidateDto])
  data!: CandidateDto[];
}
