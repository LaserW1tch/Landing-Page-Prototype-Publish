import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sceneOverlayTransform } from '../scripts/scene-transform.js';

function sample(scale, left = 0, top = 0, cssScale = 1) {
  return sceneOverlayTransform({
    sceneRect: { width: 1920, height: 1200 },
    origin: { x: left, y: top }, xAxis: { x: left + scale, y: top }, yAxis: { x: left, y: top + scale },
    bounds: { left: 10, top: 20, width: 1600 * cssScale, height: 1000 * cssScale }, screen: { width: 1600, height: 1000 }
  });
}

test('zoom scales the entire overlay without reflowing its scene-sized layout', () => {
  const small = sample(.5), large = sample(1.5);
  assert.deepEqual([small.width, small.height], [1920,1200]);
  assert.deepEqual([large.width, large.height], [1920,1200]);
  assert.deepEqual(small.matrix,[.5,0,0,.5,10,20]);
  assert.deepEqual(large.matrix,[1.5,0,0,1.5,10,20]);
});
test('camera panning translates the overlay with the same world origin', () => {
  assert.deepEqual(sample(1,-300,125).matrix,[1,0,0,1,-290,145]);
});
test('CSS canvas scaling and its viewport offset are accounted for', () => {
  assert.deepEqual(sample(2,100,50,.5).matrix,[1,0,0,1,60,45]);
});
test('an unlaid-out canvas does not produce an invalid CSS transform', () => {
  assert.equal(sceneOverlayTransform({sceneRect:{width:1920,height:1200},screen:{width:0,height:0}}),null);
});
