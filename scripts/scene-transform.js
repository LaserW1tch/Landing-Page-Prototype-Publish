/** Map scene-local pixels to CSS viewport pixels, including canvas placement/DPR. */
export function sceneOverlayTransform({ sceneRect, origin, xAxis, yAxis, bounds, screen }) {
  if (!screen.width || !screen.height || !sceneRect.width || !sceneRect.height) return null;
  const sx = bounds.width / screen.width;
  const sy = bounds.height / screen.height;
  return {
    width: sceneRect.width,
    height: sceneRect.height,
    matrix: [
      (xAxis.x - origin.x) * sx,
      (xAxis.y - origin.y) * sy,
      (yAxis.x - origin.x) * sx,
      (yAxis.y - origin.y) * sy,
      bounds.left + origin.x * sx,
      bounds.top + origin.y * sy
    ]
  };
}
