<?php

namespace App\Services;

use Illuminate\Contracts\Filesystem\Filesystem;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use League\Flysystem\FilesystemException;

/**
 * S3 互換バケット（本番 Railway / ローカル RustFS）の薄いラッパー
 * （docs/05-admin.md / docs/06-laravel-design.md §2）。
 *
 * キー形式: {prefix}/{ulid}.{ext}
 *  - 商品画像:  products/{product_id}
 *  - CMS 画像:  content/{key}
 */
class StorageService
{
    private Filesystem $disk;

    public function __construct()
    {
        $this->disk = Storage::disk(config('filesystems.default'));
    }

    /**
     * ファイルを保存し、オブジェクトキーを返す。
     *
     * 拡張子はファイルの中身（MIME）から決める（R4）。R3 はアップロードした人が付けた
     * ファイル名の拡張子をそのまま使っていたので、中身が JPEG でも photo.html なら .html で保存された
     */
    public function put(string $prefix, UploadedFile $file): string
    {
        $key = trim($prefix, '/').'/'.strtolower((string) Str::ulid()).'.'.$file->extension();

        $this->disk->put($key, $file->getContent());

        return $key;
    }

    /**
     * 削除の失敗は例外にせずログに残す（R4 2026-11-02）。DB の行はもう消えているので、
     * ここで止めると「消えたのにエラー」になる。残るのは使われないファイルだけ
     */
    public function delete(string $key): void
    {
        $this->deleteMany([$key]);
    }

    /**
     * @param  list<string>  $keys
     */
    public function deleteMany(array $keys): void
    {
        if ($keys === []) {
            return;
        }

        try {
            $this->disk->delete($keys);
        } catch (FilesystemException $e) {
            report($e);
        }
    }

    public function exists(string $key): bool
    {
        return $this->disk->exists($key);
    }
}
