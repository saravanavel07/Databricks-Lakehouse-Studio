import React, { useEffect, useRef } from 'react';

interface ParticleCanvasProps {
  intensity?: number; // 0 to 100
  isRunning?: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  phase: number;
  accent: boolean;
}

interface DataPacket {
  from: number;
  to: number;
  progress: number;
  speed: number;
}

export const ParticleCanvas: React.FC<ParticleCanvasProps> = ({ intensity = 50, isRunning = false }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || intensity <= 0) return;

    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (motionPreference.matches) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    let frameId = 0;
    let width = 0;
    let height = 0;
    let tick = 0;
    let mouseX = -1000;
    let mouseY = -1000;
    const density = intensity / 50;
    const particles: Particle[] = [];
    const packets: DataPacket[] = [];

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const particleCount = Math.max(18, Math.min(48, Math.floor((width * height) / 26000 * density)));
    for (let i = 0; i < particleCount; i++) {
      const accent = Math.random() > 0.68;
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() * 0.5 + 0.12) * (isRunning ? 1.8 : 1) * density,
        vy: (Math.random() - 0.5) * 0.4 * density,
        radius: Math.random() * 2 + 1.2,
        phase: Math.random() * Math.PI * 2,
        accent
      });
    }

    const packetCount = Math.max(8, Math.floor(particleCount * 0.85));
    for (let i = 0; i < packetCount; i++) {
      packets.push({
        from: Math.floor(Math.random() * particleCount),
        to: Math.floor(Math.random() * particleCount),
        progress: Math.random(),
        speed: (0.003 + Math.random() * 0.006) * density * (isRunning ? 1.8 : 1)
      });
    }

    const moveMouse = (event: MouseEvent) => {
      mouseX = event.clientX;
      mouseY = event.clientY;
    };
    const leaveWindow = () => {
      mouseX = -1000;
      mouseY = -1000;
    };

    const draw = () => {
      if (document.hidden) {
        frameId = requestAnimationFrame(draw);
        return;
      }

      tick += 1;
      context.clearRect(0, 0, width, height);
      const connectionDistance = width > 768 ? 170 : 100;

      // Fine, gently shimmering links between nearby data nodes.
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i];
          const b = particles[j];
          const distance = Math.hypot(a.x - b.x, a.y - b.y);
          if (distance >= connectionDistance) continue;

          const strength = 1 - distance / connectionDistance;
          const shimmer = 0.78 + Math.sin(tick * 0.025 + a.phase) * 0.22;
          const alpha = strength * (isRunning ? 0.32 : 0.19) * density * shimmer;
          context.beginPath();
          context.moveTo(a.x, a.y);
          context.lineTo(b.x, b.y);
          context.strokeStyle = isRunning || a.accent || b.accent
            ? `rgba(255, 54, 33, ${alpha})`
            : `rgba(148, 163, 184, ${alpha})`;
          context.lineWidth = strength * (isRunning ? 1.5 : 1);
          context.stroke();
        }
      }

      // Bright packets glide along the network, with a short luminous tail.
      for (const packet of packets) {
        packet.progress += packet.speed;
        if (packet.progress >= 1) {
          packet.progress = 0;
          packet.from = Math.floor(Math.random() * particles.length);
          let nearest = (packet.from + 1) % particles.length;
          let nearestDistance = connectionDistance;
          for (let i = 0; i < particles.length; i++) {
            if (i === packet.from) continue;
            const distance = Math.hypot(
              particles[packet.from].x - particles[i].x,
              particles[packet.from].y - particles[i].y
            );
            if (distance < nearestDistance) {
              nearest = i;
              nearestDistance = distance;
            }
          }
          packet.to = nearest;
        }

        const start = particles[packet.from];
        const end = particles[packet.to];
        if (!start || !end || Math.hypot(start.x - end.x, start.y - end.y) >= connectionDistance) continue;

        const x = start.x + (end.x - start.x) * packet.progress;
        const y = start.y + (end.y - start.y) * packet.progress;
        const tailX = start.x + (end.x - start.x) * Math.max(0, packet.progress - 0.09);
        const tailY = start.y + (end.y - start.y) * Math.max(0, packet.progress - 0.09);
        const trail = context.createLinearGradient(tailX, tailY, x, y);
        trail.addColorStop(0, 'rgba(255, 54, 33, 0)');
        trail.addColorStop(1, isRunning ? 'rgba(255, 54, 33, 0.8)' : 'rgba(245, 158, 11, 0.75)');
        context.beginPath();
        context.moveTo(tailX, tailY);
        context.lineTo(x, y);
        context.strokeStyle = trail;
        context.lineWidth = 2;
        context.stroke();
        context.beginPath();
        context.arc(x, y, isRunning ? 2.4 : 1.9, 0, Math.PI * 2);
        context.fillStyle = '#fff7ed';
        context.shadowBlur = 12;
        context.shadowColor = isRunning ? '#ff3621' : '#f59e0b';
        context.fill();
        context.shadowBlur = 0;
      }

      // Floating nodes gently breathe and respond to the pointer.
      for (const particle of particles) {
        particle.x += particle.vx;
        particle.y += particle.vy;

        const dx = particle.x - mouseX;
        const dy = particle.y - mouseY;
        const distance = Math.hypot(dx, dy);
        if (distance < 125 && distance > 0) {
          const force = (1 - distance / 125) * 0.75;
          particle.x += (dx / distance) * force;
          particle.y += (dy / distance) * force;
        }

        if (particle.x > width + 20) particle.x = -20;
        if (particle.x < -20) particle.x = width + 20;
        if (particle.y > height + 20) particle.y = -20;
        if (particle.y < -20) particle.y = height + 20;

        const pulse = (Math.sin(tick * 0.045 + particle.phase) + 1) / 2;
        const radius = particle.radius + pulse * 0.8;
        const color = isRunning || particle.accent ? '255, 54, 33' : '245, 158, 11';

        // Expanding rings make active/accent nodes feel like live pipeline signals.
        if (particle.accent || isRunning) {
          const ringRadius = radius + 3 + pulse * 8;
          context.beginPath();
          context.arc(particle.x, particle.y, ringRadius, 0, Math.PI * 2);
          context.strokeStyle = `rgba(${color}, ${(1 - pulse) * (isRunning ? 0.24 : 0.12)})`;
          context.lineWidth = 1;
          context.stroke();
        }

        context.beginPath();
        context.arc(particle.x, particle.y, radius * 2.7, 0, Math.PI * 2);
        context.fillStyle = `rgba(${color}, ${isRunning ? 0.13 : 0.07})`;
        context.fill();
        context.beginPath();
        context.arc(particle.x, particle.y, radius, 0, Math.PI * 2);
        context.fillStyle = `rgba(${color}, ${isRunning ? 0.88 : particle.accent ? 0.72 : 0.42})`;
        context.fill();
      }

      frameId = requestAnimationFrame(draw);
    };

    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', moveMouse, { passive: true });
    document.addEventListener('mouseleave', leaveWindow);
    frameId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', moveMouse);
      document.removeEventListener('mouseleave', leaveWindow);
    };
  }, [intensity, isRunning]);

  if (intensity <= 0) return null;

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0 h-screen w-screen opacity-85 transition-opacity duration-500"
      aria-hidden="true"
    />
  );
};
