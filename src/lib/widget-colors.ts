export interface WidgetColor {
  stroke: string;
  fill: string;
}

export function colorForId(id: string): WidgetColor {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  const hue = Math.abs(hash) % 360;
  return {
    stroke: `hsl(${hue} 75% 65%)`,
    fill: `hsl(${hue} 75% 65% / 0.18)`,
  };
}
