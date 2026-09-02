-- Broadens the like_count trigger (originally 'like'-only) to also score
-- community up/down-votes, so posts.like_count doubles as "score" in both
-- contexts rather than needing a second counter column.
create or replace function public.sync_post_like_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_delta int;
begin
  if tg_op = 'INSERT' and new.target_type = 'post' then
    v_delta := case new.type when 'like' then 1 when 'upvote' then 1 when 'downvote' then -1 else 0 end;
    update public.posts set like_count = like_count + v_delta where id = new.target_id;
  elsif tg_op = 'DELETE' and old.target_type = 'post' then
    v_delta := case old.type when 'like' then 1 when 'upvote' then 1 when 'downvote' then -1 else 0 end;
    update public.posts set like_count = like_count - v_delta where id = old.target_id;
  end if;
  return null;
end;
$$;
