// src/app/statistics/page.tsx
'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { Line, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Title, Tooltip, Legend, BarElement } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Title, Tooltip, Legend, BarElement);

// --- Types ---
type KpiData = { totalLifetimeSales: number; totalSalesThisMonth: number; totalSalesThisYear: number; averageOrderValue: number; };
type SalesByItemData = { itemName: string; totalSales: number; roi: number; };
type MonthlySalesData = { month: number; sales: number; };
type MonthlySalesByYear = { [year: string]: MonthlySalesData[]; };
type Top10ItemByValue = { itemName: string; totalSales: number; };
type Top10ItemByFrequency = { name: string; count: number; };
type StatisticsData = { kpis: KpiData; salesByItem: SalesByItemData[]; monthlySales: MonthlySalesByYear; top10ByValue: Top10ItemByValue[]; top10ByFrequency: Top10ItemByFrequency[]; };

// --- Helper Functions ---
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('nb-NO', { style: 'currency', currency: 'NOK', minimumFractionDigits: 2, maximumFractionDigits: 2, }).format(value);
};

// --- KPI Card Component ---
function KpiCard({ title, value, icon, gradient, isCurrency = true }: { title: string; value: string | number; icon: React.ReactNode; gradient: string; isCurrency?: boolean; }) {
  return (
    <div className="bg-slate-800/90 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50 shadow-xl hover:shadow-2xl transition-all duration-300 hover:bg-slate-800">
      <div className="flex items-center">
        <div className={`p-3 rounded-full shadow-lg ${gradient}`}>{icon}</div>
        <div className="ml-4">
          <p className="text-sm font-medium text-slate-300">{title}</p>
          <p className="text-2xl font-bold text-white">{isCurrency ? formatCurrency(Number(value)) : value}</p>
        </div>
      </div>
    </div>
  );
}

export default function StatisticsPage() {
  const [stats, setStats] = useState<StatisticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());

  useEffect(() => {
    fetch('/api/statistics').then(res => res.json()).then(data => {
      if (data.error) {
        console.error("Failed to load statistics:", data.error);
        setLoading(false);
        return;
      }
      setStats(data);
      if (data.monthlySales && Object.keys(data.monthlySales).length > 0) {
        const years = Object.keys(data.monthlySales).sort((a, b) => parseInt(b) - parseInt(a));
        setSelectedYear(years[0]);
      }
      setLoading(false);
    });
  }, []);

  const sortedSalesByROI = useMemo(() => {
    if (!stats || !stats.salesByItem) return [];
    return [...stats.salesByItem].sort((a, b) => b.roi - a.roi);
  }, [stats]);

  const sortedSalesByItem = useMemo(() => {
    if (!stats || !stats.salesByItem) return [];
    return [...stats.salesByItem].sort((a, b) => b.totalSales - a.totalSales);
  }, [stats]);

  const availableYears = useMemo(() => {
    if (!stats || !stats.monthlySales) return [];
    return Object.keys(stats.monthlySales).sort((a, b) => parseInt(b) - parseInt(a));
  }, [stats]);

  const monthlySalesData = useMemo(() => {
    const dataForYear = stats?.monthlySales?.[selectedYear] || Array.from({ length: 12 }, (_, i) => ({ month: i + 1, sales: 0 }));
    return {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      datasets: [{ label: `Sales (${selectedYear})`, data: dataForYear.map(m => m.sales), borderColor: '#f59e0b', backgroundColor: 'rgba(245, 158, 11, 0.2)', tension: 0.3, fill: true }],
    };
  }, [stats?.monthlySales, selectedYear]);

  const pieChartData = useMemo(() => {
    if (!sortedSalesByItem || sortedSalesByItem.length === 0) {
        return { labels: [], datasets: [] };
    }
    const topItems = sortedSalesByItem.slice(0, 10);
    const otherSales = sortedSalesByItem.slice(10).reduce((sum, item) => sum + item.totalSales, 0);
    const itemNames = topItems.map(item => item.itemName);
    const itemSales = topItems.map(item => item.totalSales);
    if (otherSales > 0) { itemNames.push('Other'); itemSales.push(otherSales); }
    const backgroundColors = [
      '#f59e0b',
      '#14b8a6',
      '#0ea5e9',
      '#a78bfa',
      '#f472b6',
      '#84cc16',
      '#64748b',
      '#ef4444',
      '#eab308',
      '#8b5cf6',
      '#374151',
    ];
    return { labels: itemNames, datasets: [{ label: 'Sales by Item', data: itemSales, backgroundColor: backgroundColors, borderColor: '#1e293b', borderWidth: 2 }], };
  }, [sortedSalesByItem]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-stone-900">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mb-4"></div>
            <div className="text-xl text-slate-300 font-medium">Loading Statistics...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!stats || !stats.kpis || stats.kpis.totalLifetimeSales === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-stone-900">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-200 to-amber-400 bg-clip-text text-transparent mb-4">Statistics Dashboard</h1>
          </div>
          <div className="bg-slate-800/90 backdrop-blur-sm rounded-2xl p-12 text-center border border-slate-700/50 shadow-xl">
            <p className="text-2xl font-semibold text-slate-200">No Statistics Available</p>
            <p className="text-slate-400 mt-2">Complete some orders to generate statistics.</p>
          </div>
        </main>
      </div>
    );
  }

  const chartOptions = { 
    responsive: true, 
    maintainAspectRatio: false, 
    plugins: { 
      legend: { display: false, labels: { color: '#e2e8f0' } } 
    },
    scales: {
      x: { ticks: { color: '#94a3b8' }, grid: { color: '#334155' } },
      y: { ticks: { color: '#94a3b8' }, grid: { color: '#334155' } }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-stone-900">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-200 to-amber-400 bg-clip-text text-transparent mb-4">Statistics Dashboard</h1>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
          <KpiCard title="Lifetime Sales" value={stats.kpis.totalLifetimeSales} gradient="bg-gradient-to-r from-slate-600 to-slate-700" icon={<svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>} />
          <KpiCard title="This Year" value={stats.kpis.totalSalesThisYear} gradient="bg-gradient-to-r from-teal-600 to-emerald-700" icon={<svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>} />
          <KpiCard title="This Month" value={stats.kpis.totalSalesThisMonth} gradient="bg-gradient-to-r from-amber-600 to-orange-700" icon={<svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h5"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12A8 8 0 1013.2 5.2"></path></svg>} />
          <KpiCard title="Avg. Order Value" value={stats.kpis.averageOrderValue} gradient="bg-gradient-to-r from-stone-600 to-zinc-700" icon={<svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"></path></svg>} />
        </div>

        <div className="bg-slate-800/90 backdrop-blur-sm rounded-2xl border border-slate-700/50 shadow-xl overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-slate-700/50 bg-gradient-to-r from-slate-700/80 to-stone-700/80">
            <h2 className="text-xl font-semibold text-slate-200">Top Rented Items</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            <div>
              <h3 className="font-bold text-lg text-slate-300 mb-3 text-center">By Value</h3>
              <ul className="space-y-2">
                {stats.top10ByValue.map((item, index) => (
                  <li key={item.itemName} className="flex items-center justify-between p-2 rounded-lg bg-slate-700/70 hover:bg-slate-700 transition-all duration-200">
                    <div className="flex items-center">
                      <span className="text-sm font-bold text-slate-400 w-6 text-center">{index + 1}.</span>
                      <span className="font-semibold text-slate-200">{item.itemName}</span>
                    </div>
                    <span className="font-bold text-amber-400">{formatCurrency(item.totalSales)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-300 mb-3 text-center">By Frequency</h3>
              <ul className="space-y-2">
                {stats.top10ByFrequency.map((item, index) => (
                  <li key={item.name} className="flex items-center justify-between p-2 rounded-lg bg-slate-700/70 hover:bg-slate-700 transition-all duration-200">
                    <div className="flex items-center">
                      <span className="text-sm font-bold text-slate-400 w-6 text-center">{index + 1}.</span>
                      <span className="font-semibold text-slate-200">{item.name}</span>
                    </div>
                    <span className="font-bold text-teal-400">{item.count} orders</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/90 backdrop-blur-sm rounded-2xl border border-slate-700/50 shadow-xl overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-slate-700/50 bg-gradient-to-r from-slate-700/80 to-stone-700/80">
            <h2 className="text-xl font-semibold text-slate-200">Top 10 Items by ROI</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-700/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Item Name</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-300 uppercase tracking-wider">Total Sales</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-300 uppercase tracking-wider">Return on Investment (ROI)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {/* --- CHANGE 2: Add .slice(0, 10) to limit the list --- */}
                {sortedSalesByROI.slice(0, 10).map((item, index) => (
                  <tr key={index} className="hover:bg-slate-700/30 transition-all duration-200">
                    <td className="px-6 py-4 font-semibold text-slate-200">{item.itemName}</td>
                    <td className="px-6 py-4 text-right text-slate-300 font-medium">{formatCurrency(item.totalSales)}</td>
                    <td className={`px-6 py-4 text-right font-bold ${item.roi >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {item.roi.toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-6 gap-8">
          <div className="lg:col-span-3 bg-slate-800/90 backdrop-blur-sm rounded-2xl border border-slate-700/50 shadow-xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-slate-200">Monthly Sales</h2>
              <select 
                value={selectedYear} 
                onChange={(e) => setSelectedYear(e.target.value)} 
                className="px-3 py-1 border border-slate-600 rounded-lg shadow-sm focus:ring-2 focus:ring-amber-500 transition-all bg-slate-700 text-slate-200"
              >
                <option value="" disabled>Select Year</option>
                {availableYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            <div className="h-80">
              <Line data={monthlySalesData} options={chartOptions} />
            </div>
          </div>
          <div className="lg:col-span-3 bg-slate-800/90 backdrop-blur-sm rounded-2xl border border-slate-700/50 shadow-xl p-6 overflow-visible">
            <h2 className="text-xl font-semibold text-slate-200 text-center mb-4">Sales Distribution</h2>
            <div className="h-80 flex justify-center items-center overflow-visible">
              <Pie data={pieChartData} options={{...chartOptions, plugins: { legend: { position: 'right' as const, display: true, labels: { color: '#e2e8f0' } }}}}/>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}