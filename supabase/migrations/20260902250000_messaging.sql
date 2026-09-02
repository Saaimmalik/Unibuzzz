-- listing_id is deliberately omitted, same reasoning as posts.community_id
-- originally was: marketplace doesn't exist yet. It'll be added as a
-- nullable FK once that table exists, and this same conversations/messages
-- schema will serve marketplace buyer/seller chat too (type='marketplace').
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities(id) on delete restrict,
  type text not null default 'dm' check (type in ('dm', 'marketplace')),
  last_message_at timestamptz,
  last_message_body text,
  created_at timestamptz not null default now()
);

comment on table public.conversations is
  'last_message_at/body are trigger-denormalized so the inbox is a single query instead of an N+1 or a per-row subquery for "most recent message".';

alter table public.conversations enable row level security;

create table public.conversation_participants (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  primary key (conversation_id, user_id)
);

create index conversation_participants_user_id_idx on public.conversation_participants (user_id);

alter table public.conversation_participants enable row level security;

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index messages_conversation_id_created_at_idx on public.messages (conversation_id, created_at);

alter table public.messages enable row level security;

-- Avoids RLS recursion the same way current_university_id() etc. do: this
-- gets queried BY the RLS policies on all three tables above, so it has to
-- bypass their RLS to answer "am I a participant" without deadlocking.
create or replace function public.is_conversation_participant(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.conversation_participants
    where conversation_id = p_conversation_id and user_id = public.current_app_user_id()
  )
$$;

create policy "participants can read their conversations"
  on public.conversations for select
  to authenticated
  using (public.is_conversation_participant(id));

create policy "participants can read co-participants"
  on public.conversation_participants for select
  to authenticated
  using (public.is_conversation_participant(conversation_id));

create policy "participants can read messages"
  on public.messages for select
  to authenticated
  using (public.is_conversation_participant(conversation_id));

create policy "participants can send messages"
  on public.messages for insert
  to authenticated
  with check (
    sender_id = public.current_app_user_id()
    and public.is_conversation_participant(conversation_id)
    and public.is_active_user()
    and public.is_verified_user()
  );

-- Only the recipient marks a message read, and only read_at may change —
-- enforced below by the trigger, since RLS itself can't restrict columns.
create policy "recipients can mark messages read"
  on public.messages for update
  to authenticated
  using (public.is_conversation_participant(conversation_id) and sender_id <> public.current_app_user_id())
  with check (public.is_conversation_participant(conversation_id) and sender_id <> public.current_app_user_id());

create or replace function public.prevent_message_body_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.body is distinct from old.body
    or new.conversation_id is distinct from old.conversation_id
    or new.sender_id is distinct from old.sender_id then
    raise exception 'messages cannot be edited, only marked read';
  end if;
  return new;
end;
$$;

create trigger messages_protect_fields
  before update on public.messages
  for each row
  execute function public.prevent_message_body_changes();

create or replace function public.sync_conversation_last_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations
  set last_message_at = new.created_at, last_message_body = new.body
  where id = new.conversation_id;
  return new;
end;
$$;

create trigger messages_sync_conversation_preview
  after insert on public.messages
  for each row
  execute function public.sync_conversation_last_message();

-- The only way a conversation/participant row is ever created — a client
-- can never INSERT into conversations or conversation_participants
-- directly (no policy grants it), which is what stops someone from adding
-- themselves to a DM they weren't invited to, or fabricating a group chat.
-- Reuses an existing 1:1 conversation between the two users if one exists,
-- rather than creating duplicate threads every time you message the same
-- person.
create or replace function public.start_dm_conversation(p_other_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_self uuid := public.current_app_user_id();
  v_other_university_id uuid;
  v_conversation_id uuid;
begin
  if not public.is_active_user() or not public.is_verified_user() then
    raise exception 'Only verified, active accounts can message';
  end if;

  if p_other_user_id = v_self then
    raise exception 'Cannot start a conversation with yourself';
  end if;

  select university_id into v_other_university_id from public.users where id = p_other_user_id;
  if v_other_university_id is null or v_other_university_id <> public.current_university_id() then
    raise exception 'User not found';
  end if;

  select cp1.conversation_id into v_conversation_id
  from public.conversation_participants cp1
  join public.conversation_participants cp2
    on cp2.conversation_id = cp1.conversation_id and cp2.user_id = p_other_user_id
  join public.conversations c on c.id = cp1.conversation_id and c.type = 'dm'
  where cp1.user_id = v_self
  limit 1;

  if v_conversation_id is not null then
    return v_conversation_id;
  end if;

  insert into public.conversations (university_id, type)
  values (public.current_university_id(), 'dm')
  returning id into v_conversation_id;

  insert into public.conversation_participants (conversation_id, user_id)
  values (v_conversation_id, v_self), (v_conversation_id, p_other_user_id);

  return v_conversation_id;
end;
$$;

alter publication supabase_realtime add table
  public.conversations,
  public.messages;
