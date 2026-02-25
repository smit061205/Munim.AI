import React from "react";
import { useUser, UserButton } from "@clerk/clerk-react";

const Navbar = ({ title, subtitle, onMenuClick }) => {
  return (
    <div className="bg-black border-b border-gray-800 px-4 md:px-6 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Hamburger button - only visible on mobile */}
          <button
            onClick={onMenuClick}
            className="md:hidden p-2 text-gray-400 hover:text-white hover:bg-gray-900 rounded-lg transition-colors"
            aria-label="Open menu"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
          <div>
            <h1 className="text-lg md:text-2xl font-semibold text-white">
              {title}
            </h1>
            <p className="text-gray-400 text-sm md:text-base mt-0.5 md:mt-2 font-medium hidden sm:block">
              {subtitle}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button className="bg-black p-2 border border-gray-700 cursor-pointer hover:bg-gray-900 transition-colors rounded">
            <svg
              className="w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
          </button>
          <UserButton
            afterSignOutUrl="/"
            appearance={{
              elements: {
                avatarBox: "w-9 h-9 md:w-10 md:h-10",
                userButtonPopoverCard:
                  "bg-black border border-gray-700 shadow-xl",
                userButtonPopoverActionButton:
                  "hover:bg-gray-800 text-gray-300",
                userButtonPopoverActionButtonText: "text-gray-300",
                userButtonPopoverFooter: "hidden",
              },
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default Navbar;
