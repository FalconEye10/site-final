import React, { useEffect, useState, useRef } from 'react';

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  duration = 800,
  decimals = 0,
  prefix = '',
  suffix = '',
  className = '',
}) => {
  const [displayValue, setDisplayValue] = useState<number>(0);
  const startValRef = useRef<number>(0);
  const startTimeRef = useRef<number | null>(null);
  const reqRef = useRef<number | null>(null);

  useEffect(() => {
    startValRef.current = displayValue;
    startTimeRef.current = null;

    const easeOutQuad = (t: number) => t * (2 - t);

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const progress = Math.min((timestamp - startTimeRef.current) / duration, 1);
      const easedProgress = easeOutQuad(progress);
      
      const current = startValRef.current + (value - startValRef.current) * easedProgress;
      setDisplayValue(current);

      if (progress < 1) {
        reqRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(value);
      }
    };

    reqRef.current = requestAnimationFrame(animate);

    return () => {
      if (reqRef.current) cancelAnimationFrame(reqRef.current);
    };
  }, [value, duration]);

  const formatted = decimals > 0 
    ? displayValue.toFixed(decimals) 
    : Math.round(displayValue).toLocaleString('ro-RO');

  return (
    <span className={`inline-block font-data ${className}`}>
      {prefix}{formatted}{suffix}
    </span>
  );
};
