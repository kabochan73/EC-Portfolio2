<?php

namespace App\Models;

use Database\Factories\ProductFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Product extends Model
{
    /** @use HasFactory<ProductFactory> */
    use HasFactory;

    /** @var list<string> */
    protected $fillable = [
        'category_id', 'name', 'slug', 'price', 'description', 'material',
        'care', 'origin', 'product_code', 'size_chart', 'is_published', 'position',
    ];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'price' => 'integer',
            'size_chart' => 'array',
            'is_published' => 'boolean',
            'position' => 'integer',
        ];
    }

    /** @return BelongsTo<Category, $this> */
    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    /** @return HasMany<ProductImage, $this> */
    public function images(): HasMany
    {
        return $this->hasMany(ProductImage::class)->orderBy('position');
    }

    /** @return HasMany<ProductVariant, $this> */
    public function variants(): HasMany
    {
        return $this->hasMany(ProductVariant::class)->orderBy('position');
    }

    public function scopePublished(Builder $query): void
    {
        $query->where('is_published', true);
    }

    public function scopeInCategory(Builder $query, string $slug): void
    {
        $query->whereRelation('category', 'slug', $slug);
    }

    /** 一覧の並び順（position 昇順） */
    public function scopeOrdered(Builder $query): void
    {
        $query->orderBy('position')->orderBy('id');
    }

    public function scopeNew(Builder $query): void
    {
        $query->where('created_at', '>=', now()->subDays((int) config('shop.new_product_days')));
    }

    public function isNew(): bool
    {
        return $this->created_at !== null
            && $this->created_at->gte(now()->subDays((int) config('shop.new_product_days')));
    }

    /** 全 variant の在庫合算 */
    public function totalStock(): int
    {
        return (int) $this->variants->sum('stock');
    }
}
