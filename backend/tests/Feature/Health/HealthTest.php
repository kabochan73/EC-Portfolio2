<?php

// GET /api/health … API が起きているか＆DB に繋がっているかを確認する。
// BFF（Next.js の /bff/health）からも叩く（docs/03-api.md）。

it('reports ok and a reachable database', function () {
    $this->getJson('/api/health')
        ->assertOk()
        ->assertJson([
            'status' => 'ok',
            'app' => config('app.name'),
            'database' => 'ok',
        ])
        ->assertJsonStructure(['status', 'app', 'database', 'time']);
});
