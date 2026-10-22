import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AppException } from "../../../../common/exceptions/app-exception";
import { APP_ERRORS } from "../../../../common/exceptions/app-errors.catalog";
import { RateLimitService } from "../../../../common/rate-limit/rate-limit.service";

/**
 * Locks out callers after repeated failed identity checks, on two axes:
 * - per IP: stops one client from enumerating CPFs;
 * - per CPF: stops brute-forcing someone's birth date from many IPs.
 */
@Injectable()
export class VoteFailureTrackerService {
  constructor(
    private readonly rateLimitService: RateLimitService,
    private readonly configService: ConfigService,
  ) {}

  private get maxAttempts(): number {
    return this.configService.get<number>("VOTE_FAILURE_MAX_ATTEMPTS")!;
  }

  private get lockSeconds(): number {
    return this.configService.get<number>("VOTE_FAILURE_LOCK_SECONDS")!;
  }

  async assertNotBlocked(keys: string[]): Promise<void> {
    for (const key of keys) {
      const retryAfterSeconds = await this.rateLimitService.blockedFor(
        key,
        this.maxAttempts,
      );

      if (retryAfterSeconds !== null) {
        throw AppException.from(APP_ERRORS.security.temporarilyBlocked, {
          retryAfterSeconds,
        });
      }
    }
  }

  async registerFailure(keys: string[]): Promise<void> {
    await Promise.all(
      keys.map((key) =>
        this.rateLimitService.hit(key, this.maxAttempts, this.lockSeconds),
      ),
    );
  }

  async clear(key: string): Promise<void> {
    await this.rateLimitService.reset(key);
  }
}

export const ipFailureKey = (ipHash: string) => `fail:ip:${ipHash}`;
export const cpfFailureKey = (cpfHash: string) =>
  `fail:cpf:${cpfHash.slice(0, 40)}`;
