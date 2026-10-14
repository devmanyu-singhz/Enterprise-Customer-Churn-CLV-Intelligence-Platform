import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import CustomerTable from './components/CustomerTable';
import IndividualPrediction from './pages/IndividualPrediction';
import ModelAnalytics from './pages/ModelAnalytics';
import api from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [systemStatus, setSystemStatus] = useState(null);
  
  // State for Customer Directory Table
  const [customers, setCustomers] = useState([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [riskTier, setRiskTier] = useState('all');
  const [sortBy, setSortBy] = useState('churn_probability');
  const [order, setOrder] = useState('desc');
  const [tableLoading, setTableLoading] = useState(false);

  // Selected customer for What-If Inspector
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // Fetch health and system status
  const checkHealth = async () => {
    try {
      const status = await api.checkHealth();
      setSystemStatus(status);
    } catch (err) {
      console.error('System health check failed:', err);
    }
  };

  // Fetch customer directory records
  const fetchCustomers = async () => {
    try {
      setTableLoading(true);
      const res = await api.predictBatch({
        page,
        limit: 15,
        sort_by: sortBy,
        order,
        risk_tier_filter: riskTier,
        search: search.trim() || undefined,
      });
      setCustomers(res.customers || []);
      setTotalRecords(res.total_records || 0);
      setTotalPages(res.total_pages || 1);
    } catch (err) {
      console.error('Failed to fetch customer batch predictions:', err);
    } finally {
      setTableLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  useEffect(() => {
    if (activeTab === 'directory') {
      fetchCustomers();
    }
  }, [activeTab, page, sortBy, order, riskTier, search]);

  const handleSelectCustomer = (customer) => {
    setSelectedCustomer(customer);
    setActiveTab('inspector');
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Persistent Left Navigation Sidebar */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        systemStatus={systemStatus} 
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Navbar */}
        <header className="h-14 border-b border-slate-800 bg-slate-900/60 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-400 font-medium">Enterprise Portal</span>
            <span className="text-slate-600">/</span>
            <span className="text-xs text-emerald-400 font-semibold uppercase tracking-wider">
              {activeTab === 'dashboard' && 'Executive Intelligence Dashboard'}
              {activeTab === 'directory' && 'Customer Risk Directory & Scoring'}
              {activeTab === 'inspector' && 'Customer Inspector & What-If Simulator'}
              {activeTab === 'analytics' && 'Model Governance & Global SHAP'}
            </span>
          </div>

          <div className="flex items-center space-x-3 text-xs">
            <div className="hidden sm:flex items-center space-x-2 px-2.5 py-1 rounded-md bg-slate-950 border border-slate-800 font-mono text-slate-300">
              <span className="text-slate-500">Engine:</span>
              <span className="text-emerald-400">XGBoost 3.2 + CoxPH</span>
            </div>
          </div>
        </header>

        {/* Tab Content Router */}
        <div className="flex-1 p-6 max-w-7xl w-full mx-auto">
          {activeTab === 'dashboard' && (
            <Dashboard 
              onNavigateToDirectory={() => setActiveTab('directory')} 
              onNavigateToSimulator={() => setActiveTab('inspector')} 
            />
          )}

          {activeTab === 'directory' && (
            <div className="space-y-4">
              <div className="pb-2 border-b border-slate-800">
                <h1 className="text-xl font-bold text-white tracking-tight">Customer Risk & CLV Directory</h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  Full customer scoring table with calibrated churn risk, survival lifetime, and dynamic CLV.
                </p>
              </div>

              <CustomerTable
                customers={customers}
                totalRecords={totalRecords}
                page={page}
                setPage={setPage}
                totalPages={totalPages}
                search={search}
                setSearch={setSearch}
                riskTier={riskTier}
                setRiskTier={setRiskTier}
                sortBy={sortBy}
                setSortBy={setSortBy}
                order={order}
                setOrder={setOrder}
                onSelectCustomer={handleSelectCustomer}
                loading={tableLoading}
              />
            </div>
          )}

          {activeTab === 'inspector' && (
            <IndividualPrediction initialCustomer={selectedCustomer} />
          )}

          {activeTab === 'analytics' && (
            <ModelAnalytics onModelRetrained={() => {
              checkHealth();
              if (activeTab === 'directory') fetchCustomers();
            }} />
          )}
        </div>
      </main>
    </div>
  );
}
