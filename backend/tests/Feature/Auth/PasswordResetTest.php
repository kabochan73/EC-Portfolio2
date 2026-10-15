<?php

use App\Jobs\SendPasswordResetJob;
use App\Mail\ResetPasswordMail;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Queue;

it('queues a reset mail for a known email', function () {
    Queue::fake();
    User::factory()->create(['email' => 'known@example.com']);

    $this->postJson('/api/forgot-password', ['email' => 'known@example.com'])
        ->assertOk()
        ->assertJsonStructure(['message']);

    Queue::assertPushed(SendPasswordResetJob::class);
});

it('responds 200 without queuing for an unknown email', function () {
    Queue::fake();

    $this->postJson('/api/forgot-password', ['email' => 'nobody@example.com'])
        ->assertOk();

    Queue::assertNotPushed(SendPasswordResetJob::class);
});

it('sends the mail with a frontend link when the job runs', function () {
    Mail::fake();
    $user = User::factory()->create(['email' => 'known@example.com', 'name' => 'Aoi']);

    (new SendPasswordResetJob($user->id, 'the-token'))->handle();

    Mail::assertSent(ResetPasswordMail::class, function (ResetPasswordMail $mail) {
        return $mail->hasTo('known@example.com')
            && str_contains($mail->resetUrl, config('app.frontend_url').'/reset-password?token=the-token')
            && str_contains($mail->resetUrl, 'email=known%40example.com')
            && $mail->expiresMinutes === 60;
    });
});

it('resets the password with a valid token and allows login with the new one', function () {
    $user = User::factory()->create(['email' => 'known@example.com', 'password' => Hash::make('old-password')]);
    $token = Password::createToken($user);

    $this->postJson('/api/reset-password', [
        'token' => $token,
        'email' => 'known@example.com',
        'password' => 'brand-new-password',
        'password_confirmation' => 'brand-new-password',
    ])->assertOk();

    expect(Hash::check('brand-new-password', $user->fresh()->password))->toBeTrue();

    $this->postJson('/api/login', ['email' => 'known@example.com', 'password' => 'brand-new-password'])
        ->assertOk();
});

it('rejects an invalid token', function () {
    User::factory()->create(['email' => 'known@example.com']);

    $this->postJson('/api/reset-password', [
        'token' => 'not-a-real-token',
        'email' => 'known@example.com',
        'password' => 'brand-new-password',
        'password_confirmation' => 'brand-new-password',
    ])
        ->assertStatus(422)
        ->assertJsonValidationErrorFor('email');
});

it('rejects a token for the wrong email', function () {
    $user = User::factory()->create(['email' => 'known@example.com']);
    User::factory()->create(['email' => 'other@example.com']);
    $token = Password::createToken($user);

    $this->postJson('/api/reset-password', [
        'token' => $token,
        'email' => 'other@example.com',
        'password' => 'brand-new-password',
        'password_confirmation' => 'brand-new-password',
    ])->assertStatus(422);
});

it('rejects an expired token', function () {
    $user = User::factory()->create(['email' => 'known@example.com']);
    $token = Password::createToken($user);

    $this->travel(config('auth.passwords.users.expire') + 1)->minutes();

    $this->postJson('/api/reset-password', [
        'token' => $token,
        'email' => 'known@example.com',
        'password' => 'brand-new-password',
        'password_confirmation' => 'brand-new-password',
    ])->assertStatus(422);
});

it('validates the new password', function () {
    $user = User::factory()->create(['email' => 'known@example.com']);
    $token = Password::createToken($user);

    $this->postJson('/api/reset-password', [
        'token' => $token,
        'email' => 'known@example.com',
        'password' => 'short',
        'password_confirmation' => 'nope',
    ])
        ->assertStatus(422)
        ->assertJsonValidationErrorFor('password');
});

it('revokes all tokens after a password reset', function () {
    $user = User::factory()->create(['email' => 'known@example.com']);
    $user->createToken('bff');
    $user->createToken('bff');

    $this->postJson('/api/reset-password', [
        'token' => Password::createToken($user),
        'email' => 'known@example.com',
        'password' => 'brand-new-password',
        'password_confirmation' => 'brand-new-password',
    ])->assertOk();

    expect($user->tokens()->count())->toBe(0);
});
