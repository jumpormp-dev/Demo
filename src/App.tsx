import React, { useState, useEffect, useMemo } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { RiskGauge } from './components/RiskGauge';
import { DiagnosticParameters } from './components/DiagnosticParameters';
import { SurveyForm } from './components/SurveyForm';
import { Search, ChevronDown, Maximize2, Sparkles, Loader2, LayoutDashboard, Microscope, Calendar as CalendarIcon, AlertCircle, CheckCircle2, Clock, Map as MapIcon, ShieldCheck, RefreshCw, CheckSquare, Square } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";
import * as XLSX from 'xlsx';
import { cn } from './lib/utils';
import { calculateRisk, RiskStatus } from './lib/modelLogic';
import { KTTMap } from './components/KTTMap';
import { auth, signInWithGoogle, logout, db, saveAsset, saveSurvey, getAssetHistory, deleteAsset } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { onSnapshot, collection, query, orderBy, limit, where, getDocs } from 'firebase/firestore';
import { ThermalAnalysis } from './lib/gemini';

const getAi = () => {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === "dummy_key") {
    console.warn("GEMINI_API_KEY is not set or is dummy. AI features will fail.");
  }
  return new GoogleGenAI({ apiKey: key || "dummy_key" });
};

const ai = getAi();

export interface Asset {
  id: string;
  feeder: string;
  load: number;
  voltage: number;
  trips: number;
  sound: number;
  thermal: number;
  peakFreq: number;
  age: number;
  humidity: number;
  status: RiskStatus;
  riskScore: number;
  planMonth: string;
  image?: string;
  lat: number;
  lng: number;
  pmStatus: 'Pending' | 'In Progress' | 'Completed';
  lastChecked?: string;
  lastInspectionType?: 'PM' | 'Routine Check';
}

const INITIAL_ASSETS: Asset[] = Array.from({ length: 158 }, (_, i) => {
  // Real data samples from CSV
  const samples = [
    { id: 'TR-KTT-019', feeder: 'KTT-433', lat: 13.74306325, lng: 100.557781 },
    { id: 'TR-KTT-020', feeder: 'KTT-21', lat: 13.7384782, lng: 100.5196534 },
    { id: 'TR-KTT-022', feeder: 'KTT-415', lat: 13.7407544, lng: 100.55296 },
    { id: 'TR-KTT-023', feeder: 'KTT-422', lat: 13.74737492, lng: 100.5544481 },
    { id: 'TR-KTT-025', feeder: 'KTT-418', lat: 13.7494589, lng: 100.5556056 },
    { id: 'TR-KTT-026', feeder: 'KTT-413', lat: 13.74789933, lng: 100.5563792 },
    { id: 'TR-KTT-028', feeder: 'KTT-412', lat: 13.74895343, lng: 100.5626601 },
    { id: 'TR-KTT-029', feeder: 'KTT-433', lat: 13.74195886, lng: 100.5328815 },
    { id: 'TR-KTT-030', feeder: 'KTT-434', lat: 13.73770866, lng: 100.5506867 },
    { id: 'TR-KTT-031', feeder: 'KTT-22', lat: 13.75024361, lng: 100.5192892 },
    { id: 'TR-KTT-032', feeder: 'KTT-433', lat: 13.7425, lng: 100.5580 },
    { id: 'TR-KTT-033', feeder: 'KTT-21', lat: 13.7390, lng: 100.5200 },
    { id: 'TR-KTT-034', feeder: 'KTT-415', lat: 13.7410, lng: 100.5535 },
    { id: 'TR-KTT-035', feeder: 'KTT-422', lat: 13.7480, lng: 100.5550 },
    { id: 'TR-KTT-036', feeder: 'KTT-418', lat: 13.7500, lng: 100.5560 },
    { id: 'TR-KTT-037', feeder: 'KTT-413', lat: 13.7485, lng: 100.5570 },
    { id: 'TR-KTT-038', feeder: 'KTT-412', lat: 13.7495, lng: 100.5630 },
    { id: 'TR-KTT-039', feeder: 'KTT-433', lat: 13.7425, lng: 100.5335 },
    { id: 'TR-KTT-040', feeder: 'KTT-434', lat: 13.7385, lng: 100.5515 },
    { id: 'TR-KTT-041', feeder: 'KTT-22', lat: 13.7510, lng: 100.5200 },
  ];

  const sample = samples[i];
  const id = sample ? sample.id : `TR-KTT-${String(i + 100).padStart(3, '0')}`;
  const feeder = sample ? sample.feeder : ['KTT-01', 'KTT-02', 'KTT-03', 'KTT-04', 'KTT-05', 'KTT-06', 'KTT-07', 'KTT-08'][i % 8];
  const lat = sample ? sample.lat : 13.73 + (Math.random() * 0.03);
  const lng = sample ? sample.lng : 100.51 + (Math.random() * 0.06);

  return {
    id,
    feeder,
    load: 0,
    voltage: 220,
    trips: 0,
    sound: 45,
    thermal: 50,
    peakFreq: 25000,
    age: Math.floor(Math.random() * 25) + 5,
    humidity: 65,
    status: 'Healthy' as RiskStatus,
    riskScore: 0,
    planMonth: 'Routine Check',
    lat,
    lng,
    pmStatus: 'Pending' as const,
  };
}).map((a, index) => {
  // Randomize some statuses for demo
  if (index % 15 === 0) return { ...a, status: 'Critical' as RiskStatus, riskScore: 85, planMonth: 'March 2026', pmStatus: 'In Progress' };
  if (index % 10 === 0) return { ...a, status: 'Warning' as RiskStatus, riskScore: 55, planMonth: 'April 2026', pmStatus: 'Pending' };
  return a;
});

export default function App() {
  const [isMigrating, setIsMigrating] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [assets, setAssets] = useState<Asset[]>(INITIAL_ASSETS);
  const [selectedId, setSelectedId] = useState(INITIAL_ASSETS[0].id);
  const [activeTab, setActiveTab] = useState<'overview' | 'diagnostics' | 'plan' | 'map'>('overview');
  const [activeModule, setActiveModule] = useState('overview');
  const [mapMode, setMapMode] = useState<'points' | 'heatmap'>('points');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [assetHistory, setAssetHistory] = useState<any[]>([]);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [syncType, setSyncType] = useState<'excel' | 'meter' | 'bulk'>('excel');
  const [showImageModal, setShowImageModal] = useState(false);
  const [modalImageUrl, setModalImageUrl] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Auth Listener
  useEffect(() => {
    // Check for mock user in session
    const savedUser = sessionStorage.getItem('mock_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
      setIsAuthReady(true);
    } else {
      const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        if (currentUser) {
          setUser(currentUser);
        }
        setIsAuthReady(true);
      }, (error) => {
        console.error("Auth State Error:", error);
        setAuthError(error.message);
        setIsAuthReady(true);
      });
      return () => unsubscribe();
    }
  }, []);

  const handleLogin = async () => {
    setAuthError(null);
    setIsAnalyzing(true); // Show loading state
    
    // Simulate network delay for realism
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    try {
      // Mock User Data
      const mockUser = {
        uid: 'demo-user-123',
        email: 'employee@mea.or.th',
        displayName: 'MEA Demo User',
        photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix'
      };
      
      setUser(mockUser as any);
      sessionStorage.setItem('mock_user', JSON.stringify(mockUser));
      setIsAuthReady(true);
    } catch (error: any) {
      console.error("Login Error:", error);
      setAuthError(`เกิดข้อผิดพลาด: ${error.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const logout = async () => {
    sessionStorage.removeItem('mock_user');
    await auth.signOut();
    setUser(null);
  };

  // Migration and Initialization Logic (Runs once on login)
  useEffect(() => {
    if (!isAuthReady || !user) return;

    const performMigrationAndInit = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'assets'));
        
        // 1. Migration: Rename any KTD to KTT in Firestore
        const ktdDocs = snapshot.docs.filter(doc => doc.id.includes('KTD'));
        if (ktdDocs.length > 0) {
          setIsMigrating(true);
          for (const doc of ktdDocs) {
            const data = doc.data() as Asset;
            const newId = data.id.replace('KTD', 'KTT');
            const newAsset = { ...data, id: newId };
            await saveAsset(newAsset);
            await deleteAsset(data.id);
          }
        }

        // 2. Initialization: Ensure 158 assets exist
        if (snapshot.size < INITIAL_ASSETS.length) {
          setIsMigrating(true);
          const existingIds = new Set(snapshot.docs.map(doc => doc.id));
          for (const asset of INITIAL_ASSETS) {
            if (!existingIds.has(asset.id)) {
              await saveAsset(asset);
            }
          }
        }
      } catch (error) {
        console.error("Migration/Init Error:", error);
      } finally {
        setIsMigrating(false);
      }
    };

    performMigrationAndInit();
  }, [isAuthReady, user]);

  // Real-time Assets Listener (UI Only)
  useEffect(() => {
    if (!isAuthReady || !user) return;

    const unsubscribe = onSnapshot(collection(db, 'assets'), (snapshot) => {
      if (!snapshot.empty) {
        const updatedAssets = snapshot.docs
          .map(doc => doc.data() as Asset)
          .filter(a => !a.id.includes('KTD')); // Filter out old KTD IDs from UI
        
        // Sort assets by ID to keep order consistent
        const sortedAssets = updatedAssets.sort((a, b) => a.id.localeCompare(b.id));
        setAssets(sortedAssets);
      }
    });

    return () => unsubscribe();
  }, [isAuthReady, user]);

  // Asset History Listener
  useEffect(() => {
    if (!isAuthReady || !user || !selectedId) return;

    const q = query(
      collection(db, 'surveys'),
      where('assetId', '==', selectedId),
      orderBy('timestamp', 'desc'),
      limit(10)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const history = snapshot.docs.map(doc => doc.data());
      setAssetHistory(history);
    });

    return () => unsubscribe();
  }, [isAuthReady, user, selectedId]);

  // Clear AI analysis when selected asset changes
  useEffect(() => {
    setAiAnalysis(null);
  }, [selectedId]);

  // Ensure selectedId is valid when assets list changes
  useEffect(() => {
    if (assets.length > 0) {
      const exists = assets.find(a => a.id === selectedId);
      if (!exists) {
        setSelectedId(assets[0].id);
      }
    }
  }, [assets]);

  const handleModuleChange = (id: string) => {
    setActiveModule(id);
    if (id === 'overview') {
      setActiveTab('overview');
    } else if (id === 'diagnostics' || id === 'acoustic' || id === 'thermal') {
      setActiveTab('diagnostics');
    } else if (id === 'plan') {
      setActiveTab('plan');
    } else if (id === 'map') {
      setActiveTab('map');
    } else if (id === 'upload') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.xlsx, .xls';
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          setSyncType('excel');
          setUploadStatus('uploading');
          try {
            const reader = new FileReader();
            reader.onload = async (evt) => {
              const bstr = evt.target?.result;
              const wb = XLSX.read(bstr, { type: 'binary' });
              const wsname = wb.SheetNames[0];
              const ws = wb.Sheets[wsname];
              const data = XLSX.utils.sheet_to_json(ws) as any[];
              
              let updatedCount = 0;
              for (const row of data) {
                const rawId = row.Station_ID || row['Station ID'] || row.id || row.AssetID || row.MEA_NO1;
                if (rawId) {
                  const assetId = String(rawId).replace(/^KTD/i, 'KTT');
                  
                  const assetData: Asset = {
                    id: assetId,
                    feeder: String(row.FEEDERID || row.feeder || row.Feeder || 'Unknown').replace(/^KTD/i, 'KTT'),
                    load: Number(row.load || row.Load || 0),
                    voltage: Number(row.voltage || row.Voltage || 220),
                    trips: Number(row.trips || row.Trips || 0),
                    sound: Number(row.sound || row.Sound || 45),
                    thermal: Number(row.thermal || row.Thermal || 50),
                    peakFreq: Number(row.peakFreq || row.PeakFreq || 25000),
                    age: Number(row.age || row.Age || 10),
                    humidity: Number(row.humidity || row.Humidity || 65),
                    lat: Number(row.Lat || row.lat || row.Latitude || row.LATITUDE || row.LAT || row.Y || row.y || 13.708),
                    lng: Number(row.Lon || row.lng || row.Longitude || row.LONGITUDE || row.LON || row.LONG || row.X || row.x || 100.582),
                    status: 'Healthy' as RiskStatus,
                    riskScore: 0,
                    planMonth: 'Routine Check',
                    pmStatus: 'Pending'
                  };
                  
                  // Calculate initial risk for the uploaded data
                  const { status, probability } = calculateRisk(assetData);
                  assetData.status = status;
                  assetData.riskScore = probability;
                  assetData.planMonth = calculatePlanMonth(status, probability);
                  
                  await saveAsset(assetData);
                  updatedCount++;
                }
              }
              
              setUploadStatus('success');
              setTimeout(() => setUploadStatus('idle'), 5000);
            };
            reader.readAsBinaryString(file);
          } catch (error) {
            console.error("Upload failed:", error);
            setUploadStatus('error');
            setTimeout(() => setUploadStatus('idle'), 5000);
          }
        }
      };
      input.click();
    }
  };

  const selectedAsset = useMemo(() => 
    assets.find(a => a.id === selectedId) || assets[0], 
  [assets, selectedId]);

  const stats = useMemo(() => {
    const total = assets.length;
    const critical = assets.filter(a => a.status === 'Critical').length;
    const warning = assets.filter(a => a.status === 'Warning').length;
    const healthy = assets.filter(a => a.status === 'Healthy').length;
    const avgRisk = assets.reduce((acc, a) => acc + a.riskScore, 0) / (total || 1);
    
    return { total, critical, warning, healthy, avgRisk };
  }, [assets]);

  const togglePmStatus = async (asset: Asset) => {
    const statuses: Asset['pmStatus'][] = ['Pending', 'In Progress', 'Completed'];
    const nextIndex = (statuses.indexOf(asset.pmStatus) + 1) % statuses.length;
    const updatedAsset = { 
      ...asset, 
      pmStatus: statuses[nextIndex],
      lastChecked: statuses[nextIndex] === 'Completed' ? new Date().toISOString() : asset.lastChecked
    };
    await saveAsset(updatedAsset);
  };

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

  const handleSync = async () => {
    if (isAnalyzing) return;
    setSyncType('meter');
    setIsAnalyzing(true);
    setUploadStatus('uploading');
    
    try {
      // Attempt to fetch from MEA Unified IoT (KTT Area)
      // Note: This may fail due to CORS or Mixed Content (HTTP vs HTTPS)
      // If it fails, we fallback to the robust simulation as requested
      let externalData: any = null;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout
        
        // Use local proxy (for Vercel) or direct URL (for local dev)
        const urls = [
          '/api/proxy-meter', // Vercel proxy
          'https://unified-iot.mea.or.th:8507/api/ktt/meters',
          'http://unified-iot.mea.or.th:8507/api/ktt/meters'
        ];
        
        let success = false;
        for (const url of urls) {
          try {
            console.log(`Attempting to fetch from: ${url}`);
            const response = await fetch(url, {
              signal: controller.signal,
              // Only use cors mode for direct external calls
              mode: url.startsWith('http') ? 'cors' : 'same-origin'
            });
            
            if (response.ok) {
              externalData = await response.json();
              console.log(`Fetched Smart Meter data successfully from ${url}`);
              success = true;
              break;
            } else {
              console.warn(`Fetch from ${url} returned status: ${response.status}`);
            }
          } catch (e) {
            console.warn(`Fetch from ${url} failed:`, e);
          }
        }
        
        if (!success) {
          throw new Error("All sync attempts failed");
        }
        clearTimeout(timeoutId);
      } catch (e) {
        console.warn("Unified IoT fetch failed or timed out, using internal simulation fallback", e);
      }

      const updates = assets.map(async (a) => {
        // Ensure we map the ID correctly if it comes from external source with different format
        // The user says smart meter data uses KTT, so we normalize both to compare
        const normalizeId = (id: string) => id.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().replace('KTD', 'KTT');
        const meterData = externalData?.find((m: any) => normalizeId(String(m.id)) === normalizeId(a.id));
        
        const newLoad = meterData ? Number(meterData.load) : Math.random() * 90 + 30;
        const newVoltage = meterData ? Number(meterData.voltage) : Math.random() * 30 + 210;
        const newTrips = meterData ? Number(meterData.trips) : Math.floor(Math.random() * 15);
        
        const { status, probability } = calculateRisk({
          thermal: a.thermal,
          load: newLoad,
          voltage: newVoltage,
          sound: a.sound,
          trips: newTrips,
          peakFreq: a.peakFreq,
          age: a.age,
          humidity: a.humidity
        });

        const updatedAsset = {
          ...a,
          load: newLoad,
          voltage: newVoltage,
          trips: newTrips,
          status,
          riskScore: probability,
          planMonth: calculatePlanMonth(status, probability)
        };
        return saveAsset(updatedAsset);
      });
      
      await Promise.all(updates);
      setUploadStatus('success');
      setTimeout(() => setUploadStatus('idle'), 3000);
    } catch (error) {
      console.error("Sync failed:", error);
      setUploadStatus('error');
      setTimeout(() => setUploadStatus('idle'), 3000);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleBulkAnalysis = async () => {
    if (isAnalyzing) return;
    setSyncType('bulk');
    setIsAnalyzing(true);
    setUploadStatus('uploading');
    
    // Add a small delay to simulate processing
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    try {
      const updates = assets.map(async (a) => {
        const { status, probability } = calculateRisk({
          thermal: a.thermal,
          load: a.load,
          voltage: a.voltage,
          sound: a.sound,
          trips: a.trips,
          peakFreq: a.peakFreq,
          age: a.age,
          humidity: a.humidity
        });
        
        const updatedAsset = {
          ...a,
          riskScore: probability,
          status,
          planMonth: calculatePlanMonth(status, probability)
        };
        return saveAsset(updatedAsset);
      });
      
      await Promise.all(updates);
      setUploadStatus('success');
      setTimeout(() => setUploadStatus('idle'), 3000);
    } catch (error) {
      console.error("Bulk analysis failed:", error);
      setUploadStatus('error');
      setTimeout(() => setUploadStatus('idle'), 3000);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSurveySubmit = async (data: { 
    sound?: number; 
    thermal?: number;
    acousticImage?: string;
    thermalImage?: string;
    thermalAnalysis?: ThermalAnalysis;
    inspectionType: 'PM' | 'Routine Check';
  }) => {
    if (!user) {
      alert("Please login to save survey data.");
      return;
    }

    setIsAnalyzing(true);
    setAiAnalysis(null);
    
    const finalSound = data.sound ?? selectedAsset.sound;
    const finalThermal = data.thermal ?? selectedAsset.thermal;

    try {
      // 1. First calculate using the "Expert System" logic
      const { status, probability } = calculateRisk({
        thermal: finalThermal,
        load: selectedAsset.load,
        voltage: selectedAsset.voltage,
        sound: finalSound,
        trips: selectedAsset.trips,
        peakFreq: selectedAsset.peakFreq,
        age: selectedAsset.age,
        humidity: selectedAsset.humidity
      });

      const surveyData = {
        ...data,
        assetId: selectedId,
        status,
        riskScore: probability,
        timestamp: new Date().toISOString(),
        authorEmail: user?.email || 'anonymous',
        inspectionType: data.inspectionType
      };

      await saveSurvey(surveyData);
      
      // Update local state
      setAssets(prev => prev.map(a => a.id === selectedId ? { 
        ...a, 
        sound: finalSound,
        thermal: finalThermal,
        status, 
        riskScore: probability,
        lastChecked: new Date().toISOString(),
        lastInspectionType: data.inspectionType,
        pmStatus: data.inspectionType === 'PM' ? 'Completed' : a.pmStatus
      } : a));

      // 2. Then use Gemini to provide a human-like technical explanation
      const model = "gemini-3-flash-preview";
      
      const parts: any[] = [
        { text: `คุณคือ AI วิศวกรไฟฟ้าของ MEA วิเคราะห์ข้อมูลการสำรวจหม้อแปลงไฟฟ้า ${selectedId}:
        - ระดับเสียง: ${finalSound} dB
        - อุณหภูมิ: ${finalThermal} °C
        - โหลดปัจจุบัน: ${selectedAsset.load.toFixed(1)}%
        - แรงดัน: ${selectedAsset.voltage.toFixed(1)} V
        - สภาพอากาศปัจจุบัน (KTT): 32°C, ความชื้น 68% (แดดจัด)
        
        ผลการประเมินเบื้องต้น: สถานะคือ ${status} ด้วยคะแนนความเสี่ยง ${probability}%
        
        หากมีรูปภาพประกอบ (Acoustic/Thermal) โปรดวิเคราะห์จุดที่ผิดปกติในภาพด้วย
        ช่วยสรุปคำแนะนำทางเทคนิคสั้นๆ (ภาษาไทย) ไม่เกิน 150 ตัวอักษร
        ตอบกลับเป็น JSON เท่านั้น:
        {
          "analysis": "สรุปคำแนะนำทางเทคนิค"
        }` }
      ];

      if (data.acousticImage) {
        parts.push({
          inlineData: {
            mimeType: "image/jpeg",
            data: data.acousticImage.split(',')[1]
          }
        });
      }

      if (data.thermalImage) {
        parts.push({
          inlineData: {
            mimeType: "image/jpeg",
            data: data.thermalImage.split(',')[1]
          }
        });
      }

      const response = await ai.models.generateContent({
        model,
        contents: { parts },
        config: { responseMimeType: "application/json" }
      });

      const result = JSON.parse(response.text || "{}");
      
      const updatedAsset = {
        ...selectedAsset,
        sound: finalSound,
        thermal: finalThermal,
        riskScore: probability,
        status: status,
        planMonth: calculatePlanMonth(status, probability),
        image: data.thermalImage || data.acousticImage || selectedAsset.image
      };

      // Save to Firebase
      await saveAsset(updatedAsset);
      await saveSurvey({
        assetId: selectedId,
        sound: finalSound,
        thermal: finalThermal,
        acousticImage: data.acousticImage,
        thermalImage: data.thermalImage,
        riskScore: probability,
        status: status,
        analysis: result.analysis,
        thermalPoints: data.thermalAnalysis?.points || []
      });

      setAiAnalysis(result.analysis || `สถานะคือ ${status} ตามเกณฑ์การวิเคราะห์ทางเทคนิค`);

    } catch (error) {
      console.error("AI Analysis failed:", error);
      setAiAnalysis("เกิดข้อผิดพลาดในการวิเคราะห์ข้อมูลโดย AI");
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-12 h-12 text-mea-orange animate-spin" />
        <div className="text-center">
          <p className="font-kanit font-bold text-gray-900">
            กำลังโหลดข้อมูล...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex flex-col items-center justify-center relative overflow-hidden">
        {/* Background Decorative Elements */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-mea-orange/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-mea-orange/5 rounded-full blur-3xl"></div>
        
        <div className="w-full max-w-md p-8 bg-white rounded-[2.5rem] shadow-2xl shadow-orange-900/10 border border-gray-100 relative z-10">
          <div className="flex flex-col items-center text-center mb-10">
            <div className="w-24 h-24 bg-mea-orange rounded-[2rem] flex items-center justify-center shadow-xl shadow-orange-500/20 mb-6 group hover:rotate-6 transition-transform duration-500">
              <LayoutDashboard className="w-12 h-12 text-white" />
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-inter font-black text-gray-900 tracking-tight uppercase">AI-Predictive Guardian</h1>
              <div className="h-1 w-12 bg-mea-orange mx-auto rounded-full"></div>
            </div>
            <p className="mt-4 text-sm font-kanit font-medium text-gray-500 leading-relaxed">
              Industrial Intelligence & Predictive Maintenance Dashboard<br/>
              <span className="text-mea-orange-light font-bold">Smart Maintenance System (KTT)</span>
            </p>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-mea-orange shrink-0 mt-0.5" />
              <p className="text-[11px] text-orange-800 font-kanit leading-tight">
                <strong>Employee Security Notice:</strong><br/>
                กรุณาใช้บัญชีอีเมลขององค์กร (@mea.or.th) หรือบัญชีที่ได้รับอนุญาตเพื่อเข้าใช้งานระบบวิเคราะห์ AI
              </p>
            </div>

            <button 
              onClick={handleLogin}
              disabled={isAnalyzing}
              className="w-full bg-white border-2 border-gray-100 p-4 rounded-2xl flex items-center justify-center gap-4 font-kanit font-bold text-gray-700 shadow-sm hover:border-mea-orange hover:shadow-lg hover:shadow-orange-500/5 transition-all active:scale-[0.98] group disabled:opacity-70"
            >
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm border border-gray-100 group-hover:scale-110 transition-transform">
                {isAnalyzing ? (
                  <Loader2 className="w-5 h-5 animate-spin text-mea-orange" />
                ) : (
                  <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
                )}
              </div>
              <span className="text-lg">{isAnalyzing ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบพนักงาน (SSO)'}</span>
            </button>

            {authError && (
              <div className="mt-4 p-4 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 font-kanit flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <p>{authError}</p>
              </div>
            )}
            
            <div className="pt-6 flex flex-col items-center gap-4">
              <div className="flex items-center gap-2 text-[10px] font-bold text-gray-300 uppercase tracking-[0.2em]">
                <div className="h-[1px] w-8 bg-gray-200"></div>
                Powered by MEA AI Engine
                <div className="h-[1px] w-8 bg-gray-200"></div>
              </div>
              <div className="flex gap-6 opacity-30 grayscale hover:grayscale-0 transition-all">
                <img src="https://picsum.photos/seed/mea-logo/100/40" className="h-6 object-contain" alt="MEA Logo" />
              </div>
            </div>
          </div>
        </div>

        <p className="mt-8 text-[10px] font-medium text-gray-400 font-inter uppercase tracking-widest">
          © 2026 Metropolitan Electricity Authority. All Rights Reserved.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <Header 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
        onModuleChange={setActiveModule} 
        isMigrating={isMigrating}
        onMenuClick={() => setSidebarOpen(!sidebarOpen)}
        user={user}
      />
      <Sidebar 
        onSync={handleSync} 
        onBulkAnalyze={handleBulkAnalysis} 
        isAnalyzing={isAnalyzing} 
        activeModule={activeModule}
        onModuleChange={(id) => {
          handleModuleChange(id);
          setSidebarOpen(false);
        }}
        assets={assets}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onLogout={logout}
        onSurveyClick={() => {
          setActiveTab('diagnostics');
          setActiveModule('diagnostics');
          setSidebarOpen(false);
          // Small delay to ensure tab is rendered before scrolling
          setTimeout(() => {
            window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
          }, 100);
        }}
      />
      
      <AnimatePresence>
        {uploadStatus !== 'idle' && (
          <motion.div 
            initial={{ opacity: 0, y: -100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -100 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] w-full max-w-md px-4"
          >
            <div className={cn(
              "p-4 rounded-2xl shadow-2xl border flex items-center gap-3",
              uploadStatus === 'uploading' ? "bg-blue-50 border-blue-100 text-blue-700" :
              uploadStatus === 'success' ? "bg-mea-green/10 border-mea-green/20 text-mea-green" :
              "bg-mea-red/10 border-mea-red/20 text-mea-red"
            )}>
              {uploadStatus === 'uploading' ? <Loader2 className="w-5 h-5 animate-spin" /> :
               uploadStatus === 'success' ? <CheckCircle2 className="w-5 h-5" /> :
               <AlertCircle className="w-5 h-5" />}
              <div className="flex-1">
                <p className="text-sm font-bold font-kanit">
                  {uploadStatus === 'uploading' ? (
                    syncType === 'excel' ? "กำลังประมวลผลไฟล์ XLSX..." :
                    syncType === 'meter' ? "กำลังซิงค์ข้อมูล Smart Meter..." :
                    "กำลังวิเคราะห์ข้อมูล AI ทั้งหมด..."
                  ) :
                   uploadStatus === 'success' ? (
                    syncType === 'excel' ? "อัปโหลดไฟล์สำเร็จ! ข้อมูลถูกอัปเดตแล้ว" :
                    syncType === 'meter' ? "ซิงค์ข้อมูล Smart Meter สำเร็จ!" :
                    "วิเคราะห์ข้อมูล AI สำเร็จ!"
                   ) :
                   "เกิดข้อผิดพลาดในการดำเนินการ"}
                </p>
                <p className="text-[10px] opacity-80 font-kanit">
                  {uploadStatus === 'uploading' ? "ระบบกำลังนำเข้าข้อมูลเข้าสู่ฐานข้อมูล KTT" :
                   uploadStatus === 'success' ? "ข้อมูลถูกบันทึกลงในระบบ Cloud เรียบร้อยแล้ว" :
                   "โปรดตรวจสอบการเชื่อมต่อและลองใหม่อีกครั้ง"}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showImageModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4"
            onClick={() => setShowImageModal(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-5xl w-full max-h-[90vh] flex flex-col items-center"
              onClick={e => e.stopPropagation()}
            >
              <img 
                src={modalImageUrl} 
                className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl" 
                alt="Full Resolution" 
                referrerPolicy="no-referrer"
              />
              <button 
                onClick={() => setShowImageModal(false)}
                className="absolute -top-12 right-0 text-white hover:text-mea-orange transition-colors flex items-center gap-2 font-bold font-kanit"
              >
                <AlertCircle className="w-6 h-6 rotate-45" /> ปิดหน้าต่าง
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <main className="lg:ml-72 pt-24 px-4 md:px-10 pb-12">
        {/* Tabs Navigation */}
        <div className="flex gap-2 md:gap-4 mb-8 border-b border-gray-200 overflow-x-auto no-scrollbar whitespace-nowrap">
          <button 
            onClick={() => { setActiveTab('overview'); setActiveModule('overview'); }}
            className={cn(
              "flex items-center gap-2 px-4 md:px-6 py-3 font-kanit font-bold transition-all border-b-2 shrink-0",
              activeTab === 'overview' ? "border-mea-orange-light text-mea-orange-light" : "border-transparent text-gray-400 hover:text-gray-600"
            )}
          >
            <LayoutDashboard className="w-5 h-5" />
            📊 Overview
          </button>
          <button 
            onClick={() => { setActiveTab('diagnostics'); setActiveModule('diagnostics'); }}
            className={cn(
              "flex items-center gap-2 px-4 md:px-6 py-3 font-kanit font-bold transition-all border-b-2 shrink-0",
              activeTab === 'diagnostics' ? "border-mea-orange-light text-mea-orange-light" : "border-transparent text-gray-400 hover:text-gray-600"
            )}
          >
            <Microscope className="w-5 h-5" />
            🔍 Diagnostics
          </button>
          <button 
            onClick={() => { setActiveTab('plan'); setActiveModule('plan'); }}
            className={cn(
              "flex items-center gap-2 px-4 md:px-6 py-3 font-kanit font-bold transition-all border-b-2 shrink-0",
              activeTab === 'plan' ? "border-mea-orange-light text-mea-orange-light" : "border-transparent text-gray-400 hover:text-gray-600"
            )}
          >
            <CalendarIcon className="w-5 h-5" />
            📅 Maintenance Plan
          </button>
          <button 
            onClick={() => { setActiveTab('map'); setActiveModule('map'); }}
            className={cn(
              "flex items-center gap-2 px-4 md:px-6 py-3 font-kanit font-bold transition-all border-b-2 shrink-0",
              activeTab === 'map' ? "border-mea-orange-light text-mea-orange-light" : "border-transparent text-gray-400 hover:text-gray-600"
            )}
          >
            <MapIcon className="w-5 h-5" />
            🗺️ Feeder Map
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
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold font-kanit text-gray-800">AI-Predictive Guardian Overview</h2>
                  <p className="text-sm text-gray-500">Real-time asset health monitoring for Khlong Toei district</p>
                </div>
                <div className="text-left md:text-right">
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Last Updated</p>
                  <p className="text-xs md:text-sm font-bold text-gray-600">24 Mar 2026, 08:34</p>
                </div>
              </div>

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

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 h-[300px] md:h-[500px] overflow-hidden relative group">
                  <div className="absolute top-4 right-4 z-10 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex bg-white/90 backdrop-blur-sm p-1 rounded-lg border border-gray-200 shadow-sm">
                      <button 
                        onClick={() => setMapMode('points')}
                        className={cn(
                          "px-2 py-1 rounded text-[10px] font-bold transition-all",
                          mapMode === 'points' ? "bg-mea-orange-light text-white" : "text-gray-500 hover:text-gray-700"
                        )}
                      >
                        Points
                      </button>
                      <button 
                        onClick={() => setMapMode('heatmap')}
                        className={cn(
                          "px-2 py-1 rounded text-[10px] font-bold transition-all",
                          mapMode === 'heatmap' ? "bg-mea-orange-light text-white" : "text-gray-500 hover:text-gray-700"
                        )}
                      >
                        Heatmap
                      </button>
                    </div>
                    <button 
                      onClick={() => setActiveTab('map')}
                      className="bg-white/90 backdrop-blur-sm px-3 py-1 rounded-lg text-[10px] font-bold shadow-sm border border-gray-200 text-mea-orange-light hover:bg-white"
                    >
                      Full Map
                    </button>
                  </div>
                  <div className="w-full h-full" key={`overview-${mapMode}`}>
                    <KTTMap 
                      mode={mapMode}
                    points={assets.map(a => ({
                      id: a.id,
                      lat: a.lat,
                      lng: a.lng,
                      status: a.status,
                      riskScore: a.riskScore
                    }))}
                    onPointClick={(id) => {
                      setSelectedId(id);
                      setActiveTab('diagnostics');
                      setActiveModule('diagnostics');
                    }}
                  />
                </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="font-kanit font-bold text-gray-800 mb-4 flex items-center gap-2">
                      <MapIcon className="w-5 h-5 text-mea-orange-light" />
                      KTT Feeder Summary
                    </h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                        <span className="text-sm text-gray-500">Total Feeders</span>
                        <span className="font-bold">8 Main Lines</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                        <span className="text-sm text-gray-500">Avg. Risk Score</span>
                        <span className={cn(
                          "font-bold",
                          stats.avgRisk > 70 ? "text-mea-red" : stats.avgRisk > 40 ? "text-mea-orange-light" : "text-mea-green"
                        )}>{stats.avgRisk.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                        <span className="text-sm text-gray-500">Area Coverage</span>
                        <span className="font-bold text-mea-orange-light">KTT (Khlong Toei)</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-mea-orange to-mea-orange-light p-6 rounded-2xl shadow-lg text-white">
                    <h3 className="font-kanit font-bold mb-2">AI Fleet Recommendation</h3>
                    <p className="text-sm opacity-90 leading-relaxed">
                      จากหม้อแปลงทั้งหมด 158 ตัวในเขต KTT ระบบ AI ตรวจพบ {stats.critical} ตัวที่อยู่ในสถานะวิกฤต 
                      แนะนำให้จัดลำดับความสำคัญในการเข้าตรวจสอบ (Onsite Inspection) โดยเริ่มจากหม้อแปลงที่มีคะแนนความเสี่ยงสูงสุดก่อน
                    </p>
                    <button 
                      onClick={() => { setActiveTab('plan'); setActiveModule('plan'); }}
                      className="mt-4 w-full bg-white/20 hover:bg-white/30 py-2 rounded-lg text-sm font-bold transition-all"
                    >
                      View Maintenance Plan
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'diagnostics' && (
            <motion.div 
              key={`diagnostics-${selectedId}`}
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
                          src={selectedAsset.image || "https://images.unsplash.com/photo-1544724569-5f546fd6f2b5?w=800&q=80"} 
                          alt="Transformer Unit" 
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"></div>
                        <div className="absolute bottom-4 left-4 text-white">
                          <span className="text-[10px] font-bold uppercase tracking-widest bg-mea-orange-light px-2 py-1 rounded">
                            {selectedAsset.image ? "Survey Image (AI Analyzed)" : "Latest Survey Image"}
                          </span>
                          <p className="text-[10px] mt-1 opacity-80 font-inter">Asset: {selectedAsset.id}</p>
                        </div>
                      </div>
                      <div className="p-4 flex-1 flex items-center justify-center border-t border-gray-50">
                        <button 
                          onClick={() => {
                            setModalImageUrl(selectedAsset.image || "https://images.unsplash.com/photo-1544724569-5f546fd6f2b5?w=1920&q=80");
                            setShowImageModal(true);
                          }}
                          className="flex items-center gap-2 text-mea-orange font-bold font-kanit text-sm hover:underline transition-all"
                        >
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
                    peakFreq={selectedAsset.peakFreq}
                    age={selectedAsset.age}
                    humidity={selectedAsset.humidity}
                    planMonth={selectedAsset.planMonth}
                    pmStatus={selectedAsset.pmStatus}
                  />

                  {/* Quick Maintenance Actions */}
                  <div className="bg-white p-8 rounded-2xl shadow-sm border-l-4 border-blue-500">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="font-inter font-bold text-xl text-gray-900 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-blue-500" />
                        Quick Maintenance Actions
                      </h3>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        Last Update: {selectedAsset.lastChecked ? new Date(selectedAsset.lastChecked).toLocaleString() : 'Never'}
                      </span>
                    </div>
                    
                    <div className="flex flex-wrap gap-4">
                      <button 
                        onClick={() => {
                          const updatedAsset = { ...selectedAsset, pmStatus: 'Completed' as const, lastChecked: new Date().toISOString() };
                          saveAsset(updatedAsset);
                        }}
                        className={cn(
                          "flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-bold transition-all border-2",
                          selectedAsset.pmStatus === 'Completed' 
                            ? "bg-green-50 border-mea-green text-mea-green" 
                            : "bg-white border-gray-100 text-gray-600 hover:border-mea-green hover:bg-green-50"
                        )}
                      >
                        <CheckSquare className="w-5 h-5" />
                        Mark as Completed
                      </button>
                      
                      <button 
                        onClick={() => {
                          const updatedAsset = { ...selectedAsset, pmStatus: 'In Progress' as const };
                          saveAsset(updatedAsset);
                        }}
                        className={cn(
                          "flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-bold transition-all border-2",
                          selectedAsset.pmStatus === 'In Progress' 
                            ? "bg-blue-50 border-blue-500 text-blue-600" 
                            : "bg-white border-gray-100 text-gray-600 hover:border-blue-500 hover:bg-blue-50"
                        )}
                      >
                        <RefreshCw className={cn("w-5 h-5", selectedAsset.pmStatus === 'In Progress' && "animate-spin-slow")} />
                        Set to In Progress
                      </button>

                      <button 
                        onClick={() => {
                          const updatedAsset = { ...selectedAsset, pmStatus: 'Pending' as const };
                          saveAsset(updatedAsset);
                        }}
                        className={cn(
                          "flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-bold transition-all border-2",
                          selectedAsset.pmStatus === 'Pending' 
                            ? "bg-gray-50 border-gray-400 text-gray-600" 
                            : "bg-white border-gray-100 text-gray-600 hover:border-gray-400 hover:bg-gray-50"
                        )}
                      >
                        <Clock className="w-5 h-5" />
                        Reset to Pending
                      </button>
                    </div>
                  </div>

                  {/* Methodology Note */}
                  <div className="bg-slate-900 p-6 rounded-2xl shadow-xl text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                      <ShieldCheck className="w-24 h-24" />
                    </div>
                    <div className="relative z-10">
                      <h3 className="font-kanit font-bold text-lg mb-6 flex items-center gap-2 border-b border-slate-800 pb-4">
                        <Sparkles className="w-5 h-5 text-mea-orange-light" />
                        Analysis Methodology & Data Sources
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="space-y-3">
                          <div className="w-10 h-10 bg-mea-orange-light/20 rounded-xl flex items-center justify-center">
                            <LayoutDashboard className="w-5 h-5 text-mea-orange-light" />
                          </div>
                          <p className="text-xs font-bold text-mea-orange-light uppercase tracking-widest">XLSX Data Import</p>
                          <button 
                            onClick={() => {
                              const template = [
                                { id: 'KTT0001', feeder: 'PA433', lat: 13.743, lng: 100.557, load: 45, voltage: 220, age: 15 },
                                { id: 'KTT0002', feeder: 'SAM21', lat: 13.738, lng: 100.519, load: 62, voltage: 218, age: 8 }
                              ];
                              const ws = XLSX.utils.json_to_sheet(template);
                              const wb = XLSX.utils.book_new();
                              XLSX.utils.book_append_sheet(wb, ws, "Assets");
                              XLSX.writeFile(wb, "MEA_Asset_Template.xlsx");
                            }}
                            className="text-[10px] text-blue-500 hover:underline font-bold"
                          >
                            Download Template
                          </button>
                          <p className="text-sm text-slate-300 leading-relaxed font-kanit">
                            วิเคราะห์จากข้อมูลประวัติและพารามิเตอร์พื้นฐานที่นำเข้าผ่านไฟล์ Excel (.xlsx) เพื่อสร้างฐานข้อมูลเริ่มต้น
                          </p>
                        </div>
                        <div className="space-y-3">
                          <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                            <RefreshCw className="w-5 h-5 text-blue-400" />
                          </div>
                          <p className="text-xs font-bold text-blue-400 uppercase tracking-widest">Smart Meter Sync</p>
                          <p className="text-sm text-slate-300 leading-relaxed font-kanit">
                            ดึงข้อมูล Real-time จากระบบ MEA Unified IoT (Port 8507) เพื่อประเมินสภาวะปัจจุบันของหม้อแปลงจำนวน 158 ตัวในเขต KTT
                          </p>
                        </div>
                        <div className="space-y-3">
                          <div className="w-10 h-10 bg-mea-green/20 rounded-xl flex items-center justify-center">
                            <Microscope className="w-5 h-5 text-mea-green" />
                          </div>
                          <p className="text-xs font-bold text-mea-green uppercase tracking-widest">AI Camera Analysis</p>
                          <p className="text-sm text-slate-300 leading-relaxed font-kanit">
                            ใช้ Gemini 3 วิเคราะห์ภาพถ่ายความร้อนและเสียงจากกล้องที่อัปโหลดหน้างาน เพื่อหาจุดบกพร่องเชิงลึก
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Survey History Section */}
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="font-kanit font-bold text-gray-800 mb-6 flex items-center gap-2">
                      <Clock className="w-5 h-5 text-mea-orange-light" />
                      ประวัติการสำรวจ (Survey History)
                    </h3>
                    <div className="space-y-4">
                      {assetHistory.length > 0 ? (
                        assetHistory.map((survey, idx) => (
                          <div key={idx} className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex justify-between items-center">
                            <div className="flex gap-4 items-center">
                              <div className={cn(
                                "w-2 h-10 rounded-full",
                                survey.status === 'Critical' ? "bg-mea-red" : survey.status === 'Warning' ? "bg-mea-orange-light" : "bg-mea-green"
                              )}></div>
                              <div>
                                <p className="text-sm font-bold text-gray-800">
                                  {new Date(survey.timestamp).toLocaleString('th-TH')}
                                </p>
                                <p className="text-[10px] text-gray-500">โดย: {survey.authorEmail}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-xs font-bold text-gray-700">{survey.sound} dB / {survey.thermal} °C</p>
                              <p className={cn(
                                "text-[10px] font-bold",
                                survey.status === 'Critical' ? "text-mea-red" : survey.status === 'Warning' ? "text-mea-orange-light" : "text-mea-green"
                              )}>
                                Risk: {survey.riskScore}% ({survey.status})
                              </p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-center py-8 text-gray-400 text-sm italic">ยังไม่มีประวัติการสำรวจสำหรับหม้อแปลงตัวนี้</p>
                      )}
                    </div>
                    {assetHistory.length > 0 && (
                      <button 
                        onClick={() => {
                          const csvContent = "data:text/csv;charset=utf-8," 
                            + "Timestamp,AssetID,Sound,Thermal,RiskScore,Status,Author\n"
                            + assetHistory.map(s => `${s.timestamp},${s.assetId},${s.sound},${s.thermal},${s.riskScore},${s.status},${s.authorEmail}`).join("\n");
                          const encodedUri = encodeURI(csvContent);
                          const link = document.createElement("a");
                          link.setAttribute("href", encodedUri);
                          link.setAttribute("download", `history_${selectedId}.csv`);
                          document.body.appendChild(link);
                          link.click();
                        }}
                        className="mt-6 w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm font-bold text-gray-400 hover:border-mea-orange-light hover:text-mea-orange-light transition-all"
                      >
                        📥 Download History (CSV)
                      </button>
                    )}
                  </div>
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
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                  <h1 className="text-3xl font-kanit font-bold text-gray-900">📅 แผนบำรุงรักษาเชิงป้องกัน (AI-Predictive Guardian)</h1>
                  <p className="text-gray-500">ติดตามความคืบหน้าการซ่อมบำรุงและตรวจสอบหม้อแปลง</p>
                </div>
                
                {/* Progress Stats */}
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-6">
                  <div className="text-center">
                    <p className="text-[10px] text-gray-400 uppercase font-bold">Total Tasks</p>
                    <p className="text-2xl font-bold text-gray-800">{assets.filter(a => a.status !== 'Healthy').length}</p>
                  </div>
                  <div className="w-[2px] h-10 bg-gray-100"></div>
                  <div className="text-center">
                    <p className="text-[10px] text-gray-400 uppercase font-bold">Progress</p>
                    <div className="flex items-center gap-2">
                      <p className="text-2xl font-bold text-mea-green">
                        {Math.round((assets.filter(a => a.status !== 'Healthy' && a.pmStatus === 'Completed').length / 
                         Math.max(1, assets.filter(a => a.status !== 'Healthy').length)) * 100)}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden mb-8 border border-gray-200">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ 
                    width: `${(assets.filter(a => a.status !== 'Healthy' && a.pmStatus === 'Completed').length / 
                             Math.max(1, assets.filter(a => a.status !== 'Healthy').length)) * 100}%` 
                  }}
                  className="h-full bg-gradient-to-r from-mea-green to-emerald-400"
                />
              </div>
              
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
                        "bg-white p-6 rounded-xl shadow-sm border-l-[10px] flex flex-col md:flex-row justify-between items-start md:items-center gap-4",
                        asset.status === 'Critical' ? "border-mea-red" : "border-mea-orange-light"
                      )}
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className={cn(
                          "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0",
                          asset.status === 'Critical' ? "bg-red-50 text-mea-red" : "bg-orange-50 text-mea-orange-light"
                        )}>
                          {asset.status === 'Critical' ? <AlertCircle className="w-8 h-8" /> : <Clock className="w-8 h-8" />}
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-xl text-gray-900">{asset.id}</h3>
                            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-mono">{asset.feeder}</span>
                            {asset.lastInspectionType && (
                              <span className={cn(
                                "text-[10px] px-2 py-0.5 rounded-md font-bold",
                                asset.lastInspectionType === 'PM' ? "bg-purple-100 text-purple-600" : "bg-blue-100 text-blue-600"
                              )}>
                                {asset.lastInspectionType}
                              </span>
                            )}
                          </div>
                          
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                            <div className="flex items-center gap-1 text-gray-600">
                              <ShieldCheck className={cn("w-4 h-4", asset.riskScore > 70 ? "text-mea-red" : "text-mea-orange-light")} />
                              <span className="font-bold">ความเสี่ยง: {asset.riskScore}%</span>
                            </div>
                            <div className="flex items-center gap-1 text-gray-400">
                              <MapIcon className="w-4 h-4" />
                              <span className="text-xs font-mono">{asset.lat.toFixed(6)}, {asset.lng.toFixed(6)}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col md:flex-row md:items-center gap-6 w-full md:w-auto">
                        {/* Individual Progress Indicator */}
                        <div className="flex-1 min-w-[120px]">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Task Progress</span>
                            <span className="text-[10px] font-bold text-mea-orange-light">
                              {asset.pmStatus === 'Completed' ? '100%' : asset.pmStatus === 'In Progress' ? '50%' : '0%'}
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ 
                                width: asset.pmStatus === 'Completed' ? '100%' : asset.pmStatus === 'In Progress' ? '50%' : '0%' 
                              }}
                              className={cn(
                                "h-full transition-all duration-500",
                                asset.pmStatus === 'Completed' ? "bg-mea-green" : 
                                asset.pmStatus === 'In Progress' ? "bg-blue-500" : "bg-gray-300"
                              )}
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <div className="flex flex-col items-end">
                              <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">Status</p>
                              <div className="flex items-center gap-2">
                                <button 
                                  onClick={() => {
                                    const newStatus: Asset['pmStatus'] = asset.pmStatus === 'Completed' ? 'Pending' : 'Completed';
                                    const updatedAsset = { ...asset, pmStatus: newStatus, lastChecked: newStatus === 'Completed' ? new Date().toISOString() : asset.lastChecked };
                                    saveAsset(updatedAsset);
                                  }}
                                  className={cn(
                                    "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border",
                                    asset.pmStatus === 'Completed' 
                                      ? "bg-green-50 border-green-200 text-mea-green" 
                                      : "bg-white border-gray-200 text-gray-500 hover:border-mea-orange-light"
                                  )}
                                >
                                  {asset.pmStatus === 'Completed' ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                                  {asset.pmStatus === 'Completed' ? 'ตรวจสอบแล้ว' : 'ทำเครื่องหมายว่าเสร็จสิ้น'}
                                </button>

                                <button 
                                  onClick={() => togglePmStatus(asset)}
                                  className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400 hover:text-mea-orange-light border border-transparent hover:border-gray-200"
                                  title="Cycle Status (Pending -> In Progress -> Completed)"
                                >
                                  <RefreshCw className={cn("w-4 h-4", asset.pmStatus === 'In Progress' && "animate-spin-slow text-blue-500")} />
                                </button>
                              </div>
                            </div>
                          </div>
                          
                          <div className="h-10 w-[1px] bg-gray-100 hidden md:block"></div>

                          <div className="flex flex-col items-end">
                            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">Schedule</p>
                            <p className="text-mea-orange-light font-bold font-kanit whitespace-nowrap">{asset.planMonth}</p>
                            <button 
                              onClick={() => {
                                setSelectedId(asset.id);
                                setActiveTab('diagnostics');
                                setActiveModule('diagnostics');
                              }}
                              className="mt-1 text-[10px] font-bold text-gray-400 hover:text-mea-orange-light underline"
                            >
                              View Details
                            </button>
                          </div>
                        </div>
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
          {activeTab === 'map' && (
            <motion.div 
              key="map"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="h-[calc(100vh-250px)] flex flex-col gap-4"
            >
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold font-kanit text-gray-800">AI-Predictive Guardian Overview</h2>
                  <p className="text-gray-500 text-sm">Visualizing {stats.total} transformer units in Khlong Toei district</p>
                </div>
                <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200">
                  <button 
                    onClick={() => setMapMode('points')}
                    className={cn(
                      "px-4 py-2 rounded-lg text-sm font-bold transition-all",
                      mapMode === 'points' ? "bg-white text-mea-orange-light shadow-sm" : "text-gray-500 hover:text-gray-700"
                    )}
                  >
                    Asset Points
                  </button>
                  <button 
                    onClick={() => setMapMode('heatmap')}
                    className={cn(
                      "px-4 py-2 rounded-lg text-sm font-bold transition-all",
                      mapMode === 'heatmap' ? "bg-white text-mea-orange-light shadow-sm" : "text-gray-500 hover:text-gray-700"
                    )}
                  >
                    Risk Heatmap
                  </button>
                </div>
              </div>
              <div className="flex-1 min-h-0 relative" key={`${activeTab}-${mapMode}`}>
                <KTTMap 
                  mode={mapMode}
                  points={assets.map(a => ({
                    id: a.id,
                    lat: a.lat,
                    lng: a.lng,
                    status: a.status,
                    riskScore: a.riskScore
                  }))}
                  onPointClick={(id) => {
                    setSelectedId(id);
                    setActiveTab('diagnostics');
                    setActiveModule('diagnostics');
                  }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
