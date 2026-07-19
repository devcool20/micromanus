import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createAdminClient } from '@/utils/supabase/admin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy_key', {
  apiVersion: '2025-01-27' as any,
});

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error(`Webhook signature verification failed:`, err.message);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // Handle the event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.user_id;

    if (!userId) {
      console.error('Stripe Checkout Session missing user_id in metadata');
      return NextResponse.json({ error: 'Missing user_id metadata' }, { status: 400 });
    }

    try {
      const adminSupabase = createAdminClient();

      // Get user profile
      const { data: profile, error: profileError } = await adminSupabase
        .from('profiles')
        .select('credits')
        .eq('id', userId)
        .single();

      if (profileError || !profile) {
        console.error(`Profile not found for user ${userId}:`, profileError);
        return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
      }

      // Add 5 credits and activate profile
      const currentCredits = Number(profile.credits);
      const newCredits = currentCredits + 5.0;

      const { error: updateError } = await adminSupabase
        .from('profiles')
        .update({
          credits: newCredits,
          status: 'active',
        })
        .eq('id', userId);

      if (updateError) {
        console.error(`Failed to update credits for user ${userId}:`, updateError);
        return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
      }

      console.log(`Successfully credited 5.0 credits to user ${userId}. New balance: ${newCredits}`);
    } catch (dbErr: any) {
      console.error('Database connection error in webhook:', dbErr);
      return NextResponse.json({ error: 'Internal Database Error' }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
