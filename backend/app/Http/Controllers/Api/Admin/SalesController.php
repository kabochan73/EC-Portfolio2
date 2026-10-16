<?php

namespace App\Http\Controllers\Api\Admin;

use App\Actions\Admin\GetSalesDashboard;
use App\Domain\Sales\SalesPeriod;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;

class SalesController extends Controller
{
    /**
     * GET /api/admin/sales … 売上ダッシュボード一式（docs/05-admin.md。R4 の新機能）。
     * 日別・月別を 1 回で返し、グラフの切り替えはフロントだけで行う（データは最大 31 + 12 点）。
     */
    public function __invoke(GetSalesDashboard $getSalesDashboard): JsonResponse
    {
        return response()->json(['data' => $getSalesDashboard->execute(new SalesPeriod)]);
    }
}
