-- Somente metadados. Não selecionar headers, Vault ou fila HTTP (contêm autorização).
select jsonb_build_object(
 'observed_at', clock_timestamp(),
 'jobs', (select jsonb_agg(jsonb_build_object('jobid',jobid,'jobname',jobname,'schedule',schedule,'active',active)) from cron.job where jobname='monitoramento-hml-10min'),
 'cron_runs', (select jsonb_agg(jsonb_build_object('runid',runid,'start_time',start_time,'end_time',end_time,'status',status,'return_message',return_message) order by start_time) from cron.job_run_details where jobid in (select jobid from cron.job where jobname='monitoramento-hml-10min')),
 'requests', (select jsonb_agg(jsonb_build_object('request_id',r.request_id,'expected_at',r.expected_at,'requested_at',r.requested_at,'http_status',h.status_code,'timed_out',h.timed_out,'edge_response',h.content) order by r.request_id) from monitoramento_hml.dispatch_requests r left join net._http_response h on h.id=r.request_id)
) as evidence;
