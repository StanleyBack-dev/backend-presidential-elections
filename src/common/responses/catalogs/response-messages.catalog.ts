export const RESPONSE_MESSAGES = {
  candidates: {
    listed: {
      code: "CANDIDATES_LISTED",
      message: "Candidatos carregados com sucesso.",
    },
  },
  votes: {
    cast: {
      code: "VOTE_CAST",
      message: "Voto registrado com sucesso. Obrigado por participar!",
    },
    analyticsFetched: {
      code: "ELECTION_ANALYTICS_FETCHED",
      message: "Análise carregada com sucesso.",
    },
    resultsFetched: {
      code: "ELECTION_RESULTS_FETCHED",
      message: "Resultados carregados com sucesso.",
    },
  },
} as const;
