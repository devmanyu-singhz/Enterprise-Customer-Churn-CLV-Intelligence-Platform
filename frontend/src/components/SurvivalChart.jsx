import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { Calendar, ShieldCheck, Activity } from 'lucide-react';

export default function SurvivalChart({ survivalCurve, currentTenure, expectedLifetime }) {
  if (!survivalCurve || survivalCurve.length === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-xl text-slate-500 text-xs">
        <Activity className="w-8 h-8 mb-2 opacity-40 text-slate-400" />
        <span>Survival curve will render upon simulation</span>
      </div>
    );
  }

  // Format data for Recharts
  const data = survivalCurve.map((pt) => ({
    month: pt.month,
    displayMonth: `+${pt.month}m`,
    futureTenure: pt.future_tenure,
    probability: Math.round(pt.probability * 100),
    rawProb: pt.probability,
  }));

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const p = payload[0].payload;
      return (
        <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-2xl text-xs space-y-1">
          <div className="font-semibold text-emerald-400 flex items-center space-x-1.5">
            <Calendar className="w-3.5 h-3.5" />
            <span>Horizon: +{p.month} Months (Tenure: {p.futureTenure}m)</span>
          </div>
          <div className="text-slate-200 flex justify-between space-x-4">
            <span className="text-slate-400">Survival Probability:</span>
            <span className="font-mono font-bold text-white">{p.probability}%</span>
          </div>
          <div className="text-[11px] text-slate-400 border-t border-slate-800 pt-1">
            Cox Proportional Hazards Projection
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
        <div>
          <h4 className="text-sm font-semibold text-white flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Customer Survival Horizon Curve</span>
          </h4>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Probability of account staying active over the next 36 months (Right-Censored Cox Model)
          </p>
        </div>
        <div className="text-right">
          <span className="text-[11px] text-slate-400 block">Expected Remaining:</span>
          <span className="text-sm font-mono font-bold text-emerald-400">
            {expectedLifetime} Months
          </span>
        </div>
      </div>

      <div className="h-56 w-full pt-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="survivalGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis 
              dataKey="displayMonth" 
              stroke="#64748b" 
              fontSize={10} 
              tickLine={false} 
              axisLine={{ stroke: '#334155' }}
            />
            <YAxis 
              domain={[0, 100]} 
              stroke="#64748b" 
              fontSize={10} 
              tickLine={false} 
              axisLine={{ stroke: '#334155' }}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={50} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: '50% Median Line', fill: '#f59e0b', fontSize: 9, position: 'insideTopLeft' }} />
            <Area 
              type="monotone" 
              dataKey="probability" 
              stroke="#10b981" 
              strokeWidth={2.5} 
              fillOpacity={1} 
              fill="url(#survivalGradient)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
        <span className="flex items-center space-x-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
          <span>Active Tenure baseline: <strong className="text-slate-200">{currentTenure} months</strong></span>
        </span>
        <span className="text-slate-400">Lifelines CoxPH Engine</span>
      </div>
    </div>
  );
}
