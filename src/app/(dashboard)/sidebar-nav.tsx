"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Cloud, Globe, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/sites", label: "Sites", icon: Globe },
  { href: "/functions", label: "Functions", icon: Zap },
  { href: "/connect", label: "Connection", icon: Cloud },
  { href: "/learn", label: "Learn", icon: BookOpen },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 md:flex-1 md:flex-col">
      {navItems.map((item) => {
        const isActive =
          pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
