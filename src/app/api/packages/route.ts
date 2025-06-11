// src/app/api/packages/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const packages = await prisma.packageTemplate.findMany({ // FIX: Renamed to packageTemplate
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(packages, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch packages:", error);
    return NextResponse.json({ error: 'Failed to fetch packages' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { name, items } = data;

    if (!name || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Package name and at least one item are required.' }, { status: 400 });
    }

    const newPackage = await prisma.$transaction(async (tx) => {
      const createdPackage = await tx.packageTemplate.create({ // FIX: Renamed to packageTemplate
        data: { name },
      });

      const packageItemsData = items.map(item => ({
        packageTemplateId: createdPackage.id, // FIX: Renamed field
        inventoryItemId: item.inventoryItemId,
        quantity: item.quantity,
      }));

      await tx.packageTemplateItem.createMany({ // FIX: Renamed to packageTemplateItem
        data: packageItemsData,
      });

      return createdPackage;
    });

    return NextResponse.json(newPackage, { status: 201 });
  } catch (error) {
    if (error instanceof Error && (error as any).code === 'P2002') {
      return NextResponse.json({ error: 'A package with this name already exists.' }, { status: 409 });
    }
    console.error("Failed to create package:", error);
    return NextResponse.json({ error: 'Failed to create package' }, { status: 500 });
  }
}