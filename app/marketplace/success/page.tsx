'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { CheckCircle, ArrowRight, Download } from 'lucide-react';
import Link from 'next/link';
import confetti from 'canvas-confetti';

export default function SuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get('session_id');
  const nexaId = searchParams.get('nexa_id');
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    // Trigger confetti animation
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });

    // Verify payment with backend
    if (sessionId) {
      // TODO: Call your backend to verify the payment and activate the integration
      setVerified(true);
    }
  }, [sessionId]);

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 flex items-center justify-center min-h-[600px]">
        <div className="max-w-2xl w-full space-y-8 text-center">
          {/* Success Icon */}
          <div className="flex justify-center">
            <div className="w-24 h-24 bg-green-500/10 border border-green-500/20 rounded-full flex items-center justify-center">
              <CheckCircle className="w-12 h-12 text-green-400" />
            </div>
          </div>

          {/* Success Message */}
          <div className="space-y-3">
            <h1 className="text-4xl font-bold text-white">Payment Successful!</h1>
            <p className="text-xl text-white/70">
              Your integration has been activated successfully
            </p>
          </div>

          {/* Details Card */}
          <div className="bg-[#1a1410]/80 backdrop-blur-xl border border-white/5 rounded-2xl p-8 space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-white/5">
                <span className="text-white/60">Session ID</span>
                <span className="text-white font-mono text-sm">{sessionId?.substring(0, 20)}...</span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-white/5">
                <span className="text-white/60">Status</span>
                <span className="px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
                  Active
                </span>
              </div>
              <div className="flex items-center justify-between py-3">
                <span className="text-white/60">Integration</span>
                <span className="text-white">Ready to use</span>
              </div>
            </div>

            {/* Next Steps */}
            <div className="space-y-4 pt-6 border-t border-white/5">
              <h3 className="text-lg font-semibold text-white text-left">Next Steps</h3>
              <div className="space-y-3 text-left">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#FF6900]/10 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[#FF6900] text-sm font-bold">1</span>
                  </div>
                  <div>
                    <p className="text-white font-medium">Configure your integration</p>
                    <p className="text-white/60 text-sm">Set up your workflow and customize settings</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#FF6900]/10 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[#FF6900] text-sm font-bold">2</span>
                  </div>
                  <div>
                    <p className="text-white font-medium">Test your workflow</p>
                    <p className="text-white/60 text-sm">Run a test to ensure everything works correctly</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#FF6900]/10 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[#FF6900] text-sm font-bold">3</span>
                  </div>
                  <div>
                    <p className="text-white font-medium">Start automating</p>
                    <p className="text-white/60 text-sm">Activate your workflow and let it run</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/workflows">
              <button className="px-6 py-3 bg-[#FF6900] hover:bg-[#FF6900]/90 text-white font-semibold rounded-lg inline-flex items-center gap-2 transition-colors">
                Go to Workflows
                <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
            <Link href="/marketplace">
              <button className="px-6 py-3 border border-white/10 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-lg transition-colors">
                Browse More Integrations
              </button>
            </Link>
          </div>

          {/* Support */}
          <p className="text-white/50 text-sm">
            Need help? <Link href="/support" className="text-[#FF6900] hover:text-[#FF6900]/80">Contact Support</Link>
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}

