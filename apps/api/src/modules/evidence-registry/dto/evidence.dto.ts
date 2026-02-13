import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsEnum, IsOptional, IsString, MaxLength, IsBoolean } from 'class-validator';
import { EvidenceType } from '@prisma/client';

// Extract enum values for Swagger schema generation
const EvidenceTypeValues = Object.values(EvidenceType);

/**
 * DTO for uploading evidence
 */
export class UploadEvidenceDto {
  @ApiProperty({ description: 'Session ID the evidence belongs to' })
  @IsUUID()
  sessionId: string;

  @ApiProperty({ description: 'Question ID the evidence supports' })
  @IsUUID()
  questionId: string;

  @ApiProperty({
    enum: EvidenceTypeValues,
    enumName: 'EvidenceType',
    description: 'Type of evidence artifact',
  })
  @IsEnum(EvidenceType)
  artifactType: EvidenceType;

  @ApiPropertyOptional({ description: 'Custom file name for the evidence' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  fileName?: string;
}

/**
 * DTO for verifying evidence
 */
export class VerifyEvidenceDto {
  @ApiProperty({ description: 'Evidence ID to verify' })
  @IsUUID()
  evidenceId: string;

  @ApiProperty({ description: 'Whether the evidence is verified' })
  @IsBoolean()
  verified: boolean;

  @ApiPropertyOptional({
    description: 'Coverage value to set on the associated response (0.0-1.0)',
    minimum: 0,
    maximum: 1,
  })
  @IsOptional()
  coverageValue?: number;
}

/**
 * Response DTO for evidence item
 */
export class EvidenceItemResponse {
  @ApiProperty({ description: 'Evidence ID' })
  id: string;

  @ApiProperty({ description: 'Session ID' })
  sessionId: string;

  @ApiProperty({ description: 'Question ID' })
  questionId: string;

  @ApiProperty({ description: 'Storage URL' })
  artifactUrl: string;

  @ApiProperty({ enum: EvidenceTypeValues, enumName: 'EvidenceType' })
  artifactType: EvidenceType;

  @ApiProperty({ description: 'Original file name' })
  fileName: string | null;

  @ApiProperty({ description: 'File size in bytes' })
  fileSize: bigint | null;

  @ApiProperty({ description: 'MIME type' })
  mimeType: string | null;

  @ApiProperty({ description: 'SHA-256 hash of file content' })
  hashSignature: string | null;

  @ApiProperty({ description: 'Whether evidence has been verified' })
  verified: boolean;

  @ApiPropertyOptional({ description: 'ID of user who verified' })
  verifierId: string | null;

  @ApiPropertyOptional({ description: 'When evidence was verified' })
  verifiedAt: Date | null;

  @ApiProperty({ description: 'When evidence was created' })
  createdAt: Date;
}

/**
 * Filter options for listing evidence
 */
export class ListEvidenceDto {
  @ApiPropertyOptional({ description: 'Filter by session ID' })
  @IsOptional()
  @IsUUID()
  sessionId?: string;

  @ApiPropertyOptional({ description: 'Filter by question ID' })
  @IsOptional()
  @IsUUID()
  questionId?: string;

  @ApiPropertyOptional({ enum: EvidenceTypeValues, description: 'Filter by artifact type' })
  @IsOptional()
  @IsEnum(EvidenceType)
  artifactType?: EvidenceType;

  @ApiPropertyOptional({ description: 'Filter by verification status' })
  @IsOptional()
  @IsBoolean()
  verified?: boolean;
}
