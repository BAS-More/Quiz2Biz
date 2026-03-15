import { Module } from '@nestjs/common';
import { PrismaModule } from '@libs/database';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

/**
 * Projects Module
 *
 * Provides REST API for multi-project workspace management.
 * Depends on PrismaModule for database access.
 */
@Module({
  imports: [PrismaModule],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
