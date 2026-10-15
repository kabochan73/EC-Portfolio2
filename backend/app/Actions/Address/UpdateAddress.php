<?php

namespace App\Actions\Address;

use App\Models\Address;
use Illuminate\Support\Facades\DB;

/**
 * 住所の更新（docs/03-api.md PUT /api/addresses/{id}）。
 * is_default=true にした場合は同ユーザーの他を false 化。
 * 既に default の住所を is_default=false で更新しても外さない（default は必ず1件残す）。
 *
 * CreateAddress と同じく「先に他を外す → この住所を default にして保存」の順
 * （部分 UNIQUE インデックス addresses_one_default_per_user に違反しないため）。
 */
final class UpdateAddress
{
    /**
     * @param  array<string, mixed>  $attributes
     */
    public function execute(Address $address, array $attributes): Address
    {
        return DB::transaction(function () use ($address, $attributes) {
            $promote = ($attributes['is_default'] ?? false) && ! $address->is_default;

            unset($attributes['is_default']);
            $address->fill($attributes);

            if ($promote) {
                Address::where('user_id', $address->user_id)
                    ->whereKeyNot($address->id)
                    ->update(['is_default' => false]);

                $address->is_default = true;
            }

            $address->save();

            return $address;
        });
    }
}
