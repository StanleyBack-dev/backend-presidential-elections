import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  BallotOptionDto,
  CandidateDto,
} from "../dtos/get-candidates-response.dto";
import { CandidateEntity } from "../entities/candidate.entity";
import { BallotOptionKind } from "../enums/ballot-option-kind.enum";

@Injectable()
export class GetCandidatesService {
  // Ballot options are seeded by migration and never change at runtime.
  private cached: CandidateEntity[] | null = null;

  constructor(
    @InjectRepository(CandidateEntity)
    private readonly candidatesRepository: Repository<CandidateEntity>,
  ) {}

  /** Every ballot option: candidates, blank and null. */
  async findAll(): Promise<CandidateEntity[]> {
    this.cached ??= await this.candidatesRepository.find({
      order: { displayOrder: "ASC" },
    });
    return this.cached;
  }

  /** Real candidates only. */
  async findCandidates(): Promise<CandidateEntity[]> {
    return (await this.findAll()).filter(
      (option) => option.kind === BallotOptionKind.CANDIDATE,
    );
  }

  /** Any ballot option (a candidate, "branco" or "nulo"). */
  async findBySlug(slug: string): Promise<CandidateEntity | undefined> {
    return (await this.findAll()).find((option) => option.slug === slug);
  }

  async findOtherOptions(): Promise<BallotOptionDto[]> {
    return (await this.findAll())
      .filter((option) => option.kind !== BallotOptionKind.CANDIDATE)
      .map((option) => ({
        slug: option.slug,
        name: option.name,
        fullName: option.fullName,
        kind: option.kind,
        color: option.color,
      }));
  }

  async execute(): Promise<CandidateDto[]> {
    return (await this.findCandidates()).map(toCandidateDto);
  }
}

/** Only for kind CANDIDATE, where party and ballot number are guaranteed. */
export function toCandidateDto(candidate: CandidateEntity): CandidateDto {
  return {
    slug: candidate.slug,
    name: candidate.name,
    fullName: candidate.fullName,
    photoUrl: candidate.photoUrl,
    party: candidate.party!,
    ballotNumber: candidate.ballotNumber!,
    color: candidate.color,
  };
}
