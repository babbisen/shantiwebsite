'use client';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLanguage } from '@/components/LanguageContext';
import { toast } from 'sonner';
import { CurrencyDollarIcon, TruckIcon, CalendarDaysIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { formatDate } from '@/lib/date';
import { getPickupDateStyles } from '@/lib/pickupColors';

interface OrderItemFromServer {
  itemName: string | null;
  quantity: number;
  unitPrice: number;
  total: number;
  inventoryItem?: { name: string } | null;
}

interface OrderFee {
  description: string;
  amount: number;
}

const titleTranslations = {
  en: 'Dashboard',
  eve: 'Ekpeye - Dashboard',
};

interface OrderFromServer {
  id: number;
  customerName: string;
  pickUpDate: string;
  deliveryDate: string;
  finalPrice?: number | null;
  items: OrderItemFromServer[];
  fees?: OrderFee[];
}

interface Order {
  id: number;
  customerName: string;
  pickUpDate: string;
  deliveryDate: string;
  finalPrice?: number | null;
  items: { itemName: string; quantity: number; unitPrice: number; total: number }[];
  fees: OrderFee[];
  phone?: string;
  email?: string;
}

const loadContactInfo = (): Record<number, { phone: string; email: string }> => {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem('orderContactInfo') || '{}');
  } catch {
    return {};
  }
};

const formatCurrency = (amount: number | null | undefined) => {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return '0,00 kr';
  }
  return `${new Intl.NumberFormat('nb-NO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)} kr`;
};

export default function DashboardPage() {
  const { language } = useLanguage();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissedReminders, setDismissedReminders] = useState<number[]>([]);
  const [processingOrderId, setProcessingOrderId] = useState<number | null>(null);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch('/api/orders');
      const data: OrderFromServer[] = await res.json();
      const contactData = loadContactInfo();
      const mapped: Order[] = data.map(o => ({
        id: o.id,
        customerName: o.customerName,
        pickUpDate: o.pickUpDate.slice(0, 10),
        deliveryDate: o.deliveryDate.slice(0, 10),
        finalPrice: o.finalPrice ?? undefined,
        items: o.items.map(i => ({
          itemName: i.itemName || i.inventoryItem?.name || 'Deleted Item',
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          total: i.total,
        })),
        fees: o.fees || [],
        phone: contactData[o.id]?.phone || '',
        email: contactData[o.id]?.email || '',
      }));
      setOrders(mapped);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = JSON.parse(localStorage.getItem('readyDismissed') || '[]');
      setDismissedReminders(Array.isArray(stored) ? stored : []);
    } catch {
      setDismissedReminders([]);
    }
  }, []);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const inFive = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + 5);
    return d;
  }, [today]);

  const currentlyOut = useMemo(
    () =>
      orders.filter(o => {
        const start = new Date(o.pickUpDate + 'T00:00:00');
        const end = new Date(o.deliveryDate + 'T00:00:00');
        return start < today && end >= today;
      }),
    [orders, today]
  );

  const upcomingPickups = useMemo(
    () =>
      orders
        .filter(o => {
          const start = new Date(o.pickUpDate + 'T00:00:00');
          return start >= today && start <= inFive;
        })
        .sort((a, b) =>
          new Date(a.pickUpDate).getTime() - new Date(b.pickUpDate).getTime()
        ),
    [orders, today, inFive]
  );

  const upcomingDeliveries = useMemo(
    () =>
      orders.filter(o => {
        const start = new Date(o.pickUpDate + 'T00:00:00');
        const end = new Date(o.deliveryDate + 'T00:00:00');
        return start < today && end >= today && end <= inFive;
      }),
    [orders, today, inFive]
  );

  const upcomingRevenue = useMemo(() => {
    return upcomingPickups.reduce((sum, order) => {
      if (typeof order.finalPrice === 'number') return sum + order.finalPrice;
      const itemsTotal = order.items.reduce((a, b) => a + b.total, 0);
      const feesTotal = order.fees.reduce((a, b) => a + b.amount, 0);
      return sum + itemsTotal + feesTotal;
    }, 0);
  }, [upcomingPickups]);

  const nextPickup = upcomingPickups[0];
  const showReadyReminder = useMemo(() => {
    if (!nextPickup) return false;
    const diffMs =
      new Date(nextPickup.pickUpDate + 'T00:00:00').getTime() - today.getTime();
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return days <= 1 && !dismissedReminders.includes(nextPickup.id);
  }, [nextPickup, today, dismissedReminders]);

  const dismissReminder = (id: number) => {
    const updated = [...dismissedReminders, id];
    setDismissedReminders(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('readyDismissed', JSON.stringify(updated));
    }
  };

  const handleCompleteOrder = useCallback(
    async (orderId: number) => {
      setProcessingOrderId(orderId);
      try {
        const res = await fetch(`/api/orders/${orderId}/complete`, {
          method: 'PATCH',
        });
        if (res.ok) {
          toast.success('Order marked as complete.');
          await fetchOrders();
        } else {
          toast.error('Failed to complete order');
        }
      } finally {
        setProcessingOrderId(null);
      }
    },
    [fetchOrders]
  );

  const renderOrder = (
    order: Order,
    colorize: boolean = true,
    highlightToday: boolean = false,
    showCompleteButton: boolean = false
  ) => {
    const pickupStyles = getPickupDateStyles(order.pickUpDate);
    const itemsTotal = order.items.reduce((a, b) => a + b.total, 0);
    const feesTotal = order.fees.reduce((a, b) => a + b.amount, 0);
    const calculatedTotal =
      typeof order.finalPrice === 'number' ? order.finalPrice : itemsTotal + feesTotal;
    return (
      <div key={order.id} className="bg-slate-800/70 backdrop-blur-sm rounded-2xl p-4 border border-slate-700/50 shadow-lg">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center">
          <div>
            <h3 className="text-lg font-bold text-white">{order.customerName}</h3>
            <div className="flex items-center gap-2 text-sm font-bold mt-1">
              <span className={`px-2 py-0.5 rounded-md ${colorize ? pickupStyles.bg : ''} ${colorize ? pickupStyles.text : ''}`}>{formatDate(order.pickUpDate)}</span>
              {highlightToday && (
                <span className="px-2 py-0.5 bg-red-600 text-white rounded-md text-xs">TODAY</span>
              )}
              <span className="text-slate-500">→</span>
              <span className="text-slate-400">{formatDate(order.deliveryDate)}</span>
            </div>
            {(order.phone || order.email) && (
              <p className="text-xs text-slate-400 font-medium mt-1">
                {order.phone && <span>📞 {order.phone}</span>}
                {order.phone && order.email && <span className="mx-1">|</span>}
                {order.email && <span>{order.email}</span>}
              </p>
            )}
          </div>
          <p className="text-sm font-bold text-white mt-2 sm:mt-0">{formatCurrency(calculatedTotal)}</p>
        </div>
        <ul className="mt-2 text-sm text-slate-300 list-disc list-inside space-y-1">
          {order.items.map((it, idx) => (
            <li key={idx}>{it.itemName} × {it.quantity}</li>
          ))}
        </ul>
        {showCompleteButton && (
          <div className="mt-3 flex justify-end">
            {processingOrderId === order.id ? (
              <div className="px-4 py-2 flex items-center gap-2 text-sm font-bold text-white">
                <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>
                Processing...
              </div>
            ) : (
              <button
                onClick={() => handleCompleteOrder(order.id)}
                disabled={!!processingOrderId}
                className="px-4 py-2 text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-green-600 rounded-lg shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Mark as Completed
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900 text-slate-200 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-slate-400 mb-4"></div>
          <div className="text-xl text-slate-400 font-medium">Loading Dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900 text-slate-200">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-3 tracking-tight">{titleTranslations[language]}</h1>
          <div className="w-24 h-1 bg-gradient-to-r from-indigo-400 to-purple-400 mx-auto rounded-full"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-slate-800/70 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50 shadow-lg">
            <div className="flex items-center"><div className="p-3 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 shadow-lg"><TruckIcon className="w-6 h-6 text-white" /></div><div className="ml-4"><p className="text-sm font-medium text-slate-400">Currently Out</p><p className="text-2xl font-bold text-white">{currentlyOut.length}</p></div></div>
          </div>
          <div className="bg-slate-800/70 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50 shadow-lg">
            <div className="flex items-center"><div className="p-3 rounded-full bg-gradient-to-r from-emerald-500 to-green-600 shadow-lg"><CalendarDaysIcon className="w-6 h-6 text-white" /></div><div className="ml-4"><p className="text-sm font-medium text-slate-400">Pick-ups Next 5 Days</p><p className="text-2xl font-bold text-white">{upcomingPickups.length}</p></div></div>
          </div>
          <div className="bg-slate-800/70 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50 shadow-lg">
            <div className="flex items-center"><div className="p-3 rounded-full bg-gradient-to-r from-purple-500 to-fuchsia-600 shadow-lg"><ArrowDownTrayIcon className="w-6 h-6 text-white" /></div><div className="ml-4"><p className="text-sm font-medium text-slate-400">Deliveries Next 5 Days</p><p className="text-2xl font-bold text-white">{upcomingDeliveries.length}</p></div></div>
          </div>
          <div className="bg-slate-800/70 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50 shadow-lg">
            <div className="flex items-center"><div className="p-3 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 shadow-lg"><CurrencyDollarIcon className="w-6 h-6 text-white" /></div><div className="ml-4"><p className="text-sm font-medium text-slate-400">Expected Revenue next 5 days</p><p className="text-2xl font-bold text-white">{formatCurrency(upcomingRevenue)}</p></div></div>
          </div>
        </div>
        {currentlyOut.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-white mt-8 mb-4">Orders Currently Out</h2>
            <div className="space-y-4">
              {currentlyOut.map(o => renderOrder(o))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {upcomingPickups.length > 0 && (
            <div>
              {showReadyReminder && nextPickup && (
                <div className="mb-4 p-4 bg-gradient-to-r from-indigo-700 via-purple-700 to-fuchsia-700 border border-indigo-700 rounded-xl flex items-center justify-between shadow-lg">
                  <p className="text-lg font-bold text-white">Have you remembered to ready the items for {nextPickup.customerName}?</p>
                  <button
                    onClick={() => dismissReminder(nextPickup.id)}
                    className="ml-4 px-3 py-1 bg-indigo-600 rounded-md text-white font-bold"
                  >
                    Yes
                  </button>
                </div>
              )}
              <h2 className="text-2xl font-bold text-white mt-8 mb-4">Upcoming Pick-ups</h2>
              <div className="space-y-4">
                {upcomingPickups.map(o =>
                  renderOrder(
                    o,
                    true,
                    new Date(o.pickUpDate + 'T00:00:00').getTime() ===
                      today.getTime()
                  )
                )}
              </div>
            </div>
          )}
          {upcomingDeliveries.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold text-white mt-8 mb-4">Upcoming Deliveries</h2>
              <div className="space-y-4">
                {upcomingDeliveries.map(o =>
                  renderOrder(
                    o,
                    false,
                    new Date(o.deliveryDate + 'T00:00:00').getTime() ===
                      today.getTime(),
                    true
                  )
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
