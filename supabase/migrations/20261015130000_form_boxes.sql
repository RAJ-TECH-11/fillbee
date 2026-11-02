-- Step 6: bina fields wale (scanned) PDFs ke liye admin ke banaye boxes
-- Apply with: npx supabase db push

-- Har box: { id, page, x, y, width, height, key }
-- page 0 se shuru, x/y/width/height PDF points mein (neeche-baayein kone se), key = profile key
alter table public.form_templates
  add column if not exists boxes jsonb not null default '[]'::jsonb
  check (jsonb_typeof(boxes) = 'array');
