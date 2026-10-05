-- Executar exclusivamente no projeto HML ufeahglxwygvlugfsopi, após teste da Edge.
select cron.schedule('monitoramento-hml-10min', '2,12,22,32,42,52 * * * *',
  'select monitoramento_hml.trigger_dispatch();');
