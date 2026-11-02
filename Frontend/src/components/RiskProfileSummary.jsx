import React from "react";
import { ASSET_CLASS_COLORS } from "./charts";

const ASSET_CLASSES = [
  { key: "equity", label: "Equity" },
  { key: "debt", label: "Debt" },
  { key: "gold", label: "Gold" },
];

export default function RiskProfileSummary({ profile }) {
  return (
    <div>
      <p className="text-muted mb-1">Your risk profile</p>
      <h2 className="font-display text-4xl md:text-5xl leading-tight mb-3">
        {profile.riskLabel}
      </h2>
      <p className="text-muted max-w-xl mb-8">{profile.description}</p>

      <div
        className="flex gap-0.5 h-3 mb-3"
        role="img"
        aria-label={`Indicative allocation: ${ASSET_CLASSES.map(
          ({ key, label }) => `${profile.allocation[key]}% ${label}`,
        ).join(", ")}`}
      >
        {ASSET_CLASSES.map(({ key }) => (
          <div
            key={key}
            className="first:rounded-l last:rounded-r"
            style={{
              width: `${profile.allocation[key]}%`,
              background: ASSET_CLASS_COLORS[key],
            }}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-8 gap-y-2 mb-6">
        {ASSET_CLASSES.map(({ key, label }) => (
          <div key={key} className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-sm"
              style={{ background: ASSET_CLASS_COLORS[key] }}
            />
            <span className="font-medium tnum">{profile.allocation[key]}%</span>
            <span className="text-muted">{label}</span>
          </div>
        ))}
      </div>

      {profile.capReasons?.length > 0 && (
        <p className="text-warn text-sm mb-4">
          We kept this profile lower than your score suggests because{" "}
          {profile.capReasons.join(" and ")}.
        </p>
      )}

      <p className="text-muted text-sm">
        This indicative mix is based only on your answers. It is not personal
        investment advice.
      </p>
    </div>
  );
}
