import { CpfVerificationProvider } from "./cpf-verification.provider";

/**
 * No external lookup: relies only on the check digits already validated by
 * the caller. For local development, or a deliberate zero-cost deployment.
 */
export class LocalCpfVerificationProvider implements CpfVerificationProvider {
  readonly name = "local";

  async verify() {
    return "confirmed" as const;
  }
}
