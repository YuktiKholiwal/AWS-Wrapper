import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Globe, Shield, Zap } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const features = [
  {
    icon: Globe,
    title: "Your account, your resources",
    description:
      "Everything deploys to your own account. File hosting, a fast global network for your site — you own it all. We never touch your data.",
  },
  {
    icon: Shield,
    title: "No credentials stored",
    description:
      "We use a secure permission link with temporary access. Nothing is saved. Every session is fresh.",
  },
  {
    icon: Zap,
    title: "One-click setup",
    description:
      "One click creates everything: private file storage, HTTPS, single-page app support — all set up automatically.",
  },
];

export default async function Home() {
  const { userId } = await auth();
  if (userId) redirect("/sites");
  return (
    <main className="flex flex-1 flex-col">
      <nav className="flex items-center justify-between px-6 py-4">
        <span className="text-lg font-bold">Plot</span>
        <div className="flex items-center gap-3">
          <Link
            href="/sign-in"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className={cn(buttonVariants({ size: "sm" }))}
          >
            Get started
          </Link>
        </div>
      </nav>

      <section className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <h1 className="max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
          Deploy static sites to your own AWS account in 5 minutes.
        </h1>
        <p className="text-muted-foreground mt-6 max-w-lg text-lg">
          You own everything. We don&apos;t store your credentials.
          Your own hosting, set up in one click.
        </p>
        <div className="mt-8 flex gap-3">
          <Link
            href="/sign-up"
            className={cn(buttonVariants({ size: "lg" }))}
          >
            Get started
          </Link>
          <Link
            href="/sign-in"
            className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
          >
            Sign in
          </Link>
        </div>
      </section>

      <section className="border-t px-6 py-16">
        <div className="mx-auto grid max-w-4xl gap-8 sm:grid-cols-3">
          {features.map((feature) => (
            <div key={feature.title} className="text-center">
              <feature.icon className="text-primary mx-auto mb-3 h-8 w-8" />
              <h3 className="mb-2 font-semibold">{feature.title}</h3>
              <p className="text-muted-foreground text-sm">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      <footer className="text-muted-foreground border-t px-6 py-6 text-center text-sm">
        Plot — deploy your site, own your hosting.
      </footer>
    </main>
  );
}
