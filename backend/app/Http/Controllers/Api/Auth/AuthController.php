<?php

namespace App\Http\Controllers\Api\Auth;

use App\Actions\Auth\AuthenticateUser;
use App\Actions\Auth\RegisterUser;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Resources\Account\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuthController extends Controller
{
    /** BFF が httpOnly Cookie に載せるトークンの名前 */
    private const TOKEN_NAME = 'bff';

    public function register(RegisterRequest $request, RegisterUser $registerUser): JsonResponse
    {
        $user = $registerUser->execute(
            name: $request->string('name')->toString(),
            email: $request->string('email')->toString(),
            password: $request->string('password')->toString(),
        );

        return $this->tokenResponse($user, 201);
    }

    public function login(LoginRequest $request, AuthenticateUser $authenticateUser): JsonResponse
    {
        $user = $authenticateUser->execute(
            email: $request->string('email')->toString(),
            password: $request->string('password')->toString(),
        );

        return $this->tokenResponse($user, 200);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(status: 204);
    }

    private function tokenResponse(User $user, int $status): JsonResponse
    {
        $token = $user->createToken(self::TOKEN_NAME)->plainTextToken;

        return UserResource::make($user)
            ->additional(['token' => $token])
            ->response()
            ->setStatusCode($status);
    }
}
