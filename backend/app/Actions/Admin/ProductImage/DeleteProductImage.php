<?php

namespace App\Actions\Admin\ProductImage;

use App\Models\ProductImage;
use App\Services\StorageService;

/**
 * 商品画像の削除。先に DB の行を消し、成功してからバケットのファイルを消す（R4）。
 * R3 は逆順で、行の削除に失敗すると「行はあるのにファイルが無い = 画面で画像切れ」になりえた。
 * この順なら、失敗しても残るのは誰も参照しないファイルだけ
 */
final class DeleteProductImage
{
    public function __construct(private readonly StorageService $storage) {}

    public function execute(ProductImage $image): void
    {
        $path = $image->path;

        $image->delete();

        $this->storage->delete($path);
    }
}
