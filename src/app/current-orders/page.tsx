'use client';
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useLanguage } from '@/components/LanguageContext';
import { formatDate } from '@/lib/date';
import { getPickupDateStyles } from '@/lib/pickupColors';
import { toast } from 'sonner';

// --- Types ---
type InventoryItem = { id: number; name: string; totalQuantity: number; pricePerItem: number; };
type OrderItemFromServer = {
  id: number;
  itemName: string | null;
  quantity: number;
  unitPrice: number;
  total: number;
  specialPrice?: number;
  inventoryItemId: number | null;
  inventoryItem?: { name: string } | null;
};
type OrderFromServer = { id: number; customerName: string; deposit?: number; pickUpDate: string; deliveryDate: string; items: OrderItemFromServer[]; fees: OrderFee[]; finalPrice?: number | null; };

type OrderItemState = { itemId: number | null; itemName:string; quantity: number; unitPrice: number; total: number; specialPrice?: number; };
type OrderFee = { description: string; amount: number; };
type OrderState = {
  id: number;
  customerName: string;
  deposit?: number;
  pickUpDate: string;
  deliveryDate: string;
  items: OrderItemState[];
  fees: OrderFee[];
  finalPrice?: number | null;
  phone?: string;
  email?: string;
};

type SpecialPrice = { id: number; customerName: string; itemName: string; price: number; };
type AvailabilityInfo = { available: number; message: string; status: 'available' | 'unavailable' | 'checking' | 'error' | 'idle'; };

const loadContactInfo = (): Record<number, { phone: string; email: string }> => {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem('orderContactInfo') || '{}');
  } catch {
    return {};
  }
};

const saveContactInfo = (info: Record<number, { phone: string; email: string }>) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('orderContactInfo', JSON.stringify(info));
  }
};

// --- HELPER FUNCTION for Currency ---
const formatCurrency = (amount: number | null | undefined) => {
  if (typeof amount !== 'number' || isNaN(amount)) { return '0.00 kr'; }
  return `${new Intl.NumberFormat('nb-NO', { minimumFractionDigits: 2, maximumFractionDigits: 2, }).format(amount)} kr`;
};

const StockStatus = ({ info }: { info: AvailabilityInfo }) => {
  const baseStyle = "mt-3 px-4 py-3 rounded-lg text-center font-bold transition-all duration-300 shadow-sm";
  switch (info.status) {
    case 'checking': return (<div className={`${baseStyle} bg-indigo-900 text-indigo-300 border border-indigo-700`}><div className="flex items-center justify-center gap-2"><div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>Checking availability...</div></div>);
    case 'available': return (<div className={`${baseStyle} bg-green-900/50 text-green-300 border border-green-700`}><div className="flex items-center justify-center gap-2"><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>{info.message}</div></div>);
    case 'unavailable': return (<div className={`${baseStyle} bg-red-900/50 text-red-300 border border-red-700`}><div className="flex items-center justify-center gap-2"><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>{info.message}</div></div>);
    case 'error': return (<div className={`${baseStyle} bg-red-900/50 text-red-300 border border-red-700`}><div className="flex items-center justify-center gap-2"><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>Error checking stock</div></div>);
    default: return <div className="h-[55px] mt-3"></div>;
  }
};

const titleTranslations = {
  en: 'Order Management',
  eve: 'Ðoɖo si dzi woato akpɔ egbɔ',
};

export default function CurrentOrdersPage() {
  const { language } = useLanguage();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [orders, setOrders] = useState<OrderState[]>([]);
  const [specialPrices, setSpecialPrices] = useState<SpecialPrice[]>([]);
  const [editingOrderId, setEditingOrderId] = useState<number | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [deposit, setDeposit] = useState('');
  const [finalPrice, setFinalPrice] = useState('');
  const [pickUpDate, setPickUpDate] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [orderItems, setOrderItems] = useState<OrderItemState[]>([]);
  const [itemSearch, setItemSearch] = useState('');
  const [quantity, setQuantity] = useState('');
  const [specialPriceCustomer, setSpecialPriceCustomer] = useState('');
  const [specialPriceItem, setSpecialPriceItem] = useState('');
  const [specialPriceValue, setSpecialPriceValue] = useState('');
  const [language, setLanguage] = useState<'en' | 'no'>('en');
  const [availabilityInfo, setAvailabilityInfo] = useState<AvailabilityInfo>({ available: 0, message: '', status: 'idle' });
  const [processingOrderId, setProcessingOrderId] = useState<number | null | string>(null);
  const [isSpecialPriceLoading, setIsSpecialPriceLoading] = useState(false);
  
  const [orderFees, setOrderFees] = useState<OrderFee[]>([]);
  const [feeDescription, setFeeDescription] = useState('');
  const [feeAmount, setFeeAmount] = useState('');

  const ordersToday = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return orders.filter(o => {
      const d = new Date(o.pickUpDate + 'T00:00:00');
      return d.getTime() === today.getTime();
    }).length;
  }, [orders]);

  const ordersTomorrow = useMemo(() => {
    const tomorrow = new Date();
    tomorrow.setHours(0, 0, 0, 0);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return orders.filter(o => {
      const d = new Date(o.pickUpDate + 'T00:00:00');
      return d.getTime() === tomorrow.getTime();
    }).length;
  }, [orders]);

  const ordersThisWeek = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);
    return orders.filter(o => {
      const d = new Date(o.pickUpDate + 'T00:00:00');
      return d >= today && d <= weekEnd;
    }).length;
  }, [orders]);

  const resetForm = useCallback(() => {
    setEditingOrderId(null);
    setCustomerName('');
    setDeposit('');
    setFinalPrice('');
    setPickUpDate('');
    setDeliveryDate('');
    setPhone('');
    setEmail('');
    setOrderItems([]);
    setItemSearch('');
    setQuantity('');
    setOrderFees([]);
    setFeeDescription('');
    setFeeAmount('');
  }, []);

  const reloadData = useCallback(async () => {
    try {
      const [invRes, ordRes, spRes] = await Promise.all([ fetch('/api/inventory'), fetch('/api/orders'), fetch('/api/special-price') ]);
      const inventoryData = await invRes.json();
      const ordersData: OrderFromServer[] = await ordRes.json();
      const spData = await spRes.json();
      
      setInventory(inventoryData);
      setSpecialPrices(spData);
      
      const contactData = loadContactInfo();
      const transformedOrders = ordersData.map((order) => ({
        ...order,
        pickUpDate: order.pickUpDate.slice(0, 10),
        deliveryDate: order.deliveryDate.slice(0, 10),
        items: order.items.map((item) => ({
          itemId: item.inventoryItemId,
          itemName: item.itemName || item.inventoryItem?.name || 'Deleted Item',
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total,
          specialPrice: item.specialPrice,
        })),
        fees: order.fees || [],
        phone: contactData[order.id]?.phone || '',
        email: contactData[order.id]?.email || '',
      }));
      setOrders(transformedOrders);

    } catch (error) { 
      console.error("Failed to reload data:", error); 
      toast.error("Failed to load page data. Please refresh.");
    }
  }, []);

  useEffect(() => { reloadData(); }, [reloadData]);

  const checkAvailability = useCallback(async (itemId: number, qty: number) => {
    if (!itemId || !qty || !pickUpDate || !deliveryDate) { setAvailabilityInfo({ available: 0, message: '', status: 'idle' }); return; }
    setAvailabilityInfo({ available: 0, message: '', status: 'checking' });
    try {
      const res = await fetch('/api/inventory/availability', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ inventoryItemId: itemId, pickUpDate, deliveryDate, editingOrderId: editingOrderId || undefined, }), });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const totalStock = inventory.find(inv => inv.id === itemId)?.totalQuantity || 0;
      const available = totalStock - data.rentedOut;
      setAvailabilityInfo({ available, status: qty <= available ? 'available' : 'unavailable', message: `${available} available for these dates.` });
    } catch (error) { console.error(error); setAvailabilityInfo({ available: 0, message: '', status: 'error' }); }
  }, [pickUpDate, deliveryDate, editingOrderId, inventory]);

  const selectedItem = useMemo(() => inventory.find(i => i.name.toLowerCase() === itemSearch.trim().toLowerCase()), [inventory, itemSearch]);

  useEffect(() => {
    if (selectedItem && quantity) { checkAvailability(selectedItem.id, Number(quantity)); }
    else { setAvailabilityInfo({ available: 0, message: '', status: 'idle' }); }
  }, [selectedItem, quantity, checkAvailability]);

  function getItemPrice(customer: string, item: InventoryItem): number { const special = specialPrices.find(sp => sp.customerName.trim().toLowerCase() === customer.trim().toLowerCase() && sp.itemName === item.name); return special ? special.price : item.pricePerItem; }
  function handleAddItem() { if (!selectedItem || !quantity || availabilityInfo.status !== 'available') return; const qty = Number(quantity); if (qty > availabilityInfo.available) { toast.warning("Cannot add more items than are available."); return; } const unitPrice = getItemPrice(customerName, selectedItem); setOrderItems([...orderItems, { itemId: selectedItem.id, itemName: selectedItem.name, quantity: qty, unitPrice, total: unitPrice * qty, specialPrice: unitPrice !== selectedItem.pricePerItem ? unitPrice : undefined }]); setItemSearch(''); setQuantity(''); }
  function handleRemoveOrderItem(idx: number) { setOrderItems(orderItems.filter((_, i) => i !== idx)); }

  function handleAddFee() { if (!feeDescription.trim() || !feeAmount) return; setOrderFees([...orderFees, { description: feeDescription.trim(), amount: Number(feeAmount) }]); setFeeDescription(''); setFeeAmount(''); }
  function handleRemoveFee(idx: number) { setOrderFees(orderFees.filter((_, i) => i !== idx)); }

  const handleSaveOrder = useCallback(async () => {
    if (!customerName.trim() || !pickUpDate || !deliveryDate) { 
      toast.error("Customer Name, Pick-up Date, and Delivery Date are required."); 
      return; 
    }
    const idToProcess = editingOrderId || 'new-order';
    setProcessingOrderId(idToProcess);
    try {
      const payload = {
        customerName: customerName.trim(),
        deposit: deposit ? Number(deposit) : undefined,
        finalPrice: finalPrice ? Number(finalPrice) : undefined,
        pickUpDate,
        deliveryDate,
        items: orderItems.map(oi => ({ ...oi, itemId: oi.itemId })),
        fees: orderFees,
      };
      const url = editingOrderId ? `/api/orders/${editingOrderId}` : '/api/orders';
      const method = editingOrderId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = editingOrderId ? { id: editingOrderId } : await res.json();
        const contactData = loadContactInfo();
        contactData[data.id] = { phone, email };
        saveContactInfo(contactData);
        toast.success(editingOrderId ? 'Order updated successfully!' : 'Order created successfully!');
        await reloadData();
        resetForm();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to save order');
      }
    } finally {
      setProcessingOrderId(null);
    }
  }, [customerName, pickUpDate, deliveryDate, editingOrderId, deposit, finalPrice, orderItems, orderFees, phone, email, reloadData, resetForm]);

  const handleDeleteOrder = useCallback(async (orderId: number) => { 
    setProcessingOrderId(orderId); 
    try { 
      const res = await fetch(`/api/orders/${orderId}`, { method: 'DELETE' }); 
      if (res.ok) { 
        toast.success('Order deleted.');
        await reloadData(); 
        if (editingOrderId === orderId) resetForm(); 
      } else { 
        toast.error('Failed to delete order'); 
      } 
    } finally { 
      setProcessingOrderId(null); 
    } 
  }, [editingOrderId, reloadData, resetForm]);

  const handleCompleteOrder = useCallback(async (orderId: number) => { 
    setProcessingOrderId(orderId); 
    try { 
      const res = await fetch(`/api/orders/${orderId}/complete`, { method: 'PATCH' }); 
      if (res.ok) { 
        toast.success('Order marked as complete.');
        await reloadData(); 
      } else { 
        toast.error('Failed to complete order'); 
      } 
    } finally { 
      setProcessingOrderId(null); 
    } 
  }, [reloadData]);
  
  const handleEditOrder = useCallback((order: OrderState) => {
    setEditingOrderId(order.id);
    setCustomerName(order.customerName);
    setDeposit(order.deposit?.toString() || '');
    setFinalPrice(order.finalPrice?.toString() || '');
    setPickUpDate(order.pickUpDate);
    setDeliveryDate(order.deliveryDate);
    setPhone(order.phone || '');
    setEmail(order.email || '');
    setOrderItems(order.items);
    setOrderFees(order.fees || []);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleAddSpecialPrice = useCallback(async () => { 
    if (!specialPriceCustomer || !specialPriceItem || !specialPriceValue) {
      toast.error("Please select a customer, item, and enter a price.");
      return;
    }
    setIsSpecialPriceLoading(true);
    try {
      const res = await fetch('/api/special-price', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ customerName: specialPriceCustomer, itemName: specialPriceItem, price: Number(specialPriceValue) }) }); 
      if (res.ok) { 
        toast.success('Special price saved.');
        await reloadData(); 
        setSpecialPriceCustomer(''); 
        setSpecialPriceItem(''); 
        setSpecialPriceValue(''); 
      } else { 
        toast.error('Failed to save special price'); 
      }
    } finally {
      setIsSpecialPriceLoading(false);
    }
  }, [specialPriceCustomer, specialPriceItem, specialPriceValue, reloadData]);

  const handleDeleteSpecialPrice = useCallback(async (id: number) => { 
    setIsSpecialPriceLoading(true);
    try {
      const res = await fetch(`/api/special-price/${id}`, { method: 'DELETE' }); 
      if (res.ok) { 
        toast.success('Special price deleted.');
        await reloadData(); 
      } else { 
        toast.error('Failed to delete special price'); 
      } 
    } finally {
      setIsSpecialPriceLoading(false);
    }
  }, [reloadData]);
  
  const currentCustomerNames = Array.from(new Set(orders.map(o => o.customerName))).sort();
  const filteredItems = useMemo(() => inventory.filter(item => item.name.toLowerCase().includes(itemSearch.toLowerCase())).sort((a, b) => a.name.localeCompare(b.name)), [itemSearch, inventory]);

  const calculatedTotal = useMemo(() => {
    const itemsTotal = orderItems.reduce((acc, item) => acc + item.total, 0);
    const feesTotal = orderFees.reduce((acc, fee) => acc + fee.amount, 0);
    return itemsTotal + feesTotal;
  }, [orderItems, orderFees]);
  
  const specialPriceItemsList = useMemo(() => {
    if (!specialPriceCustomer) {
      return inventory.slice().sort((a, b) => a.name.localeCompare(b.name));
    }
    const customerItemNames = new Set<string>();
    orders
      .filter(order => order.customerName === specialPriceCustomer)
      .forEach(order => {
        order.items.forEach(item => {
          customerItemNames.add(item.itemName);
        });
      });
    const uniqueItemNames = Array.from(customerItemNames);
    if (uniqueItemNames.length === 0) {
      return inventory.slice().sort((a, b) => a.name.localeCompare(b.name));
    }
    const filteredInventory = inventory.filter(invItem => uniqueItemNames.includes(invItem.name));
    return filteredInventory.sort((a, b) => a.name.localeCompare(b.name));
  }, [specialPriceCustomer, orders, inventory]);

  useEffect(() => {
    setSpecialPriceItem('');
  }, [specialPriceCustomer]);
  
  const inputStyle = "w-full px-4 py-3 bg-slate-700/50 border-2 border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition font-semibold disabled:opacity-50";
  const labelStyle = "block text-sm font-bold text-slate-300 mb-1";
  const primaryButton = "px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold rounded-xl shadow-lg hover:shadow-purple-500/30 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed";
  const secondaryButton = "px-6 py-3 bg-slate-700 text-slate-300 font-bold rounded-xl hover:bg-slate-600 hover:scale-105 transition-all duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <>

      
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900 text-slate-200">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-3 tracking-tight">{titleTranslations[language]}</h1>
            <div className="w-24 h-1 bg-gradient-to-r from-indigo-400 to-purple-400 mx-auto rounded-full"></div>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            <div className="xl:col-span-2 space-y-8">
              <div className="bg-slate-800/70 backdrop-blur-sm rounded-2xl border border-slate-700/50 shadow-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-700"><h2 className="text-xl font-bold text-white">{editingOrderId ? 'Edit Order' : 'Create New Order'}</h2></div>
                <div className="p-6">
                  {/* Customer and Date Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                    <div className="lg:col-span-2 space-y-2"><label htmlFor="customerName" className={labelStyle}>Customer Name</label><input id="customerName" autoComplete="new-password" autoCorrect="off" spellCheck={false} className={inputStyle} value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Enter name" /></div>
                    <div className="space-y-2"><label htmlFor="deposit" className={labelStyle}>Deposit (kr)</label><input id="deposit" className={inputStyle} value={deposit} onChange={e => setDeposit(e.target.value)} type="number" min={0} placeholder="0"/></div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                    <div className="space-y-2"><label htmlFor="pickUpDate" className={labelStyle}>Pick-up Date</label><input id="pickUpDate" className={`${inputStyle} dark:[color-scheme:dark]`} type="date" value={pickUpDate} onChange={e => setPickUpDate(e.target.value)} /></div>
                    <div className="space-y-2"><label htmlFor="deliveryDate" className={labelStyle}>Delivery Date</label><input id="deliveryDate" className={`${inputStyle} dark:[color-scheme:dark]`} type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} /></div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                    <div className="space-y-2"><label htmlFor="phone" className={labelStyle}>Phone</label><input id="phone" autoComplete="new-password" autoCorrect="off" spellCheck={false} className={inputStyle} value={phone} onChange={e => setPhone(e.target.value)} placeholder="+47..." /></div>
                    <div className="lg:col-span-2 space-y-2"><label htmlFor="email" className={labelStyle}>Email</label><input id="email" autoComplete="new-password" autoCorrect="off" spellCheck={false} className={inputStyle} value={email} onChange={e => setEmail(e.target.value)} placeholder="name@example.com" /></div>
                  </div>
                  
                  <div className="mt-4 border-t border-slate-700 pt-4 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    {/* Add Item Section */}
                    <div>
                      <h3 className="text-lg font-bold text-slate-300 mb-2">Add Inventory Item</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 items-end">
                        <div className="sm:col-span-3 space-y-2"><label htmlFor="itemSearch" className={labelStyle}>Item</label><input id="itemSearch" className={inputStyle} value={itemSearch} onChange={e => setItemSearch(e.target.value)} placeholder="Type or select item" list="inventory-items" /><datalist id="inventory-items">{filteredItems.map(item => (<option key={item.id} value={item.name} />))}</datalist></div>
                        <div className="sm:col-span-2 space-y-2"><label htmlFor="quantity" className={labelStyle}>Quantity</label><input id="quantity" className={inputStyle} type="number" min={1} value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="0"/></div>
                      </div>
                      <StockStatus info={availabilityInfo} />
                      <div className="text-right mt-2"><button className="px-5 py-2 text-sm bg-indigo-900/70 text-indigo-300 font-bold rounded-lg hover:bg-indigo-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" onClick={handleAddItem} disabled={availabilityInfo.status !== 'available' || !quantity}>Add Item to Order</button></div>
                    </div>

                    {/* Add Fee Section */}
                    <div>
                      <h3 className="text-lg font-bold text-slate-300 mb-2">Add Service or Fee</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 items-end">
                        <div className="sm:col-span-3 space-y-2"><label htmlFor="feeDescription" className={labelStyle}>Description</label><input id="feeDescription" className={inputStyle} value={feeDescription} onChange={e => setFeeDescription(e.target.value)} placeholder="e.g., Washing Fee" /></div>
                        <div className="sm:col-span-2 space-y-2"><label htmlFor="feeAmount" className={labelStyle}>Amount (kr)</label><input id="feeAmount" className={inputStyle} type="number" min={0} value={feeAmount} onChange={e => setFeeAmount(e.target.value)} placeholder="e.g., 500"/></div>
                      </div>
                      <div className="h-[55px] mt-3"></div>
                      <div className="text-right mt-2"><button className="px-5 py-2 text-sm bg-indigo-900/70 text-indigo-300 font-bold rounded-lg hover:bg-indigo-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" onClick={handleAddFee} disabled={!feeDescription || !feeAmount}>Add Fee to Order</button></div>
                    </div>
                  </div>
                  
                  {/* Order Summary */}
                  {(orderItems.length > 0 || orderFees.length > 0) && (
                    <div className="mt-6 border-t border-slate-700 pt-6">
                      <h3 className="text-lg font-bold text-slate-200 mb-4">Order Summary</h3>
                      <div className="space-y-2 mb-4 bg-slate-900/40 p-4 rounded-xl border border-slate-700/50">
                        {orderItems.map((oi, idx) => (
                          <div key={`item-${idx}`} className="flex items-center justify-between p-3 bg-slate-700 rounded-lg shadow-sm">
                            <div><span className="font-bold text-slate-200">{oi.itemName}</span><span className="font-bold text-slate-400"> × {oi.quantity}</span>{oi.specialPrice && (<span className="ml-2 text-xs font-bold text-teal-300 bg-teal-900/50 px-2 py-1 rounded-full">SPECIAL</span>)}</div>
                            <div className="flex items-center gap-4"><span className="font-bold text-slate-300">{formatCurrency(oi.total)}</span><button onClick={() => handleRemoveOrderItem(idx)} className="text-red-400 hover:text-red-300 font-bold text-xl">×</button></div>
                          </div>
                        ))}
                        {orderFees.map((fee, idx) => (
                          <div key={`fee-${idx}`} className="flex items-center justify-between p-3 bg-cyan-900/40 rounded-lg border border-cyan-800/50">
                            <div><span className="font-bold text-slate-200">{fee.description}</span><span className="ml-2 text-xs font-bold text-cyan-300 bg-cyan-900/50 px-2 py-1 rounded-full">FEE</span></div>
                            <div className="flex items-center gap-4"><span className="font-bold text-slate-300">{formatCurrency(fee.amount)}</span><button onClick={() => handleRemoveFee(idx)} className="text-red-400 hover:text-red-300 font-bold text-xl">×</button></div>
                          </div>
                        ))}
                      </div>
                      <div className="text-right text-xl font-bold text-white border-t border-slate-700 pt-3 mt-3">Calculated Total: {formatCurrency(calculatedTotal)}</div>
                    </div>
                  )}

                  {/* Special Price and Confirm Button */}
                  <div className="mt-4 border-t border-slate-700 pt-4">
                     <label htmlFor="finalPrice" className={labelStyle}>Special Total Price (Optional)</label>
                     <p className="text-xs text-slate-400 font-semibold mb-2">If set, this will override the calculated total.</p>
                     <input id="finalPrice" className={inputStyle} value={finalPrice} onChange={e => setFinalPrice(e.target.value)} type="number" min={0} placeholder="e.g., 1000"/>
                  </div>
                  <div className="mt-6 flex items-center gap-4">
                    <button className={primaryButton} onClick={handleSaveOrder} disabled={!!processingOrderId}>
                      {processingOrderId === (editingOrderId || 'new-order') ? <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin"></div> : (editingOrderId ? 'Save Changes' : 'Confirm Order')}
                    </button>
                    {editingOrderId && (<button className={secondaryButton} onClick={resetForm} disabled={!!processingOrderId}>Cancel</button>)}
                  </div>
                </div>
              </div>

              {/* Active Orders List */}
              <div className="bg-slate-800/70 backdrop-blur-sm rounded-2xl border border-slate-700/50 shadow-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-700"><h2 className="text-xl font-bold text-white">Active Orders ({orders.length})</h2></div>
                <div className="p-6 space-y-6">
                  {orders.length === 0 ? ( <div className="text-center py-12 text-slate-400 font-bold"><p>No active orders yet.</p></div> ) : (
                    orders.slice().sort((a, b) => new Date(a.pickUpDate).getTime() - new Date(b.pickUpDate).getTime())
                      .map(order => {
                        const pickupStyles = getPickupDateStyles(order.pickUpDate);
                        const itemsTotal = order.items.reduce((a, b) => a + b.total, 0);
                        const feesTotal = (order.fees || []).reduce((a, b) => a + b.amount, 0);
                        const calculatedTotal = itemsTotal + feesTotal;
                        return (
                          <div key={order.id} className="bg-slate-800/50 rounded-xl p-5 shadow-md border border-slate-700">
                            <div className="flex flex-col sm:flex-row justify-between sm:items-start mb-4">
                              <div>
                                <p className="font-bold text-xl text-white">{order.customerName}</p>
                                {(order.phone || order.email) && (
                                  <p className="text-sm text-slate-400 font-medium mt-1">
                                    {order.phone && <span>📞 {order.phone}</span>}
                                    {order.phone && order.email && <span className="mx-2">|</span>}
                                    {order.email && <span>{order.email}</span>}
                                  </p>
                                )}
                                <div className="flex items-center gap-2 text-base font-bold mt-1">
                                  <span className={`px-2 py-0.5 rounded-md transition-colors ${pickupStyles.bg} ${pickupStyles.text}`}>{formatDate(order.pickUpDate)}</span>
                                  <span className="text-slate-500">→</span>
                                  <span className="text-slate-400">{formatDate(order.deliveryDate)}</span>
                                </div>
                              </div>
                              <div className="text-left sm:text-right mt-2 sm:mt-0">
                                {order.deposit ? <p className="text-base font-bold text-slate-400">(Deposit: {formatCurrency(order.deposit)})</p> : null}
                                {typeof order.finalPrice === 'number' ? (
                                    <div className="flex items-center gap-2 justify-end">
                                      <span className="text-xs font-bold text-purple-300 bg-purple-900/50 px-2 py-1 rounded-full">DEAL</span>
                                      <p className="font-bold text-2xl text-purple-300">{formatCurrency(order.finalPrice)}</p>
                                    </div>
                                ) : ( <p className="font-bold text-2xl text-indigo-300">{formatCurrency(calculatedTotal)}</p> )}
                              </div>
                            </div>
                            <div className="overflow-x-auto mb-4 -mx-2">
                              <table className="w-full text-base">
                                <tbody className="divide-y divide-slate-700">
                                  {order.items.map((oi, idx) => (<tr key={`item-${idx}`}><td className="py-2 px-2 font-bold text-slate-300">{oi.itemName}</td><td className="py-2 px-2 font-bold text-slate-400 text-center">x {oi.quantity}</td><td className="py-2 px-2 font-bold text-slate-400 text-right">{formatCurrency(oi.unitPrice)}</td></tr>))}
                                  {(order.fees || []).map((fee, idx) => (<tr key={`fee-${idx}`}><td className="py-2 px-2 font-bold text-cyan-300">{fee.description}</td><td className="py-2 px-2 font-bold text-cyan-400 text-center">(Fee)</td><td className="py-2 px-2 font-bold text-cyan-400 text-right">{formatCurrency(fee.amount)}</td></tr>))}
                                </tbody>
                              </table>
                            </div>
                            <div className="flex items-center gap-2 pt-4 border-t border-slate-700">
                              <button
                                onClick={() => handleDeleteOrder(order.id)}
                                disabled={!!processingOrderId}
                                className="px-4 py-2 text-base font-bold text-red-300 bg-red-900/50 hover:bg-red-900/80 rounded-lg transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Delete
                              </button>
                              <div className="ml-auto">
                                {processingOrderId === order.id ? (
                                  <div className="px-4 py-2 flex items-center gap-2 text-base font-bold text-white">
                                    <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>
                                    Processing...
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => handleCompleteOrder(order.id)}
                                    disabled={!!processingOrderId}
                                    className="px-4 py-2 text-base font-bold text-white bg-gradient-to-r from-emerald-500 to-green-600 rounded-lg shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    Mark as Completed
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })
                  )}
                </div>
              </div>
            </div>
            {/* Special Pricing Column */}
            <div className="xl:col-span-1"><div className="bg-slate-800/70 backdrop-blur-sm rounded-2xl border border-slate-700/50 shadow-2xl overflow-hidden sticky top-8"><div className="px-6 py-4 border-b border-slate-700"><h2 className="text-xl font-bold text-white">Special Pricing</h2></div><div className="p-6"><div className="space-y-4 mb-6"><div className="space-y-2"><label htmlFor="sp-customer" className={labelStyle}>Customer Name</label><select id="sp-customer" className={inputStyle} value={specialPriceCustomer} onChange={e => setSpecialPriceCustomer(e.target.value)}><option value="">Select customer</option>{currentCustomerNames.map(name => (<option key={name} value={name} className="font-bold">{name}</option>))}</select></div><div className="space-y-2"><label htmlFor="sp-item" className={labelStyle}>Item</label>
            <select id="sp-item" className={inputStyle} value={specialPriceItem} onChange={e => setSpecialPriceItem(e.target.value)} disabled={!specialPriceCustomer}>
              <option value="">Select item</option>
              {specialPriceItemsList.map(item => (
                <option key={item.id} value={item.name} className="font-bold">{item.name}</option>
              ))}
            </select>
            </div><div className="space-y-2"><label htmlFor="sp-price" className={labelStyle}>Special Price</label><input id="sp-price" className={inputStyle} value={specialPriceValue} onChange={e => setSpecialPriceValue(e.target.value)} type="number" min={0} placeholder="Enter price"/></div></div>
            <button className={`${primaryButton} w-full`} onClick={handleAddSpecialPrice} disabled={isSpecialPriceLoading}>
                {isSpecialPriceLoading ? <div className="w-5 h-5 mx-auto border-2 border-white/50 border-t-white rounded-full animate-spin"></div> : 'Add / Update Price'}
            </button>
            {specialPrices.length > 0 && (<div className="mt-6 pt-6 border-t border-slate-700 space-y-3">{specialPrices.map((sp) => (<div key={sp.id} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg"><div><p className="text-sm font-bold text-slate-200">{sp.customerName}</p><p className="text-xs font-bold text-slate-400">{sp.itemName}</p></div><div className="flex items-center gap-3"><span className="text-sm font-bold text-teal-300">{formatCurrency(sp.price)}</span>
            <button onClick={() => handleDeleteSpecialPrice(sp.id)} disabled={isSpecialPriceLoading} className="text-red-400 hover:text-red-300 font-bold text-lg disabled:opacity-50">×</button></div></div>))}</div>)}</div></div></div>
          </div>
        </main>
      </div>
    </>
  );
}