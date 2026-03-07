import { Test, TestingModule } from '@nestjs/testing';
import { EvidenceIntegrityService } from './evidence-integrity.service';

describe('EvidenceIntegrityService', () => {
  let service: EvidenceIntegrityService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EvidenceIntegrityService],
    }).compile();

    service = module.get<EvidenceIntegrityService>(EvidenceIntegrityService);
  });

  describe('chainEvidence', () => {
    beforeEach(() => {
      jest.spyOn(service, 'requestTimestamp');
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should ...', () => {
      // test code
    });
  });

  describe('requestTimestamp', () => {
    beforeEach(() => {
      jest.restoreAllMocks();
    });

    it('should ...', () => {
      // test code
    });
  });
});
