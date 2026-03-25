'use client';

import { useEffect, useRef } from 'react';
import { useAdminTheme } from '@/contexts/AdminThemeContext';

interface Star {
  x: number;
  y: number;
  size: number;
  speed: number;
  opacity: number;
  twinkleSpeed: number;
}

export default function StarBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { theme, mounted } = useAdminTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const setCanvasSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    setCanvasSize();
    window.addEventListener('resize', setCanvasSize);

    // Create stars
    const stars: Star[] = [];
    const numStars = 200;
    const resolvedTheme = mounted ? theme : 'dark';
    const backgroundColor = resolvedTheme === 'light' ? '#eef4ff' : '#0B0B1F';
    const starColor = resolvedTheme === 'light' ? '0, 0, 0' : '255, 255, 255';

    for (let i = 0; i < numStars; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2 + 0.5,
        speed: Math.random() * 0.5 + 0.1,
        opacity: Math.random(),
        twinkleSpeed: Math.random() * 0.02 + 0.01,
      });
    }

    // Animation
    let animationFrameId: number;
    const animate = () => {
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      stars.forEach((star) => {
        // Twinkle effect
        star.opacity += star.twinkleSpeed;
        if (star.opacity > 1 || star.opacity < 0.3) {
          star.twinkleSpeed = -star.twinkleSpeed;
        }

        // Draw star
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${starColor}, ${resolvedTheme === 'light' ? Math.min(star.opacity * 0.45, 0.45) : star.opacity})`;
        ctx.fill();

        // Move star (parallax effect)
        star.y += star.speed;
        if (star.y > canvas.height) {
          star.y = 0;
          star.x = Math.random() * canvas.width;
        }
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', setCanvasSize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [mounted, theme]);

  const resolvedTheme = mounted ? theme : 'dark';

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 -z-10"
      style={{ background: resolvedTheme === 'light' ? '#eef4ff' : '#0B0B1F' }}
    />
  );
}
