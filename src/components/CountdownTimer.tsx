'use client';

import { useState, useEffect } from 'react';

export default function CountdownTimer() {
  const [time, setTime] = useState({
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();

      // Convert to WIB (UTC+7)
      const wibTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));

      setTime({
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
    <div className="admin-time-box flex flex-col items-center rounded-xl border px-6 py-4 min-w-[100px] backdrop-blur-md transition-all duration-300">
      <span className="admin-time-label text-sm mb-1">{label}</span>
      <span className="admin-time-value text-4xl font-bold">{value.toString().padStart(2, '0')}</span>
    </div>
  );

  return (
    <div className="flex items-center gap-4">
      <TimeBox
        value={time.hours}
        label="Jam"
      />
      <span className="admin-time-separator text-3xl font-bold">:</span>
      <TimeBox
        value={time.minutes}
        label="Menit"
      />
      <span className="admin-time-separator text-3xl font-bold">:</span>
      <TimeBox
        value={time.seconds}
        label="Detik"
      />
    </div>
  );
}
