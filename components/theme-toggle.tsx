"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

import { cn } from "@/lib/utils";

type Theme = "light" | "dark";

const prefersDarkScheme = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-color-scheme: dark)").matches;

const getInitialTheme = (): Theme => {
  if (typeof window === "undefined") {
    return "light";
  }

  const storedTheme = window.localStorage.getItem("theme") as Theme | null;

  if (storedTheme === "light" || storedTheme === "dark") {
    return storedTheme;
  }

  return prefersDarkScheme() ? "dark" : "light";
};

export function ThemeToggle({ className }: { className?: string }) {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<Theme>(() => getInitialTheme());

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem("theme", theme);
  }, [theme, mounted]);

  const toggleTheme = () => {
    setTheme((current) => (current === "light" ? "dark" : "light"));
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(
        "relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm transition hover:-translate-y-0.5 hover:bg-muted focus-visible:ring-2",
        className,
      )}
      aria-label="Toggle theme"
    >
      <Sun
        className={cn(
          "absolute h-5 w-5 rotate-0 scale-100 transition-transform duration-300",
          theme === "dark" && "-rotate-90 scale-0",
        )}
      />
      <Moon
        className={cn(
          "absolute h-5 w-5 rotate-90 scale-0 transition-transform duration-300",
          theme === "dark" && "rotate-0 scale-100",
        )}
      />
      <span className="sr-only">Toggle theme</span>
    </button>
  );
}


