<?php

namespace App\Http\Controllers\Api\Account;

use App\Actions\Auth\UpdatePassword;
use App\Actions\Auth\UpdateProfile;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\UpdatePasswordRequest;
use App\Http\Requests\Auth\UpdateProfileRequest;
use App\Http\Resources\Account\UserResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProfileController extends Controller
{
    /** GET /api/me … ログインユーザー（docs/03-api.md）。 */
    public function show(Request $request): UserResource
    {
        return UserResource::make($request->user());
    }

    /** PUT /api/me … 氏名・メール更新。 */
    public function update(UpdateProfileRequest $request, UpdateProfile $updateProfile): UserResource
    {
        $user = $updateProfile->execute(
            user: $request->user(),
            name: $request->string('name')->toString(),
            email: $request->string('email')->toString(),
        );

        return UserResource::make($user);
    }

    /** PUT /api/me/password … 現パスワード必須。 */
    public function updatePassword(UpdatePasswordRequest $request, UpdatePassword $updatePassword): JsonResponse
    {
        $updatePassword->execute(
            user: $request->user(),
            newPassword: $request->string('password')->toString(),
        );

        return response()->json(status: 204);
    }
}
