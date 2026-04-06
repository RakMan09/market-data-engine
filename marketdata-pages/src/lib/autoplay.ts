import { useEffect, useMemo, useState } from 'react';

export const useReducedMotion = (): boolean => {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  return reduced;
};

export const useAutoplayIndex = (length: number, intervalMs = 800, loop = true): number => {
  const reduced = useReducedMotion();
  const [idx, setIdx] = useState(0);

  const safeLength = useMemo(() => Math.max(length, 1), [length]);

  useEffect(() => {
    if (safeLength <= 1 || reduced) {
      setIdx(0);
      return;
    }
    const timer = setInterval(() => {
      setIdx((prev) => {
        if (loop) {
          return (prev + 1) % safeLength;
        }
        return Math.min(prev + 1, safeLength - 1);
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [safeLength, intervalMs, reduced, loop]);

  return idx;
};
