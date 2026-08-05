import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Illustration } from './entities/illustration.entity';
import { IllustrationsService } from './illustrations.service';

@Module({
  imports: [TypeOrmModule.forFeature([Illustration])],
  providers: [IllustrationsService],
  exports: [IllustrationsService, TypeOrmModule],
})
export class IllustrationsModule {}
