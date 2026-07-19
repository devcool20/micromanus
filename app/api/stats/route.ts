import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

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

    // 1. Get user profile details (credits, status)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('credits, status')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 500 });
    }

    // 2. Get chats with non-zero or all chats
    const { data: chats, error: chatsError } = await supabase
      .from('chats')
      .select('id, title, model, tokens_input, tokens_cached, tokens_output, cost_usd, artifact_url, created_at')
      .eq('status', 'completed')
      .order('created_at', { ascending: false });

    if (chatsError) {
      return NextResponse.json({ error: chatsError.message }, { status: 500 });
    }

    // 3. Compute summaries
    let totalCost = 0;
    let totalTokensInput = 0;
    let totalTokensCached = 0;
    let totalTokensOutput = 0;

    if (chats) {
      chats.forEach((chat) => {
        totalCost += Number(chat.cost_usd || 0);
        totalTokensInput += chat.tokens_input || 0;
        totalTokensCached += chat.tokens_cached || 0;
        totalTokensOutput += chat.tokens_output || 0;
      });
    }

    const totalTokens = totalTokensInput + totalTokensOutput;

    return NextResponse.json({
      credits: Number(profile.credits),
      status: profile.status,
      summary: {
        totalCost: Number(totalCost.toFixed(6)),
        totalTokensInput,
        totalTokensCached,
        totalTokensOutput,
        totalTokens,
      },
      chats: chats || [],
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
