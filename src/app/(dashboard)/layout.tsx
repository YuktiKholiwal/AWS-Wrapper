import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { Cloud, Globe } from "lucide-react";

const navItems = [
  { href: "/sites", label: "Sites", icon: Globe },
  { href: "/connect", label: "Connect AWS", icon: Cloud },
];

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex flex-1">
      <aside className="bg-muted/40 flex w-56 flex-col border-r px-4 py-6">
        <nav className="flex flex-1 flex-col gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-muted-foreground hover:bg-accent hover:text-accent-foreground flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="pt-4">
          <UserButton />
        </div>
      </aside>
      <main className="flex flex-1 flex-col p-6">{children}</main>
    </div>
  );
}
