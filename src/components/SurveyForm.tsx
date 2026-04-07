import React, { useState } from 'react';
import { Camera, CloudUpload, Send, Info, Loader2, X, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';
import { analyzeImage, ThermalAnalysis } from '../lib/gemini';

interface SurveyFormProps {
  onSubmit: (data: { 
    sound?: number; 
    thermal?: number;
    acousticImage?: string;
    thermalImage?: string;
    thermalAnalysis?: ThermalAnalysis;
    inspectionType: 'PM' | 'Routine Check';
  }) => void;
  isLoading: boolean;
}

export function SurveyForm({ onSubmit, isLoading }: SurveyFormProps) {
  const [sound, setSound] = useState<string>('');
  const [thermal, setThermal] = useState<string>('');
  const [inspectionType, setInspectionType] = useState<'PM' | 'Routine Check'>('Routine Check');
  const [acousticImage, setAcousticImage] = useState<string | null>(null);
  const [thermalImage, setThermalImage] = useState<string | null>(null);
  const [thermalAnalysis, setThermalAnalysis] = useState<ThermalAnalysis | null>(null);
  const [isAnalyzingAcoustic, setIsAnalyzingAcoustic] = useState(false);
  const [isAnalyzingThermal, setIsAnalyzingThermal] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'acoustic' | 'thermal') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        if (type === 'acoustic') {
          setAcousticImage(base64);
          setIsAnalyzingAcoustic(true);
          const result = await analyzeImage(base64, 'acoustic');
          if (typeof result === 'number') setSound(result.toString());
          setIsAnalyzingAcoustic(false);
        } else {
          setThermalImage(base64);
          setIsAnalyzingThermal(true);
          const result = await analyzeImage(base64, 'thermal');
          if (result && typeof result === 'object') {
            setThermalAnalysis(result);
            if (result.maxTemp !== null) setThermal(result.maxTemp.toString());
          }
          setIsAnalyzingThermal(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = (type: 'acoustic' | 'thermal') => {
    if (type === 'acoustic') {
      setAcousticImage(null);
      setSound('');
    } else {
      setThermalImage(null);
      setThermal('');
      setThermalAnalysis(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const hasAcoustic = sound || acousticImage;
    const hasThermal = thermal || thermalImage;
    
    if (!hasAcoustic && !hasThermal) return;

    onSubmit({ 
      sound: sound ? Number(sound) : undefined, 
      thermal: thermal ? Number(thermal) : undefined,
      acousticImage: acousticImage || undefined,
      thermalImage: thermalImage || undefined,
      thermalAnalysis: thermalAnalysis || undefined,
      inspectionType
    });
  };

  const canSubmit = (sound || acousticImage) || (thermal || thermalImage);

  return (
    <div className="bg-white p-4 md:p-8 rounded-2xl shadow-lg border border-gray-100 lg:sticky lg:top-24">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-mea-orange-light">
          <Camera className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-inter font-bold text-gray-900">บันทึกสำรวจหน้างาน</h3>
          <p className="text-xs text-gray-500">Manual Entry or Image Upload</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-3">
          <label className="block text-[10px] font-bold text-gray-500 uppercase ml-1 tracking-wider">
            ประเภทการเข้าตรวจ (Inspection Type)
          </label>
          <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200">
            <button 
              type="button"
              onClick={() => setInspectionType('Routine Check')}
              className={cn(
                "flex-1 py-2 rounded-lg text-xs font-bold transition-all",
                inspectionType === 'Routine Check' ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
              )}
            >
              Routine Check
            </button>
            <button 
              type="button"
              onClick={() => setInspectionType('PM')}
              className={cn(
                "flex-1 py-2 rounded-lg text-xs font-bold transition-all",
                inspectionType === 'PM' ? "bg-white text-purple-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
              )}
            >
              PM (Maintenance)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2 ml-1 tracking-wider">
              Sound Level (dB)
            </label>
            <div className="relative">
              <input 
                type="number" 
                value={sound}
                onChange={(e) => setSound(e.target.value)}
                className="w-full bg-gray-50 border-none ring-1 ring-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-mea-orange-light font-kanit outline-none transition-all"
                placeholder="dB"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2 ml-1 tracking-wider">
              Thermal (°C)
            </label>
            <div className="relative">
              <input 
                type="number" 
                value={thermal}
                onChange={(e) => setThermal(e.target.value)}
                className="w-full bg-gray-50 border-none ring-1 ring-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-mea-orange-light font-kanit outline-none transition-all"
                placeholder="°C"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2 ml-1 tracking-wider">
              Acoustic Camera Image
            </label>
            <div className="relative group">
              {!acousticImage && (
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={(e) => handleFileChange(e, 'acoustic')}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
              )}
              <div className={cn(
                "border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center text-center transition-all relative",
                acousticImage ? "border-mea-green bg-green-50" : "border-gray-200 group-hover:bg-gray-50"
              )}>
                {acousticImage ? (
                  <div className="relative w-full">
                    <img src={acousticImage} alt="Acoustic" className="w-full h-24 object-cover rounded-lg mb-2" />
                    <button
                      type="button"
                      onClick={() => removeImage('acoustic')}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md hover:bg-red-600 transition-colors z-20"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    {isAnalyzingAcoustic && (
                      <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex flex-col items-center justify-center rounded-lg">
                        <Sparkles className="w-5 h-5 text-mea-orange animate-pulse mb-1" />
                        <span className="text-[10px] font-bold text-mea-orange">AI Analyzing...</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <CloudUpload className="w-6 h-6 text-gray-300 mb-1" />
                )}
                <span className="text-[10px] font-kanit text-gray-400">
                  {acousticImage ? "Acoustic Image Uploaded" : "Upload Acoustic Image"}
                </span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2 ml-1 tracking-wider">
              Thermal Imaging Photo
            </label>
            <div className="relative group">
              {!thermalImage && (
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={(e) => handleFileChange(e, 'thermal')}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
              )}
              <div className={cn(
                "border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center text-center transition-all relative",
                thermalImage ? "border-mea-green bg-green-50" : "border-gray-200 group-hover:bg-gray-50"
              )}>
                {thermalImage ? (
                  <div className="relative w-full">
                    <img src={thermalImage} alt="Thermal" className="w-full h-24 object-cover rounded-lg mb-2" />
                    <button
                      type="button"
                      onClick={() => removeImage('thermal')}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md hover:bg-red-600 transition-colors z-20"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    {isAnalyzingThermal && (
                      <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex flex-col items-center justify-center rounded-lg">
                        <Sparkles className="w-5 h-5 text-mea-orange animate-pulse mb-1" />
                        <span className="text-[10px] font-bold text-mea-orange">AI Analyzing...</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <CloudUpload className="w-6 h-6 text-gray-300 mb-1" />
                )}
                <span className="text-[10px] font-kanit text-gray-400">
                  {thermalImage ? "Thermal Image Uploaded" : "Upload Thermal Image"}
                </span>
              </div>
            </div>

            {thermalAnalysis && (
              <div className="mt-3 p-3 bg-orange-50 rounded-xl border border-orange-100 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-gray-500 uppercase">Thermal Points Detected</span>
                  <span className="text-[10px] font-bold text-mea-red bg-red-100 px-2 py-0.5 rounded-full">
                    {thermalAnalysis.hotSpotsCount} Hot Spots
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {thermalAnalysis.points.map((p, idx) => (
                    <div key={idx} className="bg-white p-1.5 rounded-lg border border-orange-100 text-center">
                      <p className="text-[9px] font-bold text-gray-400">{p.label}</p>
                      <p className={cn(
                        "text-[11px] font-bold",
                        p.temp === thermalAnalysis.maxTemp ? "text-mea-red" : "text-gray-700"
                      )}>{p.temp}°C</p>
                    </div>
                  ))}
                </div>
                {thermalAnalysis.maxTemp && (
                  <p className="text-[10px] text-gray-500 font-kanit italic">
                    * Auto-filled maximum temperature: <span className="font-bold text-mea-red">{thermalAnalysis.maxTemp}°C</span>
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <button 
          type="submit"
          disabled={isLoading || !canSubmit}
          className="w-full py-4 rounded-xl bg-mea-orange text-white font-bold font-kanit text-lg flex items-center justify-center gap-2 shadow-lg shadow-orange-900/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              กำลังประมวลผลภาพและข้อมูล...
            </>
          ) : (
            <>
              บันทึกและวิเคราะห์ภาพ AI
              <Send className="w-5 h-5" />
            </>
          )}
        </button>
      </form>

      <div className="mt-8 p-4 bg-green-50 rounded-xl border border-green-100">
        <p className="text-[11px] text-mea-green font-bold font-kanit leading-relaxed flex gap-2">
          <Info className="w-4 h-4 shrink-0" />
          ระบบ AI จะทำการปรับปรุงคะแนน Risk Score ทันทีหลังจากท่านยืนยันข้อมูลการสำรวจครั้งนี้
        </p>
      </div>
    </div>
  );
}
