import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

const STATE_ID = "bakery_main";

export async function loadState() {
  const { data, error } = await supabase
    .from("app_state")
    .select("data")
    .eq("id", STATE_ID)
    .single();

  if (error || !data) return null;
  return data.data;
}

export async function saveState(state) {
  const { error } = await supabase
    .from("app_state")
    .upsert({ id: STATE_ID, data: state, updated_at: new Date().toISOString() });

  if (error) console.error("Save error:", error);
}
