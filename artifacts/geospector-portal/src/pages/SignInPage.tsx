import { SignIn } from "@clerk/react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-slate-900 px-4">
      <SignIn
        routing="path"
        path={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/sign-up`}
        appearance={{
          variables: {
            colorPrimary: "#3b82f6",
            colorBackground: "#1e293b",
            colorForeground: "#f8fafc",
            colorMutedForeground: "#94a3b8",
            colorNeutral: "#475569",
            colorInput: "#0f172a",
            colorInputForeground: "#f8fafc",
            colorDanger: "#ef4444",
            borderRadius: "0.75rem",
            fontFamily: "Inter, sans-serif",
          },
          elements: {
            rootBox: "w-full flex justify-center",
            cardBox: "rounded-2xl w-[440px] max-w-full overflow-hidden shadow-2xl border border-slate-700",
            card: "!shadow-none !border-0 !rounded-none",
            footer: "!shadow-none !border-0 !rounded-none",
            logoBox: "hidden",
            logoImage: "hidden",
          },
        }}
      />
    </div>
  );
}
