import { Test, TestingModule } from '@nestjs/testing';
import { TeamsWebhookController } from './teams-webhook.controller';
import {
  AdaptiveCardService,
  HeatmapCardData,
  GapSummaryCardData,
  ApprovalRequestCardData,
  ScoreUpdateCardData,
} from './adaptive-card.service';

describe('TeamsWebhookController', () => {
  let controller: TeamsWebhookController;

  const mockCard = { type: 'AdaptiveCard', version: '1.5', body: [], actions: [] };

  const mockAdaptiveCardService = {
    generateHeatmapCard: jest.fn().mockReturnValue(mockCard),
    generateGapSummaryCard: jest.fn().mockReturnValue(mockCard),
    generateApprovalRequestCard: jest.fn().mockReturnValue(mockCard),
    generateScoreUpdateCard: jest.fn().mockReturnValue(mockCard),
    sendToTeams: jest.fn().mockResolvedValue({ success: true }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TeamsWebhookController],
      providers: [{ provide: AdaptiveCardService, useValue: mockAdaptiveCardService }],
    }).compile();

    controller = module.get<TeamsWebhookController>(TeamsWebhookController);
    module.get<AdaptiveCardService>(AdaptiveCardService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('sendHeatmapCard', () => {
    const mockHeatmapData: HeatmapCardData = {
      sessionName: 'Test Session',
      overallScore: 0.85,
      dimensions: [{ name: 'Security', score: 0.9, questionsAnswered: 9, totalQuestions: 10 }],
      progress: {
        sectionsLeft: 2,
        questionsLeft: 10,
        currentSectionProgress: 5,
        currentSectionTotal: 10,
      },
      heatmapUrl: 'https://example.com/heatmap',
      continueUrl: 'https://example.com/continue',
    };

    it('should generate and return heatmap card', async () => {
      const result = await controller.sendHeatmapCard(mockHeatmapData);
      expect(result.success).toBe(true);
      expect(result.card).toEqual(mockCard);
      expect(mockAdaptiveCardService.generateHeatmapCard).toHaveBeenCalledWith(mockHeatmapData);
    });

    it('should send to Teams when webhookUrl provided', async () => {
      const bodyWithWebhook = { ...mockHeatmapData, webhookUrl: 'https://teams.webhook.url' };
      await controller.sendHeatmapCard(bodyWithWebhook);
      expect(mockAdaptiveCardService.sendToTeams).toHaveBeenCalledWith(
        'https://teams.webhook.url',
        mockCard,
      );
    });

    it('should not send to Teams when no webhookUrl', async () => {
      await controller.sendHeatmapCard(mockHeatmapData);
      expect(mockAdaptiveCardService.sendToTeams).not.toHaveBeenCalled();
    });
  });

  describe('sendGapSummaryCard', () => {
    const mockGapData: GapSummaryCardData = {
      totalGaps: 5,
      criticalGaps: 2,
      highGaps: 2,
      gaps: [
        {
          question: 'Gap 1',
          dimension: 'Security',
          severity: 0.9,
          coverage: 0.1,
          questionId: 'q1',
        },
      ],
      gapsUrl: 'https://example.com/gaps',
      promptsUrl: 'https://example.com/prompts',
    };

    it('should generate and return gap summary card', async () => {
      const result = await controller.sendGapSummaryCard(mockGapData);
      expect(result.success).toBe(true);
      expect(result.card).toEqual(mockCard);
      expect(mockAdaptiveCardService.generateGapSummaryCard).toHaveBeenCalledWith(mockGapData);
    });

    it('should send to Teams when webhookUrl provided', async () => {
      const bodyWithWebhook = { ...mockGapData, webhookUrl: 'https://teams.webhook.url' };
      await controller.sendGapSummaryCard(bodyWithWebhook);
      expect(mockAdaptiveCardService.sendToTeams).toHaveBeenCalled();
    });
  });

  describe('sendApprovalRequestCard', () => {
    const mockApprovalData: ApprovalRequestCardData = {
      approvalId: 'apr-123',
      requestType: 'Policy Lock',
      requesterName: 'John Doe',
      resourceName: 'Security Policy',
      justification: 'Ready for production',
      requestedAt: '2025-01-01T00:00:00Z',
      expiresAt: '2025-01-02T00:00:00Z',
      detailsUrl: 'https://example.com/approval/123',
    };

    it('should generate and return approval request card', async () => {
      const result = await controller.sendApprovalRequestCard(mockApprovalData);
      expect(result.success).toBe(true);
      expect(result.card).toEqual(mockCard);
      expect(mockAdaptiveCardService.generateApprovalRequestCard).toHaveBeenCalledWith(
        mockApprovalData,
      );
    });

    it('should send to Teams when webhookUrl provided', async () => {
      const bodyWithWebhook = { ...mockApprovalData, webhookUrl: 'https://teams.webhook.url' };
      await controller.sendApprovalRequestCard(bodyWithWebhook);
      expect(mockAdaptiveCardService.sendToTeams).toHaveBeenCalled();
    });
  });

  describe('sendScoreUpdateCard', () => {
    const mockScoreData: ScoreUpdateCardData = {
      sessionName: 'Test Session',
      previousScore: 0.65,
      newScore: 0.75,
      reason: 'New evidence uploaded',
      updatedAt: '2025-01-01T12:00:00Z',
      dashboardUrl: 'https://example.com/dashboard',
    };

    it('should generate and return score update card', async () => {
      const result = await controller.sendScoreUpdateCard(mockScoreData);
      expect(result.success).toBe(true);
      expect(result.card).toEqual(mockCard);
      expect(mockAdaptiveCardService.generateScoreUpdateCard).toHaveBeenCalledWith(mockScoreData);
    });

    it('should send to Teams when webhookUrl provided', async () => {
      const bodyWithWebhook = { ...mockScoreData, webhookUrl: 'https://teams.webhook.url' };
      await controller.sendScoreUpdateCard(bodyWithWebhook);
      expect(mockAdaptiveCardService.sendToTeams).toHaveBeenCalled();
    });
  });

  describe('testWebhook', () => {
    it('should return success when webhook test passes', async () => {
      const result = await controller.testWebhook({ webhookUrl: 'https://teams.webhook.url' });
      expect(result.success).toBe(true);
      expect(result.message).toBe('Webhook test successful');
    });

    it('should return failure when webhook test fails with Error', async () => {
      mockAdaptiveCardService.sendToTeams.mockRejectedValueOnce(new Error('Connection failed'));
      const result = await controller.testWebhook({ webhookUrl: 'https://teams.webhook.url' });
      expect(result.success).toBe(false);
      expect(result.message).toBe('Connection failed');
    });

    it('should return failure when webhook test fails with non-Error', async () => {
      mockAdaptiveCardService.sendToTeams.mockRejectedValueOnce('Unknown error');
      const result = await controller.testWebhook({ webhookUrl: 'https://teams.webhook.url' });
      expect(result.success).toBe(false);
      expect(result.message).toBe('Webhook test failed');
    });
  });

  describe('previewCard', () => {
    it('should preview heatmap card', async () => {
      const result = await controller.previewCard('heatmap');
      expect(result.cardType).toBe('heatmap');
      expect(result.card).toBeDefined();
      expect(mockAdaptiveCardService.generateHeatmapCard).toHaveBeenCalled();
    });

    it('should preview gaps card', async () => {
      const result = await controller.previewCard('gaps');
      expect(result.cardType).toBe('gaps');
      expect(result.card).toBeDefined();
      expect(mockAdaptiveCardService.generateGapSummaryCard).toHaveBeenCalled();
    });

    it('should preview approval card', async () => {
      const result = await controller.previewCard('approval');
      expect(result.cardType).toBe('approval');
      expect(result.card).toBeDefined();
      expect(mockAdaptiveCardService.generateApprovalRequestCard).toHaveBeenCalled();
    });

    it('should preview score-update card', async () => {
      const result = await controller.previewCard('score-update');
      expect(result.cardType).toBe('score-update');
      expect(result.card).toBeDefined();
      expect(mockAdaptiveCardService.generateScoreUpdateCard).toHaveBeenCalled();
    });

    it('should return error for unknown card type', async () => {
      const result = await controller.previewCard('unknown');
      expect(result.cardType).toBe('unknown');
      expect(result.card).toEqual({ error: 'Unknown card type' });
    });
  });
});
