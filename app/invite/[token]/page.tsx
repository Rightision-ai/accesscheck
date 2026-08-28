import InviteClient from "./InviteClient";

export default async function InvitationPage({ params }: { params: Promise<{ token: string }> }) { const { token } = await params; return <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4"><InviteClient token={token} /></main>; }
