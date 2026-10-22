import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, QueryFailedError, Repository } from "typeorm";
import { AppException } from "../../../../common/exceptions/app-exception";
import { APP_ERRORS } from "../../../../common/exceptions/app-errors.catalog";
import { ClientInfo } from "../../../../common/request/get-request.util";
import { hmacSha256 } from "../../../../common/security/hmac.util";
import { CaptchaService } from "../../../captcha/captcha.service";
import { GetCandidatesService } from "../../../candidates/services/get-candidates.service";
import { CPF_VERIFICATION_PROVIDER } from "../../../cpf-verification/providers/cpf-verification.provider";
import type { CpfVerificationProvider } from "../../../cpf-verification/providers/cpf-verification.provider";
import {
  ageOn,
  parseBirthDate,
} from "../../../cpf-verification/utils/birth-date.util";
import {
  isValidCpf,
  normalizeCpf,
} from "../../../cpf-verification/utils/cpf.util";
import { CastVoteInputDto } from "../../dtos/cast/cast-vote-input.dto";
import { CastVoteResponseDto } from "../../dtos/cast/cast-vote-response.dto";
import { VoteEntity } from "../../entities/vote.entity";
import { VoterEntity } from "../../entities/voter.entity";
import { VoteTallyService } from "../tally/vote-tally.service";
import { VotingWindowService } from "../voting-window.service";
import {
  cpfFailureKey,
  ipFailureKey,
  VoteFailureTrackerService,
} from "./vote-failure-tracker.service";

const MINIMUM_VOTING_AGE = 16;
const PG_UNIQUE_VIOLATION = "23505";

@Injectable()
export class CastVoteService {
  constructor(
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
    @InjectRepository(VoterEntity)
    private readonly votersRepository: Repository<VoterEntity>,
    private readonly getCandidatesService: GetCandidatesService,
    private readonly captchaService: CaptchaService,
    private readonly failureTracker: VoteFailureTrackerService,
    private readonly voteTallyService: VoteTallyService,
    private readonly votingWindowService: VotingWindowService,
    @Inject(CPF_VERIFICATION_PROVIDER)
    private readonly cpfVerificationProvider: CpfVerificationProvider,
  ) {}

  async execute(
    input: CastVoteInputDto,
    client: ClientInfo,
  ): Promise<CastVoteResponseDto> {
    if (!this.votingWindowService.isOpen()) {
      throw AppException.from(APP_ERRORS.votes.votingClosed, undefined);
    }

    const ipKey = ipFailureKey(client.ipHash ?? "unknown");
    await this.failureTracker.assertNotBlocked([ipKey]);

    // Cheapest checks first; the external CPF lookup is the last gate.
    if (!(await this.captchaService.verify(input.captchaToken, client.ip))) {
      throw AppException.from(APP_ERRORS.votes.captchaFailed, undefined);
    }

    const cpf = normalizeCpf(input.cpf);
    if (!isValidCpf(cpf)) {
      await this.failureTracker.registerFailure([ipKey]);
      throw AppException.from(APP_ERRORS.votes.invalidCpf, undefined);
    }

    const birthDate = parseBirthDate(input.birthDate);
    if (!birthDate) {
      throw AppException.from(APP_ERRORS.votes.identityNotConfirmed, undefined);
    }
    if (ageOn(birthDate) < MINIMUM_VOTING_AGE) {
      throw AppException.from(APP_ERRORS.votes.underage, undefined);
    }

    const candidate = await this.getCandidatesService.findBySlug(
      input.candidateSlug,
    );
    if (!candidate) {
      throw AppException.from(APP_ERRORS.votes.candidateNotFound, undefined);
    }

    const cpfHash = hmacSha256(
      this.configService.get<string>("CPF_HASH_SECRET")!,
      `cpf:${cpf}`,
    );
    const cpfKey = cpfFailureKey(cpfHash);
    await this.failureTracker.assertNotBlocked([cpfKey]);

    // Checked before the paid lookup so repeat attempts don't burn credits.
    if (await this.votersRepository.exists({ where: { cpfHash } })) {
      throw AppException.from(APP_ERRORS.votes.alreadyVoted, undefined);
    }

    const verification = await this.cpfVerificationProvider.verify(
      cpf,
      birthDate,
    );

    if (verification === "unavailable") {
      throw AppException.from(
        APP_ERRORS.votes.verificationUnavailable,
        undefined,
      );
    }

    if (verification === "not_confirmed") {
      await this.failureTracker.registerFailure([ipKey, cpfKey]);
      throw AppException.from(APP_ERRORS.votes.identityNotConfirmed, undefined);
    }

    await this.persistVote(cpfHash, candidate.idCandidates, input.state);
    await this.failureTracker.clear(cpfKey);
    this.voteTallyService.invalidate();

    return {
      registered: true,
      candidateSlug: candidate.slug,
      state: input.state,
      votedAt: new Date().toISOString(),
    };
  }

  /**
   * Voter registry and ballot are written atomically. The UNIQUE constraint
   * on `cpf_hash` is the real double-vote guard: it holds even when two
   * requests with the same CPF race past the `exists` check above.
   */
  private async persistVote(
    cpfHash: string,
    idCandidates: string,
    state: string,
  ): Promise<void> {
    try {
      await this.dataSource.transaction(async (manager) => {
        await manager.insert(VoterEntity, { cpfHash });
        await manager.insert(VoteEntity, { idCandidates, state });
      });
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error.driverError as { code?: string })?.code === PG_UNIQUE_VIOLATION
      ) {
        throw AppException.from(APP_ERRORS.votes.alreadyVoted, undefined);
      }
      throw error;
    }
  }
}
