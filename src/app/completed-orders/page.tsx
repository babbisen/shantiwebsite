'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

// --- Types ---
type OrderItemFromServer = {
  itemName: string | null; // The snapshot field
  quantity: number;
  unitPrice: number;
  total: number;
  inventoryItem?: { name: string } | null; // The relation can be null
};

type OrderFee = {
  description: string;
  amount: number;
};

type Order = {
  id: number;
  customerName: string;
  deposit?: number;
  pickUpDate: string;
  deliveryDate: string;
  items: { 
    itemName: string; // This is the final, processed name for display
    quantity: number; 
    unitPrice: number; 
    total: number; 
  }[];
  fees: OrderFee[];
  finalPrice?: number | null;
  phone?: string;
  email?: string;
};

const loadContactInfo = (): Record<number, { phone: string; email: string }> => {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem('orderContactInfo') || '{}');
  } catch {
    return {};
  }
};

// --- HELPER FUNCTION for Currency ---
const formatCurrency = (amount: number | null | undefined) => {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return '0,00 kr';
  }
  const formattedAmount = new Intl.NumberFormat('nb-NO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `${formattedAmount} kr`;
};

export default function CompletedOrdersPage() {
  const [completedOrders, setCompletedOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingOrderId, setProcessingOrderId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const filteredOrders = completedOrders.filter(o =>
    o.customerName.toLowerCase().includes(search.toLowerCase())
  );

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const ordersRes = await fetch('/api/completed-orders');
      if (!ordersRes.ok) {
        throw new Error('Failed to fetch completed orders data.');
      }
      const ordersData = await ordersRes.json();
      
      const contactData = loadContactInfo();
      const mappedOrders = ordersData.map((order: any) => ({
        ...order,
        pickUpDate: new Date(order.pickUpDate).toLocaleDateString('nb-NO'),
        deliveryDate: new Date(order.deliveryDate).toLocaleDateString('nb-NO'),
        items: order.items.map((item: OrderItemFromServer) => ({
          // --- THIS IS THE KEY CHANGE ---
          // 1. Use the snapped `itemName` if it exists.
          // 2. Fall back to the live name from the relation.
          // 3. If the item was deleted, show a clear message.
          itemName: item.itemName || item.inventoryItem?.name || 'Deleted Item',
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total,
        })),
        fees: order.fees || [],
        phone: contactData[order.id]?.phone || '',
        email: contactData[order.id]?.email || '',
      }));
      setCompletedOrders(mappedOrders);
    } catch (error) {
      console.error("Failed to load completed orders:", error);
      alert("Could not load completed orders data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDeleteOrder = useCallback(async (orderId: number) => {
    setProcessingOrderId(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Order deleted.');
        await fetchData();
      } else {
        toast.error('Failed to delete order');
      }
    } finally {
      setProcessingOrderId(null);
    }
  }, [fetchData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-zinc-900">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-slate-400 mb-4"></div>
            <div className="text-xl text-slate-400 font-medium">Loading Completed Orders...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-zinc-900 text-slate-300">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-3 tracking-tight">
            Completed Order Archive
          </h1>
          <div className="w-24 h-1 bg-gradient-to-r from-indigo-500 to-blue-500 mx-auto rounded-full mb-6"></div>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search..."
            className="px-3 py-1 text-sm bg-slate-700 border border-slate-600 rounded-md placeholder-slate-400 text-white focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {completedOrders.length === 0 ? (
          <div className="bg-slate-800/70 backdrop-blur-sm rounded-2xl p-12 text-center border border-slate-700/50 shadow-xl">
            <p className="text-2xl font-semibold text-slate-200">No Completed Orders Found</p>
            <p className="text-slate-400 mt-2">When an order is marked as complete, it will appear here.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {filteredOrders.map(order => {
              const itemsTotal = order.items.reduce((sum, item) => sum + item.total, 0);
              const feesTotal = (order.fees || []).reduce((sum, fee) => sum + fee.amount, 0);
              const calculatedTotal = itemsTotal + feesTotal;

              return (
                <div key={order.id} className="bg-slate-800/70 backdrop-blur-sm rounded-2xl border border-slate-700/50 shadow-xl overflow-hidden">
                  <div className="p-6 border-b border-slate-700">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center">
                      <div>
                        <h2 className="text-2xl font-bold text-white">{order.customerName}</h2>
                        {(order.phone || order.email) && (
                          <p className="text-sm text-slate-400 font-medium mt-1">
                            {order.phone && <span>📞 {order.phone}</span>}
                            {order.phone && order.email && <span className="mx-2">|</span>}
                            {order.email && <span>{order.email}</span>}
                          </p>
                        )}
                      </div>
                      <p className="text-sm text-slate-400 font-medium mt-1 sm:mt-0">{order.pickUpDate} → {order.deliveryDate}</p>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="border-b-2 border-slate-700">
                          <tr>
                            <th className="py-2 px-2 text-left font-semibold text-slate-400 uppercase tracking-wider">Item / Fee</th>
                            <th className="py-2 px-2 text-center font-semibold text-slate-400 uppercase tracking-wider">Qty</th>
                            <th className="py-2 px-2 text-right font-semibold text-slate-400 uppercase tracking-wider">Unit Price / Amount</th>
                            <th className="py-2 px-2 text-right font-semibold text-slate-400 uppercase tracking-wider">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {order.items.map((item, idx) => (
                            <tr key={`item-${idx}`} className="border-b border-slate-700/50 hover:bg-slate-700/40 transition-colors">
                              <td className="py-3 px-2 font-semibold text-slate-200">{item.itemName}</td>
                              <td className="py-3 px-2 text-center text-slate-300">{item.quantity}</td>
                              <td className="py-3 px-2 text-right text-slate-300">{formatCurrency(item.unitPrice)}</td>
                              <td className="py-3 px-2 text-right font-semibold text-slate-200">{formatCurrency(item.total)}</td>
                            </tr>
                          ))}
                          {(order.fees || []).map((fee, idx) => (
                            <tr key={`fee-${idx}`} className="border-b border-cyan-800/20 bg-cyan-900/20 hover:bg-cyan-900/40 transition-colors">
                              <td className="py-3 px-2 font-semibold text-cyan-200">{fee.description}</td>
                              <td className="py-3 px-2 text-center text-cyan-300 font-style: italic">(Fee)</td>
                              <td className="py-3 px-2 text-right text-cyan-300">{formatCurrency(fee.amount)}</td>
                              <td className="py-3 px-2 text-right font-semibold text-cyan-200">{formatCurrency(fee.amount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-700 flex items-center">
                      {order.deposit && (
                        <div className="text-sm font-semibold text-emerald-300 bg-emerald-900/50 px-3 py-1 rounded-full">
                          Deposit Paid: {formatCurrency(order.deposit)}
                        </div>
                      )}
                      <div className="ml-auto flex items-center gap-3">
                        <div className="text-right">
                          {typeof order.finalPrice === 'number' ? (
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-bold text-purple-300 bg-purple-900/50 px-3 py-1 rounded-full">FINAL PRICE</span>
                              <span className="text-xl font-bold text-purple-300">{formatCurrency(order.finalPrice)}</span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-end">
                              <span className="text-xs text-slate-400 font-semibold">ORDER TOTAL</span>
                              <span className="text-xl font-bold text-white">
                                {formatCurrency(calculatedTotal)}
                              </span>
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => handleDeleteOrder(order.id)}
                          disabled={!!processingOrderId}
                          className="px-3 py-1 text-sm font-bold text-red-300 bg-red-900/50 hover:bg-red-900/80 rounded-lg transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  );
}