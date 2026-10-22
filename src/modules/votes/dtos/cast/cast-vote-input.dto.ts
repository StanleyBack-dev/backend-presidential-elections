import { Field, InputType } from "@nestjs/graphql";
import {
  Equals,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from "class-validator";
import { BRAZILIAN_STATES } from "../../../../common/constants/brazilian-states.constant";

@InputType()
export class CastVoteInputDto {
  @Field()
  @Matches(/^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/, { message: "CPF inválido." })
  cpf!: string;

  @Field({ description: "Data de nascimento no formato YYYY-MM-DD." })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: "Data de nascimento inválida.",
  })
  birthDate!: string;

  @Field()
  @IsString()
  @MaxLength(40)
  candidateSlug!: string;

  @Field()
  @IsIn(BRAZILIAN_STATES, { message: "Estado inválido." })
  state!: string;

  @Field({ description: "Aceite do aviso de privacidade (LGPD)." })
  @Equals(true, { message: "É necessário aceitar o aviso de privacidade." })
  privacyConsent!: boolean;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  captchaToken?: string;
}
