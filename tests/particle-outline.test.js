import { test } from 'node:test';
import assert from 'node:assert/strict';
import { outlineFor, outlineRadius, outlinePoint } from '../js/particle-outline.js';

const close = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-6, `${msg}: ${a} vs ${b}`);

test('circles have no outline and a radius of 1 everywhere', () => {
  assert.equal(outlineFor('circle'), null);
  close(outlineRadius(null, 1.2), 1, 'circle');
});

test('the square outline: 1 to the sides, √2 to the corners', () => {
  const box = outlineFor('box');
  assert.deepEqual(box.centre, [0, 0]);
  close(outlineRadius(box, 0), 1, 'right');
  close(outlineRadius(box, Math.PI / 2), 1, 'down');
  close(outlineRadius(box, Math.PI / 4), Math.SQRT2, 'corner');
});

test('triangle points land on its edges, scaled about its centre', () => {
  const tri = outlineFor('triangle');
  const [, cy] = tri.centre;
  assert.ok(cy < 0, 'point-down triangle: centre sits above the field centre');
  // Straight up from the centre meets the flat top edge at y = -0.866.
  const [x, y] = outlinePoint(tri, -Math.PI / 2, 1);
  close(x, 0, 'top x');
  close(y, -0.866, 'top y');
  // Half scale: half way between the centre and the top edge.
  const [, yHalf] = outlinePoint(tri, -Math.PI / 2, 0.5);
  close(yHalf, (cy - 0.866) / 2, 'half scale');
});
