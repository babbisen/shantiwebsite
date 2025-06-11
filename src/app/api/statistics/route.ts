// src/app/api/statistics/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const completedOrders = await prisma.order.findMany({ 
      where: { completed: true }, 
      include: { 
        items: { 
          include: { 
            inventoryItem: {
              select: { name: true, pricePaid: true, totalQuantity: true }
            }
          } 
        },
        fees: true
      } 
    });

    if (completedOrders.length === 0) {
      return NextResponse.json({
        kpis: { totalLifetimeSales: 0, totalSalesThisMonth: 0, totalSalesThisYear: 0, averageOrderValue: 0 },
        salesByItem: [], 
        monthlySales: {}, 
        top10ByValue: [], 
        top10ByFrequency: []
      });
    }
    
    const now = new Date();
    let totalLifetimeSales = 0, totalSalesThisMonth = 0, totalSalesThisYear = 0;

    completedOrders.forEach(order => {
        const itemsTotal = order.items.reduce((sum, item) => sum + item.total, 0);
        const feesTotal = (order.fees || []).reduce((sum, fee) => sum + fee.amount, 0);
        const calculatedTotal = itemsTotal + feesTotal;
        const orderTotal = order.finalPrice ?? calculatedTotal;
        
        totalLifetimeSales += orderTotal;
        const deliveryDate = new Date(order.deliveryDate);
        if (deliveryDate.getFullYear() === now.getFullYear() && deliveryDate.getMonth() === now.getMonth()) {
          totalSalesThisMonth += orderTotal;
        }
        if (deliveryDate.getFullYear() === now.getFullYear()) {
          totalSalesThisYear += orderTotal;
        }
    });

    // --- KEY CHANGE: Group sales by itemName (string) instead of inventoryItemId (number) ---
    const salesByItemMap = new Map<string, { totalSales: number, pricePaidPerItem: number, quantity: number }>();
    completedOrders.forEach(order => {
      if (order.finalPrice === null || order.finalPrice === undefined) {
        order.items.forEach(item => {
          // Use the robust fallback logic for the name
          const itemName = item.itemName || item.inventoryItem?.name;
          if (!itemName) return; // Skip if item name is not available

          const pricePaidPerItem = item.inventoryItem?.pricePaid || 0;
          const quantity = item.inventoryItem?.totalQuantity || 0;
          const current = salesByItemMap.get(itemName);
          const itemTotal = item.specialPrice ?? item.total;
          if (!current) {
            salesByItemMap.set(itemName, { totalSales: itemTotal, pricePaidPerItem, quantity });
          } else {
            salesByItemMap.set(itemName, {
              totalSales: current.totalSales + itemTotal,
              pricePaidPerItem: current.pricePaidPerItem,
              quantity: current.quantity,
            });
          }
        });
      }
    });

    const allSalesByItem = Array.from(salesByItemMap.entries()).map(([itemName, data]) => {
        const totalInvestment = data.pricePaidPerItem * data.quantity;
        const roi = totalInvestment > 0 ? (data.totalSales / totalInvestment) * 100 : 0;
        return { itemName, totalSales: data.totalSales, roi: parseFloat(roi.toFixed(2)) };
    }).filter(item => item.totalSales > 0);
    
    const sortedSalesByItem = [...allSalesByItem].sort((a, b) => b.totalSales - a.totalSales);
    const top10ByValue = sortedSalesByItem.slice(0, 10);
    const salesByItem = sortedSalesByItem; // Return all items for the table

    const monthlySales: { [year: string]: number[] } = {};
    completedOrders.forEach(order => {
        const deliveryDate = new Date(order.deliveryDate);
        const year = deliveryDate.getFullYear().toString();
        const month = deliveryDate.getMonth();
        if (!monthlySales[year]) monthlySales[year] = Array(12).fill(0);
        
        const itemsTotal = order.items.reduce((sum, item) => sum + item.total, 0);
        const feesTotal = (order.fees || []).reduce((sum, fee) => sum + fee.amount, 0);
        const calculatedTotal = itemsTotal + feesTotal;
        const orderTotal = order.finalPrice ?? calculatedTotal;

        monthlySales[year][month] += orderTotal;
    });

    const formattedMonthlySales = Object.entries(monthlySales).reduce((acc, [year, sales]) => {
        acc[year] = sales.map((sale, i) => ({ month: i + 1, sales: sale }));
        return acc;
    }, {} as { [key: string]: any });

    // --- KEY CHANGE: Use robust itemName for frequency counting ---
    const frequencyMap = new Map<string, number>();
    completedOrders.forEach(order => {
        const uniqueItemsInOrder = new Set<string>();
        order.items.forEach(item => {
            const itemName = item.itemName || item.inventoryItem?.name;
            if (itemName) {
                uniqueItemsInOrder.add(itemName);
            }
        });
        
        uniqueItemsInOrder.forEach(itemName => {
            frequencyMap.set(itemName, (frequencyMap.get(itemName) || 0) + 1);
        });
    });
    
    const top10ByFrequency = Array.from(frequencyMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return NextResponse.json({
      kpis: { totalLifetimeSales, totalSalesThisMonth, totalSalesThisYear, averageOrderValue: completedOrders.length > 0 ? totalLifetimeSales / completedOrders.length : 0 },
      salesByItem,
      monthlySales: formattedMonthlySales, 
      top10ByValue, 
      top10ByFrequency,
    });

  } catch (error) {
    console.error("Stats API Error:", error);
    return NextResponse.json({ error: 'Failed to generate statistics' }, { status: 500 });
  }
}