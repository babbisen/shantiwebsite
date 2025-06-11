// prisma/seed.ts

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');

const prisma = new PrismaClient();

// Helper function to read and parse a CSV file
function parseCSV(fileName: string) {
  const csvFilePath = path.join(__dirname, fileName);
  const csvFileContent = fs.readFileSync(csvFilePath, 'utf8');
  const parsed = Papa.parse(csvFileContent, {
    header: true, // Uses the first row as keys
    skipEmptyLines: true, // Ignores empty lines
  });
  return parsed.data;
}

async function main() {
  console.log('--- Starting the database seed process ---');

  // 1. DELETE ALL EXISTING DATA (in the correct order)
  console.log('Step 1: Deleting existing data...');
  await prisma.packageTemplateItem.deleteMany({});
  await prisma.packageTemplate.deleteMany({});
  await prisma.specialPrice.deleteMany({});
  await prisma.orderFee.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.inventoryItem.deleteMany({});
  console.log('✅ Existing data deleted successfully.');

  // 2. SEED THE INVENTORY
  console.log('\nStep 2: Seeding inventory items...');
  const inventoryItems = parseCSV('inventory_corrected.csv');

  for (const item of inventoryItems) {
    await prisma.inventoryItem.create({
      data: {
        name: item.name,
        totalQuantity: parseInt(item.totalquantity, 10) || 0,
        pricePerItem: parseInt(item.priceperitem, 10) || 0,
        pricePaid: parseInt(item.pricepaid, 10) || 0,
      },
    });
  }
  console.log(`✅ Seeded ${inventoryItems.length} inventory items.`);

  const inventoryMap = new Map();
  const allInventory = await prisma.inventoryItem.findMany();
  for (const item of allInventory) {
    inventoryMap.set(item.name, item.id);
  }

  // 3. SEED THE COMPLETED ORDERS
  console.log('\nStep 3: Seeding completed orders...');
  const orderRows = parseCSV('orders_corrected.csv');
  const groupedOrders = new Map();

  for (const row of orderRows) {
    const orderKey = `${row.customername}_${row.pickupdate}`;
    const inventoryItemId = inventoryMap.get(row.itemname);

    if (!inventoryItemId) {
      console.warn(`⚠️  Skipping item "${row.itemname}" because it was not found in the inventory file.`);
      continue;
    }

    if (!groupedOrders.has(orderKey)) {
      groupedOrders.set(orderKey, {
        customerName: row.customername,
        pickUpDate: new Date(row.pickupdate),
        deliveryDate: new Date(row.deliverydate),
        finalPrice: row.finalprice ? parseInt(row.finalprice, 10) : null,
        items: [],
      });
    }

    const quantity = parseInt(row.quantity, 10) || 1;
    const lineItemTotal = parseInt(row.unitprice, 10) || 0;
    const actualUnitPrice = quantity > 0 ? Math.round(lineItemTotal / quantity) : 0;

    groupedOrders.get(orderKey).items.push({
      inventoryItemId: inventoryItemId,
      itemName: row.itemname, // This is the key addition
      quantity: quantity,
      unitPrice: actualUnitPrice,
      total: lineItemTotal,
    });
  }

  for (const order of groupedOrders.values()) {
    await prisma.order.create({
      data: {
        customerName: order.customerName,
        pickUpDate: order.pickUpDate,
        deliveryDate: order.deliveryDate,
        finalPrice: order.finalPrice,
        completed: true,
        items: {
          create: order.items,
        },
      },
    });
  }
  console.log(`✅ Seeded ${groupedOrders.size} unique completed orders.`);
  console.log('\n--- Database seed process finished successfully! ---');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });