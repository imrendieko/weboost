'use client';

import { useState, useEffect } from 'react';

interface CountdownTimerProps {
  showDate?: boolean;
}

export default function CountdownTimer({ showDate = true }: CountdownTimerProps) {
  const [dateTime, setDateTime] = useState({
    day: '',
    date: 0,
    month: '',
    year: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();

      // Convert to WIB (UTC+7)
      const wibTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));

      const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

      setDateTime({
        day: days[wibTime.getDay()],
        date: wibTime.getDate(),
        month: months[wibTime.getMonth()],
        year: wibTime.getFullYear(),
        hours: wibTime.getHours(),
        minutes: wibTime.getMinutes(),
        seconds: wibTime.getSeconds(),
      });
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, []);

  const TimeBox = ({ value, label }: { value: number; label: string }) => (
    <div className="admin-time-box flex flex-col items-center rounded-xl border px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 sm:min-w-[100px] backdrop-blur-md transition-all duration-300">
      <span className="admin-time-label text-xs sm:text-sm mb-1">{label}</span>
      <span className="admin-time-value text-2xl sm:text-3xl md:text-4xl font-bold">{value.toString().padStart(2, '0')}</span>
    </div>
  );

  return (
    <div className="flex flex-col items-center gap-3 sm:gap-6">
      {/* Date Section */}
      {showDate && (
        <div className="admin-time-box flex items-center gap-2 rounded-xl border px-4 sm:px-6 md:px-8 py-2 sm:py-3 md:py-4 backdrop-blur-md transition-all duration-300">
          <span className="admin-time-value text-lg sm:text-xl md:text-2xl font-bold">
            {dateTime.day}, {dateTime.date} {dateTime.month} {dateTime.year}
          </span>
        </div>
      )}

      {/* Time Section */}
      <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
        <TimeBox
          value={dateTime.hours}
          label="Jam"
        />
        <span className="admin-time-separator text-xl sm:text-2xl md:text-3xl font-bold">:</span>
        <TimeBox
          value={dateTime.minutes}
          label="Menit"
        />
        <span className="admin-time-separator text-xl sm:text-2xl md:text-3xl font-bold">:</span>
        <TimeBox
          value={dateTime.seconds}
          label="Detik"
        />
      </div>
    </div>
  );
}
