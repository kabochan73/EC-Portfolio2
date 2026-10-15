<?php

namespace App\Actions\Address;

use App\Models\Address;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * 住所の新規作成（docs/03-api.md POST /api/addresses）。
 * 最初の1件、または is_default=true 指定なら、その1件だけを default にする。
 *
 * 順番が大事: 先に既存の default を外してから新しい住所を default で作る。
 * addresses には「default はユーザーごとに 1 件」の部分 UNIQUE インデックスがあるので、
 * 逆順（作ってから外す）だと作った瞬間に 2 件になり DB に拒否される（R3 は逆順だった）。
 */
final class CreateAddress
{
    /**
     * @param  array<string, mixed>  $attributes
     */
    public function execute(User $user, array $attributes): Address
    {
        return DB::transaction(function () use ($user, $attributes) {
            $makeDefault = ($attributes['is_default'] ?? false) || $user->addresses()->doesntExist();

            if ($makeDefault) {
                $user->addresses()->where('is_default', true)->update(['is_default' => false]);
            }

            return $user->addresses()->create([
                ...$attributes,
                'is_default' => $makeDefault,
            ]);
        });
    }
}
