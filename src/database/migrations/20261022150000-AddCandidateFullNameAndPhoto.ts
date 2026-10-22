import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Full legal names and official candidacy photos, as registered with the TSE
 * (Portal de Dados Abertos, consulta_cand_2026 / foto_cand2026_BR_div):
 * - Lula: SQ_CANDIDATO 280002542548
 * - Flávio Bolsonaro: SQ_CANDIDATO 280002551544
 * Photos are served by the frontend from /candidates/*.jpg.
 */
export class AddCandidateFullNameAndPhoto20261022150000 implements MigrationInterface {
  name = "AddCandidateFullNameAndPhoto20261022150000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tb_candidates"
        ADD COLUMN "full_name" varchar(160),
        ADD COLUMN "photo_url" varchar(255)
    `);

    await queryRunner.query(`
      UPDATE "tb_candidates" SET
        "full_name" = 'Luiz Inácio Lula da Silva',
        "photo_url" = '/candidates/lula.jpg'
      WHERE "slug" = 'lula'
    `);
    await queryRunner.query(`
      UPDATE "tb_candidates" SET
        "full_name" = 'Flávio Nantes Bolsonaro',
        "photo_url" = '/candidates/flavio-bolsonaro.jpg'
      WHERE "slug" = 'flavio-bolsonaro'
    `);

    await queryRunner.query(`
      UPDATE "tb_candidates" SET "full_name" = "name" WHERE "full_name" IS NULL
    `);
    await queryRunner.query(
      `ALTER TABLE "tb_candidates" ALTER COLUMN "full_name" SET NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tb_candidates"
        DROP COLUMN "photo_url",
        DROP COLUMN "full_name"
    `);
  }
}
