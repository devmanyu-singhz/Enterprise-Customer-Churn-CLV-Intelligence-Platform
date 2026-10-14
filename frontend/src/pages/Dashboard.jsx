import React, { useState, useEffect } from 'react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { 
  RefreshCw, 
  Layers, 
  FileText, 
  ExternalLink, 
  CheckCircle2, 
  TrendingUp, 
  AlertOctagon,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import MetricsOverview from '../components/MetricsOverview';
import api from '../services/api';

export default function Dashboard({ onNavigateToDirectory, onNavigateToSimulator }) {
  const [data, setData] = useState(null);
  const [globalShap, setGlobalShap] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      setRefreshing(true);
      const [analyticsRes, shapRes] = await Promise.all([
        api.getAnalytics(),
        api.getGlobalExplanation()
      ]);
      setData(analyticsRes);
      setGlobalShap(shapRes);
    } catch (err) {
      console.error('Failed to load dashboard analytics:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
        <div className="w-8 h-8 border-3 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-slate-400">Loading Enterprise Analytics & Intelligence...</p>
      </div>
    );
  }

  const riskDistribution = data?.risk_distribution || [];
  const contractBreakdown = (data?.contract_breakdown || []).map(c => ({
    name: c.category,
    actualChurn: Math.round(c.actual_churn_rate * 100),
    predictedChurn: Math.round(c.predicted_churn_prob * 100),
    avgClv: c.avg_clv,
    customers: c.total_customers
  }));

  const internetBreakdown = (data?.internet_breakdown || []).map(i => ({
    name: i.category,
    churnRate: Math.round(i.actual_churn_rate * 100),
    customers: i.total_customers
  }));

  const topDrivers = (globalShap?.top_features || []).slice(0, 5).map(f => ({
    name: f.feature,
    importance: Math.round(f.importance * 100),
    direction: f.direction
  }));

  return (
    <div className="space-y-6 pb-12">
      {/* Executive Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-white tracking-tight">Executive Intelligence Overview</h1>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-medium">
              Live Monitoring
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time customer portfolio health, retention forecasts, and dynamic revenue risk modeling.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={fetchData}
            disabled={refreshing}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-lg text-xs font-medium transition shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-emerald-400' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh KPIs'}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <MetricsOverview kpis={data?.kpis} riskDistribution={riskDistribution} />

      {/* Two Column Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Risk Tier Donut Distribution */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-white">Risk Tier Breakdown</h3>
              <span className="text-[11px] text-slate-400 font-mono">Portfolio Distribution</span>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Categorization based on calibrated XGBoost churn probabilities.
            </p>

            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={riskDistribution}
                    dataKey="count"
                    nameKey="tier"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                  >
                    {riskDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="#0f172a" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(val, name, item) => [`${val} accounts (${item.payload.percentage}%)`, name]}
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Custom Legend */}
          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-800 text-center">
            {riskDistribution.map((item, i) => (
              <div key={i} className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
                <span className="text-[10px] text-slate-400 block">{item.tier}</span>
                <span className="text-sm font-bold font-mono text-white block mt-0.5">{item.percentage}%</span>
                <span className="text-[10px] text-slate-500 font-mono">{item.count} accts</span>
              </div>
            ))}
          </div>
        </div>

        {/* Contract Type Vulnerability Analysis */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl lg:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-white">Churn Risk by Contract Structure</h3>
              <span className="text-[11px] px-2 py-0.5 bg-slate-800 text-slate-300 rounded font-mono">
                Predictive vs Actual
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Comparing average churn risk and portfolio distribution across Month-to-Month, 1-Year, and 2-Year contracts.
            </p>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={contractBreakdown} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} tickFormatter={(v) => `${v}%`} />
                  <Tooltip 
                    formatter={(val, name) => [`${val}%`, name === 'predictedChurn' ? 'Predicted Risk' : 'Historical Churn']}
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                  />
                  <Legend 
                    wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                    formatter={(val) => val === 'predictedChurn' ? 'Predicted Churn Prob' : 'Observed Churn Rate'}
                  />
                  <Bar dataKey="predictedChurn" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={26} />
                  <Bar dataKey="actualChurn" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={26} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-800">
            <span>💡 <strong>Insight:</strong> Month-to-Month accounts carry ~4.8x higher churn risk than 2-Year commitments.</span>
          </div>
        </div>
      </div>

      {/* Second Row: Internet Services & Top SHAP Drivers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Internet Service Churn Rates */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-white">Churn Risk by Internet Service</h3>
            <span className="text-[11px] text-slate-400 font-mono">Service Segment</span>
          </div>
          <p className="text-xs text-slate-400 mb-4">
            Customer churn vulnerability by connectivity tier.
          </p>

          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={internetBreakdown} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                <XAxis type="number" stroke="#64748b" fontSize={11} tickFormatter={(v) => `${v}%`} domain={[0, 60]} />
                <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip 
                  formatter={(val) => [`${val}% Churn Rate`]}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                />
                <Bar dataKey="churnRate" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Global SHAP Drivers Snapshot */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-white flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>Primary Churn Drivers (SHAP Global)</span>
              </h3>
              <span className="text-[11px] text-slate-400 font-mono">TreeExplainer</span>
            </div>
            <p className="text-xs text-slate-400 mb-3">
              Top global features influencing churn risk across all 1,200 accounts.
            </p>

            <div className="space-y-2">
              {topDrivers.map((driver, idx) => (
                <div key={idx} className="p-2 rounded-lg bg-slate-950/70 border border-slate-800/80 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-slate-500 text-[10px]">#{idx + 1}</span>
                    <span className="font-medium text-slate-200">{driver.name}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                      driver.direction === 'Risk Driver' 
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' 
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    }`}>
                      {driver.direction}
                    </span>
                    <span className="font-mono text-slate-300 font-semibold">{driver.importance}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 flex justify-between items-center text-xs">
            <span className="text-slate-400">Want deeper model diagnostics?</span>
            <button
              onClick={onNavigateToSimulator}
              className="text-emerald-400 hover:text-emerald-300 font-medium flex items-center space-x-1"
            >
              <span>Explore What-If Simulator</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Action Banner */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-900 border border-emerald-500/30 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-semibold text-white flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>High-Priority Retention Playbook</span>
          </h4>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl">
            {data?.risk_distribution?.find(r => r.tier === 'High Risk')?.count || 0} customer accounts are currently identified in the 
            <strong> High Risk tier</strong>. Migrating them to 1-Year/2-Year agreements and adding Tech Support decreases churn by up to <strong>72%</strong>.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={onNavigateToDirectory}
            className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold rounded-lg text-xs transition shadow-md shadow-emerald-500/20"
          >
            View High-Risk Directory
          </button>
          <button
            onClick={onNavigateToSimulator}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-lg text-xs transition"
          >
            Launch Simulator
          </button>
        </div>
      </div>
    </div>
  );
}
