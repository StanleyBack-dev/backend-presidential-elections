import { AppErrorDefinition } from "./app-error-definition.type";
import { securityErrors } from "./catalogs/security-errors.catalog";
import { votesErrors } from "./catalogs/votes-errors.catalog";

export const APP_ERRORS = {
  security: securityErrors,
  votes: votesErrors,
} as const satisfies Record<string, Record<string, AppErrorDefinition<never>>>;
