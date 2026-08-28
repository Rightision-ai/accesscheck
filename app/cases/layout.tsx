import AuthenticatedAppShell from "@/app/components/app-shell/AuthenticatedAppShell";

export default function CasesLayout({ children }: { children: React.ReactNode }) {
  return <AuthenticatedAppShell>{children}</AuthenticatedAppShell>;
}
