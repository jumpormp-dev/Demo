import React, { useState } from 'react';
import { Camera, CloudUpload, Send, Info, Loader2 } from 'lucide-react';

interface SurveyFormProps {
  onSubmit: (data: { sound: number; thermal: number }) => void;
  isLoading: boolean;
}

export function SurveyForm({ onSubmit, isLoading }: SurveyFormProps) {
  const [sound, setSound] = useState<string>('');
  const [thermal, setThermal] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sound || !thermal) return;
    onSubmit({ sound: Number(sound), thermal: Number(thermal) });
  };

  return (
    <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 sticky top-24">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-mea-orange-light">
          <Camera className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-inter font-bold text-gray-900">บันทึกสำรวจหน้างาน</h3>
          <p className="text-xs text-gray-500">Manual Survey Data Entry</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
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
              placeholder="Enter dB value"
              required
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-[10px] uppercase">
              Decibels
            </span>
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2 ml-1 tracking-wider">
            Thermal Reading (°C)
          </label>
          <div className="relative">
            <input 
              type="number" 
              value={thermal}
              onChange={(e) => setThermal(e.target.value)}
              className="w-full bg-gray-50 border-none ring-1 ring-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-mea-orange-light font-kanit outline-none transition-all"
              placeholder="Enter Celsius value"
              required
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-[10px] uppercase">
              Celsius
            </span>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-100">
          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-3 ml-1 tracking-wider">
            Verification Photo
          </label>
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-gray-50 transition-all group">
            <CloudUpload className="w-8 h-8 text-gray-300 mb-2 group-hover:text-mea-orange-light transition-colors" />
            <span className="text-sm font-kanit text-gray-400">Click to upload image</span>
            <span className="text-[10px] text-gray-300 mt-1">JPG, PNG up to 10MB</span>
          </div>
        </div>

        <button 
          type="submit"
          disabled={isLoading}
          className="w-full py-4 rounded-xl bg-mea-orange text-white font-bold font-kanit text-lg flex items-center justify-center gap-2 shadow-lg shadow-orange-900/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              กำลังวิเคราะห์...
            </>
          ) : (
            <>
              บันทึกข้อมูลสำรวจ
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
