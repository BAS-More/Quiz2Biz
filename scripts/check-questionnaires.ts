import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const pts = await prisma.projectType.findMany({
    where: {
      slug: { in: ['idea-to-docs', 'technical-readiness'] }
    },
    include: {
      questionnaires: { where: { isActive: true } }
    }
  });

  console.log('Project Types with Questionnaires:');
  console.log(JSON.stringify(pts, null, 2));

  await prisma.$disconnect();
}

main().catch(console.error);
