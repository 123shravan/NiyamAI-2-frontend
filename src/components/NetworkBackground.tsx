'use client';

import React, { useEffect, useRef } from 'react';

interface Point {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
}

const NetworkBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let particles: Point[] = [];
    let animationFrameId: number;
    let mouse = { x: -1000, y: -1000 };

    // Performance & visual settings
    const MAX_DISTANCE = 150; // max line connection distance
    const MOUSE_REPEL_RADIUS = 100;
    
    // A palette matching the provided tailwind theme (Primary, Indigo, Secondary, Surface tints)
    const COLOR_PALETTE = [
      '195, 192, 255', // surface-tint / primary-fixed-dim
      '79, 70, 229',   // primary-container
      '183, 200, 225', // secondary-fixed-dim
      '220, 225, 251', // inverse-surface
    ];

    // Determine dynamic particle count based on window size
    const getParticleCount = (width: number) => {
      if (width < 768) return 35; // Mobile
      if (width < 1024) return 50; // Tablet
      return 75; // Desktop
    };

    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      
      // Force CSS width/height to logical bounds to prevent blurring
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      
      // Scale canvas context to match device pixel ratio
      ctx.scale(dpr, dpr);
      initParticles();
    };

    const initParticles = () => {
      particles = [];
      const particleCount = getParticleCount(window.innerWidth);
      
      for (let i = 0; i < particleCount; i++) {
        const randomColor = COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)];
        
        particles.push({
          x: Math.random() * window.innerWidth,
          y: Math.random() * window.innerHeight,
          vx: (Math.random() - 0.5) * 0.3, // Very slow movement
          vy: (Math.random() - 0.5) * 0.3,
          radius: Math.random() * 1.5 + 0.8, // Slightly larger radii for visibility
          color: randomColor,
        });
      }
    };

    const drawParticles = () => {
      // Clear scaled logical viewport
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      for (let i = 0; i < particles.length; i++) {
        const p1 = particles[i];

        // Movement
        p1.x += p1.vx;
        p1.y += p1.vy;

        // Bouncing off edges smoothly
        if (p1.x < 0 || p1.x > window.innerWidth) p1.vx *= -1;
        if (p1.y < 0 || p1.y > window.innerHeight) p1.vy *= -1;

        // Mouse Repel Logic
        const dxMouse = mouse.x - p1.x;
        const dyMouse = mouse.y - p1.y;
        const distMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);
        
        if (distMouse < MOUSE_REPEL_RADIUS) {
          const repelStrength = (MOUSE_REPEL_RADIUS - distMouse) / MOUSE_REPEL_RADIUS;
          p1.x -= dxMouse * repelStrength * 0.02;
          p1.y -= dyMouse * repelStrength * 0.02;
        }

        // Draw Node
        ctx.beginPath();
        ctx.arc(p1.x, p1.y, p1.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p1.color}, 0.55)`; // Clearer opacity logic
        ctx.fill();

        // Draw Connections
        // Using a secondary loop but starting from i + 1 to avoid duplicate lines (n^2 / 2)
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < MAX_DISTANCE) {
            ctx.beginPath();
            // Opacity decreases as distance increases
            const opacity = (1 - dist / MAX_DISTANCE) * 0.18; 
            // Mix connections using p1's color group
            ctx.strokeStyle = `rgba(${p1.color}, ${opacity})`;
            ctx.lineWidth = 0.8; // slightly thicker for retina clarity
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(drawParticles);
    };

    // Event Listeners
    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    const handleMouseLeave = () => {
      mouse.x = -1000;
      mouse.y = -1000;
    };

    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseout', handleMouseLeave);

    // Initial setup
    resizeCanvas();
    drawParticles();

    // Cleanup
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseout', handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-[1]"
    />
  );
};

export default NetworkBackground;
