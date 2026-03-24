import React, { useState, useEffect, useMemo } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { RiskGauge } from './components/RiskGauge';
import { DiagnosticParameters } from './components/DiagnosticParameters';
import { SurveyForm } from './components/SurveyForm';
import { Search, ChevronDown, Maximize2, Sparkles, Loader2, LayoutDashboard, Microscope, Calendar as CalendarIcon, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";
import { cn } from './lib/utils';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

interface Asset {
  id: string;
  feeder: string;
  load: number;
  voltage: number;
  trips: number;
  sound: number;
  thermal: number;
  age: number;
  status: 'Healthy' | 'Warning' | 'Critical';
  riskScore: number;
  planMonth: string;
  image?: string;
}

const INITIAL_ASSETS: Asset[] = Array.from({ length: 20 }, (_, i) => ({
  id: `TR-KTD-${String(i + 1).padStart(3, '0')}`,
  feeder: ['EM-418', 'SAM-13', 'PI-435', 'NS-436', 'SA-411'][i % 5],
  load: 0,
  voltage: 220,
  trips: 0,
  sound: 45,
  thermal: 50,
  age: Math.floor(Math.random() * 25) + 5,
  status: 'Healthy',
  riskScore: 0,
  planMonth: 'Routine Check',
}));

export default function App() {
  const [assets, setAssets] = useState<Asset[]>(INITIAL_ASSETS);
  const [selectedId, setSelectedId] = useState(INITIAL_ASSETS[0].id);
  const [activeTab, setActiveTab] = useState<'overview' | 'diagnostics' | 'plan'>('diagnostics');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);

  const selectedAsset = useMemo(() => 
    assets.find(a => a.id === selectedId) || assets[0], 
  [assets, selectedId]);

  const stats = useMemo(() => ({
    total: assets.length,
    critical: assets.filter(a => a.status === 'Critical').length,
    warning: assets.filter(a => a.status === 'Warning').length,
    healthy: assets.filter(a => a.status === 'Healthy').length,
  }), [assets]);

  const calculatePlanMonth = (status: string, score: number) => {
    const today = new Date();
    if (status === 'Critical') {
      return today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } else if (status === 'Warning') {
      const delayMonths = Math.max(1, Math.floor((1 - score / 100) * 4));
      today.setMonth(today.getMonth() + delayMonths);
      return today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
    return "Routine Check";
  };

  const handleSync = () => {
    setAssets(prev => prev.map(a => ({
      ...a,
      load: Math.random() * 75 + 40,
      voltage: Math.random() * 25 + 210,
    })));
  };

  const handleBulkAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      // Simulate AI processing for all assets
      // In a real app, we might send a summary to Gemini
      const newAssets = assets.map(a => {
        const score = Math.floor(Math.random() * 100);
        let status: 'Healthy' | 'Warning' | 'Critical' = 'Healthy';
        if (score >= 80) status = 'Critical';
        else if (score >= 50) status = 'Warning';
        
        return {
          ...a,
          riskScore: score,
          status,
          planMonth: calculatePlanMonth(status, score)
        };
      });
      setAssets(newAssets);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSurveySubmit = async (data: { sound: number; thermal: number }) => {
    setIsAnalyzing(true);
    setAiAnalysis(null);
    
    try {
      const model = "gemini-3-flash-preview";
      const prompt = `คุณคือ AI วิศวกรไฟฟ้าของ MEA วิเคราะห์ข้อมูลการสำรวจหม้อแปลงไฟฟ้า ${selectedId}:
      - ระดับเสียง: ${data.sound} dB
      - อุณหภูมิ: ${data.thermal} °C
      - โหลดปัจจุบัน: ${selectedAsset.load.toFixed(1)}%
      - แรงดัน: ${selectedAsset.voltage.toFixed(1)} V
      
      ให้ประเมินคะแนนความเสี่ยงใหม่ (0-100) และสรุปสั้นๆ (ภาษาไทย)
      ตอบกลับเป็น JSON เท่านั้น:
      {
        "newRiskScore": number,
        "analysis": "สรุปสั้นๆ",
        "status": "Critical" | "Warning" | "Healthy"
      }`;

      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });

      const result = JSON.parse(response.text || "{}");
      
      if (result.newRiskScore !== undefined) {
        setAssets(prev => prev.map(a => a.id === selectedId ? {
          ...a,
          sound: data.sound,
          thermal: data.thermal,
          riskScore: result.newRiskScore,
          status: result.status,
          planMonth: calculatePlanMonth(result.status, result.newRiskScore)
        } : a));
        setAiAnalysis(result.analysis);
      }
    } catch (error) {
      console.error("AI Analysis failed:", error);
      setAiAnalysis("เกิดข้อผิดพลาดในการวิเคราะห์ข้อมูลโดย AI");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <Header />
      <Sidebar onSync={handleSync} onBulkAnalyze={handleBulkAnalysis} isAnalyzing={isAnalyzing} />
      
      <main className="ml-72 pt-24 px-10 pb-12">
        {/* Tabs Navigation */}
        <div className="flex gap-4 mb-8 border-b border-gray-200">
          <button 
            onClick={() => setActiveTab('overview')}
            className={cn(
              "flex items-center gap-2 px-6 py-3 font-kanit font-bold transition-all border-b-2",
              activeTab === 'overview' ? "border-mea-orange-light text-mea-orange-light" : "border-transparent text-gray-400 hover:text-gray-600"
            )}
          >
            <LayoutDashboard className="w-5 h-5" />
            📊 Overview
          </button>
          <button 
            onClick={() => setActiveTab('diagnostics')}
            className={cn(
              "flex items-center gap-2 px-6 py-3 font-kanit font-bold transition-all border-b-2",
              activeTab === 'diagnostics' ? "border-mea-orange-light text-mea-orange-light" : "border-transparent text-gray-400 hover:text-gray-600"
            )}
          >
            <Microscope className="w-5 h-5" />
            🔍 Diagnostics
          </button>
          <button 
            onClick={() => setActiveTab('plan')}
            className={cn(
              "flex items-center gap-2 px-6 py-3 font-kanit font-bold transition-all border-b-2",
              activeTab === 'plan' ? "border-mea-orange-light text-mea-orange-light" : "border-transparent text-gray-400 hover:text-gray-600"
            )}
          >
            <CalendarIcon className="w-5 h-5" />
            📅 Maintenance Plan
          </button>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div 
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border-t-8 border-gray-400 text-center">
                  <h4 className="text-gray-500 font-kanit text-sm mb-2">ทั้งหมด</h4>
                  <h1 className="text-4xl font-bold text-gray-900">{stats.total}</h1>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border-t-8 border-mea-red text-center">
                  <h4 className="text-gray-500 font-kanit text-sm mb-2">วิกฤต</h4>
                  <h1 className="text-4xl font-bold text-mea-red">{stats.critical}</h1>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border-t-8 border-mea-orange-light text-center">
                  <h4 className="text-gray-500 font-kanit text-sm mb-2">เฝ้าระวัง</h4>
                  <h1 className="text-4xl font-bold text-mea-orange-light">{stats.warning}</h1>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border-t-8 border-mea-green text-center">
                  <h4 className="text-gray-500 font-kanit text-sm mb-2">ปกติ</h4>
                  <h1 className="text-4xl font-bold text-mea-green">{stats.healthy}</h1>
                </div>
              </div>

              <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 h-[500px] flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <LayoutDashboard className="w-16 h-16 mx-auto mb-4 opacity-20" />
                  <p className="font-kanit">Map Visualization (KTD Area)</p>
                  <p className="text-xs">Interactive map showing 20 transformer units</p>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'diagnostics' && (
            <motion.div 
              key="diagnostics"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                  <h1 className="text-4xl font-inter font-bold text-gray-900 tracking-tight mb-2 flex items-center gap-3">
                    <Search className="w-8 h-8 text-mea-orange-light" />
                    Asset Diagnostics
                  </h1>
                  <p className="text-gray-500 font-inter">Deep analytical view for high-voltage distribution units.</p>
                </div>

                <div className="w-full md:w-80">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2 ml-1">
                    Select Asset ID
                  </label>
                  <div className="relative">
                    <select 
                      value={selectedId}
                      onChange={(e) => setSelectedId(e.target.value)}
                      className="w-full bg-white border-none ring-1 ring-gray-200 rounded-xl px-4 py-3 appearance-none focus:ring-2 focus:ring-mea-orange-light font-kanit font-medium text-gray-700 shadow-sm cursor-pointer outline-none"
                    >
                      {assets.map(a => (
                        <option key={a.id} value={a.id}>{a.id} ({a.feeder})</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 w-5 h-5" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-12 gap-8">
                <div className="col-span-12 lg:col-span-8 flex flex-col gap-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <RiskGauge score={selectedAsset.riskScore} />
                    <div className="bg-white rounded-2xl shadow-sm overflow-hidden group border-l-4 border-mea-orange-light flex flex-col h-full">
                      <div className="h-64 relative overflow-hidden">
                        <img 
                          src="https://images.unsplash.com/photo-1544724569-5f546fd6f2b5?w=800&q=80" 
                          alt="Transformer Unit" 
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"></div>
                        <div className="absolute bottom-4 left-4 text-white">
                          <span className="text-[10px] font-bold uppercase tracking-widest bg-mea-orange-light px-2 py-1 rounded">
                            Latest Survey Image
                          </span>
                          <p className="text-[10px] mt-1 opacity-80 font-inter">Asset: {selectedAsset.id}</p>
                        </div>
                      </div>
                      <div className="p-4 flex-1 flex items-center justify-center border-t border-gray-50">
                        <button className="flex items-center gap-2 text-mea-orange font-bold font-kanit text-sm hover:underline transition-all">
                          <Maximize2 className="w-4 h-4" />
                          View Full Resolution
                        </button>
                      </div>
                    </div>
                  </div>

                  <AnimatePresence>
                    {aiAnalysis && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-orange-50 border border-orange-100 p-6 rounded-2xl flex gap-4 items-start"
                      >
                        <div className="w-10 h-10 rounded-full bg-mea-orange-light/10 flex items-center justify-center text-mea-orange-light shrink-0">
                          <Sparkles className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-inter font-bold text-mea-orange text-sm mb-1">AI Technical Analysis</h4>
                          <p className="text-sm text-gray-700 font-kanit leading-relaxed">{aiAnalysis}</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <DiagnosticParameters 
                    thermal={selectedAsset.thermal} 
                    sound={selectedAsset.sound} 
                    load={selectedAsset.load} 
                    trips={selectedAsset.trips}
                    planMonth={selectedAsset.planMonth}
                  />
                </div>

                <div className="col-span-12 lg:col-span-4">
                  <SurveyForm onSubmit={handleSurveySubmit} isLoading={isAnalyzing} />
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'plan' && (
            <motion.div 
              key="plan"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <h1 className="text-3xl font-kanit font-bold text-gray-900 mb-8">📅 แผนบำรุงรักษาเชิงป้องกัน (KTD Area)</h1>
              
              <div className="grid gap-4">
                {assets
                  .filter(a => a.status !== 'Healthy')
                  .sort((a, b) => {
                    const order = { 'Critical': 0, 'Warning': 1, 'Healthy': 2 };
                    return order[a.status] - order[b.status] || b.riskScore - a.riskScore;
                  })
                  .map((asset) => (
                    <motion.div 
                      key={asset.id}
                      layout
                      className={cn(
                        "bg-white p-6 rounded-xl shadow-sm border-l-[10px] flex justify-between items-center",
                        asset.status === 'Critical' ? "border-mea-red" : "border-mea-orange-light"
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-12 h-12 rounded-full flex items-center justify-center",
                          asset.status === 'Critical' ? "bg-red-50 text-mea-red" : "bg-orange-50 text-mea-orange-light"
                        )}>
                          {asset.status === 'Critical' ? <AlertCircle className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
                        </div>
                        <div>
                          <h3 className="font-bold text-lg text-gray-900">{asset.id} ({asset.feeder})</h3>
                          <p className="text-sm text-gray-500 font-kanit">Risk Score: {asset.riskScore}% | Status: {asset.status}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-mea-orange-light font-bold font-kanit text-lg">แผนงาน: {asset.planMonth}</p>
                        <button className="text-xs text-gray-400 hover:text-mea-orange-light transition-colors mt-1">View Details</button>
                      </div>
                    </motion.div>
                  ))
                }
                {assets.filter(a => a.status !== 'Healthy').length === 0 && (
                  <div className="bg-green-50 p-12 rounded-2xl border border-green-100 text-center">
                    <CheckCircle2 className="w-16 h-16 text-mea-green mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-mea-green font-kanit">✅ อุปกรณ์ทุกตัวปกติ</h3>
                    <p className="text-gray-500">ไม่พบอุปกรณ์ที่ต้องการการบำรุงรักษาเร่งด่วนในขณะนี้</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
