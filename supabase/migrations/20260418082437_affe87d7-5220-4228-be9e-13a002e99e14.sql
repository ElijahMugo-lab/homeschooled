
-- =========================================
-- VETTING DOCUMENTS
-- =========================================
create type public.vetting_status as enum ('pending', 'approved', 'rejected');
create type public.doc_type as enum ('national_id', 'certificate', 'other');

create table public.vetting_documents (
  id uuid primary key default gen_random_uuid(),
  educator_id uuid not null,
  doc_type public.doc_type not null,
  file_path text not null,
  status public.vetting_status not null default 'pending',
  reviewer_notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.vetting_documents enable row level security;

create policy "Educators insert own docs"
  on public.vetting_documents for insert to authenticated
  with check (auth.uid() = educator_id and public.has_role(auth.uid(), 'educator'));

create policy "Educators view own docs"
  on public.vetting_documents for select to authenticated
  using (auth.uid() = educator_id);

create policy "Admins view all docs"
  on public.vetting_documents for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy "Admins update docs"
  on public.vetting_documents for update to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- Allow admins to update educator_profiles verification
create policy "Admins update educator profiles"
  on public.educator_profiles for update to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- =========================================
-- STORAGE: private vetting-docs bucket
-- =========================================
insert into storage.buckets (id, name, public)
values ('vetting-docs', 'vetting-docs', false)
on conflict (id) do nothing;

create policy "Educators upload own vetting docs"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'vetting-docs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Educators read own vetting docs"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'vetting-docs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Admins read all vetting docs"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'vetting-docs'
    and public.has_role(auth.uid(), 'admin')
  );

-- =========================================
-- CONVERSATIONS + MESSAGES
-- =========================================
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null,
  educator_id uuid not null,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (parent_id, educator_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null,
  body text not null check (length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index idx_messages_conversation on public.messages(conversation_id, created_at);
create index idx_conversations_parent on public.conversations(parent_id);
create index idx_conversations_educator on public.conversations(educator_id);

alter table public.conversations enable row level security;
alter table public.messages enable row level security;

-- Helper to check participation without recursion
create or replace function public.is_conversation_participant(_conv_id uuid, _user_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.conversations
    where id = _conv_id and (parent_id = _user_id or educator_id = _user_id)
  )
$$;

create policy "Participants view conversation"
  on public.conversations for select to authenticated
  using (auth.uid() = parent_id or auth.uid() = educator_id);

create policy "Parents create conversations"
  on public.conversations for insert to authenticated
  with check (
    auth.uid() = parent_id
    and public.has_role(auth.uid(), 'parent')
  );

create policy "Participants update conversation"
  on public.conversations for update to authenticated
  using (auth.uid() = parent_id or auth.uid() = educator_id);

create policy "Participants view messages"
  on public.messages for select to authenticated
  using (public.is_conversation_participant(conversation_id, auth.uid()));

create policy "Participants send messages"
  on public.messages for insert to authenticated
  with check (
    auth.uid() = sender_id
    and public.is_conversation_participant(conversation_id, auth.uid())
  );

-- Bump conversation last_message_at on new message
create or replace function public.bump_conversation_timestamp()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  update public.conversations
    set last_message_at = new.created_at
    where id = new.conversation_id;
  return new;
end;
$$;

create trigger trg_bump_conversation
after insert on public.messages
for each row execute function public.bump_conversation_timestamp();

-- Realtime
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.conversations;
