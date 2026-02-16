import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
  try {
    // Initialize Stripe inside the handler
    const secretKey = process.env.STRIPE_SECRET_KEY;
    
    
    if (!secretKey) {
      console.error('STRIPE_SECRET_KEY is not set');
      return NextResponse.json(
        { error: 'Payment system not configured - missing API key' },
        { status: 500 }
      );
    }

    const stripe = new Stripe(secretKey, {
      apiVersion: '2025-10-29.clover',
    });

    const { nexaId, nexaName, price } = await request.json();


    // Validate price
    if (!price || price <= 0) {
      return NextResponse.json(
        { error: 'Invalid price amount' },
        { status: 400 }
      );
    }

    // Validate APP_URL
    if (!process.env.NEXT_PUBLIC_APP_URL) {
      console.error('NEXT_PUBLIC_APP_URL is not set');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: nexaName,
              description: `Integration for ${nexaName}`,
            },
            unit_amount: price, // Price in cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/marketplace/success?session_id={CHECKOUT_SESSION_ID}&nexa_id=${nexaId}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/marketplace/integrate/${nexaId}`,
      metadata: {
        nexaId,
        nexaName,
      },
    });

    console.log('Stripe session created:', session.id);
    console.log('Checkout URL:', session.url);
    
    return NextResponse.json({ 
      sessionId: session.id,
      url: session.url 
    });
  } catch (error: any) {
    console.error('Stripe error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}

