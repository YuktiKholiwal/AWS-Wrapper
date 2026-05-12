import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Shield,
  HardDrive,
  Globe,
  Lock,
  Layers,
  FileKey,
  Network,
  ArrowRight,
} from "lucide-react";

const concepts = [
  {
    icon: Shield,
    title: "IAM (Identity & Access Management)",
    aka: "The bouncer",
    what: "Controls who can do what in your account. Think of it like user permissions on your computer — but for cloud resources.",
    whyYouCare:
      "Plot creates a permission link (IAM role) in your account so we can set things up on your behalf. We can only do what the role allows — nothing more.",
    color: "text-blue-400",
  },
  {
    icon: HardDrive,
    title: "S3 (Simple Storage Service)",
    aka: "The file cabinet",
    what: "A place to store files in the cloud. Like Google Drive, but designed for apps and websites. Your site's HTML, CSS, images — they all live here.",
    whyYouCare:
      "When you deploy a site, Plot creates a private S3 bucket and uploads your files to it. Nobody can access it directly — only through your site's URL.",
    color: "text-green-400",
  },
  {
    icon: Globe,
    title: "CloudFront (CDN)",
    aka: "The delivery network",
    what: "A global network of servers that serves your site to visitors. When someone in Tokyo visits your site, they get it from a nearby server instead of one across the world.",
    whyYouCare:
      "Plot sets up CloudFront automatically. It makes your site fast everywhere and gives you an HTTPS URL. This is what turns your files into a live website.",
    color: "text-purple-400",
  },
  {
    icon: Lock,
    title: "ACM (Certificate Manager)",
    aka: "The HTTPS padlock",
    what: "Creates the SSL/TLS certificates that put the padlock icon in your browser. This is what makes your site https:// instead of http://.",
    whyYouCare:
      "When you add a custom domain, Plot requests a free certificate from ACM. You verify you own the domain by adding a DNS record, and ACM handles the rest — including auto-renewal.",
    color: "text-yellow-400",
  },
  {
    icon: Layers,
    title: "CloudFormation",
    aka: "The blueprint builder",
    what: "A way to create cloud resources from a template. Instead of clicking through 50 settings pages, you describe what you want and CloudFormation builds it.",
    whyYouCare:
      "Plot uses CloudFormation behind the scenes to set up your S3 bucket, CloudFront, and everything else. This means your setup is repeatable and can be cleanly deleted.",
    color: "text-orange-400",
  },
  {
    icon: FileKey,
    title: "STS (Security Token Service)",
    aka: "The temporary pass",
    what: "Issues short-lived credentials. Like a visitor badge that expires at the end of the day — you get in, do your work, and the badge stops working automatically.",
    whyYouCare:
      "Every time Plot does something in your account, it gets a temporary pass that expires in 1 hour. We never store long-term credentials. This is the safest way to grant access.",
    color: "text-cyan-400",
  },
  {
    icon: Network,
    title: "DNS (Domain Name System)",
    aka: "The phone book",
    what: "Translates human-readable names (mysite.com) into server addresses. When you type a URL, DNS tells your browser where to go.",
    whyYouCare:
      "When you add a custom domain, you need to create DNS records at your domain provider (Cloudflare, GoDaddy, etc.) to point your domain to your site. Plot tells you exactly what records to create.",
    color: "text-pink-400",
  },
];

export default function LearnPage() {
  return (
    <div className="mx-auto w-full max-w-2xl">
      <h1 className="mb-2 text-2xl font-semibold">
        How it all works
      </h1>
      <p className="text-muted-foreground mb-8 text-sm">
        You don&apos;t need to understand any of this to use Plot. But if
        you&apos;re curious about what&apos;s happening behind the scenes,
        here&apos;s the plain-English version.
      </p>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-base">The big picture</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-2 text-sm">
            <Step label="You upload files" />
            <Arrow />
            <Step label="Plot stores them in S3 (your account)" />
            <Arrow />
            <Step label="CloudFront serves them globally with HTTPS" />
            <Arrow />
            <Step label="Visitors see your site at a fast URL" />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {concepts.map((concept) => (
          <Card key={concept.title}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <concept.icon className={`h-5 w-5 shrink-0 ${concept.color}`} />
                <div>
                  <CardTitle className="text-base">
                    {concept.title}
                  </CardTitle>
                  <CardDescription>
                    Think of it as: <strong>{concept.aka}</strong>
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-muted-foreground mb-1 text-xs font-medium uppercase tracking-wide">
                  What is it?
                </p>
                <p className="text-sm">{concept.what}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1 text-xs font-medium uppercase tracking-wide">
                  Why should I care?
                </p>
                <p className="text-sm">{concept.whyYouCare}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Step({ label }: { label: string }) {
  return (
    <div className="bg-muted w-full rounded-md px-4 py-2 text-center text-sm">
      {label}
    </div>
  );
}

function Arrow() {
  return (
    <ArrowRight className="text-muted-foreground h-4 w-4 rotate-90" />
  );
}
