import { createClient } from '@supabase/supabase-js';
import { Receipt, ReceiptInsert } from '@/types/receipt';
import { Bucket, BucketInsert } from '@/types/bucket';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function saveReceipt(receipt: ReceiptInsert): Promise<Receipt | null> {
  const { data, error } = await supabase
    .from('receipts')
    .insert([{
      ...receipt,
      bucket_id: receipt.bucket_id,
    }])
    .select()
    .single();

  if (error) {
    console.error('Error saving receipt:', error);
    return null;
  }

  return data as Receipt;
}

export async function getReceipts(): Promise<Receipt[]> {
  const { data, error } = await supabase
    .from('receipts')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching receipts:', error);
    return [];
  }

  return data as Receipt[];
}

export async function deleteReceipt(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('receipts')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting receipt:', error);
    return false;
  }

  return true;
}

export async function updateReceipt(id: string, updates: Partial<ReceiptInsert>): Promise<Receipt | null> {
  const { data, error } = await supabase
    .from('receipts')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating receipt:', error);
    return null;
  }

  return data as Receipt;
}

// Bucket functions
export async function getBuckets(): Promise<Bucket[]> {
  const { data, error } = await supabase
    .from('buckets')
    .select('*')
    .order('year', { ascending: false })
    .order('month', { ascending: false })
    .order('category', { ascending: true });

  if (error) {
    console.error('Error fetching buckets:', error);
    return [];
  }

  return data as Bucket[];
}

export async function createBucket(bucket: BucketInsert): Promise<Bucket | null> {
  const { data, error } = await supabase
    .from('buckets')
    .insert([bucket])
    .select()
    .single();

  if (error) {
    // Check for duplicate key error
    if (error.code === '23505') {
      console.error('Bucket already exists');
      return null;
    }
    console.error('Error creating bucket:', error);
    return null;
  }

  return data as Bucket;
}

export async function deleteBucket(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('buckets')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting bucket:', error);
    return false;
  }

  return true;
}
