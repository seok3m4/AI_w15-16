import { AuthForm } from "@/components/auth/auth-form";
import { SiteHeader } from "@/components/site-header";

export default function LoginPage() {
  return (
    <main className="min-h-screen text-[#101827]">
      <SiteHeader />
      <AuthForm mode="login" />
    </main>
  );
}

