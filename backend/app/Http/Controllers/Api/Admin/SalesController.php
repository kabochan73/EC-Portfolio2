<?php

namespace App\Http\Controllers\Api\Admin;

use App\Actions\Admin\GetSalesDashboard;
use App\Domain\Sales\SalesPeriod;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class SalesController extends Controller
{
    /**
     * GET /api/admin/sales … 売上ダッシュボード一式（docs/05-admin.md。R4 の新機能）。
     * 日別・月別を 1 回で返し、グラフの切り替えはフロントだけで行う（データは最大 31 + 12 点）。
     * ?month=YYYY-MM でランキングの月を選べる（R4 追加。過去 12 か月のどれか。省略は今月）
     */
    public function __invoke(Request $request, GetSalesDashboard $getSalesDashboard): JsonResponse
    {
        $period = new SalesPeriod;

        $validated = $request->validate([
            // 月別グラフと同じ過去 12 か月だけ選べる（未来の月・13 か月以上前・形式違いは 422）
            'month' => ['sometimes', 'string', Rule::in($period->monthsOfLastTwelve())],
        ]);

        return response()->json(['data' => $getSalesDashboard->execute($period, $validated['month'] ?? null)]);
    }
}
