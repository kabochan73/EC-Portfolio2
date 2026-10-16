<?php

use App\Models\Category;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    Storage::fake(config('filesystems.default'));
});

function aProduct(): Product
{
    return Product::factory()->for(Category::factory()->create())->create();
}

it('uploads an image, storing the object and creating a row', function () {
    $product = aProduct();

    $res = $this->actingAs(admin())
        ->postJson("/api/admin/products/{$product->id}/images", [
            'image' => UploadedFile::fake()->create('front.jpg', 200, 'image/jpeg'),
            'alt' => '正面',
        ])
        ->assertCreated()
        ->assertJsonPath('data.position', 0)
        ->assertJsonPath('data.alt', '正面');

    $image = $product->images()->first();
    expect($image)->not->toBeNull()
        ->and(Storage::disk(config('filesystems.default'))->exists($image->path))->toBeTrue()
        ->and($res->json('data.url'))->toBe('/media/'.$image->path);
});

it('decides the stored extension from the file contents, not the client file name', function () {
    // 中身は JPEG なのに名前は photo.html（R4 追加。R3 はクライアントの拡張子をそのまま使っていた）
    $product = aProduct();

    $this->actingAs(admin())
        ->postJson("/api/admin/products/{$product->id}/images", [
            'image' => UploadedFile::fake()->create('photo.html', 200, 'image/jpeg'),
        ])
        ->assertCreated();

    expect($product->images()->first()->path)->toEndWith('.jpg');
});

it('appends new images after existing ones', function () {
    $product = aProduct();
    ProductImage::factory()->for($product)->create(['position' => 0]);

    $this->actingAs(admin())
        ->postJson("/api/admin/products/{$product->id}/images", [
            'image' => UploadedFile::fake()->create('back.jpg', 200, 'image/jpeg'),
        ])
        ->assertCreated()
        ->assertJsonPath('data.position', 1);
});

it('rejects a non-image upload', function () {
    $product = aProduct();

    $this->actingAs(admin())
        ->postJson("/api/admin/products/{$product->id}/images", [
            'image' => UploadedFile::fake()->create('notes.pdf', 10, 'application/pdf'),
        ])
        ->assertStatus(422)
        ->assertJsonValidationErrorFor('image');
});

it('reorders images and rejects an incomplete set', function () {
    $product = aProduct();
    $a = ProductImage::factory()->for($product)->create(['position' => 0]);
    $b = ProductImage::factory()->for($product)->create(['position' => 1]);
    $c = ProductImage::factory()->for($product)->create(['position' => 2]);

    $this->actingAs(admin())
        ->putJson("/api/admin/products/{$product->id}/images/reorder", ['order' => [$c->id, $a->id, $b->id]])
        ->assertOk()
        ->assertJsonPath('data.0.id', $c->id);

    expect($c->fresh()->position)->toBe(0)
        ->and($b->fresh()->position)->toBe(2);

    // 一部だけ渡すと 422
    $this->actingAs(admin())
        ->putJson("/api/admin/products/{$product->id}/images/reorder", ['order' => [$a->id, $b->id]])
        ->assertStatus(422);
});

it('rejects a reorder that mixes in another products image', function () {
    $product = aProduct();
    $mine = ProductImage::factory()->for($product)->create(['position' => 0]);
    $other = ProductImage::factory()->for(aProduct())->create();

    $this->actingAs(admin())
        ->putJson("/api/admin/products/{$product->id}/images/reorder", ['order' => [$mine->id, $other->id]])
        ->assertStatus(422);
});

it('deletes an image and its object', function () {
    $product = aProduct();
    $disk = Storage::disk(config('filesystems.default'));
    $disk->put('products/1/keep.jpg', 'x');
    $image = ProductImage::factory()->for($product)->create(['path' => 'products/1/keep.jpg']);

    $this->actingAs(admin())
        ->deleteJson("/api/admin/product-images/{$image->id}")
        ->assertNoContent();

    expect(ProductImage::find($image->id))->toBeNull()
        ->and($disk->exists('products/1/keep.jpg'))->toBeFalse();
});

it('cleans up bucket objects when the product is deleted', function () {
    $product = aProduct();
    $disk = Storage::disk(config('filesystems.default'));
    $disk->put('products/9/a.jpg', 'x');
    ProductImage::factory()->for($product)->create(['path' => 'products/9/a.jpg']);

    $this->actingAs(admin())
        ->deleteJson("/api/admin/products/{$product->id}")
        ->assertNoContent();

    expect($disk->exists('products/9/a.jpg'))->toBeFalse();
});

it('rejects a non-admin', function () {
    $product = aProduct();

    $this->actingAs(User::factory()->create())
        ->postJson("/api/admin/products/{$product->id}/images", [
            'image' => UploadedFile::fake()->create('x.jpg', 200, 'image/jpeg'),
        ])
        ->assertForbidden();
});
