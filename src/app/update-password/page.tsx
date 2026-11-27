import { Navbar } from "@/components/navbar";
import { ResetPasswordForm } from "@/components/reset-password-form";

export default function UpdatePasswordPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="mx-auto flex w-full max-w-4xl flex-1 items-center justify-center px-4 py-10">
        <ResetPasswordForm mode="update" />
      </main>
    </div>
  );
}
