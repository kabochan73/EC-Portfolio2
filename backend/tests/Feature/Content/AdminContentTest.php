<?php

use App\Models\SiteContent;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

it('returns every key for the edit form', function () {
    $this->actingAs(admin())
        ->getJson('/api/admin/content')
        ->assertOk()
        ->assertJsonStructure(['data' => ['hero', 'concept', 'lookbook', 'about']]);
});

it('updates the hero and records the editor', function () {
    $admin = admin();

    $this->actingAs($admin)
        ->putJson('/api/admin/content/hero', [
            'headline' => 'AUTUMN', 'tagline' => 'considered basics', 'image_url' => null,
        ])
        ->assertOk()
        ->assertJsonPath('data.headline', 'AUTUMN');

    $row = SiteContent::where('key', 'hero')->firstOrFail();
    expect($row->data['headline'])->toBe('AUTUMN')
        ->and($row->updated_by)->toBe($admin->id);
});

it('validates the hero payload', function () {
    $this->actingAs(admin())
        ->putJson('/api/admin/content/hero', ['tagline' => 'no headline'])
        ->assertStatus(422)
        ->assertJsonValidationErrorFor('headline');
});

it('validates lookbook image entries', function () {
    $this->actingAs(admin())
        ->putJson('/api/admin/content/lookbook', ['images' => [['alt' => 'missing url']]])
        ->assertStatus(422)
        ->assertJsonValidationErrorFor('images.0.url');

    // 空配列は許容（画像なし）
    $this->actingAs(admin())
        ->putJson('/api/admin/content/lookbook', ['images' => []])
        ->assertOk();
});

it('returns 404 for an unknown content key', function () {
    $this->actingAs(admin())
        ->putJson('/api/admin/content/footer', ['x' => 1])
        ->assertNotFound();
});

it('uploads a content image and returns a media url', function () {
    Storage::fake(config('filesystems.default'));

    $res = $this->actingAs(admin())
        ->postJson('/api/admin/content/hero/images', [
            'image' => UploadedFile::fake()->create('bg.jpg', 300, 'image/jpeg'),
        ])
        ->assertCreated();

    $url = $res->json('url');
    expect($url)->toStartWith('/media/content/hero/');

    $key = str_replace('/media/', '', $url);
    expect(Storage::disk(config('filesystems.default'))->exists($key))->toBeTrue();
});

it('rejects a non-admin on every content route', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->getJson('/api/admin/content')->assertForbidden();
    $this->actingAs($user)->putJson('/api/admin/content/hero', [])->assertForbidden();
    $this->actingAs($user)->postJson('/api/admin/content/hero/images', [])->assertForbidden();
});
