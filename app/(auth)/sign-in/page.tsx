"use client";

import { SignIn } from "@clerk/nextjs";
import { Zap } from "lucide-react";

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Logo + SaaS name at top-left */}
      <div className="absolute top-6 left-6 flex items-center gap-3">
    <div className="w-10 h-10 bg-gradient-to-br from-[#FF6900] to-[#FF8555] rounded-xl flex items-center justify-center shadow-lg">
      <Zap className="w-6 h-6 text-white" />
    </div>
    <span className="text-2xl font-bold text-white">
      Nex<span className="text-[#FF6900]">Agent</span>
    </span>
  </div>
      {/* Centered sign-in form */}
      <div className="flex flex-1 items-center justify-center px-6">
        <div className="w-full max-w-md">
          <h2 className="text-2xl font-semibold mb-2 text-center">
            Welcome back
          </h2>
          <p className="text-gray-400 mb-6 text-center">
            Sign in to continue to your dashboard.
          </p>

          <SignIn
            appearance={{
              elements: {
                card: "bg-black/50 border border-gray-800 shadow-3xl p-6 rounded-xl w-full",
                formButtonPrimary:
                  "bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold py-2 px-4 rounded-lg hover:opacity-90 transition w-full",
                socialButtonsBlock: "flex flex-col gap-3 mb-4 w-full",
                socialButtonsBlockButton:
                  "flex items-center justify-center gap-2 bg-white text-white border border-white font-medium py-2 px-4 rounded-lg hover:bg-gray-900 transition w-full relative overflow-hidden",
                socialButtonsBlockButtonText: "text-white font-medium",

                // GitHub fix: white circle behind logo
               

                headerTitle: "hidden",
                headerSubtitle: "hidden",
                footer: "hidden",
              },
            }}
            routing="path"
            path="/sign-in"
            signUpUrl="/sign-up"
          />
        </div>
      </div>
    </div>
  );
}
