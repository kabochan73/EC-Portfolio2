<?php

namespace App\Models;

use Database\Factories\SiteContentFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * トップページの編集可能コンテンツ（軽量 CMS。docs/11-cms.md）。
 * key は hero / concept / lookbook / about の4種のみ。
 */
class SiteContent extends Model
{
    /** @use HasFactory<SiteContentFactory> */
    use HasFactory;

    public const KEYS = ['hero', 'concept', 'lookbook', 'about'];

    /** @var list<string> */
    protected $fillable = ['key', 'data', 'updated_by'];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return ['data' => 'array'];
    }

    /** @return BelongsTo<User, $this> */
    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public static function isValidKey(string $key): bool
    {
        return in_array($key, self::KEYS, true);
    }

    /**
     * DB に行が無いキーのデフォルト値。GET /api/content が必ず全キーを返せるように、
     * また SiteContentSeeder の初期投入値としても使う（docs/11）。
     *
     * @return array<string, mixed>
     */
    public static function defaults(string $key): array
    {
        return match ($key) {
            'hero' => [
                'headline' => 'EC-PORTFOLIO',
                'tagline' => 'Everyday garments, considered.',
                'image_url' => null,
            ],
            'concept' => [
                'body' => "We make a small number of pieces and make them well.\n".
                    'Unisex cuts, honest materials, nothing you have to think about in the morning.',
            ],
            'lookbook' => [
                'images' => [],
            ],
            'about' => [
                'blocks' => [
                    [
                        'label' => 'Since 2019',
                        'heading' => 'A small studio',
                        'body' => 'Started as a two-person studio releasing one capsule a season. Still small on purpose.',
                        'image_url' => null,
                    ],
                    [
                        'label' => 'Material',
                        'heading' => 'Fewer, better fibres',
                        'body' => 'Long-staple cotton, mid-weight wool, recycled nylon. Chosen to last and to age well.',
                        'image_url' => null,
                    ],
                    [
                        'label' => 'Production',
                        'heading' => 'Made close to home',
                        'body' => 'Cut and sewn by two partner factories we visit every season.',
                        'image_url' => null,
                    ],
                ],
            ],
            default => [],
        };
    }
}
