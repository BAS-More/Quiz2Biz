import { IsString, IsOptional, IsEnum, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Create a new chat message
 */
export class CreateMessageDto {
  @ApiProperty({ description: 'Message content from the user' })
  @IsString()
  content!: string;

  @ApiPropertyOptional({ enum: ['claude', 'openai'], description: 'Preferred AI provider' })
  @IsOptional()
  @IsEnum(['claude', 'openai'])
  provider?: 'claude' | 'openai';
}

/**
 * Chat message response
 */
export class ChatMessageDto {
  @ApiProperty({ description: 'Message ID' })
  id!: string;

  @ApiProperty({ description: 'Project ID' })
  projectId!: string;

  @ApiProperty({ enum: ['user', 'assistant', 'system'], description: 'Message role' })
  role!: 'user' | 'assistant' | 'system';

  @ApiProperty({ description: 'Message content' })
  content!: string;

  @ApiPropertyOptional({ description: 'AI provider that generated this message' })
  aiProviderId?: string;

  @ApiPropertyOptional({ description: 'Input tokens used' })
  inputTokens?: number;

  @ApiPropertyOptional({ description: 'Output tokens generated' })
  outputTokens?: number;

  @ApiPropertyOptional({ description: 'Response latency in ms' })
  latencyMs?: number;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt!: Date;
}

/**
 * Project chat status
 */
export class ChatStatusDto {
  @ApiProperty({ description: 'Project ID' })
  projectId!: string;

  @ApiProperty({ description: 'Number of messages sent' })
  messageCount!: number;

  @ApiProperty({ description: 'Message limit for the project' })
  messageLimit!: number;

  @ApiProperty({ description: 'Remaining messages' })
  remainingMessages!: number;

  @ApiProperty({ description: 'Whether limit has been reached' })
  limitReached!: boolean;

  @ApiPropertyOptional({ description: 'Project quality score' })
  qualityScore?: number;
}

/**
 * Query parameters for listing messages
 */
export class ListMessagesQueryDto {
  @ApiPropertyOptional({ description: 'Number of messages to skip' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  skip?: number;

  @ApiPropertyOptional({ description: 'Maximum messages to return' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  take?: number;
}
