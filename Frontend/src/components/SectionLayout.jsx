import React from "react";
import { NavLink, Outlet } from "react-router-dom";
import { SectionContext } from "./ui";

// The frame for Money, Wealth and Plan: the section's title, a line saying
// what it's for, and links between its pages
export default function SectionLayout({ title, description, pages }) {
  return (
    <SectionContext.Provider value>
      <div className="mb-6">
        <h1 className="font-display text-[32px] leading-tight">{title}</h1>
        <p className="text-muted mt-1">{description}</p>
      </div>
      <nav aria-label={title} className="no-print flex gap-1 mb-8 border-b border-line overflow-x-auto scrollbar-none">
        {pages.map((page) => (
          <NavLink
            key={page.to}
            to={page.to}
            end={page.end}
            className={({ isActive }) =>
              `relative px-3 pb-3 pt-1 text-[15px] whitespace-nowrap transition-colors ${
                isActive
                  ? "text-ink font-medium after:absolute after:inset-x-3 after:-bottom-px after:h-0.5 after:rounded-full after:bg-accent"
                  : "text-muted hover:text-ink"
              }`
            }
          >
            {page.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </SectionContext.Provider>
  );
}
