import React from "react";
import { motion, AnimatePresence } from "framer-motion";

const Modal = ({ title, children, onClose, isOpen = true }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm"
          onMouseDown={onClose}
        />

        {/* Modal container */}
        <div className="relative z-10 flex min-h-screen items-center justify-center p-4 sm:p-6">
          {/* Modal panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            className="w-full max-w-2xl rounded-2xl border border-gray-700/70 bg-[#0b0f14] shadow-2xl ring-1 ring-black/30 overflow-hidden"
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-gray-900/60 border-b border-gray-700/60">
              <h3 className="text-lg font-semibold text-white">{title}</h3>
              <button
                onClick={onClose}
                className="inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:text-white hover:bg-white/5 transition"
                aria-label="Close"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="px-6 py-6">{children}</div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
};

export default Modal;
