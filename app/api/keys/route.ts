import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { encrypt } from '@/lib/crypto';

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: keys, error } = await supabase
      .from('api_keys')
      .select('id, provider, model, endpoint, label, is_default, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ keys });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

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

    const { provider, model, endpoint, api_key, label, is_default } = await request.json();

    if (!provider || !model || !endpoint || !api_key) {
      return NextResponse.json(
        { error: 'Provider, Model, Endpoint, and API Key are required' },
        { status: 400 }
      );
    }

    const encryptedKey = encrypt(api_key);

    // Check if the user already has keys
    const { count, error: countError } = await supabase
      .from('api_keys')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      return NextResponse.json({ error: countError.message }, { status: 500 });
    }

    const shouldBeDefault = count === 0 || is_default === true;

    if (shouldBeDefault) {
      // Set all other keys to default = false
      await supabase
        .from('api_keys')
        .update({ is_default: false })
        .eq('user_id', user.id);
    }

    const { data: newKey, error: insertError } = await supabase
      .from('api_keys')
      .insert({
        user_id: user.id,
        provider,
        model,
        endpoint,
        encrypted_key: encryptedKey,
        label: label || `${provider} Key`,
        is_default: shouldBeDefault,
      })
      .select('id, provider, model, endpoint, label, is_default, created_at')
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ key: newKey });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
