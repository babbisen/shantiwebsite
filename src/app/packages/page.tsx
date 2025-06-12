'use client';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { toast } from 'sonner';

// --- Type Definitions ---
type InventoryItem = { id: number; name: string; totalQuantity: number; pricePerItem: number; };
type PackageItem = { inventoryItemId: number; quantity: number; };
type PackageTemplate = { id: number; name: string; };
type DetailedPackageTemplate = PackageTemplate & { packageItems: { inventoryItem: InventoryItem; quantity: number; }[] };
type OrderItem = { itemId: number | null; itemName: string; quantity: number; unitPrice: number; total: number; specialPrice?: number; };
type OrderFee = { description: string; amount: number; };
type SpecialPrice = { customerName: string; itemName: string; price: number; };

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

// --- Main Component ---
export default function PackagesPage() {
    // --- State Management ---
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [packages, setPackages] = useState<PackageTemplate[]>([]);
    const [specialPrices, setSpecialPrices] = useState<SpecialPrice[]>([]);

    const [newPackageName, setNewPackageName] = useState('');
    const [packageItems, setPackageItems] = useState<({ inventoryItem: InventoryItem; quantity: number; })[]>([]);
    
    const [customerName, setCustomerName] = useState('');
    const [pickUpDate, setPickUpDate] = useState('');
    const [deliveryDate, setDeliveryDate] = useState('');
    const [selectedPackageId, setSelectedPackageId] = useState<string>('');
    const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
    const [orderFees, setOrderFees] = useState<OrderFee[]>([]);
    const [feeDescription, setFeeDescription] = useState('');
    const [feeAmount, setFeeAmount] = useState('');

    const [deposit, setDeposit] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    
    const [itemSearch, setItemSearch] = useState('');
    const [isItemSearchFocused, setIsItemSearchFocused] = useState(false);
    const [packageSearch, setPackageSearch] = useState('');
    const [isPackageSearchFocused, setIsPackageSearchFocused] = useState(false);

    // --- Additional Item for Order State ---
    const [orderItemSearch, setOrderItemSearch] = useState('');
    const [orderItemQuantity, setOrderItemQuantity] = useState('');
    const [isOrderItemSearchFocused, setIsOrderItemSearchFocused] = useState(false);


    // --- Data Fetching ---
    const fetchData = useCallback(async () => {
        try {
            const [invRes, pkgRes, spRes] = await Promise.all([ fetch('/api/inventory'), fetch('/api/packages'), fetch('/api/special-price') ]);
            if (!invRes.ok || !pkgRes.ok || !spRes.ok) throw new Error('Failed to fetch initial data');
            const invData = await invRes.json();
            const pkgData = await pkgRes.json();
            const spData = await spRes.json();
            setInventory(invData);
            setPackages(pkgData);
            setSpecialPrices(spData);
            setError(null);
        } catch (err) {
            console.error(err);
            setError('Could not load page data. Please refresh.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    // --- Package Template Management Logic ---
    const handleAddItemToPackage = (item: InventoryItem, quantity: number) => {
        const existingItem = packageItems.find(pi => pi.inventoryItem.id === item.id);
        if (existingItem) {
            setPackageItems(packageItems.map(pi => pi.inventoryItem.id === item.id ? { ...pi, quantity: pi.quantity + quantity } : pi));
        } else {
            setPackageItems([...packageItems, { inventoryItem: item, quantity }]);
        }
        setItemSearch('');
    };
    const handleRemoveItemFromPackage = (itemId: number) => {
        setPackageItems(packageItems.filter(pi => pi.inventoryItem.id !== itemId));
    };
    const handleSavePackage = async () => {
        if (!newPackageName.trim() || packageItems.length === 0) {
            toast.error('Package name and at least one item are required.');
            return;
        }

        for (const pi of packageItems) {
            const inv = inventory.find(it => it.id === pi.inventoryItem.id);
            if (inv && pi.quantity > inv.totalQuantity) {
                toast.error(`Not enough '${inv.name}' in inventory to create this package.`);
                return;
            }
        }

        setIsProcessing(true);
        try {
            const payload = {
                name: newPackageName,
                items: packageItems.map(pi => ({ inventoryItemId: pi.inventoryItem.id, quantity: pi.quantity })),
            };
            const res = await fetch('/api/packages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (res.ok) {
                toast.success('Package saved successfully!');
                setNewPackageName('');
                setPackageItems([]);
                await fetchData();
            } else {
                const err = await res.json();
                toast.error(err.error || 'Failed to save package.');
            }
        } finally {
            setIsProcessing(false);
        }
    };
    const handleDeletePackage = async (packageId: number) => {
        // --- NOTE: I am removing the window.confirm as per your last request in the previous turn ---
        setIsProcessing(true);
        try {
            const res = await fetch(`/api/packages/${packageId}`, { method: 'DELETE' });
            if (res.ok) {
                toast.success('Package deleted.');
                await fetchData();
            } else {
                toast.error('Failed to delete package.');
            }
        } finally {
            setIsProcessing(false);
        }
    };

    // --- Order Creation from Package Logic ---
    const handlePackageSelect = async (pkg: PackageTemplate) => {
        setSelectedPackageId(pkg.id.toString());
        setPackageSearch(pkg.name);
        setIsPackageSearchFocused(false);

        const res = await fetch(`/api/packages/${pkg.id}`);
        if (!res.ok) { toast.error('Failed to load package details.'); return; }
        const pkgDetails: DetailedPackageTemplate = await res.json();
        const itemsForOrder = pkgDetails.packageItems.map(pItem => {
            const unitPrice = specialPrices.find(sp => sp.customerName.toLowerCase() === customerName.toLowerCase() && sp.itemName === pItem.inventoryItem.name)?.price ?? pItem.inventoryItem.pricePerItem;
            return { itemId: pItem.inventoryItem.id, itemName: pItem.inventoryItem.name, quantity: pItem.quantity, unitPrice, total: unitPrice * pItem.quantity, specialPrice: unitPrice !== pItem.inventoryItem.pricePerItem ? unitPrice : undefined, };
        });
        setOrderItems(itemsForOrder);
    };

    const handleCreateOrderFromPackage = async () => {
        if (!customerName || !pickUpDate || !deliveryDate || orderItems.length === 0) {
            toast.error('Customer name, dates, and at least one item are required.');
            return;
        }
        setIsProcessing(true);
        try {
            const payload = {
                customerName,
                pickUpDate,
                deliveryDate,
                items: orderItems,
                deposit: deposit ? Number(deposit) : undefined,
                fees: orderFees,
            };
            const res = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (res.ok) {
                const data = await res.json();
                const contactData = loadContactInfo();
                contactData[data.id] = { phone, email };
                saveContactInfo(contactData);
                toast.success('Order created successfully!');
                setCustomerName('');
                setDeposit('');
                setPickUpDate('');
                setDeliveryDate('');
                setPhone('');
                setEmail('');
                setSelectedPackageId('');
                setOrderItems([]);
                setOrderFees([]);
                setFeeDescription('');
                setFeeAmount('');
                setPackageSearch('');
            } else {
                const err = await res.json();
                toast.error(`Order creation failed: ${err.error}`);
            }
        } finally {
            setIsProcessing(false);
        }
    };

    const handleAddItemToOrder = () => {
        if (!orderItemSearch.trim() || !orderItemQuantity) {
            toast.error('Select an item and quantity first.');
            return;
        }
        const invItem = inventory.find(i => i.name.toLowerCase() === orderItemSearch.trim().toLowerCase());
        if (!invItem) {
            toast.error('Item not found.');
            return;
        }
        const qty = parseInt(orderItemQuantity, 10);
        if (!qty || qty <= 0) {
            toast.error('Quantity must be at least 1.');
            return;
        }
        const unitPrice = specialPrices.find(sp => sp.customerName.toLowerCase() === customerName.toLowerCase() && sp.itemName === invItem.name)?.price ?? invItem.pricePerItem;
        setOrderItems([...orderItems, { itemId: invItem.id, itemName: invItem.name, quantity: qty, unitPrice, total: unitPrice * qty, specialPrice: unitPrice !== invItem.pricePerItem ? unitPrice : undefined }]);
        setOrderItemSearch('');
        setOrderItemQuantity('');
    };
    const handleRemoveItemFromOrder = (itemId: number | null) => {
        setOrderItems(orderItems.filter(oi => oi.itemId !== itemId));
    };

    const handleAddFee = () => {
        if (!feeDescription.trim() || !feeAmount) return;
        setOrderFees([...orderFees, { description: feeDescription.trim(), amount: Number(feeAmount) }]);
        setFeeDescription('');
        setFeeAmount('');
    };

    const handleRemoveFee = (idx: number) => {
        setOrderFees(orderFees.filter((_, i) => i !== idx));
    };

    const filteredInventory = useMemo(() =>
        inventory.filter(item => item.name.toLowerCase().includes(itemSearch.toLowerCase()))
    , [inventory, itemSearch]);

    const filteredInventoryForOrder = useMemo(() =>
        inventory.filter(item => item.name.toLowerCase().includes(orderItemSearch.toLowerCase()))
    , [inventory, orderItemSearch]);

    const filteredPackages = useMemo(() =>
        packages.filter(pkg => pkg.name.toLowerCase().includes(packageSearch.toLowerCase()))
    , [packages, packageSearch]);

    const calculatedTotal = useMemo(() => {
        const itemsTotal = orderItems.reduce((acc, item) => acc + item.total, 0);
        const feesTotal = orderFees.reduce((acc, fee) => acc + fee.amount, 0);
        return itemsTotal + feesTotal;
    }, [orderItems, orderFees]);

    // --- UI Helpers & Styles ---
    const inputStyle = "w-full px-4 py-3 bg-slate-700/50 border-2 border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition font-semibold";
    const labelStyle = "block text-sm font-bold text-slate-300 mb-1";
    const primaryButton = "px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold rounded-xl shadow-lg hover:shadow-purple-500/30 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed";
    const cardStyle = "bg-slate-800/70 backdrop-blur-sm rounded-2xl border border-slate-700/50 shadow-2xl p-6";

    const formatCurrency = (amount: number | null | undefined) => {
      if (typeof amount !== 'number' || isNaN(amount)) { return '0.00 kr'; }
      return `${new Intl.NumberFormat('nb-NO', { minimumFractionDigits: 2, maximumFractionDigits: 2, }).format(amount)} kr`;
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white"><div className="w-8 h-8 border-4 border-slate-600 border-t-indigo-500 rounded-full animate-spin"></div></div>;
    if (error) return <div className="min-h-screen flex items-center justify-center bg-slate-900 text-red-400">{error}</div>;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900 text-slate-200">
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold text-white mb-3 tracking-tight">Package Management</h1>
                    <div className="w-24 h-1 bg-gradient-to-r from-indigo-400 to-purple-400 mx-auto rounded-full"></div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className={`space-y-6 ${cardStyle}`}>
                        <h2 className="text-2xl font-bold text-white">Create Order from Package</h2>
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="customer" className={labelStyle}>Customer Name</label>
                                <input
                                    id="customer"
                                    value={customerName}
                                    onChange={(e) => setCustomerName(e.target.value)}
                                    className={inputStyle}
                                    autoComplete="new-password"
                                    autoCorrect="off"
                                    spellCheck={false}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label htmlFor="pickup" className={labelStyle}>Pick-up Date</label><input id="pickup" type="date" value={pickUpDate} onChange={(e) => setPickUpDate(e.target.value)} className={`${inputStyle} dark:[color-scheme:dark]`} /></div>
                                <div><label htmlFor="delivery" className={labelStyle}>Delivery Date</label><input id="delivery" type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} className={`${inputStyle} dark:[color-scheme:dark]`} /></div>
                            </div>
                            <div><label htmlFor="deposit" className={labelStyle}>Deposit (kr)</label><input id="deposit" type="number" min={0} value={deposit} onChange={(e) => setDeposit(e.target.value)} className={inputStyle} /></div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="phone" className={labelStyle}>Phone</label>
                                    <input
                                        id="phone"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        className={inputStyle}
                                        autoComplete="new-password"
                                        autoCorrect="off"
                                        spellCheck={false}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="email" className={labelStyle}>Email</label>
                                    <input
                                        id="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className={inputStyle}
                                        autoComplete="new-password"
                                        autoCorrect="off"
                                        spellCheck={false}
                                    />
                                </div>
                            </div>
                            <div className="relative">
                                <label htmlFor="package-search" className={labelStyle}>Select Package</label>
                                <input
                                    id="package-search"
                                    type="text"
                                    value={packageSearch}
                                    onChange={(e) => { setPackageSearch(e.target.value); setSelectedPackageId(''); }}
                                    onFocus={() => setIsPackageSearchFocused(true)}
                                    onBlur={() => setTimeout(() => setIsPackageSearchFocused(false), 150)}
                                    placeholder="Search for a package..."
                                    className={inputStyle}
                                    autoComplete="off"
                                />
                                {isPackageSearchFocused && filteredPackages.length > 0 && (
                                    <ul className="absolute z-20 w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-lg max-h-60 overflow-auto">
                                        {filteredPackages.map(p => (
                                            <li key={p.id} onMouseDown={() => handlePackageSelect(p)} className="px-4 py-2 hover:bg-indigo-600 cursor-pointer">{p.name}</li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                        {orderItems.length > 0 && (
                            <div className="border-t border-slate-700 pt-6">
                                <h3 className="text-lg font-semibold text-slate-200 mb-4">Add Extra Item</h3>
                                <div className="grid grid-cols-5 gap-4 items-end mb-6">
                                    <div className="col-span-3 relative">
                                        <label className={labelStyle}>Item</label>
                                        <input
                                            type="text"
                                            value={orderItemSearch}
                                            onChange={(e) => setOrderItemSearch(e.target.value)}
                                            onFocus={() => setIsOrderItemSearchFocused(true)}
                                            onBlur={() => setTimeout(() => setIsOrderItemSearchFocused(false), 150)}
                                            placeholder="Search for item..."
                                            className={inputStyle}
                                            autoComplete="off"
                                        />
                                        {isOrderItemSearchFocused && filteredInventoryForOrder.length > 0 && (
                                            <ul className="absolute z-20 w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-lg max-h-60 overflow-auto">
                                                {filteredInventoryForOrder.map(item => (
                                                    <li key={item.id} onMouseDown={() => setOrderItemSearch(item.name)} className="px-4 py-2 hover:bg-indigo-600 cursor-pointer">{item.name}</li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                    <div className="col-span-2">
                                        <label className={labelStyle}>Quantity</label>
                                        <input type="number" min={1} value={orderItemQuantity} onChange={(e) => setOrderItemQuantity(e.target.value)} className={inputStyle} />
                                    </div>
                                    <div className="col-span-5 text-right">
                                        <button onClick={handleAddItemToOrder} className="px-5 py-2 text-sm bg-indigo-900/70 text-indigo-300 font-bold rounded-lg hover:bg-indigo-900 transition-colors">Add Item</button>
                                    </div>
                                </div>
                                <h3 className="text-lg font-semibold text-slate-200 mb-4">Add Service or Fee</h3>
                                <div className="grid grid-cols-5 gap-4 items-end mb-6">
                                    <div className="col-span-3">
                                        <label className={labelStyle}>Description</label>
                                        <input type="text" value={feeDescription} onChange={(e) => setFeeDescription(e.target.value)} className={inputStyle} placeholder="e.g., Washing Fee" />
                                    </div>
                                    <div className="col-span-2">
                                        <label className={labelStyle}>Amount (kr)</label>
                                        <input type="number" min={0} value={feeAmount} onChange={(e) => setFeeAmount(e.target.value)} className={inputStyle} />
                                    </div>
                                    <div className="col-span-5 text-right">
                                        <button onClick={handleAddFee} className="px-5 py-2 text-sm bg-indigo-900/70 text-indigo-300 font-bold rounded-lg hover:bg-indigo-900 transition-colors" disabled={!feeDescription || !feeAmount}>Add Fee</button>
                                    </div>
                                </div>
                                <h3 className="text-lg font-semibold text-slate-200 mb-4">Order Items (Editable)</h3>
                                <div className="space-y-2 mb-6 bg-slate-900/40 p-4 rounded-xl border border-slate-700/50">
                                    {orderItems.map((oi) => (
                                        <div key={oi.itemId} className="flex items-center justify-between p-3 bg-slate-700 rounded-lg shadow-sm">
                                            <div><span className="font-bold text-slate-200">{oi.itemName}</span><span className="font-bold text-slate-400"> × {oi.quantity}</span></div>
                                            <div className="flex items-center gap-4"><span className="font-bold text-slate-300">{formatCurrency(oi.total)}</span><button onClick={() => handleRemoveItemFromOrder(oi.itemId)} className="text-red-400 hover:text-red-300 font-bold text-xl">×</button></div>
                                        </div>
                                    ))}
                                    {orderFees.map((fee, idx) => (
                                        <div key={`fee-${idx}`} className="flex items-center justify-between p-3 bg-cyan-900/40 rounded-lg border border-cyan-800/50">
                                            <div><span className="font-bold text-slate-200">{fee.description}</span><span className="ml-2 text-xs font-bold text-cyan-300 bg-cyan-900/50 px-2 py-1 rounded-full">FEE</span></div>
                                            <div className="flex items-center gap-4"><span className="font-bold text-slate-300">{formatCurrency(fee.amount)}</span><button onClick={() => handleRemoveFee(idx)} className="text-red-400 hover:text-red-300 font-bold text-xl">×</button></div>
                                        </div>
                                    ))}
                                </div>
                                <div className="text-right text-xl font-bold text-white border-t border-slate-700 pt-3 mt-3">Total: {formatCurrency(calculatedTotal)}</div>
                                <button onClick={handleCreateOrderFromPackage} className={`${primaryButton} mt-6 w-full`} disabled={isProcessing}>
                                    {isProcessing ? <div className="w-5 h-5 mx-auto border-2 border-white/50 border-t-white rounded-full animate-spin"></div> : 'Create Order'}
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="space-y-8">
                        {/* --- CHANGE: Add relative and z-index to this card --- */}
                        <div className={`${cardStyle} relative z-30`}>
                            <h2 className="text-2xl font-bold text-white mb-6">Package Template Builder</h2>
                            <div className="space-y-4">
                                <div><label className={labelStyle}>Package Name</label><input value={newPackageName} onChange={(e) => setNewPackageName(e.target.value)} className={inputStyle} placeholder="e.g., Standard Wedding for 50"/></div>
                                <div className="relative">
                                    <label className={labelStyle}>Add Items to Template</label>
                                    <input
                                        type="text"
                                        value={itemSearch}
                                        onChange={(e) => setItemSearch(e.target.value)}
                                        onFocus={() => setIsItemSearchFocused(true)}
                                        onBlur={() => setTimeout(() => setIsItemSearchFocused(false), 150)}
                                        placeholder="Search for an item to add..."
                                        className={inputStyle}
                                        autoComplete="off"
                                    />
                                    {isItemSearchFocused && filteredInventory.length > 0 && (
                                        <ul className="absolute z-20 w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-lg max-h-60 overflow-auto">
                                            {filteredInventory.map(item => (
                                                <li key={item.id} onMouseDown={() => handleAddItemToPackage(item, 1)} className="px-4 py-2 hover:bg-indigo-600 cursor-pointer">{item.name}</li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            </div>
                            {packageItems.length > 0 && (
                                <div className="border-t border-slate-700 pt-6 mt-6">
                                    <h3 className="text-lg font-semibold text-slate-200 mb-4">Template Items</h3>
                                    <div className="space-y-3 mb-6">
                                        {packageItems.map((pi) => (
                                            <div key={pi.inventoryItem.id} className="flex items-center justify-between p-2 bg-slate-700/50 rounded-lg">
                                                <span className="font-semibold text-slate-200">{pi.inventoryItem.name}</span>
                                                <div className="flex items-center gap-3">
                                                    <label htmlFor={`pkg-qty-${pi.inventoryItem.id}`} className="text-sm font-semibold text-slate-400">Qty:</label>
                                                    <input id={`pkg-qty-${pi.inventoryItem.id}`} type="number" value={pi.quantity} onFocus={(e) => e.target.select()} onChange={(e) => { const newQuantity = parseInt(e.target.value, 10) || 0; setPackageItems(packageItems.map(item => item.inventoryItem.id === pi.inventoryItem.id ? { ...item, quantity: newQuantity } : item)); }} className="w-16 text-center font-semibold bg-slate-600 rounded-md border border-slate-500" />
                                                    <button onClick={() => handleRemoveItemFromPackage(pi.inventoryItem.id)} className="text-red-400 hover:text-red-300 font-bold text-xl">×</button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <button onClick={handleSavePackage} className={`${primaryButton} w-full`} disabled={isProcessing}>
                                        {isProcessing ? <div className="w-5 h-5 mx-auto border-2 border-white/50 border-t-white rounded-full animate-spin"></div> : 'Save New Package Template'}
                                    </button>
                                </div>
                            )}
                        </div>
                        <div className={cardStyle}>
                            <h2 className="text-2xl font-bold text-white mb-6">Existing Packages</h2>
                            <div className="space-y-3">
                                {packages.length === 0 ? <p className="text-slate-500 text-center font-semibold">No packages created yet.</p> : packages.map(p => (
                                    <div key={p.id} className="flex justify-between items-center p-3 bg-slate-700/50 rounded-lg">
                                        <span className="font-semibold text-slate-200">{p.name}</span>
                                        <button onClick={() => handleDeletePackage(p.id)} className="px-3 py-1 text-xs font-medium text-red-400 bg-red-900/40 hover:bg-red-900/80 rounded-lg disabled:opacity-50" disabled={isProcessing}>Delete</button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}