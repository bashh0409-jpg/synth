"use client";

import { useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

const DEFAULT_OPTIONS: [string, string] = ["iOS", "Web"];

type SegmentedToggleProps = {
  options?: [string, string];
  defaultValue?: string;
  onChange?: (value: string) => void;
};

export default function SegmentedToggle({
  options = DEFAULT_OPTIONS,
  defaultValue,
  onChange,
}: SegmentedToggleProps) {
  const [value, setValue] = useState(defaultValue ?? options[0]);
  const toggleRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const hasPositionedPill = useRef(false);

  useGSAP(
    () => {
      const activeOption = optionRefs.current[options.indexOf(value)];
      const toggle = toggleRef.current;
      const pill = pillRef.current;

      if (!activeOption || !toggle || !pill) return;

      const toggleBounds = toggle.getBoundingClientRect();
      const optionBounds = activeOption.getBoundingClientRect();
      const position = {
        x: optionBounds.left - toggleBounds.left,
        y: optionBounds.top - toggleBounds.top,
        width: optionBounds.width,
        height: optionBounds.height,
      };

      if (!hasPositionedPill.current) {
        gsap.set(pill, position);
        hasPositionedPill.current = true;
        return;
      }

      gsap.to(pill, {
        ...position,
        duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? 0
          : 0.35,
        ease: "power3.out",
        overwrite: "auto",
      });
    },
    { dependencies: [value, options], scope: toggleRef },
  );

  return (
    <div
      ref={toggleRef}
      role="tablist"
      className="relative isolate inline-flex items-center rounded-full bg-zinc-200/80 p-1 text-xs dark:bg-white/10"
    >
      <span
        ref={pillRef}
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-0 z-0 rounded-full bg-white shadow-sm dark:bg-zinc-800"
      />
      {options.map((option) => {
        const isActive = option === value;
        return (
          <button
            key={option}
            ref={(element) => {
              optionRefs.current[options.indexOf(option)] = element;
            }}
            role="tab"
            aria-selected={isActive}
            type="button"
            onClick={() => {
              setValue(option);
              onChange?.(option);
            }}
            className={`relative z-10 cursor-pointer rounded-full px-2  text-sm font-medium tracking-normal transition-colors duration-200 ${
              isActive
                ? "text-black dark:text-white"
                : "text-black/45 hover:text-black/70 dark:text-white/50 dark:hover:text-white/80"
            }`}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
