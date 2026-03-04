import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID, MinLength, MaxLength } from 'class-validator';

export class CreateIdeaDto {
  @ApiProperty({
    description: 'Free-form text describing the business idea or project',
    example:
      'I want to start a mobile app for pet owners that connects them with local vets and pet sitters. I am thinking subscription model with premium features.',
    minLength: 10,
    maxLength: 10000,
  })
  @IsString()
  @MinLength(10, {
    message: 'Please provide at least a brief description of your idea (10+ characters).',
  })
  @MaxLength(10000)
  rawInput: string;

  @ApiPropertyOptional({
    description: 'Optional title for the idea',
    example: 'PetConnect App',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({
    description: 'If the user already knows which project type they want',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  projectTypeId?: string;
}
