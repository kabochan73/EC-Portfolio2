<?php

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/*
|--------------------------------------------------------------------------
| Test Case
|--------------------------------------------------------------------------
|
| Feature テストは HTTP を叩いて JSON / 副作用を検証する（docs/12-testing.md）。
| Repository パターンを使わない設計なので、実 DB（Postgres）を挟むのが自然。
| RefreshDatabase で毎テスト DB をまっさらに戻す（対象は phpunit.xml の ecp_test）。
|
*/

pest()->extend(TestCase::class)
    ->use(RefreshDatabase::class)
    ->in('Feature');

pest()->extend(TestCase::class)
    ->in('Unit');

/*
|--------------------------------------------------------------------------
| Expectations / Helpers
|--------------------------------------------------------------------------
|
| プロジェクト共通の expectation / helper が必要になったらここに足す。
| Stripe の疑似イベントなどは tests/Support/ に置く（docs/12）。
|
*/
