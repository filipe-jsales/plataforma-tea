import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateStudentIdentityReversals1785940075961 implements MigrationInterface {
    name = 'CreateStudentIdentityReversals1785940075961'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "student_identity_reversals" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "pseudonymId" character varying(64) NOT NULL, "schoolReversibleRef" character varying(128), "schoolId" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_7c8bb0dbc9599c0c0410f779a50" UNIQUE ("userId"), CONSTRAINT "UQ_5a9ec41b3784bd9861569cd76db" UNIQUE ("pseudonymId"), CONSTRAINT "REL_7c8bb0dbc9599c0c0410f779a5" UNIQUE ("userId"), CONSTRAINT "PK_4fa990f01b85f101e7ba8132050" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_7c8bb0dbc9599c0c0410f779a5" ON "student_identity_reversals"  ("userId") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_5a9ec41b3784bd9861569cd76d" ON "student_identity_reversals"  ("pseudonymId") `);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "schoolReversibleRef"`);
        await queryRunner.query(`ALTER TABLE "student_identity_reversals" ADD CONSTRAINT "FK_7c8bb0dbc9599c0c0410f779a50" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "student_identity_reversals" ADD CONSTRAINT "FK_3978c7264b7bb08471a8cfc96b7" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "student_identity_reversals" DROP CONSTRAINT "FK_3978c7264b7bb08471a8cfc96b7"`);
        await queryRunner.query(`ALTER TABLE "student_identity_reversals" DROP CONSTRAINT "FK_7c8bb0dbc9599c0c0410f779a50"`);
        await queryRunner.query(`ALTER TABLE "users" ADD "schoolReversibleRef" character varying(128)`);
        await queryRunner.query(`DROP INDEX "public"."IDX_5a9ec41b3784bd9861569cd76d"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_7c8bb0dbc9599c0c0410f779a5"`);
        await queryRunner.query(`DROP TABLE "student_identity_reversals"`);
    }

}
