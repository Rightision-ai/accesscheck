import { getUser } from "@/lib/auth/actions";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  // Get the current user from the database
  const user = await getUser();

  // If the user is not authenticated, redirect to the login page
  if (!user) {
    redirect("/login");
  }
  return <div>Dashboard {user.email}</div>;
}
