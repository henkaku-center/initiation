-- ABOUTME: 申請者へ承認後に連絡するためのDiscord名をmembersへ保存する(Issue #117)。
-- ABOUTME: 既存メンバーは未登録のまま。申請の条件として扱うのはアプリ側。

alter table members add column discord_username text;

comment on column members.discord_username is
  '申請者のDiscord名。アプリは実在確認をせず、承認時に運営が突き合わせる。';
