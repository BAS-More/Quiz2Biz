import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { PrismaService } from '@libs/database';
import { SUBSCRIPTION_TIERS } from './payment.service';

describe('SubscriptionService', () => {
  let service: SubscriptionService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionService,
        {
          provide: PrismaService,
          useValue: {
            organization: {
              findUnique: jest.fn(),
              findMany: jest.fn(),
              update: jest.fn(),
            },
            questionnaire: {
              count: jest.fn(),
            },
            session: {
              count: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<SubscriptionService>(SubscriptionService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('getOrganizationSubscription', () => {
    it('retrieves subscription for existing organization', async () => {
      const mockOrg = {
        id: 'org-123',
        subscription: {
          plan: 'professional',
          status: 'active',
          stripeCustomerId: 'cus_123',
          stripeSubscriptionId: 'sub_123',
          currentPeriodEnd: '2026-02-28T00:00:00Z',
          cancelAtPeriodEnd: false,
        },
      };

      jest.spyOn(prisma.organization, 'findUnique').mockResolvedValue(mockOrg as any);

      const result = await service.getOrganizationSubscription('org-123');

      expect(result).toEqual({
        organizationId: 'org-123',
        tier: 'PROFESSIONAL',
        status: 'active',
        stripeCustomerId: 'cus_123',
        stripeSubscriptionId: 'sub_123',
        currentPeriodEnd: new Date('2026-02-28T00:00:00Z'),
        cancelAtPeriodEnd: false,
        features: SUBSCRIPTION_TIERS.PROFESSIONAL.features,
      });
    });

    it('returns FREE tier for organization without subscription', async () => {
      const mockOrg = {
        id: 'org-123',
        subscription: null,
      };

      jest.spyOn(prisma.organization, 'findUnique').mockResolvedValue(mockOrg as any);

      const result = await service.getOrganizationSubscription('org-123');

      expect(result.tier).toBe('FREE');
      expect(result.features).toEqual(SUBSCRIPTION_TIERS.FREE.features);
    });

    it('throws NotFoundException for non-existent organization', async () => {
      jest.spyOn(prisma.organization, 'findUnique').mockResolvedValue(null);

      await expect(service.getOrganizationSubscription('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('activateSubscription', () => {
    it('activates subscription for organization', async () => {
      jest.spyOn(prisma.organization, 'update').mockResolvedValue({} as any);

      await service.activateSubscription({
        organizationId: 'org-123',
        stripeCustomerId: 'cus_123',
        stripeSubscriptionId: 'sub_123',
        tier: 'PROFESSIONAL',
      });

      expect(prisma.organization.update).toHaveBeenCalledWith({
        where: { id: 'org-123' },
        data: {
          subscription: expect.objectContaining({
            plan: 'PROFESSIONAL',
            status: 'active',
            stripeCustomerId: 'cus_123',
            stripeSubscriptionId: 'sub_123',
          }),
        },
      });
    });
  });

  describe('syncSubscriptionStatus', () => {
    it('syncs subscription status from Stripe', async () => {
      const mockOrgs = [
        {
          id: 'org-123',
          subscription: {
            plan: 'professional',
            stripeCustomerId: 'cus_123',
            stripeSubscriptionId: 'sub_123',
          },
        },
      ];

      jest.spyOn(prisma.organization, 'findMany').mockResolvedValue(mockOrgs as any);
      jest.spyOn(prisma.organization, 'update').mockResolvedValue({} as any);

      await service.syncSubscriptionStatus({
        stripeSubscriptionId: 'sub_123',
        stripeCustomerId: 'cus_123',
        status: 'active',
        currentPeriodEnd: new Date('2026-02-28'),
        cancelAtPeriodEnd: false,
      });

      expect(prisma.organization.update).toHaveBeenCalledWith({
        where: { id: 'org-123' },
        data: {
          subscription: expect.objectContaining({
            status: 'active',
            cancelAtPeriodEnd: false,
          }),
        },
      });
    });

    it('handles missing organization gracefully', async () => {
      jest.spyOn(prisma.organization, 'findMany').mockResolvedValue([]);

      await service.syncSubscriptionStatus({
        stripeSubscriptionId: 'sub_123',
        stripeCustomerId: 'cus_nonexistent',
        status: 'active',
        currentPeriodEnd: new Date('2026-02-28'),
        cancelAtPeriodEnd: false,
      });

      expect(prisma.organization.update).not.toHaveBeenCalled();
    });
  });

  describe('cancelSubscriptionByStripeId', () => {
    it('cancels subscription and downgrades to FREE', async () => {
      const mockOrgs = [
        {
          id: 'org-123',
          subscription: {
            plan: 'professional',
            stripeSubscriptionId: 'sub_123',
          },
        },
      ];

      jest.spyOn(prisma.organization, 'findMany').mockResolvedValue(mockOrgs as any);
      jest.spyOn(prisma.organization, 'update').mockResolvedValue({} as any);

      await service.cancelSubscriptionByStripeId('sub_123');

      expect(prisma.organization.update).toHaveBeenCalledWith({
        where: { id: 'org-123' },
        data: {
          subscription: expect.objectContaining({
            plan: 'FREE',
            status: 'canceled',
          }),
        },
      });
    });
  });

  describe('hasFeatureAccess', () => {
    it('allows access when under limit', async () => {
      const mockOrg = {
        id: 'org-123',
        subscription: {
          plan: 'professional',
        },
      };

      jest.spyOn(prisma.organization, 'findUnique').mockResolvedValue(mockOrg as any);

      const result = await service.hasFeatureAccess('org-123', 'questionnaires', 5);

      expect(result).toEqual({
        allowed: true,
        limit: 10,
        remaining: 5,
      });
    });

    it('denies access when over limit', async () => {
      const mockOrg = {
        id: 'org-123',
        subscription: {
          plan: 'professional',
        },
      };

      jest.spyOn(prisma.organization, 'findUnique').mockResolvedValue(mockOrg as any);

      const result = await service.hasFeatureAccess('org-123', 'questionnaires', 10);

      expect(result).toEqual({
        allowed: false,
        limit: 10,
        remaining: 0,
      });
    });

    it('allows unlimited access for ENTERPRISE tier', async () => {
      const mockOrg = {
        id: 'org-123',
        subscription: {
          plan: 'enterprise',
        },
      };

      jest.spyOn(prisma.organization, 'findUnique').mockResolvedValue(mockOrg as any);

      const result = await service.hasFeatureAccess('org-123', 'questionnaires', 1000);

      expect(result).toEqual({
        allowed: true,
        limit: -1,
        remaining: -1,
      });
    });
  });

  describe('getOrganizationsByTier', () => {
    it('retrieves organizations by tier', async () => {
      const mockOrgs = [{ id: 'org-1' }, { id: 'org-2' }, { id: 'org-3' }];

      jest.spyOn(prisma.organization, 'findMany').mockResolvedValue(mockOrgs as any);

      const result = await service.getOrganizationsByTier('PROFESSIONAL');

      expect(result).toEqual(['org-1', 'org-2', 'org-3']);
      expect(prisma.organization.findMany).toHaveBeenCalledWith({
        where: {
          subscription: {
            path: ['plan'],
            equals: 'PROFESSIONAL',
          },
        },
        select: { id: true },
      });
    });
  });

  describe('getTierFeatures', () => {
    it('returns features for specified tier', () => {
      const features = service.getTierFeatures('PROFESSIONAL');

      expect(features).toEqual(SUBSCRIPTION_TIERS.PROFESSIONAL.features);
    });

    it('returns FREE features for invalid tier', () => {
      const features = service.getTierFeatures('INVALID' as any);

      expect(features).toEqual(SUBSCRIPTION_TIERS.FREE.features);
    });
  });

  describe('compareTiers', () => {
    it('detects upgrade', () => {
      expect(service.compareTiers('FREE', 'PROFESSIONAL')).toBe('upgrade');
      expect(service.compareTiers('PROFESSIONAL', 'ENTERPRISE')).toBe('upgrade');
    });

    it('detects downgrade', () => {
      expect(service.compareTiers('PROFESSIONAL', 'FREE')).toBe('downgrade');
      expect(service.compareTiers('ENTERPRISE', 'PROFESSIONAL')).toBe('downgrade');
    });

    it('detects same tier', () => {
      expect(service.compareTiers('FREE', 'FREE')).toBe('same');
      expect(service.compareTiers('PROFESSIONAL', 'PROFESSIONAL')).toBe('same');
      expect(service.compareTiers('ENTERPRISE', 'ENTERPRISE')).toBe('same');
    });
  });
});
