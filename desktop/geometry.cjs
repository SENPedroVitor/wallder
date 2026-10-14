function pointInSurface(point, windowBounds, surface) {
  const x = point.x - windowBounds.x - surface.x, y = point.y - windowBounds.y - surface.y
  if (x < 0 || y < 0 || x >= surface.width || y >= surface.height) return false
  const radius = Math.min(surface.radius || 0, surface.width / 2, surface.height / 2)
  const cx = x < radius ? radius : x > surface.width - radius ? surface.width - radius : x
  const cy = y < radius ? radius : y > surface.height - radius ? surface.height - radius : y
  return (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2
}
module.exports = { pointInSurface }
