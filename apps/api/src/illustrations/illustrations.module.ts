import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Illustration } from './entities/illustration.entity';
import { IllustrationsController } from './illustrations.controller';
import { IllustrationsService } from './illustrations.service';

@Module({
  imports: [TypeOrmModule.forFeature([Illustration])],
  controllers: [IllustrationsController],
  providers: [IllustrationsService],
  exports: [IllustrationsService, TypeOrmModule],
})
export class IllustrationsModule {}
