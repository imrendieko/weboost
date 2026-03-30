'use client';

import { useState, useEffect } from 'react';

export default function RealtimeDateTime() {
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
    const updateDateTime = () => {
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

    updateDateTime();
    const interval = setInterval(updateDateTime, 1000);

    return () => clearInterval(interval);
  }, []);

  const TimeBox = ({ value, label }: { value: number; label: string }) => (
    <div className="admin-time-box flex flex-col items-center rounded-xl border px-4 py-3 backdrop-blur-md transition-all duration-300">
      <span className="admin-time-label text-xs mb-1">{label}</span>
      <span className="admin-time-value text-2xl font-bold">{value.toString().padStart(2, '0')}</span>
    </div>
  );

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="text-center">
        <p className="text-white text-lg font-semibold">
          {dateTime.day}, {dateTime.date} {dateTime.month} {dateTime.year}
        </p>
      </div>
      <div className="flex items-center gap-2 flex-wrap justify-center">
        <TimeBox
          value={dateTime.hours}
          label="Jam"
        />
        <span className="admin-time-separator text-2xl font-bold">:</span>
        <TimeBox
          value={dateTime.minutes}
          label="Menit"
        />
        <span className="admin-time-separator text-2xl font-bold">:</span>
        <TimeBox
          value={dateTime.seconds}
          label="Detik"
        />
      </div>
    </div>
  );
}
