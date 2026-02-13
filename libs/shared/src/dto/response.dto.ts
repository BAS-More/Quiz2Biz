import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PaginationMeta {
  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 100 })
  totalItems: number;

  @ApiProperty({ example: 5 })
  totalPages: number;
}

export class ApiResponseDto<T> {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty()
  data: T;

  @ApiPropertyOptional()
  meta?: {
    timestamp: string;
    requestId?: string;
  };
}

export class PaginatedResponseDto<T> {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty()
  data: {
    items: T[];
    pagination: PaginationMeta;
  };
}

export class ErrorResponseDto {
  @ApiProperty({ example: false })
  success: false;

  @ApiProperty({
    example: {
      code: 'NOT_FOUND',
      message: 'Resource not found',
      timestamp: '2025-01-15T10:00:00.000Z',
    },
  })
  error: {
    code: string;
    message: string;
    details?: unknown[];
    requestId?: string;
    timestamp: string;
  };
}
