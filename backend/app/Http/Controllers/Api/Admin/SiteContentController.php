<?php

namespace App\Http\Controllers\Api\Admin;

use App\Actions\Admin\Content\UpdateSiteContent;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Content\UpdateSiteContentRequest;
use App\Http\Requests\Admin\Content\UploadContentImageRequest;
use App\Models\SiteContent;
use App\Services\StorageService;
use Illuminate\Http\JsonResponse;

class SiteContentController extends Controller
{
    /** GET /api/admin/content … 全 4 キーの data（編集フォーム用。中身は公開 API と同じ）。 */
    public function index(): JsonResponse
    {
        return response()->json(['data' => SiteContent::allWithDefaults()]);
    }

    /** PUT /api/admin/content/{key} … data 全体を差し替え。 */
    public function update(UpdateSiteContentRequest $request, string $key, UpdateSiteContent $updateSiteContent): JsonResponse
    {
        $content = $updateSiteContent->execute($key, $request->validated(), $request->user());

        return response()->json(['data' => $content->data]);
    }

    /** POST /api/admin/content/{key}/images … 画像を保存し { url } を返す。 */
    public function uploadImage(UploadContentImageRequest $request, string $key, StorageService $storage): JsonResponse
    {
        $path = $storage->put("content/{$key}", $request->file('image'));

        return response()->json(['url' => '/media/'.$path], 201);
    }
}
