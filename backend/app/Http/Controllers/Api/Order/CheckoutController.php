<?php

namespace App\Http\Controllers\Api\Order;

use App\Actions\Payment\CreatePaymentIntent;
use App\Http\Controllers\Controller;
use App\Http\Requests\Checkout\CreatePaymentIntentRequest;
use App\Models\Order;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class CheckoutController extends Controller
{
    /**
     * POST /api/checkout/payment-intent … 注文の PaymentIntent を作成 or 再利用し
     * client_secret を返す（docs/09-payments-stripe.md）。
     */
    public function paymentIntent(CreatePaymentIntentRequest $request, CreatePaymentIntent $createPaymentIntent): JsonResponse
    {
        $order = Order::query()
            ->forUser($request->user())
            ->where('order_number', $request->string('order_number'))
            ->first();

        if ($order === null) {
            throw new NotFoundHttpException('Order not found.');
        }

        return response()->json(['data' => $createPaymentIntent->execute($order)]);
    }
}
