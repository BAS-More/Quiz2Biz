import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class ConfirmProjectTypeDto {
  @ApiProperty({
    description: 'The selected project type ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  projectTypeId!: string;
}
