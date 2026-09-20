-- ABOUTME: チェックインに一言(Signal)を添えられるようにする(Issue #119)。
-- ABOUTME: 1日1件の一意制約は変えず、その日の一言を上書きする形にする。

alter table checkins add column note text;

comment on column checkins.note is
  'その日のSignal。本人の履歴に表示する。未記入は null。';
