import { UserButton } from "@clerk/nextjs";
import { SidebarNav } from "./sidebar-nav";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <aside className="bg-muted/40 flex shrink-0 items-center justify-between border-b px-4 py-3 md:w-56 md:flex-col md:items-stretch md:justify-start md:border-b-0 md:border-r md:py-6">
        <div className="hidden items-center gap-2 px-3 pb-4 md:flex">
          <span className="text-sm font-bold">Plot</span>
        </div>
        <SidebarNav />
        <div className="md:pt-4">
          <UserButton />
        </div>
      </aside>
      <main className="flex flex-1 flex-col p-4 md:p-6">{children}</main>
    </div>
  );
}
