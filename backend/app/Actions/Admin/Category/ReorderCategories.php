<?php

namespace App\Actions\Admin\Category;

use App\Models\Category;
use Illuminate\Support\Facades\DB;

final class ReorderCategories
{
    /**
     * 渡された id 配列の順に position を 0,1,2,... で振り直す。
     *
     * @param  list<int>  $orderedIds
     */
    public function execute(array $orderedIds): void
    {
        DB::transaction(function () use ($orderedIds) {
            foreach ($orderedIds as $position => $id) {
                Category::whereKey($id)->update(['position' => $position]);
            }
        });
    }
}
