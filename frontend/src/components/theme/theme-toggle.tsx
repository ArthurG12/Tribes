"use client";

import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme/theme-provider";

export function ThemeToggle({
  className,
  showLabel = false,
}: {
  className?: string;
  showLabel?: boolean;
}) {
  const { darkMode, toggleTheme } = useTheme();
  const label = darkMode ? "Ativar modo claro" : "Ativar modo escuro";

  return (
    <Button
      type="button"
      variant={showLabel ? "outline" : "ghost"}
      size={showLabel ? "default" : "icon-sm"}
      aria-label={label}
      aria-pressed={darkMode}
      title={label}
      onClick={toggleTheme}
      className={className}
    >
      {darkMode ? <Moon className="size-4" /> : <Sun className="size-4" />}
      {showLabel && <span>{darkMode ? "Modo escuro" : "Modo claro"}</span>}
    </Button>
  );
}
