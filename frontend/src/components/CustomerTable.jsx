import React from 'react';
import { 
  Search, 
  Filter, 
  ArrowUpDown, 
  ChevronLeft, 
  ChevronRight, 
  SlidersHorizontal,
  ExternalLink
} from 'lucide-react';

export default function CustomerTable({ 
  customers, 
  totalRecords, 
  page, 
  setPage, 
  totalPages,
  search, 
  setSearch, 
  riskTier, 
  setRiskTier, 
  sortBy, 
  setSortBy,
  order,
  setOrder,
  onSelectCustomer,
  loading 
}) {
  const getRiskBadge = (tier) => {
    switch (tier) {
      case 'High Risk':
        return 'bg-rose-500/15 text-rose-400 border border-rose-500/30';
      case 'Medium Risk':
        return 'bg-amber-500/15 text-amber-400 border border-amber-500/30';
      case 'Low Risk':
      default:
        return 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30';
    }
  };

  const getProbColor = (prob) => {
    if (prob > 0.65) return 'bg-rose-500';
    if (prob > 0.35) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl shadow-xl overflow-hidden flex flex-col">
      {/* Table Header & Controls Bar */}
      <div className="p-4 border-b border-slate-800 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-slate-900">
        <div className="flex items-center space-x-2">
          <h3 className="text-base font-semibold text-white">Customer Risk Directory</h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
            {totalRecords.toLocaleString()} accounts
          </span>
        </div>

        {/* Search, Filter & Sort Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Input */}
          <div className="relative min-w-[200px] flex-1 lg:flex-none">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input 
              type="text"
              placeholder="Search Customer ID, Contract..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30"
            />
          </div>

          {/* Risk Tier Filter */}
          <div className="flex items-center space-x-1.5 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={riskTier}
              onChange={(e) => {
                setRiskTier(e.target.value);
                setPage(1);
              }}
              className="bg-transparent text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-slate-900 text-slate-200">All Risk Tiers</option>
              <option value="High Risk" className="bg-slate-900 text-rose-400">High Risk</option>
              <option value="Medium Risk" className="bg-slate-900 text-amber-400">Medium Risk</option>
              <option value="Low Risk" className="bg-slate-900 text-emerald-400">Low Risk</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="flex items-center space-x-1.5 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-transparent text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="churn_probability" className="bg-slate-900">Sort by Churn Risk</option>
              <option value="estimated_clv" className="bg-slate-900">Sort by Estimated CLV</option>
              <option value="tenure" className="bg-slate-900">Sort by Tenure</option>
              <option value="MonthlyCharges" className="bg-slate-900">Sort by Monthly Bill</option>
              <option value="expected_lifetime_months" className="bg-slate-900">Sort by Expected Lifetime</option>
            </select>
            <button
              onClick={() => setOrder(order === 'desc' ? 'asc' : 'desc')}
              className="text-[10px] font-mono text-emerald-400 hover:text-emerald-300 ml-1 px-1 bg-slate-800 rounded"
              title="Toggle sort direction"
            >
              {order.toUpperCase()}
            </button>
          </div>
        </div>
      </div>

      {/* Responsive Table */}
      <div className="overflow-x-auto flex-1">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-semibold tracking-wider uppercase text-[10px]">
              <th className="py-3 px-4">Customer ID</th>
              <th className="py-3 px-3">Contract</th>
              <th className="py-3 px-3 text-right">Tenure</th>
              <th className="py-3 px-3 text-right">Monthly</th>
              <th className="py-3 px-4">Churn Risk Score</th>
              <th className="py-3 px-3">Risk Tier</th>
              <th className="py-3 px-3 text-right">Remaining Life</th>
              <th className="py-3 px-3 text-right">Dynamic CLV</th>
              <th className="py-3 px-4 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {loading ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-400">
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
                    <span>Scoring active customer portfolio...</span>
                  </div>
                </td>
              </tr>
            ) : customers.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-400">
                  No customers matched the current filter criteria.
                </td>
              </tr>
            ) : (
              customers.map((c) => {
                const probPct = Math.round(c.churn_probability * 100);
                return (
                  <tr 
                    key={c.customerID}
                    className="hover:bg-slate-800/40 transition-colors duration-150 group"
                  >
                    <td className="py-3 px-4 font-mono font-medium text-slate-200">
                      {c.customerID}
                    </td>
                    <td className="py-3 px-3 text-slate-300">
                      <span className="truncate block max-w-[110px]" title={c.Contract}>
                        {c.Contract}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-300">
                      {c.tenure} mo
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-300">
                      ${c.MonthlyCharges?.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 min-w-[140px]">
                      <div className="flex items-center space-x-2">
                        <div className="flex-1 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${getProbColor(c.churn_probability)}`}
                            style={{ width: `${probPct}%` }}
                          />
                        </div>
                        <span className="font-mono text-[11px] text-slate-200 w-8 text-right font-semibold">
                          {probPct}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full inline-block ${getRiskBadge(c.risk_tier)}`}>
                        {c.risk_tier}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-300">
                      {c.expected_lifetime_months} mo
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-semibold text-emerald-400">
                      ${c.estimated_clv?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => onSelectCustomer(c)}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded text-[11px] font-medium transition-colors"
                        title="Open customer in What-If Simulator"
                      >
                        <SlidersHorizontal className="w-3 h-3" />
                        <span>Simulate</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
        <span>
          Showing Page <strong className="text-slate-200 font-mono">{page}</strong> of <strong className="text-slate-200 font-mono">{totalPages}</strong>
        </span>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="p-1.5 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-[11px] font-mono text-slate-400 px-1">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className="p-1.5 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
