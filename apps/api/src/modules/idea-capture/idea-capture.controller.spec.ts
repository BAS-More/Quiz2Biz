import { Test, TestingModule } from '@nestjs/testing';
import { IdeaCaptureController } from './idea-capture.controller';
import { IdeaCaptureService } from './services/idea-capture.service';
import { CreateIdeaDto } from './dto/create-idea.dto';
import { ConfirmProjectTypeDto } from './dto/confirm-project-type.dto';
import { AuthenticatedUser } from '../auth/auth.service';

describe('IdeaCaptureController', () => {
  let controller: IdeaCaptureController;
  let ideaCaptureService: IdeaCaptureService;

  const mockUser: AuthenticatedUser = {
    id: 'user-123',
    email: 'test@example.com',
    role: 'CLIENT' as any,
  };

  const mockIdeaResponse = {
    id: 'idea-123',
    rawInput: 'Test business idea',
    title: 'Test Idea',
    status: 'ANALYZED',
    themes: ['Mobile', 'Subscription'],
    gaps: ['Target Market'],
    recommendedProjectTypeId: 'project-type-1',
    aiAnalysis: { confidence: 0.85 },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockIdeaCaptureService = {
    captureAndAnalyze: jest.fn().mockResolvedValue(mockIdeaResponse),
    getById: jest.fn().mockResolvedValue(mockIdeaResponse),
    confirmProjectType: jest.fn().mockResolvedValue(mockIdeaResponse),
    createSessionFromIdea: jest.fn().mockResolvedValue({ sessionId: 'session-456' }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IdeaCaptureController],
      providers: [{ provide: IdeaCaptureService, useValue: mockIdeaCaptureService }],
    }).compile();

    controller = module.get<IdeaCaptureController>(IdeaCaptureController);
    ideaCaptureService = module.get<IdeaCaptureService>(IdeaCaptureService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('captureIdea', () => {
    it('should capture and analyze idea with authenticated user', async () => {
      const dto: CreateIdeaDto = {
        rawInput: 'I want to build a mobile app for pet owners',
        title: 'PetConnect',
      };

      const result = await controller.captureIdea(dto, mockUser);

      expect(result).toEqual(mockIdeaResponse);
      expect(mockIdeaCaptureService.captureAndAnalyze).toHaveBeenCalledWith(dto, mockUser.id);
    });

    it('should capture idea without authenticated user', async () => {
      const dto: CreateIdeaDto = {
        rawInput: 'Another business idea for testing',
      };

      const result = await controller.captureIdea(dto, undefined);

      expect(result).toEqual(mockIdeaResponse);
      expect(mockIdeaCaptureService.captureAndAnalyze).toHaveBeenCalledWith(dto, undefined);
    });

    it('should capture idea with optional projectTypeId', async () => {
      const dto: CreateIdeaDto = {
        rawInput: 'Business idea with known project type',
        projectTypeId: 'project-type-123',
      };

      const result = await controller.captureIdea(dto, mockUser);

      expect(result).toEqual(mockIdeaResponse);
      expect(mockIdeaCaptureService.captureAndAnalyze).toHaveBeenCalledWith(dto, mockUser.id);
    });
  });

  describe('getIdea', () => {
    it('should return idea by ID', async () => {
      const ideaId = 'idea-123';

      const result = await controller.getIdea(ideaId);

      expect(result).toEqual(mockIdeaResponse);
      expect(mockIdeaCaptureService.getById).toHaveBeenCalledWith(ideaId);
    });
  });

  describe('confirmProjectType', () => {
    it('should confirm project type selection', async () => {
      const ideaId = 'idea-123';
      const dto: ConfirmProjectTypeDto = {
        projectTypeId: 'project-type-456',
      };

      const result = await controller.confirmProjectType(ideaId, dto);

      expect(result).toEqual(mockIdeaResponse);
      expect(mockIdeaCaptureService.confirmProjectType).toHaveBeenCalledWith(
        ideaId,
        dto.projectTypeId,
      );
    });
  });

  describe('createSession', () => {
    it('should create session from confirmed idea', async () => {
      const ideaId = 'idea-123';

      const result = await controller.createSession(ideaId, mockUser);

      expect(result).toEqual({ sessionId: 'session-456' });
      expect(mockIdeaCaptureService.createSessionFromIdea).toHaveBeenCalledWith(
        ideaId,
        mockUser.id,
      );
    });
  });
});
