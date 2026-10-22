import { HttpException } from "@nestjs/common";
import { BrazilianRegion } from "../../../common/constants/brazilian-regions.constant";
import {
  SortOrder,
  StateSortField,
  TimelineGranularity,
} from "../enums/analytics.enums";
import { GetElectionAnalyticsService } from "../services/analytics/get-election-analytics.service";
import { TallyRow } from "../services/tally/vote-tally.service";
import { BallotOptionKind } from "../../candidates/enums/ballot-option-kind.enum";

const H = 3_600_000;
const T0 = Date.parse("2026-10-23T12:00:00Z");

const OPTIONS = [
  {
    idCandidates: "id-lula",
    slug: "lula",
    name: "Lula",
    kind: BallotOptionKind.CANDIDATE,
  },
  {
    idCandidates: "id-flavio",
    slug: "flavio-bolsonaro",
    name: "Flávio",
    kind: BallotOptionKind.CANDIDATE,
  },
  {
    idCandidates: "id-branco",
    slug: "branco",
    name: "Branco",
    kind: BallotOptionKind.BLANK,
  },
  {
    idCandidates: "id-nulo",
    slug: "nulo",
    name: "Nulo",
    kind: BallotOptionKind.NULL_VOTE,
  },
].map((o) => ({
  ...o,
  fullName: o.name,
  photoUrl: null,
  party: "X",
  ballotNumber: 1,
  color: "#000000",
}));

type Slug = "lula" | "flavio-bolsonaro" | "branco" | "nulo";

const row = (
  slug: Slug,
  state: string,
  hour: number,
  votes: number,
): TallyRow => ({
  idCandidates: OPTIONS.find((o) => o.slug === slug)!.idCandidates,
  state,
  hourMs: T0 + hour * H,
  votes,
});

// SP: Lula 6 x 4 · RJ: Flávio 3 x 1 · BA: Lula 5 x 0 · PR: 2 x 2 (tie)
const ROWS: TallyRow[] = [
  row("lula", "SP", 0, 4),
  row("lula", "SP", 2, 2),
  row("flavio-bolsonaro", "SP", 1, 4),
  row("flavio-bolsonaro", "RJ", 0, 3),
  row("lula", "RJ", 2, 1),
  row("lula", "BA", 1, 5),
  row("lula", "PR", 0, 2),
  row("flavio-bolsonaro", "PR", 2, 2),
];

function setup(rows = ROWS) {
  return new GetElectionAnalyticsService(
    { rows: jest.fn().mockResolvedValue(rows) } as never,
    {
      findAll: jest.fn().mockResolvedValue(OPTIONS),
      findCandidates: jest
        .fn()
        .mockResolvedValue(
          OPTIONS.filter((o) => o.kind === BallotOptionKind.CANDIDATE),
        ),
    } as never,
  );
}

const pct = (data: { candidates: { slug: string; percentage: number }[] }) =>
  Object.fromEntries(data.candidates.map((c) => [c.slug, c.percentage]));

describe("GetElectionAnalyticsService", () => {
  it("summarizes the whole country", async () => {
    const result = await setup().execute();

    expect(result.summary.totalVotes).toBe(23);
    expect(result.summary.nationalVotes).toBe(23);
    expect(result.summary.shareOfNational).toBe(100);
    expect(result.summary.leaderSlug).toBe("lula");
    expect(result.summary.marginVotes).toBe(14 - 9);
    expect(result.summary.statesWon).toEqual([
      { slug: "lula", states: 2 },
      { slug: "flavio-bolsonaro", states: 1 },
    ]);
    expect(result.summary.tiedStates).toBe(1);
    expect(result.summary.statesWithoutVotes).toBe(27 - 4);
    expect(result.states).toHaveLength(27);
  });

  it("filters by region, keeping the national baseline", async () => {
    const result = await setup().execute({ region: BrazilianRegion.SUDESTE });

    expect(result.states.map((s) => s.state).sort()).toEqual([
      "ES",
      "MG",
      "RJ",
      "SP",
    ]);
    expect(result.summary.totalVotes).toBe(14);
    expect(result.summary.nationalVotes).toBe(23);
    expect(result.regions.map((r) => r.region)).toEqual([
      BrazilianRegion.SUDESTE,
    ]);
    expect(pct(result)).toEqual({ lula: 50, "flavio-bolsonaro": 50 });
    expect(result.summary.leaderSlug).toBeNull();
  });

  it("intersects region and explicit states", async () => {
    const result = await setup().execute({
      region: BrazilianRegion.SUDESTE,
      states: ["SP", "BA"],
    });
    expect(result.states.map((s) => s.state)).toEqual(["SP"]);
  });

  it("filters states by leader and minimum votes", async () => {
    const byLeader = await setup().execute({ leaderSlug: "lula" });
    expect(byLeader.states.map((s) => s.state)).toEqual(["SP", "BA"]);

    const byMin = await setup().execute({ minVotes: 6 });
    expect(byMin.states.map((s) => s.state)).toEqual(["SP"]);
    const inclusive = await setup().execute({ minVotes: 5 });
    expect(inclusive.states.map((s) => s.state)).toEqual(["SP", "BA"]);
  });

  it("sorts by candidate share and by state", async () => {
    const byShare = await setup().execute({
      minVotes: 1,
      sortBy: StateSortField.CANDIDATE_SHARE,
      sortCandidateSlug: "flavio-bolsonaro",
      order: SortOrder.DESC,
    });
    expect(byShare.states.map((s) => s.state)).toEqual([
      "RJ",
      "PR",
      "SP",
      "BA",
    ]);

    const alpha = await setup().execute({
      minVotes: 1,
      sortBy: StateSortField.STATE,
    });
    expect(alpha.states.map((s) => s.state)).toEqual(["BA", "PR", "RJ", "SP"]);
  });

  it("restricts the period, rounding `from` down to the hour", async () => {
    const result = await setup().execute({
      from: new Date(T0 + 2 * H + 30 * 60_000).toISOString(),
    });
    // Only hour 2: SP lula 2, RJ lula 1, PR flávio 2
    expect(result.summary.totalVotes).toBe(5);
    expect(result.summary.nationalVotes).toBe(5);
  });

  it("rejects a period that ends before it starts", async () => {
    await expect(
      setup().execute({
        from: "2026-10-24T00:00:00Z",
        to: "2026-10-23T00:00:00Z",
      }),
    ).rejects.toBeInstanceOf(HttpException);
  });

  it("builds a continuous cumulative hourly timeline", async () => {
    const { timeline, granularity } = await setup().execute();

    expect(granularity).toBe(TimelineGranularity.HOUR);
    expect(timeline.map((p) => p.at)).toEqual([
      new Date(T0).toISOString(),
      new Date(T0 + H).toISOString(),
      new Date(T0 + 2 * H).toISOString(),
    ]);
    expect(timeline.map((p) => p.cumulativeTotal)).toEqual([9, 18, 23]);
    expect(timeline.at(-1)!.candidates[0].cumulativeVotes).toBe(14);
  });

  it("switches to daily buckets cut at midnight Brasília", async () => {
    const rows = [
      // 02:00 UTC = 23:00 Brasília (day 1) · 04:00 UTC = 01:00 Brasília (day 2)
      {
        ...row("lula", "SP", 0, 1),
        hourMs: Date.parse("2026-10-20T02:00:00Z"),
      },
      {
        ...row("lula", "SP", 0, 1),
        hourMs: Date.parse("2026-10-20T04:00:00Z"),
      },
      {
        ...row("lula", "SP", 0, 1),
        hourMs: Date.parse("2026-10-24T04:00:00Z"),
      },
    ];
    const { timeline, granularity } = await setup(rows).execute();

    expect(granularity).toBe(TimelineGranularity.DAY);
    expect(timeline[0].at).toBe("2026-10-19T03:00:00.000Z");
    expect(timeline[0].totalVotes).toBe(1);
    expect(timeline[1].at).toBe("2026-10-20T03:00:00.000Z");
    expect(timeline[1].totalVotes).toBe(1);
    expect(timeline).toHaveLength(6);
  });

  it("returns an empty timeline when there are no votes", async () => {
    const result = await setup([]).execute();
    expect(result.timeline).toEqual([]);
    expect(result.summary.leaderSlug).toBeNull();
    expect(result.summary.shareOfNational).toBe(0);
  });

  it("counts blank and null in the total but not in candidate shares", async () => {
    // SP: Lula 3, Flávio 1, branco 2, nulo 4 → 10 total, 4 valid
    const result = await setup([
      row("lula", "SP", 0, 3),
      row("flavio-bolsonaro", "SP", 0, 1),
      row("branco", "SP", 0, 2),
      row("nulo", "SP", 1, 4),
    ]).execute();

    expect(result.summary).toMatchObject({
      totalVotes: 10,
      validVotes: 4,
      blankVotes: 2,
      nullVotes: 4,
      blankPercentage: 20,
      nullPercentage: 40,
      leaderSlug: "lula",
      marginPoints: 50,
    });
    expect(pct(result)).toEqual({ lula: 75, "flavio-bolsonaro": 25 });
    expect(result.candidates.map((c) => c.slug)).toEqual([
      "lula",
      "flavio-bolsonaro",
    ]);

    const sp = result.states.find((s) => s.state === "SP")!;
    expect(sp).toMatchObject({ totalVotes: 10, validVotes: 4, blankVotes: 2 });

    const last = result.timeline.at(-1)!;
    expect(last.cumulativeTotal).toBe(10);
    expect(last.cumulativeValid).toBe(4);
    expect(last.candidates[0].cumulativePercentage).toBe(75);
  });

  it("has no leader when a state only has blank/null votes", async () => {
    const result = await setup([
      row("branco", "AC", 0, 2),
      row("nulo", "AC", 0, 1),
    ]).execute();

    const ac = result.states.find((s) => s.state === "AC")!;
    expect(ac.totalVotes).toBe(3);
    expect(ac.validVotes).toBe(0);
    expect(ac.leaderSlug).toBeNull();
    expect(result.summary.tiedStates).toBe(0);
    expect(result.summary.statesWithoutVotes).toBe(26);
  });
});
