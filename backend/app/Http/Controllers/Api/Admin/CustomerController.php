<?php

namespace App\Http\Controllers\Api\Admin;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Resources\Admin\CustomerResource;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class CustomerController extends Controller
{
    /** GET /api/admin/customers … role=customer の一覧。?q= name/email 部分一致 &page= */
    public function index(Request $request): AnonymousResourceCollection
    {
        $filters = $request->validate([
            'q' => ['sometimes', 'string', 'max:255'],
            'page' => ['sometimes', 'integer', 'min:1'],
        ]);

        $customers = User::query()
            ->where('role', UserRole::Customer)
            ->withCount('orders')
            ->when(isset($filters['q']), function ($query) use ($filters) {
                $term = '%'.$filters['q'].'%';
                $query->where(fn ($q) => $q->where('name', 'ilike', $term)->orWhere('email', 'ilike', $term));
            })
            ->orderByDesc('id')
            ->paginate(20);

        return CustomerResource::collection($customers);
    }

    /** GET /api/admin/customers/{customer} … 顧客1人の情報。管理者 ID は 404。 */
    public function show(User $customer): CustomerResource
    {
        abort_unless($customer->role === UserRole::Customer, 404);

        return CustomerResource::make($customer->loadCount('orders'));
    }
}
