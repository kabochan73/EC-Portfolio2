<?php

use App\Models\Address;
use App\Models\User;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;

function addressPayload(array $overrides = []): array
{
    return array_merge([
        'recipient_name' => '田中 葵',
        'postal_code' => '150-0001',
        'prefecture' => '東京都',
        'city' => '渋谷区神宮前',
        'address_line1' => '1-2-3',
        'address_line2' => 'コーポ101',
        'phone' => '09012345678',
    ], $overrides);
}

it('lists the user addresses with the default first', function () {
    $user = User::factory()->create();
    Address::factory()->for($user)->create(['recipient_name' => 'B']);
    Address::factory()->for($user)->default()->create(['recipient_name' => 'A']);
    Address::factory()->create(); // another user

    $this->actingAs($user)
        ->getJson('/api/addresses')
        ->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('data.0.recipient_name', 'A')
        ->assertJsonPath('data.0.is_default', true);
});

it('creates the first address as the default automatically', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->postJson('/api/addresses', addressPayload())
        ->assertCreated()
        ->assertJsonPath('data.is_default', true);
});

it('promotes a new address to default and demotes the others', function () {
    $user = User::factory()->create();
    $old = Address::factory()->for($user)->default()->create();

    $this->actingAs($user)
        ->postJson('/api/addresses', addressPayload(['is_default' => true]))
        ->assertCreated()
        ->assertJsonPath('data.is_default', true);

    expect($old->fresh()->is_default)->toBeFalse()
        ->and(Address::where('user_id', $user->id)->where('is_default', true)->count())->toBe(1);
});

it('validates the postal code format', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->postJson('/api/addresses', addressPayload(['postal_code' => '1500001']))
        ->assertStatus(422)
        ->assertJsonValidationErrorFor('postal_code');
});

it('updates an address', function () {
    $user = User::factory()->create();
    $address = Address::factory()->for($user)->create();

    $this->actingAs($user)
        ->putJson("/api/addresses/{$address->id}", addressPayload(['recipient_name' => '更新後']))
        ->assertOk()
        ->assertJsonPath('data.recipient_name', '更新後');
});

it('sets an address as default via the dedicated endpoint', function () {
    $user = User::factory()->create();
    $a = Address::factory()->for($user)->default()->create();
    $b = Address::factory()->for($user)->create();

    $this->actingAs($user)
        ->postJson("/api/addresses/{$b->id}/default")
        ->assertOk()
        ->assertJsonPath('data.is_default', true);

    expect($a->fresh()->is_default)->toBeFalse();
});

it('promotes another address to default when the default is deleted', function () {
    $user = User::factory()->create();
    $default = Address::factory()->for($user)->default()->create();
    $other = Address::factory()->for($user)->create();

    $this->actingAs($user)->deleteJson("/api/addresses/{$default->id}")->assertNoContent();

    expect($other->fresh()->is_default)->toBeTrue();
});

it('returns 404 for another users address on every write route', function () {
    $me = User::factory()->create();
    $theirs = Address::factory()->create();

    $this->actingAs($me)->putJson("/api/addresses/{$theirs->id}", addressPayload())->assertNotFound();
    $this->actingAs($me)->deleteJson("/api/addresses/{$theirs->id}")->assertNotFound();
    $this->actingAs($me)->postJson("/api/addresses/{$theirs->id}/default")->assertNotFound();
});

it('requires authentication', function () {
    $this->getJson('/api/addresses')->assertUnauthorized();
    $this->postJson('/api/addresses', addressPayload())->assertUnauthorized();
});

it('lets the database reject a second default address for the same user', function () {
    // Action を通さずに 2 件目の default を入れようとしても、部分 UNIQUE インデックス
    // addresses_one_default_per_user が拒否する（R4 追加。DB 制約は最後の防衛線）
    $user = User::factory()->create();
    Address::factory()->for($user)->default()->create();

    // テストは RefreshDatabase のトランザクション内で動く。PostgreSQL は中で 1 回エラーが出ると
    // 以降の SQL を全部拒否するので、失敗させる部分だけ DB::transaction（= セーブポイント）で包む
    expect(fn () => DB::transaction(fn () => Address::factory()->for($user)->default()->create()))
        ->toThrow(UniqueConstraintViolationException::class);

    // 別のユーザーなら default を持てる
    Address::factory()->default()->create();
    expect(Address::where('is_default', true)->count())->toBe(2);
});
