'use client';
import React, { useState, useEffect } from 'react';

interface OrderItem {
  itemName: string | null;
  quantity: number;
}
interface Order {
  id: number;
  customerName: string;
  pickUpDate: string;
  deliveryDate: string;
  items: OrderItem[];
}

export default function DashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/orders')
      .then(res => res.json())
      .then(data => {
        const transformed = data.map((o: any) => ({
          ...o,
          pickUpDate: o.pickUpDate.slice(0, 10),
          deliveryDate: o.deliveryDate.slice(0, 10),
          items: o.items.map((it: any) => ({ itemName: it.itemName || it.inventoryItem?.name || 'Deleted Item', quantity: it.quantity })),
        }));
        setOrders(transformed);
        setLoading(false);
      });
  }, []);

  const today = new Date();
  today.setHours(0,0,0,0);
  const fiveDaysLater = new Date(today);
  fiveDaysLater.setDate(today.getDate() + 5);

  const isBetween = (dateStr: string, start: Date, end: Date) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d >= start && d <= end;
  };

  const ordersOut = orders.filter(o => new Date(o.pickUpDate) <= today && new Date(o.deliveryDate) >= today);
  const upcomingOrders = orders.filter(o => new Date(o.pickUpDate) > today && isBetween(o.pickUpDate, today, fiveDaysLater));
  const upcomingReturns = orders.filter(o => new Date(o.deliveryDate) >= today && isBetween(o.deliveryDate, today, fiveDaysLater));

  const sectionClass = 'bg-slate-800/70 backdrop-blur-sm rounded-2xl border border-slate-700/50 shadow-xl p-6';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900 text-slate-200">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-3 tracking-tight">Dashboard Overview</h1>
          <div className="w-24 h-1 bg-gradient-to-r from-indigo-400 to-purple-400 mx-auto rounded-full"></div>
        </div>
        {loading ? (
          <div className="text-center py-20 text-slate-300">Loading orders...</div>
        ) : (
          <div className="space-y-10">
            <section className={sectionClass}>
              <h2 className="text-xl font-bold text-white mb-4">Orders Out Now</h2>
              {ordersOut.length === 0 ? <p className="text-slate-400">None</p> : (
                <ul className="space-y-3">
                  {ordersOut.map(o => (
                    <li key={o.id} className="bg-slate-700/50 p-4 rounded-lg">
                      <div className="font-bold text-lg text-white">{o.customerName}</div>
                      <p className="text-sm text-slate-400 mb-1">{o.pickUpDate} → {o.deliveryDate}</p>
                      <p className="text-sm text-slate-300">Items: {o.items.map(it => `${it.itemName} x${it.quantity}`).join(', ')}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className={sectionClass}>
              <h2 className="text-xl font-bold text-white mb-4">Upcoming Pick-ups (next 5 days)</h2>
              {upcomingOrders.length === 0 ? <p className="text-slate-400">None</p> : (
                <ul className="space-y-3">
                  {upcomingOrders.map(o => (
                    <li key={o.id} className="bg-slate-700/50 p-4 rounded-lg">
                      <div className="font-bold text-lg text-white">{o.customerName}</div>
                      <p className="text-sm text-slate-400 mb-1">{o.pickUpDate} → {o.deliveryDate}</p>
                      <p className="text-sm text-slate-300">Items: {o.items.map(it => `${it.itemName} x${it.quantity}`).join(', ')}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className={sectionClass}>
              <h2 className="text-xl font-bold text-white mb-4">Upcoming Returns (next 5 days)</h2>
              {upcomingReturns.length === 0 ? <p className="text-slate-400">None</p> : (
                <ul className="space-y-3">
                  {upcomingReturns.map(o => (
                    <li key={o.id} className="bg-slate-700/50 p-4 rounded-lg">
                      <div className="font-bold text-lg text-white">{o.customerName}</div>
                      <p className="text-sm text-slate-400 mb-1">{o.pickUpDate} → {o.deliveryDate}</p>
                      <p className="text-sm text-slate-300">Items: {o.items.map(it => `${it.itemName} x${it.quantity}`).join(', ')}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
