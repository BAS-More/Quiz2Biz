import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Email template definitions for transactional emails
 */
export interface EmailTemplateData {
  /** User's name for personalization */
  userName?: string;
  /** Action URL (verification link, reset link, etc.) */
  actionUrl?: string;
  /** Token for verification or password reset */
  token?: string;
  /** Session ID for session-related emails */
  sessionId?: string;
  /** Document names for document-related emails */
  documentNames?: string[];
  /** Questionnaire name */
  questionnaireName?: string;
  /** Progress percentage */
  progressPercentage?: number;
  /** Expiration time for tokens */
  expiresIn?: string;
  /** Custom data fields */
  [key: string]: unknown;
}

export class EmailTemplateDto {
  @ApiProperty({ description: 'Template identifier' })
  id: string;

  @ApiProperty({ description: 'Template name' })
  name: string;

  @ApiProperty({ description: 'Subject line template (supports variables)' })
  subject: string;

  @ApiProperty({ description: 'HTML content template' })
  htmlTemplate: string;

  @ApiPropertyOptional({ description: 'Plain text template' })
  textTemplate?: string;

  @ApiPropertyOptional({ description: 'Required variables for this template' })
  requiredVariables?: string[];
}

/**
 * Predefined email templates
 */
export const EMAIL_TEMPLATES: Record<string, EmailTemplateDto> = {
  verification: {
    id: 'verification',
    name: 'Email Verification',
    subject: 'Verify your Quiz2Biz email address',
    requiredVariables: ['userName', 'actionUrl', 'expiresIn'],
    htmlTemplate: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your Email</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">Quiz2Biz</h1>
    </div>
    <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
        <h2 style="color: #333; margin-top: 0;">Welcome, {{userName}}!</h2>
        <p>Thank you for signing up for Quiz2Biz. Please verify your email address to get started.</p>
        <div style="text-align: center; margin: 30px 0;">
            <a href="{{actionUrl}}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Verify Email Address</a>
        </div>
        <p style="color: #666; font-size: 14px;">This link will expire in {{expiresIn}}.</p>
        <p style="color: #666; font-size: 14px;">If you didn't create an account, you can safely ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
        <p style="color: #999; font-size: 12px; text-align: center;">Quiz2Biz - Business Readiness Assessment Platform</p>
    </div>
</body>
</html>`,
    textTemplate: `Welcome to Quiz2Biz, {{userName}}!

Please verify your email address by clicking the link below:
{{actionUrl}}

This link will expire in {{expiresIn}}.

If you didn't create an account, you can safely ignore this email.`,
  },

  password_reset: {
    id: 'password_reset',
    name: 'Password Reset',
    subject: 'Reset your Quiz2Biz password',
    requiredVariables: ['userName', 'actionUrl', 'expiresIn'],
    htmlTemplate: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Password</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">Quiz2Biz</h1>
    </div>
    <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
        <h2 style="color: #333; margin-top: 0;">Password Reset Request</h2>
        <p>Hi {{userName}},</p>
        <p>We received a request to reset your password. Click the button below to create a new password:</p>
        <div style="text-align: center; margin: 30px 0;">
            <a href="{{actionUrl}}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Reset Password</a>
        </div>
        <p style="color: #666; font-size: 14px;">This link will expire in {{expiresIn}}.</p>
        <p style="color: #666; font-size: 14px;">If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
        <p style="color: #999; font-size: 12px; text-align: center;">Quiz2Biz - Business Readiness Assessment Platform</p>
    </div>
</body>
</html>`,
    textTemplate: `Password Reset Request

Hi {{userName}},

We received a request to reset your password. Click the link below to create a new password:
{{actionUrl}}

This link will expire in {{expiresIn}}.

If you didn't request a password reset, please ignore this email.`,
  },

  welcome: {
    id: 'welcome',
    name: 'Welcome Email',
    subject: 'Welcome to Quiz2Biz - Get Started with Your Assessment',
    requiredVariables: ['userName'],
    htmlTemplate: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to Quiz2Biz</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to Quiz2Biz!</h1>
    </div>
    <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
        <h2 style="color: #333; margin-top: 0;">Hello {{userName}}!</h2>
        <p>Your account is now active and you're ready to begin your business readiness assessment.</p>
        <h3 style="color: #667eea;">What's Next?</h3>
        <ul style="padding-left: 20px;">
            <li>Complete your first questionnaire to assess your business readiness</li>
            <li>Get personalized recommendations based on your responses</li>
            <li>Generate professional business documents automatically</li>
        </ul>
        <div style="text-align: center; margin: 30px 0;">
            <a href="{{actionUrl}}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Start Your Assessment</a>
        </div>
        <p style="color: #666; font-size: 14px;">Need help? Reply to this email or visit our help center.</p>
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
        <p style="color: #999; font-size: 12px; text-align: center;">Quiz2Biz - Business Readiness Assessment Platform</p>
    </div>
</body>
</html>`,
    textTemplate: `Welcome to Quiz2Biz, {{userName}}!

Your account is now active and you're ready to begin your business readiness assessment.

What's Next?
- Complete your first questionnaire to assess your business readiness
- Get personalized recommendations based on your responses
- Generate professional business documents automatically

Start here: {{actionUrl}}

Need help? Reply to this email or visit our help center.`,
  },

  session_reminder: {
    id: 'session_reminder',
    name: 'Session Reminder',
    subject: 'Continue your Quiz2Biz assessment - {{progressPercentage}}% complete',
    requiredVariables: ['userName', 'actionUrl', 'questionnaireName', 'progressPercentage'],
    htmlTemplate: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Continue Your Assessment</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">Quiz2Biz</h1>
    </div>
    <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
        <h2 style="color: #333; margin-top: 0;">Don't lose your progress!</h2>
        <p>Hi {{userName}},</p>
        <p>You're <strong>{{progressPercentage}}%</strong> through your "{{questionnaireName}}" assessment. Pick up where you left off to complete your readiness evaluation.</p>
        <div style="background: #f5f5f5; border-radius: 8px; padding: 15px; margin: 20px 0;">
            <div style="background: #e0e0e0; border-radius: 4px; height: 10px; overflow: hidden;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); height: 100%; width: {{progressPercentage}}%;"></div>
            </div>
            <p style="text-align: center; margin: 10px 0 0; color: #666;">{{progressPercentage}}% Complete</p>
        </div>
        <div style="text-align: center; margin: 30px 0;">
            <a href="{{actionUrl}}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Continue Assessment</a>
        </div>
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
        <p style="color: #999; font-size: 12px; text-align: center;">Quiz2Biz - Business Readiness Assessment Platform</p>
    </div>
</body>
</html>`,
    textTemplate: `Don't lose your progress!

Hi {{userName}},

You're {{progressPercentage}}% through your "{{questionnaireName}}" assessment. 

Continue here: {{actionUrl}}`,
  },

  documents_ready: {
    id: 'documents_ready',
    name: 'Documents Ready',
    subject: 'Your Quiz2Biz documents are ready for download',
    requiredVariables: ['userName', 'actionUrl', 'documentNames'],
    htmlTemplate: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Documents Ready</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">Quiz2Biz</h1>
    </div>
    <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
        <h2 style="color: #333; margin-top: 0;">Your Documents Are Ready!</h2>
        <p>Hi {{userName}},</p>
        <p>Great news! Your documents have been generated and are ready for download:</p>
        <ul style="padding-left: 20px;">
            {{#each documentNames}}
            <li>{{this}}</li>
            {{/each}}
        </ul>
        <div style="text-align: center; margin: 30px 0;">
            <a href="{{actionUrl}}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Download Documents</a>
        </div>
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
        <p style="color: #999; font-size: 12px; text-align: center;">Quiz2Biz - Business Readiness Assessment Platform</p>
    </div>
</body>
</html>`,
    textTemplate: `Your Documents Are Ready!

Hi {{userName}},

Your documents have been generated:
{{#each documentNames}}
- {{this}}
{{/each}}

Download here: {{actionUrl}}`,
  },

  documents_approved: {
    id: 'documents_approved',
    name: 'Documents Approved',
    subject: 'Your Quiz2Biz documents have been approved',
    requiredVariables: ['userName', 'actionUrl', 'documentNames'],
    htmlTemplate: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Documents Approved</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">Documents Approved!</h1>
    </div>
    <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
        <h2 style="color: #28a745; margin-top: 0;">Congratulations, {{userName}}!</h2>
        <p>Your documents have been reviewed and approved. You can now download the final versions:</p>
        <ul style="padding-left: 20px;">
            {{#each documentNames}}
            <li>{{this}} ✓</li>
            {{/each}}
        </ul>
        <div style="text-align: center; margin: 30px 0;">
            <a href="{{actionUrl}}" style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Download Approved Documents</a>
        </div>
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
        <p style="color: #999; font-size: 12px; text-align: center;">Quiz2Biz - Business Readiness Assessment Platform</p>
    </div>
</body>
</html>`,
    textTemplate: `Documents Approved!

Congratulations {{userName}}!

Your documents have been reviewed and approved:
{{#each documentNames}}
- {{this}} ✓
{{/each}}

Download here: {{actionUrl}}`,
  },

  review_pending: {
    id: 'review_pending',
    name: 'Review Pending (Admin)',
    subject: '[Action Required] New documents pending review',
    requiredVariables: ['userName', 'actionUrl', 'documentNames'],
    htmlTemplate: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Review Pending</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #fd7e14 0%, #ffc107 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">Review Required</h1>
    </div>
    <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
        <h2 style="color: #fd7e14; margin-top: 0;">New Documents Pending Review</h2>
        <p>Hi {{userName}},</p>
        <p>The following documents are awaiting your review:</p>
        <ul style="padding-left: 20px;">
            {{#each documentNames}}
            <li>{{this}}</li>
            {{/each}}
        </ul>
        <div style="text-align: center; margin: 30px 0;">
            <a href="{{actionUrl}}" style="background: linear-gradient(135deg, #fd7e14 0%, #ffc107 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Review Documents</a>
        </div>
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
        <p style="color: #999; font-size: 12px; text-align: center;">Quiz2Biz Admin Portal</p>
    </div>
</body>
</html>`,
    textTemplate: `New Documents Pending Review

Hi {{userName}},

The following documents are awaiting your review:
{{#each documentNames}}
- {{this}}
{{/each}}

Review here: {{actionUrl}}`,
  },
};
