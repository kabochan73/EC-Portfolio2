<?php

namespace App\Http\Controllers\Api\Account;

use App\Actions\Address\CreateAddress;
use App\Actions\Address\DeleteAddress;
use App\Actions\Address\SetDefaultAddress;
use App\Actions\Address\UpdateAddress;
use App\Http\Controllers\Controller;
use App\Http\Requests\Address\AddressRequest;
use App\Http\Resources\Account\AddressResource;
use App\Models\Address;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class AddressController extends Controller
{
    /** GET /api/addresses … 本人の住所（is_default を先頭、以降は新しい順）。 */
    public function index(Request $request): AnonymousResourceCollection
    {
        return AddressResource::collection(
            $request->user()->addresses()->ordered()->get(),
        );
    }

    public function store(AddressRequest $request, CreateAddress $createAddress): JsonResponse
    {
        $address = $createAddress->execute($request->user(), $request->validated());

        return AddressResource::make($address)->response()->setStatusCode(201);
    }

    public function update(AddressRequest $request, Address $address, UpdateAddress $updateAddress): AddressResource
    {
        $this->authorizeAddress($request, $address);

        return AddressResource::make($updateAddress->execute($address, $request->validated()));
    }

    public function destroy(Request $request, Address $address, DeleteAddress $deleteAddress): JsonResponse
    {
        $this->authorizeAddress($request, $address);
        $deleteAddress->execute($address);

        return response()->json(status: 204);
    }

    public function setDefault(Request $request, Address $address, SetDefaultAddress $setDefaultAddress): AddressResource
    {
        $this->authorizeAddress($request, $address);

        return AddressResource::make($setDefaultAddress->execute($address));
    }

    /** 他人の住所は「存在しない」ものとして 404（存在を秘匿）。 */
    private function authorizeAddress(Request $request, Address $address): void
    {
        abort_unless($address->user_id === $request->user()->id, 404);
    }
}
