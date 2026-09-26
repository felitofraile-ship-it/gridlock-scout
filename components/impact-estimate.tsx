"use client";

import { useState } from "react";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export default function ImpactEstimate() {
  const [separate, setSeparate] = useState(20000);
  const [joint, setJoint] = useState(28000);
  const [coordination, setCoordination] = useState(5000);
  const difference = 2 * separate - joint - coordination;

  return <section className="impact-estimate" aria-label="Illustrative shared survey estimate">
    <span className="eyebrow">Editable impact scenario</span>
    <h4>One shared regional site survey</h4>
    <p>If both utilities need comparable terrain, access, or environmental screening in this area, one jointly commissioned survey could replace part of two separate surveys. This assumes usable common scope and permission to share results.</p>
    <div className="impact-inputs">
      <label>Separate survey, each utility <span>$<input aria-label="Separate survey cost per utility" type="number" min="0" step="1000" value={separate} onChange={(event) => setSeparate(Math.max(0, Number(event.target.value) || 0))} /></span></label>
      <label>Joint survey <span>$<input aria-label="Joint survey cost" type="number" min="0" step="1000" value={joint} onChange={(event) => setJoint(Math.max(0, Number(event.target.value) || 0))} /></span></label>
      <label>Coordination overhead <span>$<input aria-label="Coordination overhead" type="number" min="0" step="1000" value={coordination} onChange={(event) => setCoordination(Math.max(0, Number(event.target.value) || 0))} /></span></label>
    </div>
    <div className="impact-result" aria-live="polite"><span>{difference >= 0 ? "Possible saving" : "Possible added cost"}</span><strong>{money.format(Math.abs(difference))}</strong></div>
    <small>Calculation: 2 × separate survey − joint survey − coordination overhead. Starting amounts are illustrative assumptions, not bids or published utility costs. Exact study areas, data rights, and field schedules must be checked before treating this as achievable.</small>
  </section>;
}
