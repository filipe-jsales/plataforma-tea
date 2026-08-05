import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateSchoolsClassroomsAndEnrollments1785938810043 implements MigrationInterface {
    name = 'CreateSchoolsClassroomsAndEnrollments1785938810043'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "schools" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(150) NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_95b932e47ac129dd8e23a0db548" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "classrooms" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "schoolId" uuid NOT NULL, "teacherId" uuid, "name" character varying(120) NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_20b7b82896c06eda27548bd0c24" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "enrollments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "studentId" uuid NOT NULL, "classroomId" uuid NOT NULL, "active" boolean NOT NULL DEFAULT true, "enrolledAt" TIMESTAMP NOT NULL DEFAULT now(), "unenrolledAt" TIMESTAMP, CONSTRAINT "PK_7c0f752f9fb68bf6ed7367ab00f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_0d13df45a63569d3596e422da1" ON "enrollments"  ("studentId", "classroomId") `);
        await queryRunner.query(`ALTER TABLE "classrooms" ADD CONSTRAINT "FK_55418280a71e7e220d89987ed8f" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "classrooms" ADD CONSTRAINT "FK_ea22bf3c6b069755e01340f6334" FOREIGN KEY ("teacherId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "enrollments" ADD CONSTRAINT "FK_bf3ba3dfa95e2df7388eb4589fd" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "enrollments" ADD CONSTRAINT "FK_a766f2b4118abeedc8636ef567b" FOREIGN KEY ("classroomId") REFERENCES "classrooms"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "enrollments" DROP CONSTRAINT "FK_a766f2b4118abeedc8636ef567b"`);
        await queryRunner.query(`ALTER TABLE "enrollments" DROP CONSTRAINT "FK_bf3ba3dfa95e2df7388eb4589fd"`);
        await queryRunner.query(`ALTER TABLE "classrooms" DROP CONSTRAINT "FK_ea22bf3c6b069755e01340f6334"`);
        await queryRunner.query(`ALTER TABLE "classrooms" DROP CONSTRAINT "FK_55418280a71e7e220d89987ed8f"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_0d13df45a63569d3596e422da1"`);
        await queryRunner.query(`DROP TABLE "enrollments"`);
        await queryRunner.query(`DROP TABLE "classrooms"`);
        await queryRunner.query(`DROP TABLE "schools"`);
    }

}
