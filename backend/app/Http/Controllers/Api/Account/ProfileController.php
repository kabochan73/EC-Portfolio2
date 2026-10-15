<?php

namespace App\Http\Controllers\Api\Account;

use App\Http\Controllers\Controller;
use App\Http\Resources\Account\UserResource;
use Illuminate\Http\Request;

class ProfileController extends Controller
{
    /** GET /api/me … ログインユーザー（docs/03-api.md）。プロフィール更新は Step 14 で足す */
    public function show(Request $request): UserResource
    {
        return UserResource::make($request->user());
    }
}
