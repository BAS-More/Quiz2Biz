import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * AI Provider seed data for Quiz2Biz AI Gateway
 *
 * These providers are used by the AI Gateway module to route requests
 * to different AI models based on task type (chat, extract, generate).
 */

interface AiProviderData {
  slug: string;
  name: string;
  description: string;
  apiEndpoint: string;
  modelMap: Record<string, string>;
  isActive: boolean;
  isDefault: boolean;
  config: Record<string, unknown>;
}

const AI_PROVIDERS: AiProviderData[] = [
  {
    slug: 'claude',
    name: 'Claude (Anthropic)',
    description:
      'Anthropic Claude models - excellent for nuanced reasoning, analysis, and long-form content generation. Primary provider for Quiz2Biz.',
    apiEndpoint: 'https://api.anthropic.com/v1',
    modelMap: {
      chat: 'claude-sonnet-4-20250514', // Best balance of speed and quality for chat
      extract: 'claude-sonnet-4-20250514', // Good at structured extraction
      generate: 'claude-sonnet-4-20250514', // Quality long-form generation
      default: 'claude-sonnet-4-20250514',
    },
    isActive: true,
    isDefault: true,
    config: {
      maxTokens: {
        chat: 4096,
        extract: 2048,
        generate: 16384,
      },
      temperature: {
        chat: 0.7,
        extract: 0.1, // Low temp for structured extraction
        generate: 0.5,
      },
      rateLimits: {
        requestsPerMinute: 60,
        tokensPerMinute: 100000,
      },
      pricing: {
        inputPer1kTokens: 0.003, // $3/million input
        outputPer1kTokens: 0.015, // $15/million output
        currency: 'USD',
      },
      features: {
        streaming: true,
        jsonMode: true,
        vision: true,
        functionCalling: true,
      },
    },
  },
  {
    slug: 'openai',
    name: 'GPT-4o (OpenAI)',
    description:
      'OpenAI GPT models - versatile and widely adopted. Available as alternative provider for Quiz2Biz chat and document generation.',
    apiEndpoint: 'https://api.openai.com/v1',
    modelMap: {
      chat: 'gpt-4o', // Fast and capable
      extract: 'gpt-4o-mini', // Cost-effective for extraction
      generate: 'gpt-4o', // Quality generation
      default: 'gpt-4o',
    },
    isActive: true,
    isDefault: false,
    config: {
      maxTokens: {
        chat: 4096,
        extract: 2048,
        generate: 16384,
      },
      temperature: {
        chat: 0.7,
        extract: 0.1,
        generate: 0.5,
      },
      rateLimits: {
        requestsPerMinute: 500,
        tokensPerMinute: 150000,
      },
      pricing: {
        inputPer1kTokens: 0.0025, // $2.50/million input (GPT-4o)
        outputPer1kTokens: 0.01, // $10/million output (GPT-4o)
        currency: 'USD',
      },
      features: {
        streaming: true,
        jsonMode: true,
        vision: true,
        functionCalling: true,
        responseFormat: true, // Structured outputs
      },
    },
  },
  {
    slug: 'gemini',
    name: 'Gemini (Google)',
    description:
      'Google Gemini models - strong multimodal capabilities. Reserved for future use.',
    apiEndpoint: 'https://generativelanguage.googleapis.com/v1',
    modelMap: {
      chat: 'gemini-2.0-flash',
      extract: 'gemini-2.0-flash',
      generate: 'gemini-2.0-flash',
      default: 'gemini-2.0-flash',
    },
    isActive: false, // Not active in initial release
    isDefault: false,
    config: {
      maxTokens: {
        chat: 4096,
        extract: 2048,
        generate: 8192,
      },
      temperature: {
        chat: 0.7,
        extract: 0.1,
        generate: 0.5,
      },
      rateLimits: {
        requestsPerMinute: 60,
        tokensPerMinute: 100000,
      },
      pricing: {
        inputPer1kTokens: 0.00025, // Competitive pricing
        outputPer1kTokens: 0.001,
        currency: 'USD',
      },
      features: {
        streaming: true,
        jsonMode: true,
        vision: true,
        functionCalling: true,
      },
    },
  },
];

export async function seedAiProviders(): Promise<void> {
  console.log('\n🤖 Seeding AI Providers...');

  for (const provider of AI_PROVIDERS) {
    await prisma.aiProvider.upsert({
      where: { slug: provider.slug },
      update: {
        name: provider.name,
        description: provider.description,
        apiEndpoint: provider.apiEndpoint,
        modelMap: provider.modelMap as Prisma.InputJsonValue,
        isActive: provider.isActive,
        isDefault: provider.isDefault,
        config: provider.config as Prisma.InputJsonValue,
      },
      create: {
        slug: provider.slug,
        name: provider.name,
        description: provider.description,
        apiEndpoint: provider.apiEndpoint,
        modelMap: provider.modelMap as Prisma.InputJsonValue,
        isActive: provider.isActive,
        isDefault: provider.isDefault,
        config: provider.config as Prisma.InputJsonValue,
      },
    });

    const statusIcon = provider.isActive ? '✓' : '○';
    const defaultBadge = provider.isDefault ? ' [DEFAULT]' : '';
    console.log(`  ${statusIcon} ${provider.name}${defaultBadge} (${provider.slug})`);
  }

  console.log(`\n✅ Seeded ${AI_PROVIDERS.length} AI providers`);
}

// Allow direct execution for testing
if (require.main === module) {
  seedAiProviders()
    .catch((e) => {
      console.error('AI Providers seed failed:', e);
      process.exit(1);
    })
    .finally(() => void prisma.$disconnect());
}
