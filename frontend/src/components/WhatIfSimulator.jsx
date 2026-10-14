import React, { useState, useEffect } from 'react';
import { 
  Sliders, 
  RotateCcw, 
  TrendingDown, 
  TrendingUp, 
  DollarSign, 
  ShieldCheck, 
  Clock, 
  Sparkles,
  Zap
} from 'lucide-react';

export default function WhatIfSimulator({
  baselineData,
  simulatedData,
  params,
  onChangeParam,
  onReset,
  onSimulate,
  loading,
  personas,
  onSelectPersona
}) {
  const getRiskColor = (tier) => {
    switch (tier) {
      case 'High Risk':
        return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
      case 'Medium Risk':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      case 'Low Risk':
      default:
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
    }
  };

  const churnProbBase = baselineData ? baselineData.churn_probability : 0;
  const churnProbSim = simulatedData ? simulatedData.churn_probability : 0;
  const churnDelta = ((churnProbSim - churnProbBase) * 100);

  const clvBase = baselineData ? baselineData.estimated_clv : 0;
  const clvSim = simulatedData ? simulatedData.estimated_clv : 0;
  const clvDelta = clvSim - clvBase;

  const lifeBase = baselineData ? baselineData.expected_lifetime_months : 0;
  const lifeSim = simulatedData ? simulatedData.expected_lifetime_months : 0;
  const lifeDelta = lifeSim - lifeBase;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl space-y-5">
      {/* Simulator Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
        <div>
          <h3 className="text-base font-semibold text-white flex items-center space-x-2">
            <Sliders className="w-4 h-4 text-emerald-400" />
            <span>Interactive Retention & CLV What-If Simulator</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Tweak customer contract, pricing, and service parameters to observe real-time risk reduction and CLV expansion.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2">
          {personas && personas.length > 0 && (
            <select
              onChange={(e) => {
                const found = personas.find(p => p.id === e.target.value);
                if (found) onSelectPersona(found.data);
              }}
              defaultValue=""
              className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-emerald-500"
            >
              <option value="" disabled>Load Archetype Persona...</option>
              {personas.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          )}

          <button
            onClick={onReset}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
            title="Reset parameters to original customer state"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Real-time Outcome Impact Comparison Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Churn Probability Delta */}
        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 relative overflow-hidden">
          <span className="text-[11px] font-medium text-slate-400 block mb-1">Simulated Churn Risk</span>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold font-mono text-white">
              {(churnProbSim * 100).toFixed(1)}%
            </span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${getRiskColor(simulatedData?.risk_tier)}`}>
              {simulatedData?.risk_tier}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-slate-800/80">
            <span className="text-slate-400">Baseline: {(churnProbBase * 100).toFixed(1)}%</span>
            <span className={`font-mono font-semibold flex items-center ${churnDelta <= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {churnDelta <= 0 ? <TrendingDown className="w-3 h-3 mr-0.5" /> : <TrendingUp className="w-3 h-3 mr-0.5" />}
              {churnDelta > 0 ? `+${churnDelta.toFixed(1)}%` : `${churnDelta.toFixed(1)}%`}
            </span>
          </div>
        </div>

        {/* Expected Remaining Lifetime Delta */}
        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 relative overflow-hidden">
          <span className="text-[11px] font-medium text-slate-400 block mb-1">Expected Remaining Life</span>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold font-mono text-white">
              {lifeSim} <span className="text-xs font-normal text-slate-400">months</span>
            </span>
          </div>

          <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-slate-800/80">
            <span className="text-slate-400">Baseline: {lifeBase} mo</span>
            <span className={`font-mono font-semibold flex items-center ${lifeDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {lifeDelta >= 0 ? `+${lifeDelta.toFixed(1)} mo` : `${lifeDelta.toFixed(1)} mo`}
            </span>
          </div>
        </div>

        {/* Dynamic CLV Delta */}
        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 relative overflow-hidden">
          <span className="text-[11px] font-medium text-slate-400 block mb-1">Dynamic CLV (Remaining)</span>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold font-mono text-emerald-400">
              ${clvSim.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-slate-800/80">
            <span className="text-slate-400">Baseline: ${clvBase?.toFixed(2)}</span>
            <span className={`font-mono font-semibold flex items-center ${clvDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {clvDelta >= 0 ? `+$${clvDelta.toFixed(2)}` : `-$${Math.abs(clvDelta).toFixed(2)}`}
            </span>
          </div>
        </div>
      </div>

      {/* Interactive Controls Form */}
      <div className="space-y-4 pt-2">
        <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
          <Zap className="w-3.5 h-3.5 text-emerald-400" />
          <span>Interactive Levers & Parameters</span>
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Contract Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300 flex justify-between">
              <span>Contract Agreement</span>
              <span className="text-emerald-400 font-mono text-[11px]">{params.Contract}</span>
            </label>
            <select
              value={params.Contract}
              onChange={(e) => onChangeParam('Contract', e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="Month-to-month">Month-to-month (High Risk)</option>
              <option value="One year">One year (Moderate Risk)</option>
              <option value="Two year">Two year (High Retention Anchor)</option>
            </select>
          </div>

          {/* Monthly Charges Slider */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300 flex justify-between">
              <span>Monthly Charges</span>
              <span className="text-emerald-400 font-mono text-[11px]">${params.MonthlyCharges}</span>
            </label>
            <input
              type="range"
              min="18"
              max="125"
              step="1"
              value={params.MonthlyCharges}
              onChange={(e) => onChangeParam('MonthlyCharges', parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>$18/mo</span>
              <span>$125/mo</span>
            </div>
          </div>

          {/* Support Tickets Slider */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300 flex justify-between">
              <span>Monthly Support Tickets</span>
              <span className="text-rose-400 font-mono text-[11px]">{params.SupportTickets} tickets</span>
            </label>
            <input
              type="range"
              min="0"
              max="8"
              step="1"
              value={params.SupportTickets}
              onChange={(e) => onChangeParam('SupportTickets', parseInt(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>0 (Satisfied)</span>
              <span>8 (Severe Friction)</span>
            </div>
          </div>

          {/* Tenure Slider */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300 flex justify-between">
              <span>Customer Tenure</span>
              <span className="text-emerald-400 font-mono text-[11px]">{params.tenure} months</span>
            </label>
            <input
              type="range"
              min="1"
              max="72"
              step="1"
              value={params.tenure}
              onChange={(e) => onChangeParam('tenure', parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>1 month</span>
              <span>72 months</span>
            </div>
          </div>

          {/* Tech Support */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300 flex justify-between">
              <span>Tech Support Subscription</span>
              <span className="text-emerald-400 font-mono text-[11px]">{params.TechSupport}</span>
            </label>
            <select
              value={params.TechSupport}
              onChange={(e) => onChangeParam('TechSupport', e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="Yes">Yes (VIP Tech Support)</option>
              <option value="No">No (Unassisted)</option>
              <option value="No internet service">No internet service</option>
            </select>
          </div>

          {/* Payment Method */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300 flex justify-between">
              <span>Payment Method</span>
              <span className="text-emerald-400 font-mono text-[11px]">{params.PaymentMethod}</span>
            </label>
            <select
              value={params.PaymentMethod}
              onChange={(e) => onChangeParam('PaymentMethod', e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="Electronic check">Electronic check (Higher Churn)</option>
              <option value="Bank transfer (automatic)">Bank transfer (automatic)</option>
              <option value="Credit card (automatic)">Credit card (automatic)</option>
              <option value="Mailed check">Mailed check</option>
            </select>
          </div>

          {/* Internet Service */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300 flex justify-between">
              <span>Internet Service Type</span>
              <span className="text-emerald-400 font-mono text-[11px]">{params.InternetService}</span>
            </label>
            <select
              value={params.InternetService}
              onChange={(e) => onChangeParam('InternetService', e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="Fiber optic">Fiber optic (Gigabit High-Speed)</option>
              <option value="DSL">DSL (Broadband)</option>
              <option value="No">No Internet Service</option>
            </select>
          </div>

          {/* Online Security */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300 flex justify-between">
              <span>Online Security Add-on</span>
              <span className="text-emerald-400 font-mono text-[11px]">{params.OnlineSecurity}</span>
            </label>
            <select
              value={params.OnlineSecurity}
              onChange={(e) => onChangeParam('OnlineSecurity', e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="Yes">Yes (Protected)</option>
              <option value="No">No (Unprotected)</option>
              <option value="No internet service">No internet service</option>
            </select>
          </div>

          {/* Paperless Billing */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300 flex justify-between">
              <span>Paperless Billing</span>
              <span className="text-emerald-400 font-mono text-[11px]">{params.PaperlessBilling}</span>
            </label>
            <select
              value={params.PaperlessBilling}
              onChange={(e) => onChangeParam('PaperlessBilling', e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="Yes">Yes (Paperless Digital)</option>
              <option value="No">No (Paper Mail Invoicing)</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
