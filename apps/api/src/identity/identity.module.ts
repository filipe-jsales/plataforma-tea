import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StudentIdentityReversal } from './entities/student-identity-reversal.entity';
import { IdentityService } from './identity.service';

// Não importar este módulo a partir do EventsModule — ver comentário na
// entidade StudentIdentityReversal.
@Module({
  imports: [TypeOrmModule.forFeature([StudentIdentityReversal])],
  providers: [IdentityService],
  exports: [IdentityService],
})
export class IdentityModule {}
