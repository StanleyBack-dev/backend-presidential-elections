import { HttpException } from "@nestjs/common";
import { QueryFailedError } from "typeorm";
import { CastVoteService } from "../services/cast/cast-vote.service";
import { CastVoteInputDto } from "../dtos/cast/cast-vote-input.dto";

const CONFIG: Record<string, unknown> = {
  VOTING_OPEN: true,
  CPF_HASH_SECRET: "test-secret-test-secret-test-secret-1234",
};

const candidate = { idCandidates: "cand-1", slug: "lula" };

function buildInput(overrides: Partial<CastVoteInputDto> = {}) {
  return {
    cpf: "529.982.247-25",
    birthDate: "1990-06-15",
    candidateSlug: "lula",
    state: "SP",
    privacyConsent: true,
    ...overrides,
  } as CastVoteInputDto;
}

function setup() {
  const manager = { insert: jest.fn() };
  const deps = {
    config: { get: jest.fn((key: string) => CONFIG[key]) },
    dataSource: {
      transaction: jest.fn((cb: (m: typeof manager) => unknown) => cb(manager)),
    },
    votersRepository: { exists: jest.fn().mockResolvedValue(false) },
    candidates: { findBySlug: jest.fn().mockResolvedValue(candidate) },
    captcha: { verify: jest.fn().mockResolvedValue(true) },
    failures: {
      assertNotBlocked: jest.fn(),
      registerFailure: jest.fn(),
      clear: jest.fn(),
    },
    tally: { invalidate: jest.fn() },
    votingWindow: { isOpen: jest.fn().mockReturnValue(true) },
    provider: {
      name: "mock",
      verify: jest.fn().mockResolvedValue("confirmed"),
    },
  };

  const service = new CastVoteService(
    deps.config as never,
    deps.dataSource as never,
    deps.votersRepository as never,
    deps.candidates as never,
    deps.captcha as never,
    deps.failures as never,
    deps.tally as never,
    deps.votingWindow as never,
    deps.provider,
  );

  return { service, deps, manager };
}

async function errorCode(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
  } catch (error) {
    return ((error as HttpException).getResponse() as { code: string }).code;
  }
  throw new Error("expected rejection");
}

const client = { ip: "1.2.3.4", ipHash: "iphash" };

describe("CastVoteService", () => {
  it("records voter and ballot in one transaction", async () => {
    const { service, deps, manager } = setup();

    const result = await service.execute(buildInput(), client);

    expect(result).toEqual({
      registered: true,
      candidateSlug: "lula",
      state: "SP",
      votedAt: expect.any(String),
    });
    expect(manager.insert).toHaveBeenCalledTimes(2);
    const voterRow = manager.insert.mock.calls[0][1];
    expect(voterRow.cpfHash).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(manager.insert.mock.calls)).not.toContain(
      "52998224725",
    );
    expect(deps.tally.invalidate).toHaveBeenCalled();
  });

  it("hashes formatted and bare CPFs identically", async () => {
    const first = setup();
    await first.service.execute(buildInput({ cpf: "52998224725" }), client);
    const second = setup();
    await second.service.execute(buildInput(), client);

    expect(first.manager.insert.mock.calls[0][1]).toEqual(
      second.manager.insert.mock.calls[0][1],
    );
  });

  it("rejects a CPF that already voted without calling the provider", async () => {
    const { service, deps } = setup();
    deps.votersRepository.exists.mockResolvedValue(true);

    expect(await errorCode(service.execute(buildInput(), client))).toBe(
      "VOTE_ALREADY_CAST",
    );
    expect(deps.provider.verify).not.toHaveBeenCalled();
  });

  it("maps a unique violation race into VOTE_ALREADY_CAST", async () => {
    const { service, deps } = setup();
    (deps.dataSource.transaction as jest.Mock).mockRejectedValue(
      new QueryFailedError("insert", [], { code: "23505" } as never),
    );

    expect(await errorCode(service.execute(buildInput(), client))).toBe(
      "VOTE_ALREADY_CAST",
    );
  });

  it("counts an invalid CPF as a failure for the IP", async () => {
    const { service, deps } = setup();

    expect(
      await errorCode(
        service.execute(buildInput({ cpf: "52998224724" }), client),
      ),
    ).toBe("VOTE_INVALID_CPF");
    expect(deps.failures.registerFailure).toHaveBeenCalledWith([
      "fail:ip:iphash",
    ]);
  });

  it("counts a wrong birth date against both IP and CPF", async () => {
    const { service, deps, manager } = setup();
    deps.provider.verify.mockResolvedValue("not_confirmed");

    expect(await errorCode(service.execute(buildInput(), client))).toBe(
      "VOTE_IDENTITY_NOT_CONFIRMED",
    );
    const [keys] = deps.failures.registerFailure.mock.calls[0];
    expect(keys).toHaveLength(2);
    expect(keys[1]).toMatch(/^fail:cpf:/);
    expect(manager.insert).not.toHaveBeenCalled();
  });

  it("does not record anything when the provider is unavailable", async () => {
    const { service, deps, manager } = setup();
    deps.provider.verify.mockResolvedValue("unavailable");

    expect(await errorCode(service.execute(buildInput(), client))).toBe(
      "VOTE_VERIFICATION_UNAVAILABLE",
    );
    expect(deps.failures.registerFailure).not.toHaveBeenCalled();
    expect(manager.insert).not.toHaveBeenCalled();
  });

  it("rejects failed captcha before touching the CPF", async () => {
    const { service, deps } = setup();
    deps.captcha.verify.mockResolvedValue(false);

    expect(await errorCode(service.execute(buildInput(), client))).toBe(
      "VOTE_CAPTCHA_FAILED",
    );
    expect(deps.votersRepository.exists).not.toHaveBeenCalled();
  });

  it("rejects voters under 16", async () => {
    const { service } = setup();
    const year = new Date().getUTCFullYear() - 10;

    expect(
      await errorCode(
        service.execute(buildInput({ birthDate: `${year}-01-01` }), client),
      ),
    ).toBe("VOTE_UNDERAGE");
  });

  it("refuses votes when voting is closed", async () => {
    const { service, deps, manager } = setup();
    deps.votingWindow.isOpen.mockReturnValue(false);

    expect(await errorCode(service.execute(buildInput(), client))).toBe(
      "VOTING_CLOSED",
    );
    expect(deps.captcha.verify).not.toHaveBeenCalled();
    expect(manager.insert).not.toHaveBeenCalled();
  });
});
