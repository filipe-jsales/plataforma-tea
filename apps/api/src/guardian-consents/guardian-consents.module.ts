import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GuardianConsent } from './entities/guardian-consent.entity';
import { GuardianConsentsAdminController } from './guardian-consents-admin.controller';
import { GuardianConsentsService } from './guardian-consents.service';

@Module({
  imports: [TypeOrmModule.forFeature([GuardianConsent])],
  controllers: [GuardianConsentsAdminController],
  providers: [GuardianConsentsService],
  exports: [GuardianConsentsService],
})
export class GuardianConsentsModule {}
