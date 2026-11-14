"use client";

import { formatSom } from "@/lib/money";
import { formatCount } from "@/lib/summary";

export const DONUT_COLORS = ["#ff5c1a", "#1b9a57", "#1a1a1a", "#ffb088", "#7d8f86", "#c9a28a"];

export function Donut({
  slices,
  total,
  unit = "сум",
}: {
  slices: { name: string; value: number }[];
  total: number;
  unit?: string;
}) {
  const size = 220;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 80;
  const thickness = 24;
  const gap = slices.length > 1 ? 0.08 : 0;
  const minShare = 0.035;
  let angle = -Math.PI / 2;
  const weighted = slices.map((slice) => Math.max(slice.value / total, minShare));
  const weightSum = weighted.reduce((sum, value) => sum + value, 0);

  const arcs = slices.map((slice, index) => {
    const share = weighted[index] / weightSum;
    const sweep = Math.max(share * (Math.PI * 2 - gap * slices.length), 0.12);
    const start = angle;
    const end = angle + sweep;
    angle = end + gap;
    return { ...slice, start, end, color: DONUT_COLORS[index % DONUT_COLORS.length] };
  });

  return (
    <div className="relative h-[220px] w-[220px] shrink-0">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        {arcs.length === 1 ? (
          <g>
            <circle cx={cx} cy={cy} r={radius} fill="none" stroke={arcs[0].color} strokeWidth={thickness} />
            <title>{`${arcs[0].name}: ${formatSom(arcs[0].value)}`}</title>
          </g>
        ) : (
          arcs.map((arc) => (
            <path key={arc.name} d={donutSlice(cx, cy, radius, thickness, arc.start, arc.end)} fill={arc.color}>
              <title>{`${arc.name}: ${formatSom(arc.value)}`}</title>
            </path>
          ))
        )}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-semibold leading-none num">{formatCount(total)}</span>
        <span className="mt-1 text-xs text-[var(--ink-soft)]">{unit}</span>
      </div>
    </div>
  );
}

function donutSlice(cx: number, cy: number, radius: number, thickness: number, start: number, end: number) {
  const outer = radius + thickness / 2;
  const inner = radius - thickness / 2;
  const large = end - start > Math.PI ? 1 : 0;
  const sx = cx + Math.cos(start) * outer;
  const sy = cy + Math.sin(start) * outer;
  const ex = cx + Math.cos(end) * outer;
  const ey = cy + Math.sin(end) * outer;
  const isx = cx + Math.cos(end) * inner;
  const isy = cy + Math.sin(end) * inner;
  const iex = cx + Math.cos(start) * inner;
  const iey = cy + Math.sin(start) * inner;
  return [
    `M ${sx} ${sy}`,
    `A ${outer} ${outer} 0 ${large} 1 ${ex} ${ey}`,
    `L ${isx} ${isy}`,
    `A ${inner} ${inner} 0 ${large} 0 ${iex} ${iey}`,
    "Z",
  ].join(" ");
}

export function shareText(value: number, total: number) {
  if (total <= 0) return "0%";
  const pct = (value / total) * 100;
  if (pct >= 99.5) return ">99%";
  if (pct > 0 && pct < 1) return "<1%";
  return `${Math.round(pct)}%`;
}
