const TAU = Math.PI * 2;

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const easeOutBack = (p, overshoot = 1.7) => {
    console.log(`easeoutback`)
    const s = overshoot;
    p -= 1;
    return p*p*((s+1)*p + s) + 1;
  };
  
const lerp = (a, b, t) => a + (b - a) * t;

function nearestAngleTo(ref, angle) {
    return angle + TAU * Math.round((ref - angle) / TAU);
  }
  
function syncTimeToPhase(hitbox, phaseY) {
  const tNow = hitbox.data.t ?? 0;
  const s = Math.max(-1, Math.min(1, 2 * phaseY - 1)); // sin value
  const a = Math.asin(s);           // principal angle in [-π/2, π/2]
  const b = Math.PI - a;            // the other sine solution

  const aN = nearestAngleTo(tNow, a);
  const bN = nearestAngleTo(tNow, b);
  hitbox.data.t = Math.abs(tNow - aN) <= Math.abs(tNow - bN) ? aN : bN;
}
  

export { clamp, easeOutBack, lerp, syncTimeToPhase }