import { BirthDate } from "../utils/birth-date.util";

/**
 * - `confirmed`: the CPF exists and the birth date matches.
 * - `not_confirmed`: the CPF does not exist or the birth date is wrong.
 * - `unavailable`: the provider could not answer (outage, quota, timeout).
 */
export type CpfVerificationResult =
  "confirmed" | "not_confirmed" | "unavailable";

export interface CpfVerificationProvider {
  readonly name: string;
  verify(cpf: string, birthDate: BirthDate): Promise<CpfVerificationResult>;
}

export const CPF_VERIFICATION_PROVIDER = Symbol("CPF_VERIFICATION_PROVIDER");
