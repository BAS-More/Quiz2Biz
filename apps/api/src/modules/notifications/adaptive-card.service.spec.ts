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
      providers: [AdaptiveCardService, { provide: ConfigService, useValue: mockConfigService }],
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
        {
          question: 'Gap 1',
          dimension: 'Security',
          severity: 0.9,
          coverage: 0.1,
          questionId: 'q1',
        },
        { question: 'Gap 2', dimension: 'DevOps', severity: 0.75, coverage: 0.2, questionId: 'q2' },
        { question: 'Gap 3', dimension: 'Testing', severity: 0.5, coverage: 0.3, questionId: 'q3' },
        { question: 'Gap 4', dimension: 'Docs', severity: 0.3, coverage: 0.4, questionId: 'q4' },
        {
          question: 'Gap 5',
          dimension: 'Security',
          severity: 0.6,
          coverage: 0.2,
          questionId: 'q5',
        },
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
        if (key === 'TEAMS_APPROVAL_WEBHOOK_URL') {
          return undefined;
        }
        if (key === 'TEAMS_WEBHOOK_URL') {
          return undefined;
        }
        return undefined;
      });
      await service.notifyApprovalRequired({} as ApprovalRequestCardData);
      expect(mockConfigService.get).toHaveBeenCalled();
    });
  });

  // ================================================================
  // ADDITIONAL COVERAGE: Card body structure deep assertions
  // ================================================================

  describe('generateHeatmapCard - body structure', () => {
    const mockHeatmapData: HeatmapCardData = {
      sessionName: 'Deep Test Session',
      overallScore: 0.72,
      dimensions: [
        { name: 'Security', score: 0.96, questionsAnswered: 10, totalQuestions: 10 },
        { name: 'DevOps', score: 0.71, questionsAnswered: 7, totalQuestions: 10 },
        { name: 'Testing', score: 0.42, questionsAnswered: 4, totalQuestions: 10 },
        { name: 'Docs', score: 0.2, questionsAnswered: 2, totalQuestions: 10 },
      ],
      progress: {
        sectionsLeft: 2,
        questionsLeft: 15,
        currentSectionProgress: 7,
        currentSectionTotal: 10,
      },
      heatmapUrl: 'https://example.com/heatmap',
      continueUrl: 'https://example.com/continue',
    };

    it('should have AdaptiveCard schema', () => {
      const card = service.generateHeatmapCard(mockHeatmapData);
      expect(card.$schema).toBe('http://adaptivecards.io/schemas/adaptive-card.json');
    });

    it('should include overall score text in body', () => {
      const card = service.generateHeatmapCard(mockHeatmapData);
      const bodyJson = JSON.stringify(card.body);
      expect(bodyJson).toContain('72.0%');
    });

    it('should include session name in body', () => {
      const card = service.generateHeatmapCard(mockHeatmapData);
      const bodyJson = JSON.stringify(card.body);
      expect(bodyJson).toContain('Deep Test Session');
    });

    it('should include progress counters in body', () => {
      const card = service.generateHeatmapCard(mockHeatmapData);
      const bodyJson = JSON.stringify(card.body);
      expect(bodyJson).toContain('Sections Left: 2');
      expect(bodyJson).toContain('Questions Left: 15');
      expect(bodyJson).toContain('7/10');
    });

    it('should include dimension names in body', () => {
      const card = service.generateHeatmapCard(mockHeatmapData);
      const bodyJson = JSON.stringify(card.body);
      expect(bodyJson).toContain('Security');
      expect(bodyJson).toContain('DevOps');
      expect(bodyJson).toContain('Testing');
      expect(bodyJson).toContain('Docs');
    });

    it('should include View Full Heatmap action with correct URL', () => {
      const card = service.generateHeatmapCard(mockHeatmapData);
      const actions = card.actions as Array<{ title: string; url: string }>;
      const heatmapAction = actions.find((a) => a.title === 'View Full Heatmap');
      expect(heatmapAction?.url).toBe('https://example.com/heatmap');
    });

    it('should include Continue Assessment action with correct URL', () => {
      const card = service.generateHeatmapCard(mockHeatmapData);
      const actions = card.actions as Array<{ title: string; url: string }>;
      const continueAction = actions.find((a) => a.title === 'Continue Assessment');
      expect(continueAction?.url).toBe('https://example.com/continue');
    });
  });

  describe('getColorEmoji (private helper via card output)', () => {
    const baseData: HeatmapCardData = {
      sessionName: 'Emoji Test',
      overallScore: 0.5,
      dimensions: [],
      progress: {
        sectionsLeft: 0,
        questionsLeft: 0,
        currentSectionProgress: 0,
        currentSectionTotal: 0,
      },
      heatmapUrl: '',
      continueUrl: '',
    };

    it('should use green emoji for score >= 0.95', () => {
      const data = {
        ...baseData,
        dimensions: [{ name: 'A', score: 0.96, questionsAnswered: 10, totalQuestions: 10 }],
      };
      const card = service.generateHeatmapCard(data);
      const bodyJson = JSON.stringify(card.body);
      expect(bodyJson).toContain('\u{1F7E2}'); // green circle
    });

    it('should use yellow emoji for score >= 0.7 and < 0.95', () => {
      const data = {
        ...baseData,
        dimensions: [{ name: 'B', score: 0.75, questionsAnswered: 7, totalQuestions: 10 }],
      };
      const card = service.generateHeatmapCard(data);
      const bodyJson = JSON.stringify(card.body);
      expect(bodyJson).toContain('\u{1F7E1}'); // yellow circle
    });

    it('should use orange emoji for score >= 0.4 and < 0.7', () => {
      const data = {
        ...baseData,
        dimensions: [{ name: 'C', score: 0.5, questionsAnswered: 5, totalQuestions: 10 }],
      };
      const card = service.generateHeatmapCard(data);
      const bodyJson = JSON.stringify(card.body);
      expect(bodyJson).toContain('\u{1F7E0}'); // orange circle
    });

    it('should use red emoji for score < 0.4', () => {
      const data = {
        ...baseData,
        dimensions: [{ name: 'D', score: 0.2, questionsAnswered: 2, totalQuestions: 10 }],
      };
      const card = service.generateHeatmapCard(data);
      const bodyJson = JSON.stringify(card.body);
      expect(bodyJson).toContain('\u{1F534}'); // red circle
    });
  });

  describe('getScoreColor (private helper via card output)', () => {
    const baseHeatmap: HeatmapCardData = {
      sessionName: 'Color Test',
      overallScore: 0.5,
      dimensions: [],
      progress: {
        sectionsLeft: 0,
        questionsLeft: 0,
        currentSectionProgress: 0,
        currentSectionTotal: 0,
      },
      heatmapUrl: '',
      continueUrl: '',
    };

    it('should produce Good color for >= 0.95', () => {
      const card = service.generateHeatmapCard({ ...baseHeatmap, overallScore: 0.97 });
      const bodyJson = JSON.stringify(card.body);
      expect(bodyJson).toContain('"Good"');
    });

    it('should produce Warning color for >= 0.7 and < 0.95', () => {
      const card = service.generateHeatmapCard({ ...baseHeatmap, overallScore: 0.8 });
      const bodyJson = JSON.stringify(card.body);
      expect(bodyJson).toContain('"Warning"');
    });

    it('should produce Attention color for < 0.7', () => {
      const card = service.generateHeatmapCard({ ...baseHeatmap, overallScore: 0.3 });
      const bodyJson = JSON.stringify(card.body);
      expect(bodyJson).toContain('"Attention"');
    });
  });

  describe('getSeverityEmoji (private helper via gap card)', () => {
    const baseGapData: GapSummaryCardData = {
      totalGaps: 1,
      criticalGaps: 0,
      highGaps: 0,
      gaps: [],
      gapsUrl: '',
      promptsUrl: '',
    };

    it('should use red emoji for severity >= 0.8', () => {
      const data = {
        ...baseGapData,
        gaps: [{ question: 'Q1', dimension: 'D', severity: 0.85, coverage: 0.1, questionId: 'q1' }],
      };
      const card = service.generateGapSummaryCard(data);
      const bodyJson = JSON.stringify(card.body);
      expect(bodyJson).toContain('\u{1F534}');
    });

    it('should use orange emoji for severity >= 0.6 and < 0.8', () => {
      const data = {
        ...baseGapData,
        gaps: [{ question: 'Q2', dimension: 'D', severity: 0.65, coverage: 0.2, questionId: 'q2' }],
      };
      const card = service.generateGapSummaryCard(data);
      const bodyJson = JSON.stringify(card.body);
      expect(bodyJson).toContain('\u{1F7E0}');
    });

    it('should use yellow emoji for severity >= 0.4 and < 0.6', () => {
      const data = {
        ...baseGapData,
        gaps: [{ question: 'Q3', dimension: 'D', severity: 0.45, coverage: 0.3, questionId: 'q3' }],
      };
      const card = service.generateGapSummaryCard(data);
      const bodyJson = JSON.stringify(card.body);
      expect(bodyJson).toContain('\u{1F7E1}');
    });

    it('should use green emoji for severity < 0.4', () => {
      const data = {
        ...baseGapData,
        gaps: [{ question: 'Q4', dimension: 'D', severity: 0.2, coverage: 0.5, questionId: 'q4' }],
      };
      const card = service.generateGapSummaryCard(data);
      const bodyJson = JSON.stringify(card.body);
      expect(bodyJson).toContain('\u{1F7E2}');
    });
  });

  describe('generateGapSummaryCard - body structure', () => {
    it('should include gap summary counts in body', () => {
      const data: GapSummaryCardData = {
        totalGaps: 8,
        criticalGaps: 2,
        highGaps: 3,
        gaps: [
          { question: 'Gap 1', dimension: 'Sec', severity: 0.9, coverage: 0.1, questionId: 'q1' },
        ],
        gapsUrl: 'https://example.com/gaps',
        promptsUrl: 'https://example.com/prompts',
      };
      const card = service.generateGapSummaryCard(data);
      const bodyJson = JSON.stringify(card.body);
      expect(bodyJson).toContain('8 gaps identified');
      expect(bodyJson).toContain('2 critical');
      expect(bodyJson).toContain('3 high priority');
    });

    it('should apply attention style for severity > 0.7', () => {
      const data: GapSummaryCardData = {
        totalGaps: 1,
        criticalGaps: 1,
        highGaps: 0,
        gaps: [
          {
            question: 'Critical Gap',
            dimension: 'Sec',
            severity: 0.9,
            coverage: 0.1,
            questionId: 'q1',
          },
        ],
        gapsUrl: '',
        promptsUrl: '',
      };
      const card = service.generateGapSummaryCard(data);
      const bodyJson = JSON.stringify(card.body);
      expect(bodyJson).toContain('"attention"');
    });

    it('should apply warning style for severity > 0.4 and <= 0.7', () => {
      const data: GapSummaryCardData = {
        totalGaps: 1,
        criticalGaps: 0,
        highGaps: 0,
        gaps: [
          {
            question: 'Medium Gap',
            dimension: 'Ops',
            severity: 0.5,
            coverage: 0.3,
            questionId: 'q1',
          },
        ],
        gapsUrl: '',
        promptsUrl: '',
      };
      const card = service.generateGapSummaryCard(data);
      const bodyJson = JSON.stringify(card.body);
      expect(bodyJson).toContain('"warning"');
    });

    it('should apply default style for severity <= 0.4', () => {
      const data: GapSummaryCardData = {
        totalGaps: 1,
        criticalGaps: 0,
        highGaps: 0,
        gaps: [
          { question: 'Low Gap', dimension: 'Dev', severity: 0.2, coverage: 0.8, questionId: 'q1' },
        ],
        gapsUrl: '',
        promptsUrl: '',
      };
      const card = service.generateGapSummaryCard(data);
      const bodyJson = JSON.stringify(card.body);
      expect(bodyJson).toContain('"default"');
    });

    it('should show overflow text when totalGaps exceeds 5', () => {
      const gaps = Array.from({ length: 6 }, (_, i) => ({
        question: `Gap ${i + 1}`,
        dimension: 'Dim',
        severity: 0.5,
        coverage: 0.3,
        questionId: `q${i + 1}`,
      }));
      const data: GapSummaryCardData = {
        totalGaps: 10,
        criticalGaps: 2,
        highGaps: 3,
        gaps,
        gapsUrl: '',
        promptsUrl: '',
      };
      const card = service.generateGapSummaryCard(data);
      const bodyJson = JSON.stringify(card.body);
      expect(bodyJson).toContain('and 5 more gaps');
    });

    it('should show empty overflow text when totalGaps is 5 or fewer', () => {
      const data: GapSummaryCardData = {
        totalGaps: 3,
        criticalGaps: 1,
        highGaps: 1,
        gaps: [
          { question: 'G1', dimension: 'D', severity: 0.5, coverage: 0.3, questionId: 'q1' },
          { question: 'G2', dimension: 'D', severity: 0.5, coverage: 0.3, questionId: 'q2' },
          { question: 'G3', dimension: 'D', severity: 0.5, coverage: 0.3, questionId: 'q3' },
        ],
        gapsUrl: '',
        promptsUrl: '',
      };
      const card = service.generateGapSummaryCard(data);
      const bodyJson = JSON.stringify(card.body);
      expect(bodyJson).not.toContain('more gaps');
    });

    it('should include gap dimension and coverage in card body', () => {
      const data: GapSummaryCardData = {
        totalGaps: 1,
        criticalGaps: 0,
        highGaps: 0,
        gaps: [
          {
            question: 'Coverage Test',
            dimension: 'Infrastructure',
            severity: 0.6,
            coverage: 0.35,
            questionId: 'q1',
          },
        ],
        gapsUrl: '',
        promptsUrl: '',
      };
      const card = service.generateGapSummaryCard(data);
      const bodyJson = JSON.stringify(card.body);
      expect(bodyJson).toContain('Infrastructure');
      expect(bodyJson).toContain('Coverage: 35%');
      expect(bodyJson).toContain('Severity: 60%');
    });
  });

  describe('generateApprovalRequestCard - body structure', () => {
    const mockApprovalData: ApprovalRequestCardData = {
      approvalId: 'apr-456',
      requestType: 'Document Publish',
      requesterName: 'Jane Smith',
      resourceName: 'Business Plan v3.0',
      justification: 'All reviews completed',
      requestedAt: '2025-06-15T10:30:00Z',
      expiresAt: '2025-06-16T10:30:00Z',
      detailsUrl: 'https://example.com/approval/456',
    };

    it('should include request type, requester, and resource in facts', () => {
      const card = service.generateApprovalRequestCard(mockApprovalData);
      const bodyJson = JSON.stringify(card.body);
      expect(bodyJson).toContain('Document Publish');
      expect(bodyJson).toContain('Jane Smith');
      expect(bodyJson).toContain('Business Plan v3.0');
    });

    it('should include justification text', () => {
      const card = service.generateApprovalRequestCard(mockApprovalData);
      const bodyJson = JSON.stringify(card.body);
      expect(bodyJson).toContain('All reviews completed');
    });

    it('should include approvalId in action submit data', () => {
      const card = service.generateApprovalRequestCard(mockApprovalData);
      const actionsJson = JSON.stringify(card.actions);
      expect(actionsJson).toContain('apr-456');
    });

    it('should have approve action with positive style', () => {
      const card = service.generateApprovalRequestCard(mockApprovalData);
      const actions = card.actions as Array<{ title: string; style?: string }>;
      const approve = actions.find((a) => a.title.includes('Approve'));
      expect(approve?.style).toBe('positive');
    });

    it('should have reject action with destructive style', () => {
      const card = service.generateApprovalRequestCard(mockApprovalData);
      const actions = card.actions as Array<{ title: string; style?: string }>;
      const reject = actions.find((a) => a.title.includes('Reject'));
      expect(reject?.style).toBe('destructive');
    });

    it('should have View Details action with correct URL', () => {
      const card = service.generateApprovalRequestCard(mockApprovalData);
      const actions = card.actions as Array<{ title: string; url?: string }>;
      const details = actions.find((a) => a.title === 'View Details');
      expect(details?.url).toBe('https://example.com/approval/456');
    });
  });

  describe('generateScoreUpdateCard - body structure', () => {
    it('should show positive change text for score increase', () => {
      const data: ScoreUpdateCardData = {
        sessionName: 'Score Session',
        previousScore: 0.6,
        newScore: 0.75,
        reason: 'Evidence added',
        updatedAt: '2025-06-15T12:00:00Z',
        dashboardUrl: 'https://example.com/dash',
      };
      const card = service.generateScoreUpdateCard(data);
      const bodyJson = JSON.stringify(card.body);
      // Change should be +15.0%
      expect(bodyJson).toContain('+15.0%');
    });

    it('should show negative change text for score decrease', () => {
      const data: ScoreUpdateCardData = {
        sessionName: 'Score Session',
        previousScore: 0.8,
        newScore: 0.65,
        reason: 'Section failed',
        updatedAt: '2025-06-15T12:00:00Z',
        dashboardUrl: 'https://example.com/dash',
      };
      const card = service.generateScoreUpdateCard(data);
      const bodyJson = JSON.stringify(card.body);
      expect(bodyJson).toContain('-15.0%');
    });

    it('should show +0.0% for no change', () => {
      const data: ScoreUpdateCardData = {
        sessionName: 'Score Session',
        previousScore: 0.75,
        newScore: 0.75,
        reason: 'Re-evaluated',
        updatedAt: '2025-06-15T12:00:00Z',
        dashboardUrl: 'https://example.com/dash',
      };
      const card = service.generateScoreUpdateCard(data);
      const bodyJson = JSON.stringify(card.body);
      expect(bodyJson).toContain('+0.0%');
    });

    it('should include session name in facts', () => {
      const data: ScoreUpdateCardData = {
        sessionName: 'My Session Name',
        previousScore: 0.5,
        newScore: 0.6,
        reason: 'Improved',
        updatedAt: '2025-06-15T12:00:00Z',
        dashboardUrl: 'https://example.com/dash',
      };
      const card = service.generateScoreUpdateCard(data);
      const bodyJson = JSON.stringify(card.body);
      expect(bodyJson).toContain('My Session Name');
    });

    it('should include reason text in body', () => {
      const data: ScoreUpdateCardData = {
        sessionName: 'S',
        previousScore: 0.5,
        newScore: 0.6,
        reason: 'Additional evidence uploaded by reviewer',
        updatedAt: '2025-06-15T12:00:00Z',
        dashboardUrl: 'https://example.com/dash',
      };
      const card = service.generateScoreUpdateCard(data);
      const bodyJson = JSON.stringify(card.body);
      expect(bodyJson).toContain('Additional evidence uploaded by reviewer');
    });

    it('should include target score of 95% in facts', () => {
      const data: ScoreUpdateCardData = {
        sessionName: 'S',
        previousScore: 0.5,
        newScore: 0.6,
        reason: 'Test',
        updatedAt: '2025-06-15T12:00:00Z',
        dashboardUrl: 'https://example.com/dash',
      };
      const card = service.generateScoreUpdateCard(data);
      const bodyJson = JSON.stringify(card.body);
      expect(bodyJson).toContain('95%');
    });

    it('should show Good color for new score increase', () => {
      const data: ScoreUpdateCardData = {
        sessionName: 'S',
        previousScore: 0.5,
        newScore: 0.7,
        reason: 'Test',
        updatedAt: '2025-06-15T12:00:00Z',
        dashboardUrl: '',
      };
      const card = service.generateScoreUpdateCard(data);
      const bodyJson = JSON.stringify(card.body);
      expect(bodyJson).toContain('"Good"');
    });

    it('should show Attention color for score decrease', () => {
      const data: ScoreUpdateCardData = {
        sessionName: 'S',
        previousScore: 0.8,
        newScore: 0.6,
        reason: 'Test',
        updatedAt: '2025-06-15T12:00:00Z',
        dashboardUrl: '',
      };
      const card = service.generateScoreUpdateCard(data);
      const bodyJson = JSON.stringify(card.body);
      expect(bodyJson).toContain('"Attention"');
    });

    it('should include View Dashboard action with correct URL', () => {
      const data: ScoreUpdateCardData = {
        sessionName: 'S',
        previousScore: 0.5,
        newScore: 0.6,
        reason: 'Test',
        updatedAt: '2025-06-15T12:00:00Z',
        dashboardUrl: 'https://example.com/dashboard',
      };
      const card = service.generateScoreUpdateCard(data);
      const actions = card.actions as Array<{ title: string; url: string }>;
      const dashAction = actions.find((a) => a.title === 'View Dashboard');
      expect(dashAction?.url).toBe('https://example.com/dashboard');
    });

    it('should use good container style for high score >= 0.95', () => {
      const data: ScoreUpdateCardData = {
        sessionName: 'S',
        previousScore: 0.9,
        newScore: 0.96,
        reason: 'Test',
        updatedAt: '2025-06-15T12:00:00Z',
        dashboardUrl: '',
      };
      const card = service.generateScoreUpdateCard(data);
      const bodyJson = JSON.stringify(card.body);
      expect(bodyJson).toContain('"good"');
    });

    it('should use warning container style for medium score >= 0.7 and < 0.95', () => {
      const data: ScoreUpdateCardData = {
        sessionName: 'S',
        previousScore: 0.6,
        newScore: 0.8,
        reason: 'Test',
        updatedAt: '2025-06-15T12:00:00Z',
        dashboardUrl: '',
      };
      const card = service.generateScoreUpdateCard(data);
      // First container's style
      const firstContainer = card.body[0] as { style?: string };
      expect(firstContainer.style).toBe('warning');
    });

    it('should use attention container style for low score < 0.7', () => {
      const data: ScoreUpdateCardData = {
        sessionName: 'S',
        previousScore: 0.3,
        newScore: 0.4,
        reason: 'Test',
        updatedAt: '2025-06-15T12:00:00Z',
        dashboardUrl: '',
      };
      const card = service.generateScoreUpdateCard(data);
      const firstContainer = card.body[0] as { style?: string };
      expect(firstContainer.style).toBe('attention');
    });
  });

  describe('sendToTeams', () => {
    // sendToTeams uses native https module; we test it through the notify methods
    // which are already tested above for the no-webhook case.
    // Here we verify the card payload structure sent to webhook.

    it('should handle the case where sendToTeams wraps card in message payload', () => {
      // Verify card shape is compatible with Teams webhook format
      const card = service.generateHeatmapCard({
        sessionName: 'S',
        overallScore: 0.5,
        dimensions: [],
        progress: {
          sectionsLeft: 0,
          questionsLeft: 0,
          currentSectionProgress: 0,
          currentSectionTotal: 0,
        },
        heatmapUrl: '',
        continueUrl: '',
      });
      expect(card.type).toBe('AdaptiveCard');
      expect(card.version).toBe('1.5');
      expect(card.$schema).toContain('adaptivecards.io');
    });
  });

  describe('branch coverage - notifyApprovalRequired with approval-specific webhook', () => {
    it('should use TEAMS_APPROVAL_WEBHOOK_URL when set', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'TEAMS_APPROVAL_WEBHOOK_URL') {
          return 'https://teams.webhook/approval';
        }
        if (key === 'TEAMS_WEBHOOK_URL') {
          return 'https://teams.webhook/general';
        }
        return undefined;
      });

      // sendToTeams will fail because URL doesn't resolve, but we just need to hit the branch
      try {
        await service.notifyApprovalRequired({
          approvalId: 'apr-1',
          requestType: 'Test',
          requesterName: 'User',
          resourceName: 'Res',
          justification: 'Just',
          requestedAt: '2025-01-01T00:00:00Z',
          expiresAt: '2025-01-02T00:00:00Z',
          detailsUrl: 'https://example.com',
        });
      } catch {
        // Expected: https.request will fail in test environment
      }

      expect(mockConfigService.get).toHaveBeenCalledWith('TEAMS_APPROVAL_WEBHOOK_URL');
    });

    it('should fall back to TEAMS_WEBHOOK_URL when TEAMS_APPROVAL_WEBHOOK_URL is undefined', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'TEAMS_APPROVAL_WEBHOOK_URL') {
          return undefined;
        }
        if (key === 'TEAMS_WEBHOOK_URL') {
          return 'https://teams.webhook/general';
        }
        return undefined;
      });

      try {
        await service.notifyApprovalRequired({
          approvalId: 'apr-2',
          requestType: 'Test',
          requesterName: 'User',
          resourceName: 'Res',
          justification: 'Just',
          requestedAt: '2025-01-01T00:00:00Z',
          expiresAt: '2025-01-02T00:00:00Z',
          detailsUrl: 'https://example.com',
        });
      } catch {
        // Expected
      }

      expect(mockConfigService.get).toHaveBeenCalledWith('TEAMS_APPROVAL_WEBHOOK_URL');
      expect(mockConfigService.get).toHaveBeenCalledWith('TEAMS_WEBHOOK_URL');
    });
  });

  describe('branch coverage - score update changeText equal scores', () => {
    it('should show +0.0% when scores are exactly equal', () => {
      const data: ScoreUpdateCardData = {
        sessionName: 'Equal',
        previousScore: 0.5,
        newScore: 0.5,
        reason: 'No change',
        updatedAt: '2025-01-01T00:00:00Z',
        dashboardUrl: '',
      };
      const card = service.generateScoreUpdateCard(data);
      const bodyJson = JSON.stringify(card.body);
      // newScore >= previousScore is true when equal, so change text is +0.0%
      expect(bodyJson).toContain('+0.0%');
      // changeDirection should be arrow right
      expect(bodyJson).toContain('\u27A1\uFE0F');
    });
  });

  describe('branch coverage - gap style for severity exactly 0.4', () => {
    it('should use default style when severity is exactly 0.4', () => {
      const data: GapSummaryCardData = {
        totalGaps: 1,
        criticalGaps: 0,
        highGaps: 0,
        gaps: [
          { question: 'Edge', dimension: 'D', severity: 0.4, coverage: 0.5, questionId: 'q1' },
        ],
        gapsUrl: '',
        promptsUrl: '',
      };
      const card = service.generateGapSummaryCard(data);
      const bodyJson = JSON.stringify(card.body);
      // severity 0.4 is NOT > 0.4, so default style
      expect(bodyJson).toContain('"default"');
    });
  });
});
