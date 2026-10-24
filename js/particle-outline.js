import { SHAPES } from './shapes.js';

// Particles on Box and Triangle move on scaled copies of the shape's outline instead
// of circles, so they follow the edges. Field coordinates: units of the field radius,
// origin at the field centre, y down. The outline scales about its centre (the
// triangle's sits above the field centre).

// The shape's outline: { vertices: [[x, y]], centre: [x, y] }, or null for circles.
export function outlineFor(shapeName) {
  const path = SHAPES[shapeName]?.path;
  if (!path) return null;
  const vertices = path.map(([x, y]) => [(x - 50) / 50, (y - 50) / 50]);
  const centre = [0, 1].map(axis => vertices.reduce((sum, v) => sum + v[axis], 0) / vertices.length);
  return { vertices, centre };
}

// Distance from the outline's centre to its edge in direction `angle` (radians,
// 0 = right, y down). 1 for circles.
export function outlineRadius(outline, angle) {
  if (!outline) return 1;
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const [cx, cy] = outline.centre;
  const vs = outline.vertices;
  let nearest = Infinity;
  for (let i = 0; i < vs.length; i++) {
    const [ax, ay] = vs[i];
    const [bx, by] = vs[(i + 1) % vs.length];
    // Ray centre + t·d against segment a + u·(b − a).
    const ex = bx - ax;
    const ey = by - ay;
    const denom = dx * ey - dy * ex;
    if (Math.abs(denom) < 1e-9) continue;
    const t = ((ax - cx) * ey - (ay - cy) * ex) / denom;
    const u = ((ax - cx) * dy - (ay - cy) * dx) / denom;
    if (t > 0 && u >= -1e-9 && u <= 1 + 1e-9) nearest = Math.min(nearest, t);
  }
  return Number.isFinite(nearest) ? nearest : 1;
}

// Where a particle sits: direction `angle`, `scale` of the way from the centre to the
// outline (fields radii, e.g. 0.25 to 0.95). Returns [x, y] in field units.
export function outlinePoint(outline, angle, scale) {
  const rho = outlineRadius(outline, angle) * scale;
  const [cx, cy] = outline?.centre ?? [0, 0];
  return [cx + Math.cos(angle) * rho, cy + Math.sin(angle) * rho];
}
