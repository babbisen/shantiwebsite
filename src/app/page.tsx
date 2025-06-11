'use client';
import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';

type Item = {
  id: number;
  name: string;
  totalQuantity: number;
  pricePerItem: number;
  pricePaid: number;
  rentedOut: number;
  inStock: number;
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

export default function Home() {
  const [items, setItems] = useState<Item[]>([]);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ name: '', totalQuantity: '', pricePerItem: '', pricePaid: '' });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const filteredItems = items.filter(item => item.name.toLowerCase().includes(search.toLowerCase()));

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/inventory');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch inventory');
      setItems(data);
    } catch (error) {
      console.error(error);
      toast.error('Could not load inventory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setForm({ name: '', totalQuantity: '', pricePerItem: '', pricePaid: '' });
    setEditingId(null);
  };

  const handleAdd = async () => {
    if (!form.name.trim()) {
      toast.error("Item name is required.");
      return;
    }
    setIsProcessing(true);
    try {
      const payload = {
        name: form.name.trim(),
        totalQuantity: parseInt(form.totalQuantity, 10) || 0,
        pricePerItem: parseInt(form.pricePerItem, 10) || 0,
        pricePaid: parseInt(form.pricePaid, 10) || 0,
      };
      const res = await fetch('/api/inventory', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (res.ok) {
        toast.success("Item added successfully!");
        await fetchInventory();
        resetForm();
      } else {
        const errorData = await res.json();
        toast.error(errorData.error || 'Failed to add item');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEdit = (item: Item) => {
    setEditingId(item.id);
    setForm({ name: item.name, totalQuantity: String(item.totalQuantity), pricePerItem: String(item.pricePerItem), pricePaid: String(item.pricePaid) });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSave = async () => {
    if (editingId === null) return;
    setIsProcessing(true);
    try {
      const payload = {
        name: form.name.trim(),
        totalQuantity: parseInt(form.totalQuantity, 10) || 0,
        pricePerItem: parseInt(form.pricePerItem, 10) || 0,
        pricePaid: parseInt(form.pricePaid, 10) || 0,
      };
      const res = await fetch(`/api/inventory/${editingId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (res.ok) {
        toast.success("Changes saved successfully!");
        await fetchInventory();
        resetForm();
      } else {
        const errorData = await res.json();
        toast.error(errorData.error || 'Failed to save changes');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async (id: number) => {
    setIsProcessing(true); // Also show loading for delete
    try {
      const res = await fetch(`/api/inventory/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success("Item deleted successfully.");
        // Optimistically update UI, or refetch
        setItems(items.filter((item) => item.id !== id));
        if (editingId === id) resetForm();
      } else {
        const errorData = await res.json();
        toast.error(errorData.error);
      }
    } finally {
      setIsProcessing(false);
    }
  };
  
  const inputStyle = "w-full px-4 py-3 bg-slate-700/50 border-2 border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition font-semibold";
  const labelStyle = "block text-sm font-bold text-slate-300 mb-1";
  const primaryButton = "px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold rounded-xl shadow-lg hover:shadow-purple-500/30 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed";
  const secondaryButton = "px-6 py-3 bg-slate-700 text-slate-300 font-bold rounded-xl hover:bg-slate-600 hover:scale-105 transition-all duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed";

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-slate-400 mb-4"></div>
            <div className="text-xl text-slate-400 font-medium">Loading Inventory...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900 text-slate-200">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-3 tracking-tight">Inventory Management</h1>
          <div className="w-24 h-1 bg-gradient-to-r from-indigo-400 to-purple-400 mx-auto rounded-full"></div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-slate-800/70 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50 shadow-2xl">
            <div className="flex items-center"><div className="p-3 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 shadow-lg"><svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg></div><div className="ml-4"><p className="text-sm font-medium text-slate-400">Total Items</p><p className="text-2xl font-bold text-white">{items.length}</p></div></div>
          </div>
          <div className="bg-slate-800/70 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50 shadow-2xl">
            <div className="flex items-center"><div className="p-3 rounded-full bg-gradient-to-r from-emerald-500 to-green-600 shadow-lg"><svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div><div className="ml-4"><p className="text-sm font-medium text-slate-400">Items in Stock</p><p className="text-2xl font-bold text-white">{items.reduce((sum, item) => sum + item.inStock, 0)}</p></div></div>
          </div>
          <div className="bg-slate-800/70 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50 shadow-2xl">
            <div className="flex items-center"><div className="p-3 rounded-full bg-gradient-to-r from-orange-500 to-red-600 shadow-lg"><svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" /></svg></div><div className="ml-4"><p className="text-sm font-medium text-slate-400">Total Value</p><p className="text-2xl font-bold text-white">{formatCurrency(items.reduce((sum, item) => sum + item.pricePaid * item.totalQuantity, 0))}</p></div></div>
          </div>
        </div>

        <div className="bg-slate-800/70 backdrop-blur-sm rounded-2xl border border-slate-700/50 shadow-2xl overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-slate-700"><h2 className="text-xl font-bold text-white">{editingId ? 'Edit Item' : 'Add New Item'}</h2></div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <div className="space-y-2"><label htmlFor="name" className={labelStyle}>Item Name</label><input id="name" name="name" value={form.name} onChange={handleChange} placeholder="e.g., Tablecloth" autoComplete="off" className={inputStyle} /></div>
              <div className="space-y-2"><label htmlFor="totalQuantity" className={labelStyle}>Total Quantity</label><input id="totalQuantity" name="totalQuantity" type="number" value={form.totalQuantity} onChange={handleChange} min={0} className={inputStyle} /></div>
              <div className="space-y-2"><label htmlFor="pricePerItem" className={labelStyle}>Price per Item</label><input id="pricePerItem" name="pricePerItem" type="number" value={form.pricePerItem} onChange={handleChange} min={0} className={inputStyle} /></div>
              <div className="space-y-2"><label htmlFor="pricePaid" className={labelStyle}>Price Paid for Single Item</label><input id="pricePaid" name="pricePaid" type="number" value={form.pricePaid} onChange={handleChange} min={0} className={inputStyle} /></div>
            </div>
            <div className="flex items-center gap-4">
              {editingId ? (
                <>
                  <button onClick={handleSave} className={primaryButton} disabled={isProcessing}>{isProcessing ? <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin"></div> : 'Save Changes'}</button>
                  <button onClick={resetForm} className={secondaryButton} disabled={isProcessing}>Cancel</button>
                </>
              ) : (
                <button onClick={handleAdd} className={primaryButton} disabled={isProcessing}>{isProcessing ? <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin"></div> : 'Add Item'}</button>
              )}
            </div>
          </div>
        </div>

        <div className="bg-slate-800/70 backdrop-blur-sm rounded-2xl border border-slate-700/50 shadow-2xl overflow-hidden">
          <div className="flex justify-between items-center px-6 py-4 border-b border-slate-700">
            <h2 className="text-xl font-bold text-white">Current Inventory</h2>
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="px-3 py-1 text-sm bg-slate-700 border border-slate-600 rounded-md placeholder-slate-400 text-white focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-800/50"><tr className="border-b border-slate-700"><th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Item Name</th><th className="px-6 py-4 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">Total</th><th className="px-6 py-4 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">Rented</th><th className="px-6 py-4 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">In Stock</th><th className="px-6 py-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Price per Item</th><th className="px-6 py-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Price Paid for Single Item</th><th className="px-6 py-4 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th></tr></thead>
              <tbody className="divide-y divide-slate-700/50">
                {filteredItems.map((item, index) => (
                  <tr key={item.id} className="hover:bg-slate-700/40 transition-colors duration-200">
                    <td className="px-6 py-4 font-semibold text-slate-200">{item.name}</td>
                    <td className="px-6 py-4 text-center text-slate-300 font-medium">{item.totalQuantity}</td>
                    <td className="px-6 py-4 text-center text-slate-300 font-medium">{item.rentedOut}</td>
                    <td className={`px-6 py-4 text-center font-bold`}>
                      <span className={`px-3 py-1 rounded-full text-sm ${item.inStock > 0 ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'}`}>{item.inStock}</span>
                    </td>
                    <td className="px-6 py-4 text-right text-slate-300 font-medium">{formatCurrency(item.pricePerItem)}</td>
                    <td className="px-6 py-4 text-right text-slate-300 font-medium">{formatCurrency(item.pricePaid)}</td>
                    <td className="px-6 py-4"><div className="flex justify-center gap-2"><button onClick={() => handleEdit(item)} className="px-4 py-2 text-sm font-bold text-indigo-300 bg-indigo-900/50 hover:bg-indigo-900/80 rounded-lg transition-all shadow-sm">Edit</button><button onClick={() => handleDelete(item.id)} className="px-4 py-2 text-sm font-bold text-red-300 bg-red-900/50 hover:bg-red-900/80 rounded-lg transition-all shadow-sm">Delete</button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}