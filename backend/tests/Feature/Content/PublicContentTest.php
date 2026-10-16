<?php

use App\Models\SiteContent;

it('returns all four keys, filled with defaults when the DB is empty', function () {
    $this->getJson('/api/content')
        ->assertOk()
        ->assertJsonStructure(['data' => [
            'hero' => ['headline', 'tagline', 'image_url'],
            'concept' => ['body'],
            'lookbook' => ['images'],
            'about' => ['blocks'],
        ]])
        ->assertJsonPath('data.hero.headline', 'EC-PORTFOLIO');
});

it('returns stored values over defaults', function () {
    SiteContent::factory()->key('hero')->create([
        'data' => ['headline' => 'NEW SEASON', 'tagline' => 'ss26', 'image_url' => '/media/content/hero/x.jpg'],
    ]);

    $this->getJson('/api/content')
        ->assertOk()
        ->assertJsonPath('data.hero.headline', 'NEW SEASON')
        ->assertJsonPath('data.hero.image_url', '/media/content/hero/x.jpg')
        // 他キーはデフォルトのまま
        ->assertJsonPath('data.concept.body', SiteContent::defaults('concept')['body']);
});

it('replaces the lookbook images array wholesale', function () {
    SiteContent::factory()->key('lookbook')->create([
        'data' => ['images' => [['url' => '/media/content/lookbook/1.jpg', 'alt' => 'one']]],
    ]);

    $this->getJson('/api/content')
        ->assertOk()
        ->assertJsonCount(1, 'data.lookbook.images')
        ->assertJsonPath('data.lookbook.images.0.alt', 'one');
});
