'use client';

import MovementClient from './MovementClient';

export default function MovementPolish(props) {
  return (
    <div className="movement-polish">
      <style>{`
        .movement-polish .hub-card .mono,.movement-polish .metric-number,.movement-polish .stat-number{font-family:'Space Grotesk',sans-serif!important;font-variant-numeric:tabular-nums;letter-spacing:-.025em;}
      `}</style>
      <MovementClient {...props} />
    </div>
  );
}
