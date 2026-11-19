import React from "react";

export const Logo = ({ className = "" }) => (
  <span className={`inline-flex items-center gap-2 font-semibold tracking-tight ${className}`}>
    <img src="/favicon.svg" alt="" className="w-6 h-6" />
    Munim.AI
  </span>
);

export default Logo;
