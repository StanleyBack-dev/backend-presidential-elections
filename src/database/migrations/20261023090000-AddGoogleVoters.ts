import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Voters now identify with their Google account instead of the CPF.
 * `google_hash` (HMAC of the account's stable `sub` id) gets its own UNIQUE
 * constraint — the double-vote guard. `cpf_hash` is kept (nullable, no
 * longer written) so votes from the CPF release stay counted, and each row
 * holds exactly one of the two.
 */
export class AddGoogleVoters20261023090000 implements MigrationInterface {
  name = "AddGoogleVoters20261023090000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // An SMS-code prototype reached some development databases but was never
    // released. Drop what it left behind; a no-op everywhere else.
    await queryRunner.query(`DROP TABLE IF EXISTS "tb_phone_verifications"`);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'tb_voters' AND column_name = 'phone_hash'
        ) THEN
          DELETE FROM "tb_voters" WHERE "phone_hash" IS NOT NULL;
          ALTER TABLE "tb_voters"
            DROP CONSTRAINT IF EXISTS "CHK_tb_voters_single_identity",
            DROP COLUMN "phone_hash";
        END IF;
      END $$
    `);

    await queryRunner.query(`
      ALTER TABLE "tb_voters"
        ALTER COLUMN "cpf_hash" DROP NOT NULL,
        ADD COLUMN "google_hash" char(64),
        ADD CONSTRAINT "UQ_tb_voters_google_hash" UNIQUE ("google_hash"),
        ADD CONSTRAINT "CHK_tb_voters_single_identity"
          CHECK (num_nonnulls("cpf_hash", "google_hash") = 1)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Refuses to run while Google voters exist (NOT NULL), on purpose.
    await queryRunner.query(`
      ALTER TABLE "tb_voters"
        DROP CONSTRAINT "CHK_tb_voters_single_identity",
        DROP CONSTRAINT "UQ_tb_voters_google_hash",
        DROP COLUMN "google_hash",
        ALTER COLUMN "cpf_hash" SET NOT NULL
    `);
  }
}
