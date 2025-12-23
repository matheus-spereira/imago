import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const slug = searchParams.get('slug');

  if (!slug) return NextResponse.json({ error: 'Slug required' }, { status: 400 });

  const consultant = await prisma.consultantProfile.findFirst({
    where: { user: { email: session.user.email } },
    select: { id: true }
  });

  if (!consultant) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  const agent = await prisma.agent.findUnique({
    where: {
      consultantId_slug: {
        consultantId: consultant.id,
        slug: slug
      }
    },
    select: { id: true, name: true, slug: true }
  });

  if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 });

  return NextResponse.json(agent);
}