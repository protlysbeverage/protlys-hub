-- Keep group leaderboard totals and member movement summaries consistent
-- with the phone-sensor-only movement policy.
do $migration$
declare
  v_def text;
  v_new text;
begin
  v_def := pg_get_functiondef('public.get_group_leaderboard(uuid,text,integer,integer)'::regprocedure);
  v_new := replace(
    v_def,
    $old$AND (NOT v_count_synced OR lower(ds.source)='synced')$old$,
    $new$AND coalesce(ds.source,'') <> 'health_connect'
            AND (NOT v_count_synced OR lower(ds.source)='synced')$new$
  );
  v_new := replace(
    v_new,
    $old$AND ds.steps>0
          THEN ds.synced_at$old$,
    $new$AND ds.steps>0
            AND NOT ds.is_flagged
            AND coalesce(ds.source,'') <> 'health_connect'
            AND (NOT v_count_synced OR lower(ds.source)='synced')
          THEN ds.synced_at$new$
  );
  if v_new = v_def then
    raise exception 'Could not patch get_group_leaderboard source filters';
  end if;
  execute v_new;

  v_def := pg_get_functiondef('public.get_member_movement_window(uuid,uuid)'::regprocedure);
  v_new := replace(
    v_def,
    $old$and not coalesce(ds.is_flagged,false);$old$,
    $new$and not coalesce(ds.is_flagged,false)
      and coalesce(ds.source,'') <> 'health_connect';$new$
  );
  if v_new = v_def then
    raise exception 'Could not patch get_member_movement_window source filter';
  end if;
  execute v_new;

  v_def := pg_get_functiondef('public.get_member_week_stats(uuid,uuid,date)'::regprocedure);
  v_new := replace(
    v_def,
    $old$and not coalesce(ds.is_flagged,false);$old$,
    $new$and not coalesce(ds.is_flagged,false)
      and coalesce(ds.source,'') <> 'health_connect';$new$
  );
  if v_new = v_def then
    raise exception 'Could not patch get_member_week_stats source filter';
  end if;
  execute v_new;
end;
$migration$;
