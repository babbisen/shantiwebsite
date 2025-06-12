'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { formatDate } from '@/lib/date';
import { getPickupDateStyles } from '@/lib/pickupColors';

interface OrderItemFromServer {
  itemName: string | null;
  quantity: number;
  inventoryItem?: { name: string } | null;
}

interface OrderFromServer {
  id: number;
  customerName: string;
  pickUpDate: string;
  deliveryDate: string;
  items: OrderItemFromServer[];
}

interface Order {
  id: number;
  customerName: string;
  pickUpDate: string;
  deliveryDate: string;
  items: { itemName: string; quantity: number }[];
}

export default function DashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/orders');
        const data: OrderFromServer[] = await res.json();
        const mapped: Order[] = data.map(o => ({
          id: o.id,
          customerName: o.customerName,
          pickUpDate: o.pickUpDate.slice(0, 10),
          deliveryDate: o.deliveryDate.slice(0, 10),
          items: o.items.map(i => ({
            itemName: i.itemName || i.inventoryItem?.name || 'Deleted Item',
            quantity: i.quantity,
          })),
        }));
        setOrders(mapped);
      } finally {
        setLoading(false);
      }
    };
    load();
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
        return start <= today && end >= today;
      }),
    [orders, today]
  );

  const upcomingPickups = useMemo(
    () =>
      orders.filter(o => {
        const start = new Date(o.pickUpDate + 'T00:00:00');
        return start > today && start <= inFive;
      }),
    [orders, today, inFive]
  );

  const upcomingDeliveries = useMemo(
    () =>
      orders.filter(o => {
        const start = new Date(o.pickUpDate + 'T00:00:00');
        const end = new Date(o.deliveryDate + 'T00:00:00');
        return start <= today && end >= today && end <= inFive;
      }),
    [orders, today, inFive]
  );

  const renderOrder = (order: Order) => {
    const pickupStyles = getPickupDateStyles(order.pickUpDate);
    return (
      <div key={order.id} className="bg-slate-800/70 backdrop-blur-sm rounded-2xl p-4 border border-slate-700/50 shadow-lg">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center">
          <div>
            <h3 className="text-lg font-bold text-white">{order.customerName}</h3>
            <div className="flex items-center gap-2 text-sm font-bold mt-1">
              <span className={`px-2 py-0.5 rounded-md ${pickupStyles.bg} ${pickupStyles.text}`}>{formatDate(order.pickUpDate)}</span>
              <span className="text-slate-500">→</span>
              <span className="text-slate-400">{formatDate(order.deliveryDate)}</span>
            </div>
          </div>
        </div>
        <ul className="mt-2 text-sm text-slate-300 list-disc list-inside space-y-1">
          {order.items.map((it, idx) => (
            <li key={idx}>{it.itemName} × {it.quantity}</li>
          ))}
        </ul>
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
          <h1 className="text-4xl font-bold text-white mb-3 tracking-tight">Dashboard</h1>
          <div className="w-24 h-1 bg-gradient-to-r from-indigo-400 to-purple-400 mx-auto rounded-full"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-800/70 backdrop-blur-sm rounded-2xl p-4 border border-slate-700/50 shadow-lg flex items-center justify-between">
            <p className="text-sm font-medium text-slate-400">Currently Out</p>
            <p className="text-2xl font-bold text-white">{currentlyOut.length}</p>
          </div>
          <div className="bg-slate-800/70 backdrop-blur-sm rounded-2xl p-4 border border-slate-700/50 shadow-lg flex items-center justify-between">
            <p className="text-sm font-medium text-slate-400">Pick-ups Next 5 Days</p>
            <p className="text-2xl font-bold text-white">{upcomingPickups.length}</p>
          </div>
          <div className="bg-slate-800/70 backdrop-blur-sm rounded-2xl p-4 border border-slate-700/50 shadow-lg flex items-center justify-between">
            <p className="text-sm font-medium text-slate-400">Deliveries Next 5 Days</p>
            <p className="text-2xl font-bold text-white">{upcomingDeliveries.length}</p>
          </div>
        </div>
        {currentlyOut.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-white mt-8 mb-4">Orders Currently Out</h2>
            <div className="space-y-4">
              {currentlyOut.map(renderOrder)}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {upcomingPickups.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold text-white mt-8 mb-4">Upcoming Pick-ups</h2>
              <div className="space-y-4">
                {upcomingPickups.map(renderOrder)}
              </div>
            </div>
          )}
          {upcomingDeliveries.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold text-white mt-8 mb-4">Upcoming Deliveries</h2>
              <div className="space-y-4">
                {upcomingDeliveries.map(renderOrder)}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
