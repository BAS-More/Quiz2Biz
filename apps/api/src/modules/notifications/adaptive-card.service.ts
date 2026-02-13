import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as https from 'https';

/**
 * Adaptive Card Service
 *
 * Generates Microsoft Teams Adaptive Cards for Quiz2Biz notifications:
 * - Readiness heatmap cards with progress counters
 * - Gap summary cards with drill-down links
 * - Approval request cards
 * - Score update notifications
 *
 * Supports Microsoft Teams Incoming Webhooks
 */
@Injectable()
export class AdaptiveCardService {
  private readonly logger = new Logger(AdaptiveCardService.name);

  constructor(private readonly configService: ConfigService) {}

  // ============================================================
  // HEATMAP CARD TEMPLATE
  // ============================================================

  /**
   * Generate Readiness Heatmap Adaptive Card
   * Shows dimension scores with color coding
   */
  generateHeatmapCard(data: HeatmapCardData): AdaptiveCard {
    const dimensionFacts = data.dimensions.map((dim) => ({
      title: dim.name,
      value: `${this.getColorEmoji(dim.score)} ${(dim.score * 100).toFixed(0)}% (${dim.questionsAnswered}/${dim.totalQuestions})`,
    }));

    return {
      type: 'AdaptiveCard',
      $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
      version: '1.5',
      body: [
        {
          type: 'Container',
          style: 'emphasis',
          items: [
            {
              type: 'TextBlock',
              text: '📊 Quiz2Biz Readiness Heatmap',
              weight: 'Bolder',
              size: 'Large',
            },
          ],
        },
        {
          type: 'ColumnSet',
          columns: [
            {
              type: 'Column',
              width: 'stretch',
              items: [
                {
                  type: 'TextBlock',
                  text: `Overall Score: ${(data.overallScore * 100).toFixed(1)}%`,
                  weight: 'Bolder',
                  size: 'ExtraLarge',
                  color: this.getScoreColor(data.overallScore),
                },
              ],
            },
            {
              type: 'Column',
              width: 'auto',
              items: [
                {
                  type: 'TextBlock',
                  text: data.sessionName,
                  isSubtle: true,
                },
              ],
            },
          ],
        },
        {
          type: 'Container',
          items: [
            {
              type: 'TextBlock',
              text: 'Progress Counters',
              weight: 'Bolder',
              spacing: 'Medium',
            },
            {
              type: 'ColumnSet',
              columns: [
                {
                  type: 'Column',
                  width: 'stretch',
                  items: [
                    {
                      type: 'TextBlock',
                      text: `📋 Sections Left: ${data.progress.sectionsLeft}`,
                    },
                  ],
                },
                {
                  type: 'Column',
                  width: 'stretch',
                  items: [
                    {
                      type: 'TextBlock',
                      text: `❓ Questions Left: ${data.progress.questionsLeft}`,
                    },
                  ],
                },
                {
                  type: 'Column',
                  width: 'stretch',
                  items: [
                    {
                      type: 'TextBlock',
                      text: `📈 This Section: ${data.progress.currentSectionProgress}/${data.progress.currentSectionTotal}`,
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: 'Container',
          spacing: 'Medium',
          items: [
            {
              type: 'TextBlock',
              text: 'Dimension Scores',
              weight: 'Bolder',
            },
            {
              type: 'FactSet',
              facts: dimensionFacts,
            },
          ],
        },
      ],
      actions: [
        {
          type: 'Action.OpenUrl',
          title: 'View Full Heatmap',
          url: data.heatmapUrl,
        },
        {
          type: 'Action.OpenUrl',
          title: 'Continue Assessment',
          url: data.continueUrl,
        },
      ],
    };
  }

  // ============================================================
  // GAP SUMMARY CARD TEMPLATE
  // ============================================================

  /**
   * Generate Gap Summary Adaptive Card
   * Shows critical gaps requiring attention
   */
  generateGapSummaryCard(data: GapSummaryCardData): AdaptiveCard {
    const gapItems = data.gaps.slice(0, 5).map((gap) => ({
      type: 'Container',
      style: gap.severity > 0.7 ? 'attention' : gap.severity > 0.4 ? 'warning' : 'default',
      items: [
        {
          type: 'TextBlock',
          text: `${this.getSeverityEmoji(gap.severity)} ${gap.question}`,
          wrap: true,
          weight: 'Bolder',
        },
        {
          type: 'ColumnSet',
          columns: [
            {
              type: 'Column',
              width: 'auto',
              items: [
                {
                  type: 'TextBlock',
                  text: `Severity: ${(gap.severity * 100).toFixed(0)}%`,
                  isSubtle: true,
                  size: 'Small',
                },
              ],
            },
            {
              type: 'Column',
              width: 'auto',
              items: [
                {
                  type: 'TextBlock',
                  text: `Coverage: ${(gap.coverage * 100).toFixed(0)}%`,
                  isSubtle: true,
                  size: 'Small',
                },
              ],
            },
            {
              type: 'Column',
              width: 'stretch',
              items: [
                {
                  type: 'TextBlock',
                  text: gap.dimension,
                  isSubtle: true,
                  size: 'Small',
                },
              ],
            },
          ],
        },
      ],
    }));

    return {
      type: 'AdaptiveCard',
      $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
      version: '1.5',
      body: [
        {
          type: 'Container',
          style: 'attention',
          items: [
            {
              type: 'TextBlock',
              text: '⚠️ Quiz2Biz Gap Summary',
              weight: 'Bolder',
              size: 'Large',
            },
          ],
        },
        {
          type: 'TextBlock',
          text: `${data.totalGaps} gaps identified | ${data.criticalGaps} critical | ${data.highGaps} high priority`,
          isSubtle: true,
          spacing: 'Small',
        },
        {
          type: 'TextBlock',
          text: 'Top Priority Gaps',
          weight: 'Bolder',
          spacing: 'Medium',
        },
        ...gapItems,
        {
          type: 'TextBlock',
          text: data.totalGaps > 5 ? `...and ${data.totalGaps - 5} more gaps` : '',
          isSubtle: true,
          spacing: 'Small',
        },
      ],
      actions: [
        {
          type: 'Action.OpenUrl',
          title: 'View All Gaps',
          url: data.gapsUrl,
        },
        {
          type: 'Action.OpenUrl',
          title: 'Generate Remediation Prompts',
          url: data.promptsUrl,
        },
      ],
    };
  }

  // ============================================================
  // APPROVAL REQUEST CARD TEMPLATE
  // ============================================================

  /**
   * Generate Approval Request Adaptive Card
   * For two-person rule approval workflows
   */
  generateApprovalRequestCard(data: ApprovalRequestCardData): AdaptiveCard {
    return {
      type: 'AdaptiveCard',
      $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
      version: '1.5',
      body: [
        {
          type: 'Container',
          style: 'warning',
          items: [
            {
              type: 'TextBlock',
              text: '🔐 Approval Required',
              weight: 'Bolder',
              size: 'Large',
            },
          ],
        },
        {
          type: 'FactSet',
          facts: [
            { title: 'Request Type', value: data.requestType },
            { title: 'Requested By', value: data.requesterName },
            { title: 'Resource', value: data.resourceName },
            { title: 'Requested At', value: new Date(data.requestedAt).toLocaleString() },
          ],
        },
        {
          type: 'TextBlock',
          text: 'Justification',
          weight: 'Bolder',
          spacing: 'Medium',
        },
        {
          type: 'TextBlock',
          text: data.justification,
          wrap: true,
        },
        {
          type: 'TextBlock',
          text: `⏰ Expires: ${new Date(data.expiresAt).toLocaleString()}`,
          isSubtle: true,
          spacing: 'Medium',
        },
      ],
      actions: [
        {
          type: 'Action.Submit',
          title: '✅ Approve',
          style: 'positive',
          data: {
            action: 'approve',
            approvalId: data.approvalId,
          },
        },
        {
          type: 'Action.Submit',
          title: '❌ Reject',
          style: 'destructive',
          data: {
            action: 'reject',
            approvalId: data.approvalId,
          },
        },
        {
          type: 'Action.OpenUrl',
          title: 'View Details',
          url: data.detailsUrl,
        },
      ],
    };
  }

  // ============================================================
  // SCORE UPDATE CARD TEMPLATE
  // ============================================================

  /**
   * Generate Score Update Notification Card
   */
  generateScoreUpdateCard(data: ScoreUpdateCardData): AdaptiveCard {
    const changeDirection =
      data.newScore > data.previousScore ? '📈' : data.newScore < data.previousScore ? '📉' : '➡️';
    const changeValue = ((data.newScore - data.previousScore) * 100).toFixed(1);
    const changeText = data.newScore >= data.previousScore ? `+${changeValue}%` : `${changeValue}%`;

    return {
      type: 'AdaptiveCard',
      $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
      version: '1.5',
      body: [
        {
          type: 'Container',
          style: data.newScore >= 0.95 ? 'good' : data.newScore >= 0.7 ? 'warning' : 'attention',
          items: [
            {
              type: 'TextBlock',
              text: `${changeDirection} Readiness Score Update`,
              weight: 'Bolder',
              size: 'Large',
            },
          ],
        },
        {
          type: 'ColumnSet',
          columns: [
            {
              type: 'Column',
              width: 'auto',
              items: [
                {
                  type: 'TextBlock',
                  text: `${(data.newScore * 100).toFixed(1)}%`,
                  weight: 'Bolder',
                  size: 'ExtraLarge',
                  color: this.getScoreColor(data.newScore),
                },
                {
                  type: 'TextBlock',
                  text: 'Current Score',
                  isSubtle: true,
                  size: 'Small',
                },
              ],
            },
            {
              type: 'Column',
              width: 'auto',
              items: [
                {
                  type: 'TextBlock',
                  text: changeText,
                  size: 'Large',
                  color: data.newScore >= data.previousScore ? 'Good' : 'Attention',
                },
                {
                  type: 'TextBlock',
                  text: 'Change',
                  isSubtle: true,
                  size: 'Small',
                },
              ],
            },
            {
              type: 'Column',
              width: 'stretch',
              items: [
                {
                  type: 'TextBlock',
                  text: `${(data.previousScore * 100).toFixed(1)}%`,
                  isSubtle: true,
                  size: 'Large',
                },
                {
                  type: 'TextBlock',
                  text: 'Previous',
                  isSubtle: true,
                  size: 'Small',
                },
              ],
            },
          ],
        },
        {
          type: 'TextBlock',
          text: data.reason,
          wrap: true,
          spacing: 'Medium',
        },
        {
          type: 'FactSet',
          spacing: 'Medium',
          facts: [
            { title: 'Session', value: data.sessionName },
            { title: 'Updated At', value: new Date(data.updatedAt).toLocaleString() },
            { title: 'Target Score', value: '95%' },
          ],
        },
      ],
      actions: [
        {
          type: 'Action.OpenUrl',
          title: 'View Dashboard',
          url: data.dashboardUrl,
        },
      ],
    };
  }

  // ============================================================
  // TEAMS WEBHOOK INTEGRATION
  // ============================================================

  /**
   * Send Adaptive Card to Teams via Incoming Webhook
   */
  async sendToTeams(webhookUrl: string, card: AdaptiveCard): Promise<TeamsWebhookResponse> {
    const payload = {
      type: 'message',
      attachments: [
        {
          contentType: 'application/vnd.microsoft.card.adaptive',
          content: card,
        },
      ],
    };

    return new Promise((resolve, reject) => {
      const url = new URL(webhookUrl);
      const body = JSON.stringify(payload);

      const options = {
        hostname: url.hostname,
        port: 443,
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          if (res.statusCode === 200 || res.statusCode === 202) {
            this.logger.log('Adaptive Card sent to Teams successfully');
            resolve({ success: true, statusCode: res.statusCode });
          } else {
            this.logger.error(`Teams webhook failed: ${res.statusCode} - ${data}`);
            reject(new Error(`Teams webhook returned ${res.statusCode}`));
          }
        });
      });

      req.on('error', (error) => {
        this.logger.error('Teams webhook error:', error);
        reject(error);
      });

      req.write(body);
      req.end();
    });
  }

  /**
   * Send heatmap notification to configured Teams channel
   */
  async notifyHeatmapUpdate(sessionId: string, data: HeatmapCardData): Promise<void> {
    const webhookUrl = this.configService.get<string>('TEAMS_WEBHOOK_URL');
    if (!webhookUrl) {
      this.logger.warn('Teams webhook URL not configured');
      return;
    }

    const card = this.generateHeatmapCard(data);
    await this.sendToTeams(webhookUrl, card);
  }

  /**
   * Send gap summary notification to configured Teams channel
   */
  async notifyGapSummary(sessionId: string, data: GapSummaryCardData): Promise<void> {
    const webhookUrl = this.configService.get<string>('TEAMS_WEBHOOK_URL');
    if (!webhookUrl) {
      this.logger.warn('Teams webhook URL not configured');
      return;
    }

    const card = this.generateGapSummaryCard(data);
    await this.sendToTeams(webhookUrl, card);
  }

  /**
   * Send approval request notification
   */
  async notifyApprovalRequired(data: ApprovalRequestCardData): Promise<void> {
    const webhookUrl =
      this.configService.get<string>('TEAMS_APPROVAL_WEBHOOK_URL') ||
      this.configService.get<string>('TEAMS_WEBHOOK_URL');

    if (!webhookUrl) {
      this.logger.warn('Teams webhook URL not configured');
      return;
    }

    const card = this.generateApprovalRequestCard(data);
    await this.sendToTeams(webhookUrl, card);
  }

  // ============================================================
  // HELPER METHODS
  // ============================================================

  private getColorEmoji(score: number): string {
    if (score >= 0.95) {
      return '🟢';
    }
    if (score >= 0.7) {
      return '🟡';
    }
    if (score >= 0.4) {
      return '🟠';
    }
    return '🔴';
  }

  private getSeverityEmoji(severity: number): string {
    if (severity >= 0.8) {
      return '🔴';
    }
    if (severity >= 0.6) {
      return '🟠';
    }
    if (severity >= 0.4) {
      return '🟡';
    }
    return '🟢';
  }

  private getScoreColor(score: number): 'Good' | 'Warning' | 'Attention' | 'Default' {
    if (score >= 0.95) {
      return 'Good';
    }
    if (score >= 0.7) {
      return 'Warning';
    }
    return 'Attention';
  }
}

// ============================================================
// TYPE DEFINITIONS
// ============================================================

export interface AdaptiveCard {
  type: string;
  $schema: string;
  version: string;
  body: unknown[];
  actions?: unknown[];
}

export interface HeatmapCardData {
  sessionName: string;
  overallScore: number;
  dimensions: Array<{
    name: string;
    score: number;
    questionsAnswered: number;
    totalQuestions: number;
  }>;
  progress: {
    sectionsLeft: number;
    questionsLeft: number;
    currentSectionProgress: number;
    currentSectionTotal: number;
  };
  heatmapUrl: string;
  continueUrl: string;
}

export interface GapSummaryCardData {
  totalGaps: number;
  criticalGaps: number;
  highGaps: number;
  gaps: Array<{
    question: string;
    dimension: string;
    severity: number;
    coverage: number;
    questionId: string;
  }>;
  gapsUrl: string;
  promptsUrl: string;
}

export interface ApprovalRequestCardData {
  approvalId: string;
  requestType: string;
  requesterName: string;
  resourceName: string;
  justification: string;
  requestedAt: string;
  expiresAt: string;
  detailsUrl: string;
}

export interface ScoreUpdateCardData {
  sessionName: string;
  previousScore: number;
  newScore: number;
  reason: string;
  updatedAt: string;
  dashboardUrl: string;
}

export interface TeamsWebhookResponse {
  success: boolean;
  statusCode?: number;
}
