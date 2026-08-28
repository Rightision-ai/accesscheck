import AuthenticatedAppShell from "@/app/components/app-shell/AuthenticatedAppShell";

export default function PlatformLayout({ children }: { children: React.ReactNode }) { return <AuthenticatedAppShell>{children}</AuthenticatedAppShell>; }
