import { apiFetch, bearer, bearerJson } from "@/lib/api";
import type { AddressFormValues } from "@/lib/schemas/address";
import type { Address, ApiCollection, ApiResource } from "@/lib/types";

// 住所録（サーバー専用。Server Component / BFF から）。

/** GET /api/addresses … is_default を先頭に */
export async function getAddresses(token: string): Promise<Address[]> {
  const res = await apiFetch<ApiCollection<Address>>("/api/addresses", { headers: bearer(token) });
  return res.data;
}

/** POST /api/addresses */
export async function createAddress(token: string, payload: AddressFormValues): Promise<Address> {
  const res = await apiFetch<ApiResource<Address>>("/api/addresses", bearerJson(token, "POST", payload));
  return res.data;
}

/** PUT /api/addresses/{id} */
export async function updateAddress(
  token: string,
  id: number,
  payload: AddressFormValues,
): Promise<Address> {
  const res = await apiFetch<ApiResource<Address>>(
    `/api/addresses/${id}`,
    bearerJson(token, "PUT", payload),
  );
  return res.data;
}

/** DELETE /api/addresses/{id} */
export async function deleteAddress(token: string, id: number): Promise<void> {
  await apiFetch<void>(`/api/addresses/${id}`, { method: "DELETE", headers: bearer(token) });
}

/** POST /api/addresses/{id}/default */
export async function setDefaultAddress(token: string, id: number): Promise<Address> {
  const res = await apiFetch<ApiResource<Address>>(`/api/addresses/${id}/default`, {
    method: "POST",
    headers: bearer(token),
  });
  return res.data;
}
