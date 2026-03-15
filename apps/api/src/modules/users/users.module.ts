import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { GdprController } from './gdpr.controller';
import { GdprService } from './gdpr.service';

@Module({
  controllers: [UsersController, GdprController],
  providers: [UsersService, GdprService],
  exports: [UsersService],
})
export class UsersModule {}
