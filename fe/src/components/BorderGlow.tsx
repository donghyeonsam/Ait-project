import { useRef, useCallback, useState, useEffect } from 'react'
import type { ComponentProps, CSSProperties, PointerEvent as ReactPointerEvent } from 'react'
import { cn } from '@/lib/utils'

interface BorderGlowProps extends Omit<ComponentProps<'article'>, 'ref'> {
  observeRef?: (node: HTMLElement | null) => void;
  contentClassName?: string;
  edgeSensitivity?: number;
  glowColor?: string;
  backgroundColor?: string;
  borderRadius?: number;
  glowRadius?: number;
  glowIntensity?: number;
  coneSpread?: number;
  animated?: boolean;
  colors?: string[];
  fillOpacity?: number;
}

function buildBoxShadow(glowColor: string, intensity: number): string {
  const layers: [number, number, number, number, number, boolean][] = [
    [0, 0, 0, 1, 100, true], [0, 0, 1, 0, 60, true], [0, 0, 3, 0, 50, true],
    [0, 0, 6, 0, 40, true], [0, 0, 15, 0, 30, true], [0, 0, 25, 2, 20, true],
    [0, 0, 50, 2, 10, true],
    [0, 0, 1, 0, 60, false], [0, 0, 3, 0, 50, false], [0, 0, 6, 0, 40, false],
    [0, 0, 15, 0, 30, false], [0, 0, 25, 2, 20, false], [0, 0, 50, 2, 10, false],
  ];
  return layers.map(([x, y, blur, spread, alpha, inset]) => {
    const a = Math.min(alpha * intensity, 100);
    return `${inset ? 'inset ' : ''}${x}px ${y}px ${blur}px ${spread}px color-mix(in srgb, ${glowColor} ${a}%, transparent)`;
  }).join(', ');
}

function easeOutCubic(x: number) { return 1 - Math.pow(1 - x, 3); }
function easeInCubic(x: number) { return x * x * x; }

interface AnimateOpts {
  start?: number; end?: number; duration?: number; delay?: number;
  ease?: (t: number) => number; onUpdate: (v: number) => void; onEnd?: () => void;
}

function animateValue({ start = 0, end = 100, duration = 1000, delay = 0, ease = easeOutCubic, onUpdate, onEnd }: AnimateOpts) {
  const t0 = performance.now() + delay;
  let frame = 0;
  function tick() {
    const elapsed = performance.now() - t0;
    const t = Math.min(elapsed / duration, 1);
    onUpdate(start + (end - start) * ease(t));
    if (t < 1) frame = requestAnimationFrame(tick);
    else if (onEnd) onEnd();
  }
  const timeout = window.setTimeout(() => {
    frame = requestAnimationFrame(tick);
  }, delay);

  return () => {
    window.clearTimeout(timeout);
    cancelAnimationFrame(frame);
  };
}

const GRADIENT_POSITIONS = ['80% 55%', '69% 34%', '8% 6%', '41% 38%', '86% 85%', '82% 18%', '51% 4%'];
const COLOR_MAP = [0, 1, 2, 0, 1, 2, 1];

function buildMeshGradients(colors: string[]): string[] {
  const gradients: string[] = [];
  for (let i = 0; i < 7; i++) {
    const c = colors[Math.min(COLOR_MAP[i], colors.length - 1)];
    gradients.push(`radial-gradient(at ${GRADIENT_POSITIONS[i]}, ${c} 0px, transparent 50%)`);
  }
  gradients.push(`linear-gradient(${colors[0]} 0 100%)`);
  return gradients;
}

// React Bits 기반 장식용 카드. 포인터가 테두리에 가까울수록(edgeProximity) 커서 각도 방향으로 글로우가 밝아진다.
// animated=true면 진입 시 한 번 자동으로 테두리를 훑는 스윕 연출을 재생한다.
const BorderGlow: React.FC<BorderGlowProps> = ({
  children,
  observeRef,
  contentClassName = '',
  className = '',
  edgeSensitivity = 30,
  glowColor = 'var(--color-action-primary)',
  backgroundColor = 'var(--color-surface-default)',
  borderRadius = 12,
  glowRadius = 24,
  glowIntensity = 0.3,
  coneSpread = 14,
  animated = false,
  colors = [
    'var(--color-action-primary)',
    'var(--color-status-info)',
    'var(--color-status-info-border)',
  ],
  fillOpacity = 0.12,
  onPointerMove,
  onPointerEnter,
  onPointerLeave,
  style,
  ...articleProps
}) => {
  const cardRef = useRef<HTMLElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [cursorAngle, setCursorAngle] = useState(45);
  const [edgeProximity, setEdgeProximity] = useState(0);
  const [sweepActive, setSweepActive] = useState(false);

  const setCardRef = useCallback((node: HTMLElement | null) => {
    cardRef.current = node;
    observeRef?.(node);
  }, [observeRef]);

  const getCenterOfElement = useCallback((el: HTMLElement) => {
    const { width, height } = el.getBoundingClientRect();
    return [width / 2, height / 2];
  }, []);

  const getEdgeProximity = useCallback((el: HTMLElement, x: number, y: number) => {
    const [cx, cy] = getCenterOfElement(el);
    const dx = x - cx;
    const dy = y - cy;
    let kx = Infinity;
    let ky = Infinity;
    if (dx !== 0) kx = cx / Math.abs(dx);
    if (dy !== 0) ky = cy / Math.abs(dy);
    return Math.min(Math.max(1 / Math.min(kx, ky), 0), 1);
  }, [getCenterOfElement]);

  const getCursorAngle = useCallback((el: HTMLElement, x: number, y: number) => {
    const [cx, cy] = getCenterOfElement(el);
    const dx = x - cx;
    const dy = y - cy;
    if (dx === 0 && dy === 0) return 0;
    const radians = Math.atan2(dy, dx);
    let degrees = radians * (180 / Math.PI) + 90;
    if (degrees < 0) degrees += 360;
    return degrees;
  }, [getCenterOfElement]);

  const handlePointerMove = useCallback((e: ReactPointerEvent<HTMLElement>) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setEdgeProximity(getEdgeProximity(card, x, y));
    setCursorAngle(getCursorAngle(card, x, y));
    onPointerMove?.(e);
  }, [getEdgeProximity, getCursorAngle, onPointerMove]);

  useEffect(() => {
    if (!animated || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const angleStart = 110;
    const angleEnd = 465;
    const cleanups: Array<() => void> = [];
    const startFrame = requestAnimationFrame(() => {
      setSweepActive(true);
      setCursorAngle(angleStart);

      cleanups.push(
        animateValue({ duration: 500, onUpdate: v => setEdgeProximity(v / 100) }),
        animateValue({ ease: easeInCubic, duration: 1500, end: 50, onUpdate: v => {
          setCursorAngle((angleEnd - angleStart) * (v / 100) + angleStart);
        }}),
        animateValue({ ease: easeOutCubic, delay: 1500, duration: 2250, start: 50, end: 100, onUpdate: v => {
          setCursorAngle((angleEnd - angleStart) * (v / 100) + angleStart);
        }}),
        animateValue({ ease: easeInCubic, delay: 2500, duration: 1500, start: 100, end: 0,
          onUpdate: v => setEdgeProximity(v / 100),
          onEnd: () => setSweepActive(false),
        }),
      );
    });

    return () => {
      cancelAnimationFrame(startFrame);
      cleanups.forEach(cleanup => cleanup());
    };
  }, [animated]);

  const colorSensitivity = edgeSensitivity + 20;
  const isVisible = isHovered || sweepActive;
  const borderOpacity = isVisible
    ? Math.max(0, (edgeProximity * 100 - colorSensitivity) / (100 - colorSensitivity))
    : 0;
  const glowOpacity = isVisible
    ? Math.max(0, (edgeProximity * 100 - edgeSensitivity) / (100 - edgeSensitivity))
    : 0;

  const meshGradients = buildMeshGradients(colors);
  const borderBg = meshGradients.map(g => `${g} border-box`);
  const fillBg = meshGradients.map(g => `${g} padding-box`);
  const angleDeg = `${cursorAngle.toFixed(3)}deg`;

  return (
    <article
      ref={setCardRef}
      onPointerMove={handlePointerMove}
      onPointerEnter={event => {
        setIsHovered(true);
        onPointerEnter?.(event);
      }}
      onPointerLeave={event => {
        setIsHovered(false);
        onPointerLeave?.(event);
      }}
      className={cn('relative isolate border border-border-default', className)}
      style={{
        ...style,
        background: backgroundColor,
        borderRadius: `${borderRadius}px`,
      }}
      {...articleProps}
    >
      {/* mesh gradient border */}
      <div
        className="pointer-events-none absolute inset-0 rounded-[inherit]"
        style={{
          border: '1px solid transparent',
          background: [
            `linear-gradient(${backgroundColor} 0 100%) padding-box`,
            'linear-gradient(rgb(255 255 255 / 0%) 0% 100%) border-box',
            ...borderBg,
          ].join(', '),
          opacity: borderOpacity,
          maskImage: `conic-gradient(from ${angleDeg} at center, black ${coneSpread}%, transparent ${coneSpread + 15}%, transparent ${100 - coneSpread - 15}%, black ${100 - coneSpread}%)`,
          WebkitMaskImage: `conic-gradient(from ${angleDeg} at center, black ${coneSpread}%, transparent ${coneSpread + 15}%, transparent ${100 - coneSpread - 15}%, black ${100 - coneSpread}%)`,
          transition: isVisible
            ? 'opacity var(--duration-base) var(--easing-standard)'
            : 'opacity var(--duration-slow) var(--easing-standard)',
        }}
      />

      {/* mesh gradient fill near edges */}
      <div
        className="pointer-events-none absolute inset-0 rounded-[inherit]"
        style={{
          border: '1px solid transparent',
          background: fillBg.join(', '),
          maskImage: [
            'linear-gradient(to bottom, black, black)',
            'radial-gradient(ellipse at 50% 50%, black 40%, transparent 65%)',
            'radial-gradient(ellipse at 66% 66%, black 5%, transparent 40%)',
            'radial-gradient(ellipse at 33% 33%, black 5%, transparent 40%)',
            'radial-gradient(ellipse at 66% 33%, black 5%, transparent 40%)',
            'radial-gradient(ellipse at 33% 66%, black 5%, transparent 40%)',
            `conic-gradient(from ${angleDeg} at center, transparent 5%, black 15%, black 85%, transparent 95%)`,
          ].join(', '),
          WebkitMaskImage: [
            'linear-gradient(to bottom, black, black)',
            'radial-gradient(ellipse at 50% 50%, black 40%, transparent 65%)',
            'radial-gradient(ellipse at 66% 66%, black 5%, transparent 40%)',
            'radial-gradient(ellipse at 33% 33%, black 5%, transparent 40%)',
            'radial-gradient(ellipse at 66% 33%, black 5%, transparent 40%)',
            'radial-gradient(ellipse at 33% 66%, black 5%, transparent 40%)',
            `conic-gradient(from ${angleDeg} at center, transparent 5%, black 15%, black 85%, transparent 95%)`,
          ].join(', '),
          maskComposite: 'subtract, add, add, add, add, add',
          WebkitMaskComposite: 'source-out, source-over, source-over, source-over, source-over, source-over',
          opacity: borderOpacity * fillOpacity,
          mixBlendMode: 'soft-light',
          transition: isVisible
            ? 'opacity var(--duration-base) var(--easing-standard)'
            : 'opacity var(--duration-slow) var(--easing-standard)',
        } as CSSProperties}
      />

      {/* outer glow */}
      <span
        className="pointer-events-none absolute rounded-[inherit]"
        style={{
          inset: `${-glowRadius}px`,
          maskImage: `conic-gradient(from ${angleDeg} at center, black 2.5%, transparent 10%, transparent 90%, black 97.5%)`,
          WebkitMaskImage: `conic-gradient(from ${angleDeg} at center, black 2.5%, transparent 10%, transparent 90%, black 97.5%)`,
          opacity: glowOpacity,
          mixBlendMode: 'plus-lighter',
          transition: isVisible
            ? 'opacity var(--duration-base) var(--easing-standard)'
            : 'opacity var(--duration-slow) var(--easing-standard)',
        } as CSSProperties}
      >
        <span
          className="absolute rounded-[inherit]"
          style={{
            inset: `${glowRadius}px`,
            boxShadow: buildBoxShadow(glowColor, glowIntensity),
          }}
        />
      </span>

      <div
        className={cn('relative', contentClassName)}
        style={{ zIndex: 'var(--z-index-base)' }}
      >
        {children}
      </div>
    </article>
  );
};

export default BorderGlow;
