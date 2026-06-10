import { AuthForm } from "@/components/auth/auth-form";
import { SiteHeader } from "@/components/site-header";

export default function SignupPage() {
  return (
    <main className="min-h-screen text-[#101827]">
      <SiteHeader />
      <AuthForm mode="signup" />
    </main>
  );
}

