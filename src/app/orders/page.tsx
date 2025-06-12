'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- TYPE DEFINITIONS ---
interface OrderItemFromServer {
  id: number;
  itemName: string | null;
  quantity: number;
  unitPrice: number;
  total: number;
  inventoryItem: {
    name: string;
  } | null;
}

interface OrderItemState {
  id: number;
  itemName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface OrderFee {
  description: string;
  amount: number;
}

interface Order {
  id: number;
  customerName: string;
  deposit: number;
  pickUpDate: string;
  deliveryDate: string;
  items: OrderItemState[];
  fees: OrderFee[];
  finalPrice?: number | null;
}

// --- TRANSLATION DATA ---
const translations = {
  en: {
    generateDetails: 'Generate Order Details',
    selectAnOrder: 'Select an Order',
    searchPlaceholder: 'Search by customer name...',
    orderDetailsFor: 'Order Details for',
    pickUpDate: 'Pick-up Date',
    deliveryDate: 'Delivery Date',
    itemName: 'Item',
    pricePerItem: 'Price per item',
    quantity: 'Quantity',
    totalPriceForItem: 'Total Price for Item',
    depositPayment: 'Deposit payment',
    deadlineForDeposit: 'Deadline for deposit',
    totalPriceForOrder: 'Total price for order',
    includingDeposit: 'Including deposit',
    additionalComments: 'Additional comments',
    comment1: 'To confirm the order and ensure that you receive the items on time, the deposit must be paid by the agreed deadline.',
    comment2: 'The deposit will be returned as soon as the order is returned without any damage or missing items.',
    comment3: 'The deposit can be sent via Vipps to 9948576.',
    comment4: 'The items must be returned in the same condition as they were when picked up.',
    loading: 'Loading orders...',
    selectOrderPrompt: 'Please select an order above to view its details.',
    orderItems: 'Order Summary',
    finalPriceLabel: 'Final Agreed Price',
  },
  no: {
    generateDetails: 'Generer Ordredetaljer',
    selectAnOrder: 'Velg en Ordre',
    searchPlaceholder: 'Søk etter kundenavn...',
    orderDetailsFor: 'Ordredetaljer for',
    pickUpDate: 'Hentedato',
    deliveryDate: 'Leveringsdato',
    itemName: 'Artikkel',
    pricePerItem: 'Pris per enhet',
    quantity: 'Antall',
    totalPriceForItem: 'Totalpris for vare',
    depositPayment: 'Depositum',
    deadlineForDeposit: 'Frist for depositum',
    totalPriceForOrder: 'Totalpris for ordre',
    includingDeposit: 'Inkludert depositum',
    additionalComments: 'Tilleggskommentarer',
    comment1: 'For å bekrefte bestillingen og sikre at du mottar varene i tide, må depositumet betales innen den avtalte fristen.',
    comment2: 'Depositumet vil bli returnert så snart bestillingen er levert tilbake uten skader eller manglende deler.',
    comment3: 'Depositumet kan sendes via Vipps til 9948576.',
    comment4: 'Varene må returneres i samme stand som de var da de ble hentet.',
    loading: 'Laster inn ordrer...',
    selectOrderPrompt: 'Vennligst velg en ordre ovenfor for å se detaljene.',
    orderItems: 'Ordreoversikt',
    finalPriceLabel: 'Endelig avtalt pris',
  }
};

const commentKeys: (keyof typeof translations.en)[] = ['comment1', 'comment2', 'comment3', 'comment4'];

// --- HELPER FUNCTIONS ---
// --- CHANGE: Updated formatCurrency to show whole numbers ---
const formatCurrency = (amount: number | null | undefined) => {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return '0 kr';
  }
  const formattedAmount = new Intl.NumberFormat('nb-NO', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
  return `${formattedAmount} kr`;
};

const formatDisplayDate = (dateString: string, locale: 'en' | 'no') => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat(locale === 'no' ? 'nb-NO' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
};

export default function OrderDetailsPage() {
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [language, setLanguage] = useState<'en' | 'no'>('en');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [depositDeadline, setDepositDeadline] = useState<string>('');

  const T = translations[language];

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/orders'); // Fetches active orders
        if (!response.ok) throw new Error('Failed to fetch orders');
        const data = await response.json();

        const transformedOrders = data.map((order: any) => ({
          ...order,
          items: order.items.map((item: OrderItemFromServer) => ({
            id: item.id,
            itemName: item.itemName || item.inventoryItem?.name || 'Deleted Item',
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.total,
          })),
          fees: order.fees || [],
        }));

        setAllOrders(transformedOrders);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setIsLoading(false);
      }
    };
    fetchOrders();
  }, []);

  const filteredOrders = useMemo(() => {
    if (!searchTerm) return allOrders;
    return allOrders.filter(order =>
      order.customerName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, allOrders]);

  const calculatedTotal = useMemo(() => {
    if (!selectedOrder) return 0;
    const itemsTotal = selectedOrder.items.reduce((sum, item) => sum + item.total, 0);
    const feesTotal = (selectedOrder.fees || []).reduce((sum, fee) => sum + fee.amount, 0);
    return itemsTotal + feesTotal;
  }, [selectedOrder]);

  const handleSelectOrder = (order: Order) => {
    setSelectedOrder(order);
    setSearchTerm(order.customerName);
    setIsSearchFocused(false);
    setDepositDeadline('');
  };
  
  const handleBlur = () => { setTimeout(() => { setIsSearchFocused(false); }, 150); };
  
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    if(selectedOrder && e.target.value !== selectedOrder.customerName){
      setSelectedOrder(null);
    }
  }

  const formatPdfDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  const handleExportPDF = () => {
    if (!selectedOrder) return;

    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text(`${T.orderDetailsFor} ${selectedOrder.customerName}`, doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });

    doc.setFontSize(12);
    doc.text(`${T.pickUpDate}: ${formatPdfDate(selectedOrder.pickUpDate)}`, 14, 25);
    doc.text(`${T.deliveryDate}: ${formatPdfDate(selectedOrder.deliveryDate)}`, 14, 32);

    const body = [
      ...selectedOrder.items.map(item => [
        item.itemName,
        formatCurrency(item.unitPrice),
        String(item.quantity),
        formatCurrency(item.total)
      ]),
      ...(selectedOrder.fees || []).map(fee => [
        fee.description,
        formatCurrency(fee.amount),
        '(Fee)',
        formatCurrency(fee.amount)
      ])
    ];

    autoTable(doc, {
      startY: 40,
      head: [[T.itemName, T.pricePerItem, T.quantity, T.totalPriceForItem]],
      body,
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59] },
      styles: { fontSize: 10 }
    });

    let y = (doc as any).lastAutoTable.finalY + 10;
    doc.text(`${T.depositPayment}: ${formatCurrency(selectedOrder.deposit)}`, 14, y);
    y += 7;
    if (depositDeadline) {
      doc.text(`${T.deadlineForDeposit}: ${depositDeadline}`, 14, y);
      y += 7;
    }

    if (typeof selectedOrder.finalPrice === 'number') {
      doc.text(`${T.finalPriceLabel}: ${formatCurrency(selectedOrder.finalPrice)}`, 14, y);
      y += 7;
    } else {
      doc.text(`${T.totalPriceForOrder}: ${formatCurrency(calculatedTotal)}`, 14, y);
      y += 7;
    }

    doc.text(`${T.includingDeposit}: ${formatCurrency((selectedOrder.finalPrice ?? calculatedTotal) + (selectedOrder.deposit || 0))}`, 14, y);

    y += 10;
    doc.text(T.additionalComments, 14, y);
    y += 6;
    commentKeys.forEach((key, idx) => {
      doc.text(`${idx + 1}. ${T[key]}`, 16, y + idx * 6);
    });

    const fileName =
      language === 'en'
        ? `order details to ${selectedOrder.customerName}.pdf`
        : `ordredetaljer til ${selectedOrder.customerName}.pdf`;
    doc.save(fileName);
  };

  return (
    <main className="min-h-screen bg-slate-900 text-slate-300 font-sans p-4 sm:p-6 lg:p-8">
      {/* --- CHANGE: Repositioned and restyled language toggle --- */}
      <div className="fixed top-1/2 -translate-y-1/2 right-6 z-50 flex flex-col gap-2 bg-slate-800/80 backdrop-blur-sm rounded-lg p-1 shadow-2xl border border-slate-700/50">
        <button onClick={() => setLanguage('en')} className={`px-4 py-2 text-sm font-bold rounded-md transition-all duration-200 ${language === 'en' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-300 hover:text-white hover:bg-slate-700/50'}`}>EN</button>
        <button onClick={() => setLanguage('no')} className={`px-4 py-2 text-sm font-bold rounded-md transition-all duration-200 ${language === 'no' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-300 hover:text-white hover:bg-slate-700/50'}`}>NO</button>
      </div>
      
      <div className="relative max-w-3xl mx-auto">
        {selectedOrder && (
          <button
            onClick={handleExportPDF}
            className="absolute top-1/2 right-0 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-md shadow-lg"
            style={{ transform: 'translate(150%, -50%)' }}
          >
            Export to PDF
          </button>
        )}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-100 mb-2 tracking-tight">{T.generateDetails}</h1>
          <div className="w-20 h-0.5 bg-slate-700 mx-auto rounded-full"></div>
        </div>
        
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 mb-6">
          <div className="max-w-sm mx-auto">
            <label htmlFor="order-search" className="block text-sm font-bold text-slate-400 mb-2">{T.selectAnOrder}</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><svg className="h-4 w-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg></div>
              <input id="order-search" type="text" value={searchTerm} onChange={handleSearchChange} onFocus={() => setIsSearchFocused(true)} onBlur={handleBlur} placeholder={T.searchPlaceholder} className="w-full pl-9 pr-4 py-2 font-semibold text-slate-200 bg-slate-700 border border-slate-600 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition placeholder-slate-500" autoComplete="off" />
              {isSearchFocused && filteredOrders.length > 0 && (
                <ul className="absolute w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-lg max-h-60 overflow-auto z-20">
                  {filteredOrders.map(order => (<li key={order.id} onClick={() => handleSelectOrder(order)} className="px-4 py-2 text-slate-300 hover:bg-slate-700 cursor-pointer"><span className="font-bold">{order.customerName}</span></li>))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {selectedOrder ? (
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden">
            <div className="bg-slate-800 p-4 border-b border-slate-700"><h2 className="text-xl font-bold text-slate-100 text-center">{T.orderDetailsFor} {selectedOrder.customerName}</h2></div>
            <div className="p-4 sm:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-800 p-4 rounded-lg border border-slate-700"><div className="flex items-center"><div className="w-9 h-9 bg-slate-700 rounded-md flex items-center justify-center mr-3"><svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg></div><div><p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{T.pickUpDate}</p><p className="text-sm font-bold text-slate-100">{formatDisplayDate(selectedOrder.pickUpDate, language)}</p></div></div></div>
                <div className="bg-slate-800 p-4 rounded-lg border border-slate-700"><div className="flex items-center"><div className="w-9 h-9 bg-slate-700 rounded-md flex items-center justify-center mr-3"><svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg></div><div><p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{T.deliveryDate}</p><p className="text-sm font-bold text-slate-100">{formatDisplayDate(selectedOrder.deliveryDate, language)}</p></div></div></div>
              </div>
              
              <div className="mb-6">
                <h3 className="text-md font-bold text-slate-200 mb-3">{T.orderItems}</h3>
                <div className="overflow-hidden rounded-lg border border-slate-700">
                  <table className="min-w-full divide-y divide-slate-700">
                    <thead className="bg-slate-800">
                      <tr>
                        <th scope="col" className="px-4 py-2 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">{T.itemName}</th>
                        <th scope="col" className="px-4 py-2 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">{T.pricePerItem}</th>
                        <th scope="col" className="px-4 py-2 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">{T.quantity}</th>
                        <th scope="col" className="px-4 py-2 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">{T.totalPriceForItem}</th>
                      </tr>
                    </thead>
                    <tbody className="bg-slate-800/50 divide-y divide-slate-700">
                      {selectedOrder.items.map((item) => (
                        <tr key={item.id}>
                          <td className="px-4 py-2 whitespace-nowrap text-sm font-bold text-slate-200">{item.itemName}</td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm font-bold text-slate-300 text-right">{formatCurrency(item.unitPrice)}</td>
                          <td className="px-4 py-2 whitespace-nowrap text-center"><span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-sm font-bold bg-slate-700 text-slate-200">{item.quantity}</span></td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm font-bold text-slate-100 text-right">{formatCurrency(item.total)}</td>
                        </tr>
                      ))}
                      {(selectedOrder.fees || []).map((fee, idx) => (
                        <tr key={`fee-${idx}`} className="bg-cyan-900/20">
                          <td className="px-4 py-2 whitespace-nowrap text-sm font-bold text-cyan-200">{fee.description}</td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm font-bold text-cyan-300 text-right">{formatCurrency(fee.amount)}</td>
                          <td className="px-4 py-2 whitespace-nowrap text-center text-cyan-300 font-style: italic">(Fee)</td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm font-bold text-cyan-100 text-right">{formatCurrency(fee.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              
              <div className="bg-slate-800 rounded-lg p-4 mb-6 border border-slate-700">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center"><span className="text-sm font-bold text-slate-400">{T.depositPayment}</span><span className="text-md font-bold text-slate-100">{formatCurrency(selectedOrder.deposit)}</span></div>
                    <div className="bg-slate-700/50 p-3 rounded-md border border-slate-600"><label htmlFor="deposit-deadline" className="block text-xs font-bold text-slate-400 mb-1">{T.deadlineForDeposit}</label><input id="deposit-deadline" type="date" value={depositDeadline} onChange={(e) => setDepositDeadline(e.target.value)} className="w-full bg-slate-600 border-slate-500 rounded p-1 text-sm font-semibold text-slate-200 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:[color-scheme:dark]"/></div>
                  </div>
                  <div className="space-y-4 lg:border-l lg:border-slate-700 lg:pl-4">
                    {typeof selectedOrder.finalPrice === 'number' ? (
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-bold text-purple-300">{T.finalPriceLabel}</span>
                        <span className="text-lg font-bold text-purple-100">{formatCurrency(selectedOrder.finalPrice)}</span>
                      </div>
                    ) : (
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-bold text-slate-400">{T.totalPriceForOrder}</span>
                        <span className="text-md font-bold text-slate-100">{formatCurrency(calculatedTotal)}</span>
                      </div>
                    )}
                    <div className="bg-slate-700/50 p-3 rounded-md border border-slate-600">
                      <div className="flex justify-between items-center">
                        <span className="text-md font-bold text-slate-200">{T.includingDeposit}</span>
                        <span className="text-lg font-bold text-white">{formatCurrency((selectedOrder.finalPrice ?? calculatedTotal) + (selectedOrder.deposit || 0))}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-md font-bold text-slate-200 mb-3 text-center">{T.additionalComments}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {commentKeys.map((key, index) => (<div key={key} className="bg-slate-700/50 text-slate-300 p-3 rounded-lg border border-slate-700"><div className="flex items-start"><div className="w-5 h-5 bg-slate-600 rounded-full flex items-center justify-center mr-2.5 mt-0.5 flex-shrink-0"><span className="text-xs font-bold text-slate-200">{index + 1}</span></div><p className="text-xs font-semibold leading-relaxed">{T[key]}</p></div></div>))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          !isLoading && (<div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-10 text-center text-slate-500 font-bold">Please select an order to begin.</div>)
        )}
        
        {isLoading && (<div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-10 text-center text-slate-400 font-bold">Loading...</div>)}
        {error && (<div className="bg-red-900/50 border border-red-700 rounded-2xl p-10 text-center text-red-300 font-bold">Error: {error}</div>)}
      </div>
    </main>
  );
}