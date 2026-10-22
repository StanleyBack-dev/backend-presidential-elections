import { registerEnumType } from "@nestjs/graphql";

export enum BallotOptionKind {
  CANDIDATE = "CANDIDATE",
  /** Voto em branco. */
  BLANK = "BLANK",
  /** Voto nulo. */
  NULL_VOTE = "NULL_VOTE",
}

registerEnumType(BallotOptionKind, {
  name: "BallotOptionKind",
  description: "Candidato, voto em branco ou voto nulo.",
});
