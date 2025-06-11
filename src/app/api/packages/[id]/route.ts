// src/app/api/packages/[id]/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const id = parseInt(params.id, 10);
  if (isNaN(id)) {
    return NextResponse.json({ error: 'Invalid package ID' }, { status: 400 });
  }

  try {
    const pkg = await prisma.packageTemplate.findUnique({ // FIX: Renamed to packageTemplate
      where: { id },
      include: {
        packageItems: {
          include: {
            inventoryItem: true,
          },
        },
      },
    });

    if (!pkg) {
      return NextResponse.json({ error: 'Package not found' }, { status: 404 });
    }

    return NextResponse.json(pkg, { status: 200 });
  } catch (error) {
    console.error(`Failed to fetch package ${id}:`, error);
    return NextResponse.json({ error: 'Failed to fetch package' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const id = parseInt(params.id, 10);
  if (isNaN(id)) {
    return NextResponse.json({ error: 'Invalid package ID' }, { status: 400 });
  }

  try {
    await prisma.packageTemplate.delete({ // FIX: Renamed to packageTemplate
      where: { id },
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error(`Failed to delete package ${id}:`, error);
    return NextResponse.json({ error: 'Failed to delete package' }, { status: 500 });
  }
}