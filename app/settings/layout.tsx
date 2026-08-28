import AuthenticatedAppShell from "@/app/components/app-shell/AuthenticatedAppShell";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <AuthenticatedAppShell>{children}</AuthenticatedAppShell>;
}
