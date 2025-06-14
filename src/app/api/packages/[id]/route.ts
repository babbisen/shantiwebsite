// src/app/api/packages/[id]/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';


export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsedId = parseInt(id, 10);
  if (isNaN(parsedId)) {
    return NextResponse.json({ error: 'Invalid package ID' }, { status: 400 });
  }

  try {
    const pkg = await prisma.packageTemplate.findUnique({ // FIX: Renamed to packageTemplate
      where: { id: parsedId },
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
    console.error(`Failed to fetch package ${parsedId}:`, error);
    return NextResponse.json({ error: 'Failed to fetch package' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsedId = parseInt(id, 10);
  if (isNaN(parsedId)) {
    return NextResponse.json({ error: 'Invalid package ID' }, { status: 400 });
  }

  try {
    await prisma.packageTemplate.delete({ // FIX: Renamed to packageTemplate
      where: { id: parsedId },
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error(`Failed to delete package ${parsedId}:`, error);
    return NextResponse.json({ error: 'Failed to delete package' }, { status: 500 });
  }
}