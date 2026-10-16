<?php

namespace App\Actions\Admin\Content;

use App\Models\SiteContent;
use App\Models\User;

final class UpdateSiteContent
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function execute(string $key, array $data, User $editor): SiteContent
    {
        return SiteContent::updateOrCreate(
            ['key' => $key],
            ['data' => $data, 'updated_by' => $editor->id],
        );
    }
}
