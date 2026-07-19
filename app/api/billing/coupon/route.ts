import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { code } = await request.json();
    if (!code) {
      return NextResponse.json({ error: 'Coupon code is required' }, { status: 400 });
    }

    const adminSupabase = createAdminClient();

    // 1. Fetch coupon details
    const { data: coupon, error: couponError } = await adminSupabase
      .from('coupons')
      .select('*')
      .eq('code', code)
      .single();

    if (couponError || !coupon) {
      return NextResponse.json({ error: 'Invalid coupon code' }, { status: 400 });
    }

    if (!coupon.active) {
      return NextResponse.json({ error: 'This coupon is no longer active' }, { status: 400 });
    }

    if (coupon.max_redemptions !== null && coupon.redeemed_count >= coupon.max_redemptions) {
      return NextResponse.json({ error: 'This coupon has reached its maximum redemptions' }, { status: 400 });
    }

    // 2. Increment coupon redeemed count
    const { error: updateCouponError } = await adminSupabase
      .from('coupons')
      .update({ redeemed_count: coupon.redeemed_count + 1 })
      .eq('code', code);

    if (updateCouponError) {
      return NextResponse.json({ error: 'Failed to redeem coupon' }, { status: 500 });
    }

    // 3. Get user's current profile to update credits
    const { data: profile, error: profileError } = await adminSupabase
      .from('profiles')
      .select('credits')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 500 });
    }

    const newCredits = Number(profile.credits) + Number(coupon.credits_granted);

    // 4. Update profile credits and status
    const { error: updateProfileError } = await adminSupabase
      .from('profiles')
      .update({
        credits: newCredits,
        status: 'active',
      })
      .eq('id', user.id);

    if (updateProfileError) {
      return NextResponse.json({ error: 'Failed to update user profile' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      creditsGranted: coupon.credits_granted,
      newCredits: newCredits,
    });
  } catch (error: any) {
    console.error('Coupon redemption error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
