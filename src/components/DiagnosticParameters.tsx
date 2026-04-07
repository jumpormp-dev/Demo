import React from 'react';
import { Calendar, Thermometer, Volume2, TrendingDown } from 'lucide-react';

interface DiagnosticParametersProps {
  thermal: number;
  sound: number;
  load: number;
  trips: number;
  peakFreq: number;
  age: number;
  humidity: number;
  planMonth: string;
  pmStatus?: 'Pending' | 'In Progress' | 'Completed';
}

export function DiagnosticParameters({ thermal, sound, load, trips, peakFreq, age, humidity, planMonth, pmStatus = 'Pending' }: DiagnosticParametersProps) {
  const parameters = [
    {
      icon: Calendar,
      label: 'แผน PM',
      value: planMonth,
      subValue: `Status: ${pmStatus}`,
      progress: pmStatus === 'Completed' ? 100 : pmStatus === 'In Progress' ? 50 : 10,
      color: pmStatus === 'Completed' ? 'text-mea-green' : pmStatus === 'In Progress' ? 'text-blue-500' : 'text-gray-500',
      bg: pmStatus === 'Completed' ? 'bg-green-50' : pmStatus === 'In Progress' ? 'bg-blue-50' : 'bg-gray-50',
    },
    {
      icon: Thermometer,
      label: 'ความร้อน / ความชื้น',
      value: `${thermal.toFixed(1)} °C / ${humidity.toFixed(0)}%`,
      subValue: thermal > 85 ? 'Critical Heat' : 'Normal Range',
      color: thermal > 85 ? 'text-mea-red' : 'text-gray-500',
      bg: thermal > 85 ? 'bg-red-50' : 'bg-gray-50',
    },
    {
      icon: Volume2,
      label: 'เสียง / ความถี่',
      value: `${sound.toFixed(0)} dB / ${Math.round(peakFreq / 1000)} kHz`,
      subValue: sound > 82 ? 'Acoustic Warning' : 'Normal Range',
      color: sound > 82 ? 'text-mea-red' : 'text-gray-500',
      bg: sound > 82 ? 'bg-red-50' : 'bg-gray-50',
    },
    {
      icon: TrendingDown,
      label: 'โหลด / ทริป',
      value: `${load.toFixed(1)}% / ${trips}`,
      subValue: `Trips: ${trips} ครั้ง`,
      color: load > 105 ? 'text-mea-red' : 'text-gray-500',
      bg: load > 105 ? 'bg-red-50' : 'bg-gray-50',
    },
  ];

  return (
    <div className="bg-white p-8 rounded-2xl shadow-sm border-l-4 border-mea-orange-light">
      <div className="flex justify-between items-center mb-8">
        <h3 className="font-inter font-bold text-xl text-gray-900">Diagnostic Parameters</h3>
        <span className="bg-green-100 text-mea-green px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
          Historical Average: Stable
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
        {parameters.map((param, idx) => (
          <div key={idx} className={`${param.bg} p-4 rounded-xl flex flex-col gap-1 transition-all duration-300`}>
            <div className={`flex items-center gap-2 ${param.color} mb-1`}>
              <param.icon className="w-4 h-4" />
              <span className="text-xs font-kanit font-bold">{param.label}</span>
            </div>
            <span className="text-xl font-bold font-kanit text-gray-900">{param.value}</span>
            {param.progress !== undefined && param.label === 'แผน PM' ? (
              <div className="h-1 w-full bg-gray-200 mt-2 rounded-full overflow-hidden">
                <div className="h-full bg-gray-400 transition-all duration-1000" style={{ width: `${param.progress}%` }}></div>
              </div>
            ) : (
              <p className={`text-[10px] ${param.color} opacity-60 mt-2 font-inter`}>{param.subValue}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
