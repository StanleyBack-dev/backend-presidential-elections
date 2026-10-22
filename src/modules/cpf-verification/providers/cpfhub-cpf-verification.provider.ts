import { Logger } from "@nestjs/common";
import { BirthDate, sameBirthDate } from "../utils/birth-date.util";
import {
  CpfVerificationProvider,
  CpfVerificationResult,
} from "./cpf-verification.provider";

interface CpfHubResponse {
  success?: boolean;
  data?: { day?: number; month?: number; year?: number } | null;
}

/**
 * https://www.cpfhub.io — `GET /cpf/{cpf}` returns the registered birth date.
 * Only the yes/no outcome is used; the name and other data it returns are
 * discarded immediately and never logged or stored.
 */
export class CpfHubCpfVerificationProvider implements CpfVerificationProvider {
  readonly name = "cpfhub";
  private readonly logger = new Logger(CpfHubCpfVerificationProvider.name);

  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
    private readonly timeoutMs: number,
  ) {}

  async verify(
    cpf: string,
    birthDate: BirthDate,
  ): Promise<CpfVerificationResult> {
    let response: Response;

    try {
      response = await fetch(
        `${this.baseUrl.replace(/\/+$/, "")}/cpf/${encodeURIComponent(cpf)}`,
        {
          method: "GET",
          headers: { "x-api-key": this.apiKey, Accept: "application/json" },
          signal: AbortSignal.timeout(this.timeoutMs),
        },
      );
    } catch (error) {
      this.logger.error(
        `CPFHub request failed: ${(error as Error).name} ${(error as Error).message}`,
      );
      return "unavailable";
    }

    // 404: CPF not found. 400/422: malformed / bad check digits.
    if ([400, 404, 422].includes(response.status)) {
      return "not_confirmed";
    }

    if (!response.ok) {
      // 401/403: bad key or out of credits; 429: provider rate limit; 5xx.
      this.logger.error(`CPFHub responded with status ${response.status}`);
      return "unavailable";
    }

    const body = (await response
      .json()
      .catch(() => null)) as CpfHubResponse | null;
    const data = body?.data;

    if (!body?.success || !data?.year || !data.month || !data.day) {
      this.logger.error("CPFHub returned an unexpected payload shape");
      return "unavailable";
    }

    return sameBirthDate(
      { year: data.year, month: data.month, day: data.day },
      birthDate,
    )
      ? "confirmed"
      : "not_confirmed";
  }
}
