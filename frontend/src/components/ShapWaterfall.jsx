import React from 'react';
import { 
  Sparkles, 
  ArrowUpRight, 
  ArrowDownRight, 
  HelpCircle,
  TrendingUp,
  ShieldCheck
} from 'lucide-react';

export default function ShapWaterfall({ shapData, predictedProbability, baseValue }) {
  if (!shapData || !shapData.feature_contributions) {
    return (
      <div className="h-64 flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-xl text-slate-500 text-xs">
        <Sparkles className="w-8 h-8 mb-2 opacity-40 text-slate-400" />
        <span>SHAP explanations will appear upon simulation</span>
      </div>
    );
  }

  const contributions = shapData.feature_contributions || [];
  const baseProb = baseValue !== undefined ? baseValue : shapData.base_value;
  const predProb = predictedProbability !== undefined ? predictedProbability : shapData.predicted_probability;

  // Max impact for proportional bar scaling
  const maxImpact = Math.max(...contributions.map(c => Math.abs(c.impact)), 0.05);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
        <div>
          <h4 className="text-sm font-semibold text-white flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>SHAP Local Feature Attribution Waterfall</span>
          </h4>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Key factors driving this customer's risk above or below baseline average
          </p>
        </div>
        <div className="flex items-center space-x-3 text-right">
          <div>
            <span className="text-[10px] text-slate-400 block uppercase">Base Risk</span>
            <span className="text-xs font-mono font-semibold text-slate-300">
              {(baseProb * 100).toFixed(1)}%
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block uppercase">Final Risk</span>
            <span className="text-xs font-mono font-bold text-white">
              {(predProb * 100).toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* Feature Attribution List */}
      <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
        {contributions.map((item, idx) => {
          const isRisk = item.impact >= 0;
          const impactPct = (Math.abs(item.impact) * 100).toFixed(1);
          const barWidth = Math.min(100, Math.round((Math.abs(item.impact) / maxImpact) * 100));

          return (
            <div 
              key={idx}
              className="p-2 rounded-lg bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 transition"
            >
              <div className="flex items-center justify-between text-xs mb-1.5">
                <div className="flex items-center space-x-1.5 truncate max-w-[240px]">
                  {isRisk ? (
                    <ArrowUpRight className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                  ) : (
                    <ArrowDownRight className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  )}
                  <span className="font-medium text-slate-200 truncate" title={item.feature}>
                    {item.feature}
                  </span>
                  {item.customer_value !== null && item.customer_value !== undefined && (
                    <span className="text-[10px] px-1.5 py-0.2 bg-slate-800 text-slate-400 rounded font-mono truncate max-w-[90px]">
                      {String(item.customer_value)}
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-2 flex-shrink-0">
                  <span className={`font-mono text-xs font-semibold ${isRisk ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {isRisk ? `+${impactPct}%` : `-${impactPct}%`}
                  </span>
                  <span className="text-[10px] text-slate-400 uppercase font-medium">
                    {isRisk ? 'Risk Driver' : 'Retention Anchor'}
                  </span>
                </div>
              </div>

              {/* Proportional Magnitude Bar */}
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden flex">
                <div 
                  className={`h-full rounded-full transition-all duration-300 ${
                    isRisk ? 'bg-gradient-to-r from-rose-600 to-rose-400' : 'bg-gradient-to-r from-emerald-600 to-emerald-400'
                  }`}
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
        <span className="flex items-center space-x-2">
          <span className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
            <span>Increases Risk</span>
          </span>
          <span className="flex items-center space-x-1 ml-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            <span>Protective Factor</span>
          </span>
        </span>
        <span className="font-mono text-[10px]">TreeExplainer • {shapData.latency_ms || 15}ms</span>
      </div>
    </div>
  );
}
