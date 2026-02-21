import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { StorageService } from './storage.service';

// Mock Azure Storage Blob SDK
const mockGetContainerClient = jest.fn().mockReturnValue({
  createIfNotExists: jest.fn().mockResolvedValue(undefined),
  getBlockBlobClient: jest.fn().mockReturnValue({
    uploadData: jest.fn().mockResolvedValue(undefined),
    url: 'https://test.blob.core.windows.net/documents/test/file.docx',
  }),
  getBlobClient: jest.fn().mockReturnValue({
    url: 'https://test.blob.core.windows.net/documents/test/file.docx',
    deleteIfExists: jest.fn().mockResolvedValue(undefined),
  }),
});

jest.mock('@azure/storage-blob', () => {
  return {
    BlobServiceClient: class MockBlobServiceClient {
      static fromConnectionString = jest.fn().mockImplementation(() => ({
        getContainerClient: mockGetContainerClient,
      }));
      getContainerClient = mockGetContainerClient;
    },
    StorageSharedKeyCredential: jest.fn(),
    generateBlobSASQueryParameters: jest.fn().mockReturnValue({
      toString: () => 'sas_token=test',
    }),
    BlobSASPermissions: {
      parse: jest.fn(),
    },
    SASProtocol: {
      Https: 'https',
    },
  };
});

describe('StorageService', () => {
  let service: StorageService;
  let configService: jest.Mocked<ConfigService>;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: string) => {
      const config: Record<string, string> = {
        AZURE_STORAGE_CONNECTION_STRING: 'DefaultEndpointsProtocol=https;AccountName=testaccount;AccountKey=testkey123==;EndpointSuffix=core.windows.net',
        AZURE_STORAGE_CONTAINER_NAME: 'documents',
      };
      return config[key] ?? defaultValue;
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<StorageService>(StorageService);
    configService = module.get(ConfigService);
  });

  describe('constructor', () => {
    it('should initialize with connection string', () => {
      expect(configService.get).toHaveBeenCalledWith('AZURE_STORAGE_CONNECTION_STRING');
      expect(configService.get).toHaveBeenCalledWith('AZURE_STORAGE_CONTAINER_NAME', 'documents');
    });

    it('should handle missing connection string', async () => {
      const noConnectionConfig = {
        get: jest.fn((key: string, defaultValue?: string) => {
          if (key === 'AZURE_STORAGE_CONNECTION_STRING') return undefined;
          return defaultValue;
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          StorageService,
          { provide: ConfigService, useValue: noConnectionConfig },
        ],
      }).compile();

      const serviceNoConnection = module.get<StorageService>(StorageService);
      expect(serviceNoConnection.isConfigured()).toBe(false);
    });
  });

  describe('upload', () => {
    it('should upload a document buffer', async () => {
      const buffer = Buffer.from('test document content');
      const fileName = 'test-document.docx';
      const category = 'reports';

      const result = await service.upload(buffer, fileName, category);

      expect(result).toBeDefined();
      expect(result.fileName).toContain(category);
      expect(result.fileName).toContain(fileName);
      expect(result.fileSize).toBe(buffer.length);
      expect(result.url).toBeDefined();
    });

    it('should include date in blob path', async () => {
      const buffer = Buffer.from('content');
      const today = new Date().toISOString().split('T')[0];

      const result = await service.upload(buffer, 'file.docx', 'category');

      expect(result.fileName).toContain(today);
    });
  });

  describe('getDownloadUrl', () => {
    it('should generate SAS URL for download', async () => {
      const storageUrl = 'https://testaccount.blob.core.windows.net/documents/reports/2024-01-01/file.docx';

      const result = await service.getDownloadUrl(storageUrl, 30);

      expect(result).toContain('sas_token');
    });

    it('should throw error when not configured', async () => {
      const noConnectionConfig = {
        get: jest.fn(() => undefined),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          StorageService,
          { provide: ConfigService, useValue: noConnectionConfig },
        ],
      }).compile();

      const serviceNoConnection = module.get<StorageService>(StorageService);

      await expect(
        serviceNoConnection.getDownloadUrl('https://test.blob.core.windows.net/documents/file.docx'),
      ).rejects.toThrow('Azure Storage credentials not configured');
    });
  });

  describe('delete', () => {
    it('should delete document from storage', async () => {
      const storageUrl = 'https://testaccount.blob.core.windows.net/documents/reports/file.docx';

      await expect(service.delete(storageUrl)).resolves.not.toThrow();
    });
  });

  describe('isConfigured', () => {
    it('should return true when properly configured', () => {
      expect(service.isConfigured()).toBe(true);
    });

    it('should return false when not configured', async () => {
      const noConnectionConfig = {
        get: jest.fn(() => undefined),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          StorageService,
          { provide: ConfigService, useValue: noConnectionConfig },
        ],
      }).compile();

      const serviceNoConnection = module.get<StorageService>(StorageService);
      expect(serviceNoConnection.isConfigured()).toBe(false);
    });
  });
});
