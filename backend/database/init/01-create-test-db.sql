-- Pest / PHPUnit 用のテスト DB。開発 DB（ecp）とは別に用意し、
-- RefreshDatabase が毎回作り直しても開発データに影響しないようにする。
-- postgres コンテナの初回起動（空ボリューム）時に一度だけ実行される。
-- docs/12-testing.md
CREATE DATABASE ecp_test OWNER ecp;
