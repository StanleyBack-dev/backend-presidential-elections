import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Blank ("branco") and null ("nulo") votes become ballot options alongside
 * the candidates, so a vote row keeps pointing at a single option and the
 * voter registry / secret-ballot design stays untouched. `kind` tells them
 * apart; like the TSE, candidate percentages are computed over valid votes
 * (excluding blank and null).
 */
export class AddBlankAndNullBallotOptions20261022180000 implements MigrationInterface {
  name = "AddBlankAndNullBallotOptions20261022180000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tb_candidates"
        ADD COLUMN "kind" varchar(12) NOT NULL DEFAULT 'CANDIDATE',
        ADD CONSTRAINT "CHK_tb_candidates_kind"
          CHECK ("kind" IN ('CANDIDATE', 'BLANK', 'NULL_VOTE')),
        ALTER COLUMN "party" DROP NOT NULL,
        ALTER COLUMN "ballot_number" DROP NOT NULL
    `);

    // Real candidates must still have a party and a ballot number.
    await queryRunner.query(`
      ALTER TABLE "tb_candidates"
        ADD CONSTRAINT "CHK_tb_candidates_candidate_fields"
          CHECK ("kind" <> 'CANDIDATE' OR ("party" IS NOT NULL AND "ballot_number" IS NOT NULL))
    `);

    await queryRunner.query(`
      INSERT INTO "tb_candidates"
        ("slug", "name", "full_name", "party", "ballot_number", "color", "display_order", "kind")
      VALUES
        ('branco', 'Branco', 'Voto em branco', NULL, NULL, '#94A3B8', 90, 'BLANK'),
        ('nulo', 'Nulo', 'Voto nulo', NULL, NULL, '#475569', 91, 'NULL_VOTE')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Refuses to run if blank/null votes exist (FK RESTRICT), on purpose.
    await queryRunner.query(
      `DELETE FROM "tb_candidates" WHERE "kind" <> 'CANDIDATE'`,
    );
    await queryRunner.query(`
      ALTER TABLE "tb_candidates"
        DROP CONSTRAINT "CHK_tb_candidates_candidate_fields",
        DROP CONSTRAINT "CHK_tb_candidates_kind",
        DROP COLUMN "kind",
        ALTER COLUMN "party" SET NOT NULL,
        ALTER COLUMN "ballot_number" SET NOT NULL
    `);
  }
}
