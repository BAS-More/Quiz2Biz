import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '@libs/database';
import { GitHubAdapter } from './github.adapter';
import { GitLabAdapter } from './gitlab.adapter';
import { JiraConfluenceAdapter } from './jira-confluence.adapter';
import { AdapterConfigService } from './adapter-config.service';
import { AdapterController } from './adapter.controller';

@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [AdapterController],
  providers: [GitHubAdapter, GitLabAdapter, JiraConfluenceAdapter, AdapterConfigService],
  exports: [GitHubAdapter, GitLabAdapter, JiraConfluenceAdapter, AdapterConfigService],
})
export class AdaptersModule {}
