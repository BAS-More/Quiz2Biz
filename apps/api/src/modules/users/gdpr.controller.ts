import { Controller, Get, Delete, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/user.decorator';
import { AuthenticatedUser } from '../auth/auth.service';
import { GdprService, GdprDataExport, GdprDeletionResult } from './gdpr.service';

@ApiTags('gdpr')
@Controller('users/gdpr')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class GdprController {
  constructor(private readonly gdprService: GdprService) {}

  @Get('export')
  @ApiOperation({ summary: 'Export all personal data (GDPR Article 15/20)' })
  @ApiResponse({ status: 200, description: 'Full data export for the authenticated user' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async exportData(@CurrentUser() user: AuthenticatedUser): Promise<GdprDataExport> {
    return this.gdprService.exportUserData(user.id);
  }

  @Delete('delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete all personal data (GDPR Article 17)' })
  @ApiResponse({ status: 200, description: 'Erasure result with item count' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async deleteData(@CurrentUser() user: AuthenticatedUser): Promise<GdprDeletionResult> {
    return this.gdprService.deleteUserData(user.id);
  }
}
