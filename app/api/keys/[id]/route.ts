import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { encrypt } from '@/lib/crypto';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { label, is_default, model, endpoint, api_key } = body;

    // Verify key exists and belongs to user
    const { data: keyToUpdate, error: fetchError } = await supabase
      .from('api_keys')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !keyToUpdate) {
      return NextResponse.json({ error: 'Key not found' }, { status: 404 });
    }

    const updateData: any = {};
    if (label !== undefined) updateData.label = label;
    if (model !== undefined) updateData.model = model;
    if (endpoint !== undefined) updateData.endpoint = endpoint;
    if (api_key !== undefined && api_key !== '') {
      updateData.encrypted_key = encrypt(api_key);
    }

    if (is_default === true) {
      // Set all other keys to default = false
      await supabase
        .from('api_keys')
        .update({ is_default: false })
        .eq('user_id', user.id);
      
      updateData.is_default = true;
    }

    const { data: updatedKey, error: updateError } = await supabase
      .from('api_keys')
      .update(updateData)
      .eq('id', id)
      .select('id, provider, model, endpoint, label, is_default, created_at')
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ key: updatedKey });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Check if key is default before deleting
    const { data: keyToDelete, error: fetchError } = await supabase
      .from('api_keys')
      .select('is_default')
      .eq('id', id)
      .single();

    if (fetchError || !keyToDelete) {
      return NextResponse.json({ error: 'Key not found' }, { status: 404 });
    }

    const { error: deleteError } = await supabase
      .from('api_keys')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    // If we deleted the default key, set another key as default
    if (keyToDelete.is_default) {
      const { data: remainingKeys } = await supabase
        .from('api_keys')
        .select('id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (remainingKeys && remainingKeys.length > 0) {
        await supabase
          .from('api_keys')
          .update({ is_default: true })
          .eq('id', remainingKeys[0].id);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
