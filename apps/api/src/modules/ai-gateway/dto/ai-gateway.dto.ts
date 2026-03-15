import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsArray,
  IsEnum,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Message DTO for chat conversations
 */
export class MessageDto {
  @ApiProperty({ enum: ['user', 'assistant', 'system'], description: 'Message role' })
  @IsEnum(['user', 'assistant', 'system'])
  role!: 'user' | 'assistant' | 'system';

  @ApiProperty({ description: 'Message content' })
  @IsString()
  content!: string;

  @ApiPropertyOptional({ description: 'Optional name for multi-turn conversations' })
  @IsOptional()
  @IsString()
  name?: string;
}

/**
 * AI Gateway request DTO
 */
export class AiGatewayRequestDto {
  @ApiProperty({ enum: ['chat', 'extract', 'generate'], description: 'Type of AI task' })
  @IsEnum(['chat', 'extract', 'generate'])
  taskType!: 'chat' | 'extract' | 'generate';

  @ApiPropertyOptional({
    enum: ['claude', 'openai', 'gemini'],
    description: 'Preferred AI provider',
  })
  @IsOptional()
  @IsEnum(['claude', 'openai', 'gemini'])
  provider?: 'claude' | 'openai' | 'gemini';

  @ApiProperty({ type: [MessageDto], description: 'Conversation messages' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MessageDto)
  messages!: MessageDto[];

  @ApiProperty({ description: 'System prompt for the conversation' })
  @IsString()
  systemPrompt!: string;

  @ApiPropertyOptional({ description: 'Enable JSON mode for structured outputs' })
  @IsOptional()
  @IsBoolean()
  jsonMode?: boolean;

  @ApiPropertyOptional({ description: 'Enable streaming response' })
  @IsOptional()
  @IsBoolean()
  stream?: boolean;

  @ApiPropertyOptional({ description: 'Maximum tokens for response' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(32000)
  maxTokens?: number;

  @ApiPropertyOptional({ description: 'Temperature for response generation (0-1)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;

  @ApiPropertyOptional({ description: 'Project ID for context and cost tracking' })
  @IsOptional()
  @IsString()
  projectId?: string;
}

/**
 * Token usage response DTO
 */
export class TokenUsageDto {
  @ApiProperty({ description: 'Input tokens used' })
  inputTokens!: number;

  @ApiProperty({ description: 'Output tokens generated' })
  outputTokens!: number;

  @ApiProperty({ description: 'Total tokens used' })
  totalTokens!: number;
}

/**
 * Cost info response DTO
 */
export class CostInfoDto {
  @ApiProperty({ description: 'Input cost' })
  inputCost!: number;

  @ApiProperty({ description: 'Output cost' })
  outputCost!: number;

  @ApiProperty({ description: 'Total cost' })
  totalCost!: number;

  @ApiProperty({ description: 'Currency code' })
  currency!: string;
}

/**
 * AI Gateway response DTO
 */
export class AiGatewayResponseDto {
  @ApiProperty({ description: 'Generated content' })
  content!: string;

  @ApiProperty({
    enum: ['claude', 'openai', 'gemini'],
    description: 'Provider that generated the response',
  })
  provider!: 'claude' | 'openai' | 'gemini';

  @ApiProperty({ description: 'Model used for generation' })
  model!: string;

  @ApiProperty({ type: TokenUsageDto, description: 'Token usage statistics' })
  usage!: TokenUsageDto;

  @ApiProperty({ type: CostInfoDto, description: 'Cost information' })
  cost!: CostInfoDto;

  @ApiProperty({ description: 'Response latency in milliseconds' })
  latencyMs!: number;

  @ApiProperty({
    enum: ['stop', 'length', 'content_filter', 'error'],
    description: 'Finish reason',
  })
  finishReason!: 'stop' | 'length' | 'content_filter' | 'error';

  @ApiProperty({ description: 'Whether the response was from a fallback provider' })
  usedFallback!: boolean;

  @ApiPropertyOptional({
    enum: ['claude', 'openai', 'gemini'],
    description: 'Original provider if fallback was used',
  })
  originalProvider?: 'claude' | 'openai' | 'gemini';
}

/**
 * Provider status DTO
 */
export class ProviderStatusDto {
  @ApiProperty({ enum: ['claude', 'openai', 'gemini'], description: 'Provider identifier' })
  provider!: 'claude' | 'openai' | 'gemini';

  @ApiProperty({ description: 'Whether the provider is available' })
  available!: boolean;

  @ApiPropertyOptional({ description: 'Last measured latency in milliseconds' })
  latencyMs?: number;

  @ApiPropertyOptional({ description: 'Last error message' })
  lastError?: string;
}

/**
 * Gateway health response DTO
 */
export class GatewayHealthDto {
  @ApiProperty({ enum: ['healthy', 'degraded', 'unhealthy'], description: 'Gateway status' })
  status!: 'healthy' | 'degraded' | 'unhealthy';

  @ApiProperty({ type: [ProviderStatusDto], description: 'Provider statuses' })
  providers!: ProviderStatusDto[];

  @ApiProperty({ description: 'Health check timestamp' })
  timestamp!: Date;
}
