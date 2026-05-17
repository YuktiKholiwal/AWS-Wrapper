"use client";

import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Check,
  CircleDot,
  Cloud,
  Globe,
  GitBranch,
  Link2,
} from "lucide-react";

interface ChecklistProps {
  isConnected: boolean;
  hasLiveSite: boolean;
  hasDomain: boolean;
  hasGithub: boolean;
}

interface Step {
  title: string;
  description: string;
  detail: string;
  href: string;
  buttonText: string;
  icon: React.ElementType;
  done: boolean;
}

export function GettingStartedChecklist({
  isConnected,
  hasLiveSite,
  hasDomain,
  hasGithub,
}: ChecklistProps) {
  const steps: Step[] = [
    {
      title: "Connect your account",
      description: "Link your AWS account so Plot can set things up for you.",
      detail:
        "This creates a secure permission link between your AWS account and Plot. You'll click a button, approve a setup in AWS, and paste back a code. Takes about 2 minutes.",
      href: "/connect",
      buttonText: isConnected ? "Connected" : "Connect now",
      icon: Cloud,
      done: isConnected,
    },
    {
      title: "Deploy your first site",
      description: "Upload a folder with your website files and go live.",
      detail:
        "Pick a name, drag in your project folder (needs an index.html), and click Deploy. Plot creates private file storage and a fast global network to serve your site. Takes 5-15 minutes for the first deploy.",
      href: "/sites/new",
      buttonText: hasLiveSite ? "Deployed" : "Deploy a site",
      icon: Globe,
      done: hasLiveSite,
    },
    {
      title: "Add a custom domain",
      description:
        "Use your own domain instead of the default URL.",
      detail:
        'On your site\'s detail page, enter your domain (like mysite.com). Plot will give you a DNS record to add at your domain provider (GoDaddy, Cloudflare, etc.). Once verified, your site is live at your domain with HTTPS.',
      href: "/sites",
      buttonText: hasDomain ? "Domain active" : "Add a domain",
      icon: Link2,
      done: hasDomain,
    },
    {
      title: "Connect GitHub for auto-deploy",
      description:
        "Push to your repo and your site updates automatically.",
      detail:
        "Link a GitHub repo to your site. Every time you push to the main branch, Plot automatically downloads your files and redeploys. No more manual uploads.",
      href: "/sites",
      buttonText: hasGithub ? "Connected" : "Connect GitHub",
      icon: GitBranch,
      done: hasGithub,
    },
  ];

  const completedCount = steps.filter((s) => s.done).length;
  const progress = Math.round((completedCount / steps.length) * 100);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {completedCount} of {steps.length} complete
          </span>
          <span className="font-medium">{progress}%</span>
        </div>
        <div className="bg-muted h-2 overflow-hidden rounded-full">
          <div
            className="bg-primary h-full rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {steps.map((step, index) => (
        <Card
          key={step.title}
          className={step.done ? "border-primary/30 bg-primary/5" : ""}
        >
          <CardHeader>
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium",
                  step.done
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {step.done ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  index + 1
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <step.icon className="text-muted-foreground h-4 w-4" />
                  <CardTitle className="text-base">{step.title}</CardTitle>
                </div>
                <CardDescription className="mt-1">
                  {step.description}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pl-14">
            <p className="text-muted-foreground mb-3 text-sm">
              {step.detail}
            </p>
            <Link
              href={step.href}
              className={cn(
                buttonVariants({
                  variant: step.done ? "outline" : "default",
                  size: "sm",
                }),
              )}
            >
              {step.done && <Check className="mr-1.5 h-3.5 w-3.5" />}
              {!step.done && <CircleDot className="mr-1.5 h-3.5 w-3.5" />}
              {step.buttonText}
            </Link>
          </CardContent>
        </Card>
      ))}

      {completedCount === steps.length && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="py-6 text-center">
            <p className="mb-1 text-lg font-semibold">
              You&apos;re all set!
            </p>
            <p className="text-muted-foreground text-sm">
              Your site is deployed, has a custom domain, and auto-deploys
              from GitHub. You&apos;re running on your own AWS
              infrastructure.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
