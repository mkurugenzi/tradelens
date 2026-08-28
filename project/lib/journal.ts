import { supabase } from './supabase';
import type { JournalTrade } from './types';

const localKey = 'tradelens_journal_entries';

function readLocal(): JournalTrade[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(localKey) || '[]') as JournalTrade[];
  } catch {
    return [];
  }
}

function writeLocal(entries: JournalTrade[]) {
  if (typeof window !== 'undefined') localStorage.setItem(localKey, JSON.stringify(entries));
}

export async function loadJournalEntries(accountId: string, isDemo: boolean): Promise<JournalTrade[]> {
  if (isDemo) return readLocal().filter((entry) => entry.account_id === accountId);
  const { data, error } = await supabase.from('journal_entries').select('*').eq('account_id', accountId).order('date', { ascending: false });
  if (error) throw error;
  return (data || []) as JournalTrade[];
}

export async function saveJournalEntry(entry: JournalTrade, isDemo: boolean): Promise<JournalTrade> {
  if (isDemo) {
    const entries = readLocal().filter((item) => item.id !== entry.id);
    writeLocal([entry, ...entries]);
    return entry;
  }
  const { data, error } = await supabase.from('journal_entries').upsert(entry).select().single();
  if (error) throw error;
  return data as JournalTrade;
}

export async function deleteJournalEntry(id: string, isDemo: boolean): Promise<void> {
  if (isDemo) {
    writeLocal(readLocal().filter((entry) => entry.id !== id));
    return;
  }
  const { error } = await supabase.from('journal_entries').delete().eq('id', id);
  if (error) throw error;
}