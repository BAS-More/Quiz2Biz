import {
  Controller,
  Post,
  Get,
  Body,
  Res,
  UseGuards,
  Logger,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AiGatewayService } from './ai-gateway.service';
import {
  AiGatewayRequestDto,
  AiGatewayResponseDto,
  GatewayHealthDto,
} from './dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

/**
 * AI Gateway Controller
 *
 * REST and SSE endpoints for AI request routing.
 */
@ApiTags('AI Gateway')
@Controller('ai-gateway')
export class AiGatewayController {
  private readonly logger = new Logger(AiGatewayController.name);

  constructor(private readonly aiGatewayService: AiGatewayService) {}

  /**
   * Generate AI response (non-streaming)
   */
  @Post('generate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate AI response' })
  @ApiResponse({ status: 200, type: AiGatewayResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 500, description: 'AI generation failed' })
  async generate(
    @Body() request: AiGatewayRequestDto,
    @CurrentUser() user: { sub: string },
  ): Promise<AiGatewayResponseDto> {
    try {
      const response = await this.aiGatewayService.generate({
        ...request,
        userId: user.sub,
      });

      return response;
    } catch (error) {
      this.logger.error(`Generate failed: ${error}`);
      throw new HttpException(
        error instanceof Error ? error.message : 'AI generation failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Generate AI response with SSE streaming
   */
  @Post('stream')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate AI response with streaming' })
  @ApiResponse({ status: 200, description: 'SSE stream of AI response chunks' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 500, description: 'AI generation failed' })
  async stream(
    @Body() request: AiGatewayRequestDto,
    @Res() res: Response,
    @CurrentUser() user: { sub: string },
  ): Promise<void> {
    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

    try {
      const stream = this.aiGatewayService.generateStream({
        ...request,
        userId: user.sub,
        stream: true,
      });

      for await (const chunk of stream) {
        // Send SSE event
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);

        if (chunk.done) {
          // Send final event
          res.write('event: done\ndata: {}\n\n');
          break;
        }
      }
    } catch (error) {
      this.logger.error(`Stream failed: ${error}`);
      res.write(
        `event: error\ndata: ${JSON.stringify({
          error: error instanceof Error ? error.message : 'Stream failed',
        })}\n\n`,
      );
    } finally {
      res.end();
    }
  }

  /**
   * Get gateway health status
   */
  @Get('health')
  @ApiOperation({ summary: 'Get AI Gateway health status' })
  @ApiResponse({ status: 200, type: GatewayHealthDto })
  async getHealth(): Promise<GatewayHealthDto> {
    return this.aiGatewayService.getHealth();
  }

  /**
   * Get available providers
   */
  @Get('providers')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get available AI providers' })
  @ApiResponse({ status: 200, description: 'List of available providers' })
  async getProviders(): Promise<{
    default: string;
    available: string[];
  }> {
    return {
      default: this.aiGatewayService.getDefaultProvider(),
      available: this.aiGatewayService.getAvailableProviders(),
    };
  }
}
