import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BlobServiceClient,
  ContainerClient,
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
  BlobSASPermissions,
  SASProtocol,
} from '@azure/storage-blob';

export interface UploadResult {
  url: string;
  fileName: string;
  fileSize: number;
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly blobServiceClient: BlobServiceClient;
  private readonly containerName: string;
  private readonly accountName: string;
  private readonly accountKey: string;

  constructor(private readonly configService: ConfigService) {
    const connectionString = this.configService.get<string>('AZURE_STORAGE_CONNECTION_STRING');
    this.containerName = this.configService.get<string>(
      'AZURE_STORAGE_CONTAINER_NAME',
      'documents',
    );

    if (connectionString) {
      this.blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);

      // Extract account name and key from connection string for SAS generation
      const accountNameMatch = connectionString.match(/AccountName=([^;]+)/);
      const accountKeyMatch = connectionString.match(/AccountKey=([^;]+)/);

      this.accountName = accountNameMatch?.[1] ?? '';
      this.accountKey = accountKeyMatch?.[1] ?? '';
    } else {
      // Fallback for development - use local emulator or mock
      this.logger.warn(
        'Azure Storage connection string not configured. Storage operations will fail.',
      );
      this.accountName = '';
      this.accountKey = '';
      this.blobServiceClient = new BlobServiceClient(
        'https://devstoreaccount1.blob.core.windows.net',
      );
    }
  }

  private getContainerClient(): ContainerClient {
    return this.blobServiceClient.getContainerClient(this.containerName);
  }

  /**
   * Upload a document buffer to Azure Blob Storage
   */
  async upload(buffer: Buffer, fileName: string, category: string): Promise<UploadResult> {
    const containerClient = this.getContainerClient();

    // Ensure container exists
    await containerClient.createIfNotExists();

    // Create blob path: category/date/filename
    const date = new Date().toISOString().split('T')[0];
    const blobPath = `${category}/${date}/${fileName}`;

    const blockBlobClient = containerClient.getBlockBlobClient(blobPath);

    this.logger.log(`Uploading document to: ${blobPath}`);

    await blockBlobClient.uploadData(buffer, {
      blobHTTPHeaders: {
        blobContentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      },
    });

    return {
      url: blockBlobClient.url,
      fileName: blobPath,
      fileSize: buffer.length,
    };
  }

  /**
   * Generate a secure SAS URL for document download
   */
  async getDownloadUrl(storageUrl: string, expiresInMinutes: number = 60): Promise<string> {
    if (!this.accountName || !this.accountKey) {
      throw new Error('Azure Storage credentials not configured');
    }

    // Extract blob name from URL
    const url = new URL(storageUrl);
    const blobPath = url.pathname.replace(`/${this.containerName}/`, '');

    const containerClient = this.getContainerClient();
    const blobClient = containerClient.getBlobClient(blobPath);

    const sharedKeyCredential = new StorageSharedKeyCredential(this.accountName, this.accountKey);

    const startsOn = new Date();
    const expiresOn = new Date(startsOn.getTime() + expiresInMinutes * 60000);

    const sasToken = generateBlobSASQueryParameters(
      {
        containerName: this.containerName,
        blobName: blobPath,
        permissions: BlobSASPermissions.parse('r'), // Read only
        startsOn,
        expiresOn,
        protocol: SASProtocol.Https,
      },
      sharedKeyCredential,
    ).toString();

    return `${blobClient.url}?${sasToken}`;
  }

  /**
   * Delete a document from storage
   */
  async delete(storageUrl: string): Promise<void> {
    const url = new URL(storageUrl);
    const blobPath = url.pathname.replace(`/${this.containerName}/`, '');

    const containerClient = this.getContainerClient();
    const blobClient = containerClient.getBlobClient(blobPath);

    this.logger.log(`Deleting document: ${blobPath}`);

    await blobClient.deleteIfExists();
  }

  /**
   * Check if storage is properly configured
   */
  isConfigured(): boolean {
    return Boolean(this.accountName && this.accountKey);
  }
}
