import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  AdaptiveCardService,
  HeatmapCardData,
  GapSummaryCardData,
  ApprovalRequestCardData,
  ScoreUpdateCardData,
} from './adaptive-card.service';

/**
 * Teams Webhook Controller
 *
 * Provides endpoints for:
 * - Sending Adaptive Cards to Teams channels
 * - Testing Teams webhook integrations
 * - Managing Teams notifications
 */
@ApiTags('Teams Integration')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('teams')
export class TeamsWebhookController {
  constructor(private readonly adaptiveCardService: AdaptiveCardService) {}

  /**
   * Send heatmap card to Teams
   */
  @Post('heatmap')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send heatmap card to Teams',
    description:
      'Generate and send a readiness heatmap Adaptive Card to the configured Teams channel.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        webhookUrl: {
          type: 'string',
          description: 'Teams webhook URL (optional, uses env if not provided)',
        },
        sessionName: { type: 'string' },
        overallScore: { type: 'number' },
        dimensions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              score: { type: 'number' },
              questionsAnswered: { type: 'number' },
              totalQuestions: { type: 'number' },
            },
          },
        },
        progress: {
          type: 'object',
          properties: {
            sectionsLeft: { type: 'number' },
            questionsLeft: { type: 'number' },
            currentSectionProgress: { type: 'number' },
            currentSectionTotal: { type: 'number' },
          },
        },
        heatmapUrl: { type: 'string' },
        continueUrl: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Card sent successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  async sendHeatmapCard(
    @Body() body: { webhookUrl?: string } & HeatmapCardData,
  ): Promise<{ success: boolean; card: unknown }> {
    const card = this.adaptiveCardService.generateHeatmapCard(body);

    if (body.webhookUrl) {
      await this.adaptiveCardService.sendToTeams(body.webhookUrl, card);
    }

    return { success: true, card };
  }

  /**
   * Send gap summary card to Teams
   */
  @Post('gaps')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send gap summary card to Teams',
    description: 'Generate and send a gap summary Adaptive Card with drill-down links.',
  })
  @ApiResponse({ status: 200, description: 'Card sent successfully' })
  async sendGapSummaryCard(
    @Body() body: { webhookUrl?: string } & GapSummaryCardData,
  ): Promise<{ success: boolean; card: unknown }> {
    const card = this.adaptiveCardService.generateGapSummaryCard(body);

    if (body.webhookUrl) {
      await this.adaptiveCardService.sendToTeams(body.webhookUrl, card);
    }

    return { success: true, card };
  }

  /**
   * Send approval request card to Teams
   */
  @Post('approval')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send approval request card to Teams',
    description:
      'Generate and send an approval request Adaptive Card for two-person rule workflows.',
  })
  @ApiResponse({ status: 200, description: 'Card sent successfully' })
  async sendApprovalRequestCard(
    @Body() body: { webhookUrl?: string } & ApprovalRequestCardData,
  ): Promise<{ success: boolean; card: unknown }> {
    const card = this.adaptiveCardService.generateApprovalRequestCard(body);

    if (body.webhookUrl) {
      await this.adaptiveCardService.sendToTeams(body.webhookUrl, card);
    }

    return { success: true, card };
  }

  /**
   * Send score update card to Teams
   */
  @Post('score-update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send score update card to Teams',
    description: 'Generate and send a score update notification Adaptive Card.',
  })
  @ApiResponse({ status: 200, description: 'Card sent successfully' })
  async sendScoreUpdateCard(
    @Body() body: { webhookUrl?: string } & ScoreUpdateCardData,
  ): Promise<{ success: boolean; card: unknown }> {
    const card = this.adaptiveCardService.generateScoreUpdateCard(body);

    if (body.webhookUrl) {
      await this.adaptiveCardService.sendToTeams(body.webhookUrl, card);
    }

    return { success: true, card };
  }

  /**
   * Test Teams webhook connection
   */
  @Post('test-webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Test Teams webhook',
    description: 'Send a test message to verify Teams webhook connectivity.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        webhookUrl: { type: 'string', description: 'Teams Incoming Webhook URL' },
      },
      required: ['webhookUrl'],
    },
  })
  @ApiResponse({ status: 200, description: 'Webhook test successful' })
  @ApiResponse({ status: 400, description: 'Webhook test failed' })
  async testWebhook(
    @Body() body: { webhookUrl: string },
  ): Promise<{ success: boolean; message: string }> {
    const testCard = {
      type: 'AdaptiveCard',
      $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
      version: '1.5',
      body: [
        {
          type: 'TextBlock',
          text: '✅ Quiz2Biz Teams Integration Test',
          weight: 'Bolder',
          size: 'Large',
        },
        {
          type: 'TextBlock',
          text: `Webhook test successful at ${new Date().toISOString()}`,
          wrap: true,
        },
      ],
    };

    try {
      await this.adaptiveCardService.sendToTeams(body.webhookUrl, testCard);
      return { success: true, message: 'Webhook test successful' };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Webhook test failed',
      };
    }
  }

  /**
   * Preview card JSON (without sending)
   */
  @Get('preview/:cardType')
  @ApiOperation({
    summary: 'Preview card JSON',
    description: 'Get sample Adaptive Card JSON for preview/debugging purposes.',
  })
  @ApiParam({ name: 'cardType', enum: ['heatmap', 'gaps', 'approval', 'score-update'] })
  @ApiResponse({ status: 200, description: 'Sample card JSON' })
  async previewCard(
    @Param('cardType') cardType: string,
  ): Promise<{ cardType: string; card: unknown }> {
    const sampleData = this.getSampleData(cardType);
    let card: unknown;

    switch (cardType) {
      case 'heatmap':
        card = this.adaptiveCardService.generateHeatmapCard(sampleData as HeatmapCardData);
        break;
      case 'gaps':
        card = this.adaptiveCardService.generateGapSummaryCard(sampleData as GapSummaryCardData);
        break;
      case 'approval':
        card = this.adaptiveCardService.generateApprovalRequestCard(
          sampleData as ApprovalRequestCardData,
        );
        break;
      case 'score-update':
        card = this.adaptiveCardService.generateScoreUpdateCard(sampleData as ScoreUpdateCardData);
        break;
      default:
        card = { error: 'Unknown card type' };
    }

    return { cardType, card };
  }

  private getSampleData(
    cardType: string,
  ): HeatmapCardData | GapSummaryCardData | ApprovalRequestCardData | ScoreUpdateCardData {
    switch (cardType) {
      case 'heatmap':
        return {
          sessionName: 'Sample Assessment',
          overallScore: 0.72,
          dimensions: [
            {
              name: 'Architecture & Security',
              score: 0.85,
              questionsAnswered: 12,
              totalQuestions: 14,
            },
            { name: 'DevOps & IaC', score: 0.65, questionsAnswered: 8, totalQuestions: 12 },
            { name: 'Testing & QA', score: 0.78, questionsAnswered: 10, totalQuestions: 11 },
            { name: 'Documentation', score: 0.55, questionsAnswered: 5, totalQuestions: 9 },
          ],
          progress: {
            sectionsLeft: 3,
            questionsLeft: 25,
            currentSectionProgress: 5,
            currentSectionTotal: 10,
          },
          heatmapUrl: 'https://quiz2biz.example.com/heatmap',
          continueUrl: 'https://quiz2biz.example.com/continue',
        };
      case 'gaps':
        return {
          totalGaps: 15,
          criticalGaps: 3,
          highGaps: 5,
          gaps: [
            {
              question: 'Is there a documented disaster recovery plan?',
              dimension: 'Security',
              severity: 0.9,
              coverage: 0.1,
              questionId: 'q1',
            },
            {
              question: 'Are secrets stored in a vault?',
              dimension: 'Security',
              severity: 0.85,
              coverage: 0.2,
              questionId: 'q2',
            },
            {
              question: 'Is there automated testing coverage?',
              dimension: 'Testing',
              severity: 0.7,
              coverage: 0.3,
              questionId: 'q3',
            },
          ],
          gapsUrl: 'https://quiz2biz.example.com/gaps',
          promptsUrl: 'https://quiz2biz.example.com/prompts',
        };
      case 'approval':
        return {
          approvalId: 'apr-123',
          requestType: 'Policy Lock',
          requesterName: 'John Doe',
          resourceName: 'Information Security Policy v2.0',
          justification: 'Policy has been reviewed and is ready for production deployment.',
          requestedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          detailsUrl: 'https://quiz2biz.example.com/approvals/apr-123',
        };
      case 'score-update':
        return {
          sessionName: 'Sample Assessment',
          previousScore: 0.68,
          newScore: 0.72,
          reason: 'Evidence uploaded for 3 questions in Architecture dimension',
          updatedAt: new Date().toISOString(),
          dashboardUrl: 'https://quiz2biz.example.com/dashboard',
        };
      default:
        return {} as HeatmapCardData;
    }
  }
}
