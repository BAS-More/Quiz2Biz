import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import { SendEmailDto, EmailResponseDto, BulkSendEmailDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post('send')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send a single email (Admin only)' })
  @ApiResponse({ status: 200, description: 'Email sent', type: EmailResponseDto })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async sendEmail(@Body() dto: SendEmailDto): Promise<EmailResponseDto> {
    return this.notificationService.sendEmail(dto);
  }

  @Post('send-bulk')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send multiple emails (Admin only)' })
  @ApiResponse({ status: 200, description: 'Emails sent', type: [EmailResponseDto] })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async sendBulkEmails(@Body() dto: BulkSendEmailDto): Promise<EmailResponseDto[]> {
    return this.notificationService.sendBulkEmails(dto);
  }
}
