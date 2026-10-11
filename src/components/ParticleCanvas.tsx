import React, { useEffect, useRef } from 'react';

interface ParticleCanvasProps {
  intensity?: number; // 0 to 100
  isRunning?: boolean;
}

export const ParticleCanvas: React.FC<ParticleCanvasProps> = ({ intensity = 50, isRunning = false }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || intensity <= 0) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    let mouseX = -1000;
    let mouseY = -1000;

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };

    const handleMouseLeave = () => {
      mouseX = -1000;
      mouseY = -1000;
    };

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);

    // Number of interactive floating nodes
    const densityFactor = intensity / 50;
    const nodeCount = Math.max(16, Math.min(36, Math.floor((width * height) / 28000 * densityFactor)));

    interface NodeParticle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      baseRadius: number;
      radius: number;
      color: string;
      phase: number;
      isAccent: boolean;
    }

    interface FlowingPacket {
      sourceIdx: number;
      targetIdx: number;
      progress: number;
      speed: number;
    }

    const particles: NodeParticle[] = [];
    const colors = [
      'rgba(255, 54, 33, 0.45)',  // Databricks Flame Red
      'rgba(245, 158, 11, 0.40)', // Bronze Amber
      'rgba(148, 163, 184, 0.35)',// Silver Slate
      'rgba(234, 179, 8, 0.45)'   // Gold Yellow
    ];

    for (let i = 0; i < nodeCount; i++) {
      const isAccent = Math.random() > 0.65;
      const r = Math.random() * 2.2 + 1.2;
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        // Continuous gentle forward flow (drifting rightward like data flowing through pipeline)
        vx: (Math.random() * 0.45 + 0.1) * (isRunning ? 1.6 : 1.0) * densityFactor,
        vy: (Math.random() - 0.5) * 0.35 * (isRunning ? 1.5 : 1.0) * densityFactor,
        baseRadius: r,
        radius: r,
        color: isAccent ? 'rgba(255, 54, 33, 0.55)' : colors[Math.floor(Math.random() * colors.length)],
        phase: Math.random() * Math.PI * 2,
        isAccent
      });
    }

    // Packets that continuously travel along node connection links
    const packets: FlowingPacket[] = [];
    for (let i = 0; i < Math.floor(nodeCount * 0.7); i++) {
      packets.push({
        sourceIdx: Math.floor(Math.random() * nodeCount),
        targetIdx: Math.floor(Math.random() * nodeCount),
        progress: Math.random(),
        speed: (Math.random() * 0.008 + 0.004) * (isRunning ? 2.0 : 1.0) * densityFactor
      });
    }

    let tick = 0;

    const render = () => {
      tick++;
      ctx.clearRect(0, 0, width, height);

      // 1. Draw connecting data filaments
      const maxConnectDist = width > 768 ? 160 : 90;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxConnectDist) {
            const edgeRatio = 1 - dist / maxConnectDist;
            const alpha = edgeRatio * (isRunning ? 0.28 : 0.16) * densityFactor;

            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = isRunning
              ? `rgba(255, 54, 33, ${alpha})`
              : (particles[i].isAccent || particles[j].isAccent)
              ? `rgba(255, 54, 33, ${alpha * 0.8})`
              : `rgba(203, 213, 225, ${alpha * 1.2})`;
            ctx.lineWidth = edgeRatio * (isRunning ? 1.4 : 0.95);
            ctx.stroke();
          }
        }
      }

      // 2. Draw live flowing data packets travelling between nearby nodes
      for (const packet of packets) {
        packet.progress += packet.speed;
        if (packet.progress >= 1) {
          packet.progress = 0;
          packet.sourceIdx = Math.floor(Math.random() * particles.length);
          // pick a target within connection range
          let bestTarget = (packet.sourceIdx + 1) % particles.length;
          let bestDist = 9999;
          for (let k = 0; k < particles.length; k++) {
            if (k === packet.sourceIdx) continue;
            const d = Math.hypot(particles[packet.sourceIdx].x - particles[k].x, particles[packet.sourceIdx].y - particles[k].y);
            if (d < maxConnectDist && d < bestDist) {
              bestDist = d;
              bestTarget = k;
            }
          }
          packet.targetIdx = bestTarget;
        }

        const p1 = particles[packet.sourceIdx];
        const p2 = particles[packet.targetIdx];
        if (p1 && p2) {
          const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
          if (dist < maxConnectDist) {
            const px = p1.x + (p2.x - p1.x) * packet.progress;
            const py = p1.y + (p2.y - p1.y) * packet.progress;

            // Draw glowing packet
            ctx.beginPath();
            ctx.arc(px, py, 1.8, 0, Math.PI * 2);
            ctx.fillStyle = isRunning ? 'rgba(255, 54, 33, 0.9)' : 'rgba(245, 158, 11, 0.75)';
            ctx.fill();

            // Glow aura
            ctx.beginPath();
            ctx.arc(px, py, 4.5, 0, Math.PI * 2);
            ctx.fillStyle = isRunning ? 'rgba(255, 54, 33, 0.25)' : 'rgba(255, 180, 50, 0.15)';
            ctx.fill();
          }
        }
      }

      // 3. Update & render node particles
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;

        // Subtle breathing radius
        const breath = Math.sin(tick * 0.04 + p.phase) * 0.6;
        p.radius = Math.max(0.8, p.baseRadius + breath);

        // Soft mouse repulsion/gravitation
        const mdx = p.x - mouseX;
        const mdy = p.y - mouseY;
        const mDist = Math.hypot(mdx, mdy);
        if (mDist < 120 && mDist > 0) {
          const force = (1 - mDist / 120) * 0.6;
          p.x += (mdx / mDist) * force;
          p.y += (mdy / mDist) * force;
        }

        // Horizontal wrap (flows smoothly off right edge and re-enters on left)
        if (p.x > width + 20) p.x = -20;
        if (p.x < -20) p.x = width + 20;
        if (p.y > height + 20) p.y = -20;
        if (p.y < -20) p.y = height + 20;

        // Outer glow halo for accent nodes
        if (p.isAccent || isRunning) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius * 2.8, 0, Math.PI * 2);
          ctx.fillStyle = isRunning ? 'rgba(255, 54, 33, 0.15)' : 'rgba(255, 54, 33, 0.08)';
          ctx.fill();
        }

        // Core circle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = isRunning ? 'rgba(255, 54, 33, 0.85)' : p.color;
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
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
