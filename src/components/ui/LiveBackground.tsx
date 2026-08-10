import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface LiveBackgroundProps {
  themeColor: string;
}

export const LiveBackground = ({ themeColor }: LiveBackgroundProps) => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: e.clientX,
        y: e.clientY,
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      {/* Base ambient wash */}
      <motion.div 
        className="absolute inset-0 opacity-20"
        animate={{ backgroundColor: themeColor }}
        transition={{ duration: 1.5, ease: 'easeInOut' }}
        style={{ mixBlendMode: 'multiply' }}
      />

      {/* Layer 1: Large slow floating orb */}
      <motion.div
        className="absolute w-[800px] h-[800px] rounded-full blur-[100px] mix-blend-screen"
        animate={{
          x: [0, 100, -50, 0],
          y: [0, -100, 50, 0],
          backgroundColor: themeColor,
          opacity: [0.15, 0.25, 0.15],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        style={{
          top: '10%',
          left: '10%',
        }}
      />

      {/* Layer 2: Interactive orb following mouse slightly */}
      <motion.div
        className="absolute w-[600px] h-[600px] rounded-full blur-[80px] mix-blend-screen"
        animate={{
          x: mousePosition.x * 0.05,
          y: mousePosition.y * 0.05,
          backgroundColor: themeColor,
        }}
        transition={{
          type: "spring",
          damping: 50,
          stiffness: 100,
        }}
        style={{
          top: '40%',
          right: '20%',
          opacity: 0.2,
        }}
      />

      {/* Layer 3: 3D-like floating polygons */}
      <motion.div
        className="absolute w-[400px] h-[400px] blur-[40px] opacity-20"
        animate={{
          rotate: [0, 180, 360],
          scale: [1, 1.2, 1],
          x: [-50, 50, -50],
          y: [50, -50, 50],
          borderColor: themeColor,
        }}
        transition={{
          duration: 30,
          repeat: Infinity,
          ease: "linear",
        }}
        style={{
          bottom: '10%',
          left: '30%',
          borderWidth: '80px',
          borderStyle: 'solid',
          borderRadius: '40% 60% 70% 30% / 40% 50% 60% 50%',
          borderColor: themeColor,
        }}
      />

      {/* Layer 4: Distant small particles */}
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-32 h-32 rounded-full blur-[20px]"
          animate={{
            y: [0, -400, 0],
            x: [0, (i % 2 === 0 ? 200 : -200), 0],
            opacity: [0.1, 0.3, 0.1],
            scale: [1, 1.5, 1],
            backgroundColor: themeColor,
          }}
          transition={{
            duration: 15 + i * 2,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 2,
          }}
          style={{
            top: `${20 + i * 15}%`,
            left: `${10 + i * 20}%`,
          }}
        />
      ))}

      {/* Light overlay to make it look premium and unified */}
      <div className="absolute inset-0 bg-white/10 pointer-events-none" />
    </div>
  );
};
