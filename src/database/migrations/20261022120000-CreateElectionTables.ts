import { MigrationInterface, QueryRunner } from "typeorm";

const BRAZILIAN_STATES = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
];

export class CreateElectionTables20261022120000 implements MigrationInterface {
  name = "CreateElectionTables20261022120000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    await queryRunner.query(`
      CREATE TABLE "tb_candidates" (
        "idtb_candidates" uuid NOT NULL DEFAULT gen_random_uuid(),
        "slug" varchar(40) NOT NULL,
        "name" varchar(120) NOT NULL,
        "party" varchar(20) NOT NULL,
        "ballot_number" smallint NOT NULL,
        "color" varchar(7) NOT NULL,
        "display_order" smallint NOT NULL DEFAULT 0,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tb_candidates" PRIMARY KEY ("idtb_candidates"),
        CONSTRAINT "UQ_tb_candidates_slug" UNIQUE ("slug"),
        CONSTRAINT "UQ_tb_candidates_ballot_number" UNIQUE ("ballot_number")
      )
    `);

    // Who already voted. Holds only an HMAC of the CPF — never the CPF
    // itself — and deliberately has no link to tb_votes (secret ballot).
    await queryRunner.query(`
      CREATE TABLE "tb_voters" (
        "idtb_voters" uuid NOT NULL DEFAULT gen_random_uuid(),
        "cpf_hash" char(64) NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tb_voters" PRIMARY KEY ("idtb_voters"),
        CONSTRAINT "UQ_tb_voters_cpf_hash" UNIQUE ("cpf_hash")
      )
    `);

    // The ballots. Only the hour is kept so a vote cannot be matched back to
    // a voter row by timestamp.
    await queryRunner.query(`
      CREATE TABLE "tb_votes" (
        "idtb_votes" uuid NOT NULL DEFAULT gen_random_uuid(),
        "idtb_candidates" uuid NOT NULL,
        "state" char(2) NOT NULL,
        "voted_hour" timestamptz NOT NULL DEFAULT date_trunc('hour', now()),
        CONSTRAINT "PK_tb_votes" PRIMARY KEY ("idtb_votes"),
        CONSTRAINT "FK_tb_votes_candidate" FOREIGN KEY ("idtb_candidates")
          REFERENCES "tb_candidates"("idtb_candidates") ON DELETE RESTRICT,
        CONSTRAINT "CHK_tb_votes_state" CHECK ("state" IN (${BRAZILIAN_STATES.map((uf) => `'${uf}'`).join(", ")}))
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_tb_votes_candidate_state" ON "tb_votes" ("idtb_candidates", "state")`,
    );

    // Shared rate-limit counters, so limits hold across serverless instances.
    await queryRunner.query(`
      CREATE TABLE "tb_rate_limits" (
        "key" varchar(160) NOT NULL,
        "hits" integer NOT NULL DEFAULT 0,
        "expires_at" timestamptz NOT NULL,
        CONSTRAINT "PK_tb_rate_limits" PRIMARY KEY ("key")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_tb_rate_limits_expires_at" ON "tb_rate_limits" ("expires_at")`,
    );

    await queryRunner.query(`
      INSERT INTO "tb_candidates" ("slug", "name", "party", "ballot_number", "color", "display_order")
      VALUES
        ('lula', 'Lula', 'PT', 13, '#C8102E', 1),
        ('flavio-bolsonaro', 'Flávio Bolsonaro', 'PL', 22, '#1F4E9C', 2)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "tb_rate_limits"`);
    await queryRunner.query(`DROP TABLE "tb_votes"`);
    await queryRunner.query(`DROP TABLE "tb_voters"`);
    await queryRunner.query(`DROP TABLE "tb_candidates"`);
  }
}
