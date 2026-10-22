import { HttpStatus } from "@nestjs/common";

// Identity failures share one deliberately vague message so the API never
// tells an attacker which part (CPF or birth date) was wrong.
const IDENTITY_NOT_CONFIRMED_MESSAGE =
  "Não foi possível confirmar seus dados. Verifique o CPF e a data de nascimento.";

export const votesErrors = {
  votingClosed: {
    code: "VOTING_CLOSED",
    status: HttpStatus.FORBIDDEN,
    message: "A votação está encerrada.",
  },
  invalidCpf: {
    code: "VOTE_INVALID_CPF",
    status: HttpStatus.BAD_REQUEST,
    message: "CPF inválido.",
  },
  identityNotConfirmed: {
    code: "VOTE_IDENTITY_NOT_CONFIRMED",
    status: HttpStatus.BAD_REQUEST,
    message: IDENTITY_NOT_CONFIRMED_MESSAGE,
  },
  underage: {
    code: "VOTE_UNDERAGE",
    status: HttpStatus.BAD_REQUEST,
    message: "É preciso ter pelo menos 16 anos para votar.",
  },
  alreadyVoted: {
    code: "VOTE_ALREADY_CAST",
    status: HttpStatus.CONFLICT,
    message: "Este CPF já registrou um voto.",
  },
  candidateNotFound: {
    code: "VOTE_CANDIDATE_NOT_FOUND",
    status: HttpStatus.BAD_REQUEST,
    message: "Candidato inválido.",
  },
  verificationUnavailable: {
    code: "VOTE_VERIFICATION_UNAVAILABLE",
    status: HttpStatus.SERVICE_UNAVAILABLE,
    message:
      "Não foi possível validar o CPF agora. Tente novamente em alguns minutos.",
  },
  invalidPeriod: {
    code: "ANALYTICS_INVALID_PERIOD",
    status: HttpStatus.BAD_REQUEST,
    message: "A data inicial deve ser anterior à data final.",
  },
  captchaFailed: {
    code: "VOTE_CAPTCHA_FAILED",
    status: HttpStatus.BAD_REQUEST,
    message:
      "Falha na verificação anti-robô. Recarregue a página e tente de novo.",
  },
} as const;
