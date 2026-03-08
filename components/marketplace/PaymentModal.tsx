'use client';

import { useState, useEffect } from 'react';
import { loadStripe, StripeElementsOptions } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Shield, Loader2, X } from 'lucide-react';

// Initialize Stripe - will be null if key is not set
const getStripePromise = () => {
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!publishableKey) {
    console.warn('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set');
    return null;
  }
  return loadStripe(publishableKey);
};

const stripePromise = getStripePromise();

interface PaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nexaId: string;
  nexaName: string;
  amount: number; // in cents
  onSuccess: (paymentIntentId: string) => void;
}

function PaymentForm({ 
  nexaName, 
  amount, 
  onSuccess, 
  onCancel 
}: { 
  nexaName: string; 
  amount: number; 
  onSuccess: (paymentIntentId: string) => void;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setError(null);
    setProcessing(true);

    try {
      // Submit the form to Stripe
      const { error: submitError } = await elements.submit();
      if (submitError) {
        setError(submitError.message || 'Payment failed');
        setProcessing(false);
        return;
      }

      // Confirm the payment (clientSecret is already set in Elements options)
      const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/marketplace/success`,
        },
        redirect: 'if_required',
      });

      if (confirmError) {
        setError(confirmError.message || 'Payment failed');
        setProcessing(false);
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Payment succeeded
        onSuccess(paymentIntent.id);
      } else {
        setError('Payment was not completed. Please try again.');
        setProcessing(false);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
      <div className="space-y-3 sm:space-y-4">
        <PaymentElement 
          options={{
            layout: 'tabs',
          }}
        />
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs sm:text-sm">
          {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-3 sm:pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={processing}
          className="flex-1 bg-white/5 border-white/10 text-white hover:bg-white/10 text-sm"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!stripe || processing}
          className="flex-1 bg-[#FF6900] hover:bg-[#FF6900]/90 text-white text-sm"
        >
          {processing ? (
            <>
              <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            `Pay $${(amount / 100).toFixed(2)}`
          )}
        </Button>
      </div>

      <div className="flex items-center gap-2 text-xs text-white/60 pt-2">
        <Shield className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-green-400 flex-shrink-0" />
        <span>Your payment is secured by Stripe</span>
      </div>
    </form>
  );
}

export default function PaymentModal({
  open,
  onOpenChange,
  nexaId,
  nexaName,
  amount,
  onSuccess,
}: PaymentModalProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && amount > 0) {
      // Create payment intent when modal opens
      const createPaymentIntent = async () => {
        setLoading(true);
        setError(null);
        try {
          const response = await fetch('/api/stripe/create-payment-intent', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              nexaId,
              nexaName,
              amount,
            }),
          });

          const data = await response.json();
          if (data.error) {
            setError(data.error);
          } else {
            setClientSecret(data.clientSecret);
          }
        } catch (err: any) {
          setError(err.message || 'Failed to initialize payment');
        } finally {
          setLoading(false);
        }
      };

      createPaymentIntent();
    } else {
      setClientSecret(null);
      setError(null);
    }
  }, [open, nexaId, nexaName, amount]);

  const handleSuccess = (paymentIntentId: string) => {
    onSuccess(paymentIntentId);
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  const options: StripeElementsOptions = {
    clientSecret: clientSecret || undefined,
    appearance: {
      theme: 'night',
      variables: {
        colorPrimary: '#FF6900',
        colorBackground: '#1a1410',
        colorText: '#ffffff',
        colorDanger: '#ef4444',
        fontFamily: 'system-ui, sans-serif',
        spacingUnit: '4px',
        borderRadius: '8px',
      },
      rules: {
        '.Input': {
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          color: '#ffffff',
        },
        '.Input:focus': {
          borderColor: '#FF6900',
        },
        '.Label': {
          color: 'rgba(255, 255, 255, 0.8)',
        },
      },
    },
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#1a1410]/95 backdrop-blur-xl border-white/10 max-w-md sm:max-w-xl flex flex-col max-h-[90vh] p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-0 flex-shrink-0">
          <DialogTitle className="text-xl sm:text-2xl font-bold text-white">
            Complete Payment
          </DialogTitle>
          <DialogDescription className="text-white/70 text-sm sm:text-base">
            Pay for <span className="font-semibold text-white">{nexaName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 sm:space-y-6">
          {/* Order Summary */}
          <div className="bg-white/5 rounded-lg p-3 sm:p-4 border border-white/10 flex-shrink-0">
            <div className="flex justify-between items-center mb-2">
              <span className="text-white/80 text-sm">Total Amount</span>
              <span className="text-xl sm:text-2xl font-bold text-[#FF6900]">
                ${(amount / 100).toFixed(2)}
              </span>
            </div>
            <p className="text-xs text-white/60">
              One-time payment for {nexaName}
            </p>
          </div>

          {/* Payment Form */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-8 sm:py-12">
              <Loader2 className="w-6 sm:w-8 h-6 sm:h-8 animate-spin text-[#FF6900] mb-3 sm:mb-4" />
              <p className="text-white/70 text-sm">Initializing payment...</p>
            </div>
          ) : error ? (
            <div className="p-3 sm:p-4 rounded-lg bg-red-500/10 border border-red-500/20">
              <div className="flex items-center gap-2 text-red-400 text-sm">
                <X className="w-4 sm:w-5 h-4 sm:h-5 flex-shrink-0" />
                <p>{error}</p>
              </div>
            </div>
          ) : clientSecret && stripePromise ? (
            <Elements stripe={stripePromise} options={options}>
              <PaymentForm
                nexaName={nexaName}
                amount={amount}
                onSuccess={handleSuccess}
                onCancel={handleCancel}
              />
            </Elements>
          ) : null}
        </div>

        {/* Security Badge - Sticky Footer */}
        <div className="px-6 pb-6 pt-4 flex-shrink-0 border-t border-white/10">
          <div className="flex items-center justify-center gap-2 text-xs text-white/60">
            <Shield className="w-4 h-4 text-green-400" />
            <span>Secured by Stripe • 256-bit SSL encryption</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

