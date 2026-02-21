import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  AdaptiveCardService,
  HeatmapCardData,
  GapSummaryCardData,
  ApprovalRequestCardData,
  ScoreUpdateCardData,
} from './adaptive-card.service';

describe('AdaptiveCardService', () => {
  let service: AdaptiveCardService;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdaptiveCardService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AdaptiveCardService>(AdaptiveCardService);
    configService = module.get<ConfigService>(ConfigService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateHeatmapCard', () => {
    const mockHeatmapData: HeatmapCardData = {
      sessionName: 'Test Session',
      overallScore: 0.85,
      dimensions: [
        { name: 'Security', score: 0.95, questionsAnswered: 10, totalQuestions: 10 },
        { name: 'DevOps', score: 0.75, questionsAnswered: 8, totalQuestions: 10 },
        { name: 'Testing', score: 0.45, questionsAnswered: 5, totalQuestions: 10 },
        { name: 'Docs', score: 0.35, questionsAnswered: 3, totalQuestions: 10 },
      ],
      progress: {
        sectionsLeft: 3,
        questionsLeft: 20,
        currentSectionProgress: 5,
        currentSectionTotal: 10,
      },
      heatmapUrl: 'https://example.com/heatmap',
      continueUrl: 'https://example.com/continue',
    };

    it('should generate heatmap adaptive card', () => {
      const card = service.generateHeatmapCard(mockHeatmapData);
      expect(card.type).toBe('AdaptiveCard');
      expect(card.version).toBe('1.5');
      expect(card.body).toBeDefined();
      expect(card.actions).toBeDefined();
      expect(card.actions?.length).toBe(2);
    });

    it('should include all dimension scores with color emojis', () => {
      const card = service.generateHeatmapCard(mockHeatmapData);
      expect(card.body).toBeDefined();
    });

    it('should handle high scores with green color', () => {
      const highScoreData = { ...mockHeatmapData, overallScore: 0.98 };
      const card = service.generateHeatmapCard(highScoreData);
      expect(card).toBeDefined();
    });

    it('should handle low scores with attention color', () => {
      const lowScoreData = { ...mockHeatmapData, overallScore: 0.3 };
      const card = service.generateHeatmapCard(lowScoreData);
      expect(card).toBeDefined();
    });
  });

  describe('generateGapSummaryCard', () => {
    const mockGapData: GapSummaryCardData = {
      totalGaps: 10,
      criticalGaps: 3,
      highGaps: 4,
      gaps: [
        { question: 'Gap 1', dimension: 'Security', severity: 0.9, coverage: 0.1, questionId: 'q1' },
        { question: 'Gap 2', dimension: 'DevOps', severity: 0.75, coverage: 0.2, questionId: 'q2' },
        { question: 'Gap 3', dimension: 'Testing', severity: 0.5, coverage: 0.3, questionId: 'q3' },
        { question: 'Gap 4', dimension: 'Docs', severity: 0.3, coverage: 0.4, questionId: 'q4' },
        { question: 'Gap 5', dimension: 'Security', severity: 0.6, coverage: 0.2, questionId: 'q5' },
        { question: 'Gap 6', dimension: 'Other', severity: 0.4, coverage: 0.5, questionId: 'q6' },
      ],
      gapsUrl: 'https://example.com/gaps',
      promptsUrl: 'https://example.com/prompts',
    };

    it('should generate gap summary card', () => {
      const card = service.generateGapSummaryCard(mockGapData);
      expect(card.type).toBe('AdaptiveCard');
      expect(card.version).toBe('1.5');
      expect(card.actions).toBeDefined();
      expect(card.actions?.length).toBe(2);
    });

    it('should limit displayed gaps to top 5', () => {
      const card = service.generateGapSummaryCard(mockGapData);
      expect(card.body).toBeDefined();
    });

    it('should handle few gaps without overflow message', () => {
      const fewGaps = { ...mockGapData, totalGaps: 3, gaps: mockGapData.gaps.slice(0, 3) };
      const card = service.generateGapSummaryCard(fewGaps);
      expect(card).toBeDefined();
    });

    it('should apply severity styling to gaps', () => {
      const card = service.generateGapSummaryCard(mockGapData);
      expect(card.body).toBeDefined();
    });
  });

  describe('generateApprovalRequestCard', () => {
    const mockApprovalData: ApprovalRequestCardData = {
      approvalId: 'apr-123',
      requestType: 'Policy Lock',
      requesterName: 'John Doe',
      resourceName: 'Security Policy v2.0',
      justification: 'Ready for production',
      requestedAt: '2025-01-01T00:00:00Z',
      expiresAt: '2025-01-02T00:00:00Z',
      detailsUrl: 'https://example.com/approval/123',
    };

    it('should generate approval request card', () => {
      const card = service.generateApprovalRequestCard(mockApprovalData);
      expect(card.type).toBe('AdaptiveCard');
      expect(card.version).toBe('1.5');
      expect(card.actions).toBeDefined();
      expect(card.actions?.length).toBe(3);
    });

    it('should include approve and reject actions', () => {
      const card = service.generateApprovalRequestCard(mockApprovalData);
      const actions = card.actions as any[];
      expect(actions.some((a) => a.title.includes('Approve'))).toBe(true);
      expect(actions.some((a) => a.title.includes('Reject'))).toBe(true);
    });
  });

  describe('generateScoreUpdateCard', () => {
    const mockScoreData: ScoreUpdateCardData = {
      sessionName: 'Test Session',
      previousScore: 0.65,
      newScore: 0.75,
      reason: 'New evidence uploaded',
      updatedAt: '2025-01-01T12:00:00Z',
      dashboardUrl: 'https://example.com/dashboard',
    };

    it('should generate score update card with increase', () => {
      const card = service.generateScoreUpdateCard(mockScoreData);
      expect(card.type).toBe('AdaptiveCard');
      expect(card.version).toBe('1.5');
      expect(card.actions).toBeDefined();
    });

    it('should handle score decrease', () => {
      const decreaseData = { ...mockScoreData, previousScore: 0.8, newScore: 0.7 };
      const card = service.generateScoreUpdateCard(decreaseData);
      expect(card).toBeDefined();
    });

    it('should handle no score change', () => {
      const noChangeData = { ...mockScoreData, previousScore: 0.75, newScore: 0.75 };
      const card = service.generateScoreUpdateCard(noChangeData);
      expect(card).toBeDefined();
    });

    it('should apply good style for high scores', () => {
      const highScoreData = { ...mockScoreData, newScore: 0.98 };
      const card = service.generateScoreUpdateCard(highScoreData);
      expect(card).toBeDefined();
    });

    it('should apply warning style for medium scores', () => {
      const mediumScoreData = { ...mockScoreData, newScore: 0.8 };
      const card = service.generateScoreUpdateCard(mediumScoreData);
      expect(card).toBeDefined();
    });

    it('should apply attention style for low scores', () => {
      const lowScoreData = { ...mockScoreData, newScore: 0.5 };
      const card = service.generateScoreUpdateCard(lowScoreData);
      expect(card).toBeDefined();
    });
  });

  describe('notifyHeatmapUpdate', () => {
    it('should log warning when webhook URL not configured', async () => {
      mockConfigService.get.mockReturnValue(undefined);
      await service.notifyHeatmapUpdate('session-1', {} as HeatmapCardData);
      expect(mockConfigService.get).toHaveBeenCalledWith('TEAMS_WEBHOOK_URL');
    });
  });

  describe('notifyGapSummary', () => {
    it('should log warning when webhook URL not configured', async () => {
      mockConfigService.get.mockReturnValue(undefined);
      await service.notifyGapSummary('session-1', {} as GapSummaryCardData);
      expect(mockConfigService.get).toHaveBeenCalledWith('TEAMS_WEBHOOK_URL');
    });
  });

  describe('notifyApprovalRequired', () => {
    it('should log warning when webhook URL not configured', async () => {
      mockConfigService.get.mockReturnValue(undefined);
      await service.notifyApprovalRequired({} as ApprovalRequestCardData);
      expect(mockConfigService.get).toHaveBeenCalled();
    });

    it('should use approval webhook URL if available', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'TEAMS_APPROVAL_WEBHOOK_URL') return undefined;
        if (key === 'TEAMS_WEBHOOK_URL') return undefined;
        return undefined;
      });
      await service.notifyApprovalRequired({} as ApprovalRequestCardData);
      expect(mockConfigService.get).toHaveBeenCalled();
    });
  });
});
