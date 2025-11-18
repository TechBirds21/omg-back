import React, { useEffect, useState } from 'react';

interface CircularCountdownTimerProps {
  duration: number; // Duration in seconds
  onComplete: () => void;
  size?: number;
  strokeWidth?: number;
}

export const CircularCountdownTimer: React.FC<CircularCountdownTimerProps> = ({
  duration,
  onComplete,
  size = 80,
  strokeWidth = 6
}) => {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(timeLeft => timeLeft - 1);
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, timeLeft]);

  // Separate effect to handle completion
  useEffect(() => {
    if (timeLeft === 0 && isActive) {
      setIsActive(false);
      onComplete();
    }
  }, [timeLeft, isActive, onComplete]);

  // Calculate circle properties
  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  
  // Calculate progress (decreasing clockwise)
  const progress = timeLeft / duration;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <div className="flex flex-col items-center space-y-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          className="transform -rotate-90"
        >
          {/* Background circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            stroke="hsl(var(--muted))"
            strokeWidth={strokeWidth}
            fill="none"
            className="opacity-20"
          />
          
          {/* Progress circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            stroke="hsl(var(--primary))"
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000 ease-linear"
            style={{
              filter: `hue-rotate(${(1 - progress) * 120}deg)`
            }}
          />
        </svg>
        
        {/* Timer text in center */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold text-foreground">
            {timeLeft}
          </span>
        </div>
      </div>
      
      <p className="text-sm text-muted-foreground text-center">
        Verifying payment...
      </p>
    </div>
  );
};

export default CircularCountdownTimer;
