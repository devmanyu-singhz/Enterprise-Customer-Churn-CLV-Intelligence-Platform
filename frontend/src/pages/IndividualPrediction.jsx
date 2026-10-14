import React, { useState, useEffect, useRef } from 'react';
import { 
  Sliders, 
  RotateCcw, 
  Sparkles, 
  ShieldCheck, 
  Activity, 
  User, 
  FileText,
  AlertCircle
} from 'lucide-react';
import WhatIfSimulator from '../components/WhatIfSimulator';
import SurvivalChart from '../components/SurvivalChart';
import ShapWaterfall from '../components/ShapWaterfall';
import api from '../services/api';

const DEFAULT_CUSTOMER = {
  customerID: '7001-TELCO',
  gender: 'Female',
  SeniorCitizen: 0,
  Partner: 'No',
  Dependents: 'No',
  tenure: 12,
  PhoneService: 'Yes',
  MultipleLines: 'No',
  InternetService: 'Fiber optic',
  OnlineSecurity: 'No',
  OnlineBackup: 'No',
  DeviceProtection: 'No',
  TechSupport: 'No',
  StreamingTV: 'No',
  StreamingMovies: 'No',
  Contract: 'Month-to-month',
  PaperlessBilling: 'Yes',
  PaymentMethod: 'Electronic check',
  MonthlyCharges: 85.50,
  TotalCharges: 1026.00,
  SupportTickets: 3
};

export default function IndividualPrediction({ initialCustomer }) {
  const [baselineCustomer, setBaselineCustomer] = useState(initialCustomer || DEFAULT_CUSTOMER);
  const [params, setParams] = useState(initialCustomer || DEFAULT_CUSTOMER);
  
  const [baselinePred, setBaselinePred] = useState(null);
  const [simulatedPred, setSimulatedPred] = useState(null);
  const [shapData, setShapData] = useState(null);
  const [personas, setPersonas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const debounceTimeout = useRef(null);

  // Load sample archetypes on mount
  useEffect(() => {
    const loadPersonas = async () => {
      try {
        const p = await api.getSampleCustomers();
        setPersonas(p);
      } catch (err) {
        console.error('Failed to load personas:', err);
      }
    };
    loadPersonas();
  }, []);

  // When initial customer prop changes
  useEffect(() => {
    if (initialCustomer) {
      setBaselineCustomer(initialCustomer);
      setParams(initialCustomer);
    }
  }, [initialCustomer]);

  // Run initial baseline and simulated predictions
  const runSimulation = async (currentParams, isBaseline = false) => {
    try {
      setLoading(true);
      setError(null);

      const [predResult, shapResult] = await Promise.all([
        api.predictIndividual(currentParams),
        api.explainIndividual(currentParams)
      ]);

      setSimulatedPred(predResult);
      setShapData(shapResult);

      if (isBaseline || !baselinePred) {
        setBaselinePred(predResult);
      }
    } catch (err) {
      console.error('Simulation error:', err);
      setError('Failed to compute real-time simulation. Verify backend engine is active.');
    } finally {
      setLoading(false);
    }
  };

  // Initial simulation on mount
  useEffect(() => {
    runSimulation(baselineCustomer, true);
  }, [baselineCustomer]);

  // Handle parameter changes with smooth 150ms debounce
  const handleParamChange = (field, value) => {
    const updated = { ...params, [field]: value };
    if (field === 'MonthlyCharges' || field === 'tenure') {
      updated.TotalCharges = Number((updated.MonthlyCharges * updated.tenure).toFixed(2));
    }
    setParams(updated);

    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    debounceTimeout.current = setTimeout(() => {
      runSimulation(updated, false);
    }, 180);
  };

  const handleReset = () => {
    setParams(baselineCustomer);
    runSimulation(baselineCustomer, false);
  };

  const handleSelectPersona = (personaData) => {
    setBaselineCustomer(personaData);
    setParams(personaData);
    runSimulation(personaData, true);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-white tracking-tight">Customer Risk Inspector & What-If Studio</h1>
            <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs font-medium font-mono">
              {params.customerID || 'CUSTOM-SIM'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time multi-variate simulation combining XGBoost risk modeling, Lifelines survival projection, and SHAP attribution.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* What-If Simulator Levers & Top Impact Cards */}
      <WhatIfSimulator
        baselineData={baselinePred}
        simulatedData={simulatedPred}
        params={params}
        onChangeParam={handleParamChange}
        onReset={handleReset}
        onSimulate={() => runSimulation(params, false)}
        loading={loading}
        personas={personas}
        onSelectPersona={handleSelectPersona}
      />

      {/* Visual Analytics Row: Survival Curve & SHAP Waterfall */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Survival Curve */}
        <SurvivalChart
          survivalCurve={simulatedPred?.survival_curve}
          currentTenure={params.tenure}
          expectedLifetime={simulatedPred?.expected_lifetime_months || 0}
        />

        {/* Right: SHAP Local Waterfall */}
        <ShapWaterfall
          shapData={shapData}
          predictedProbability={simulatedPred?.churn_probability}
          baseValue={shapData?.base_value}
        />
      </div>
    </div>
  );
}
