# SteadFast Courier API — integration notes

Source: SteadFast merchant panel → API guide and Webhook pages (October 2026).
No credentials in this file. Keys live only in `apps/api/.env`.

## Basics

- Base URL: `https://portal.packzy.com/api/v1`
- Headers on every request:
  - `Api-Key: <key>`
  - `Secret-Key: <secret>`
  - `Content-Type: application/json` (POST)
- No login step, no token refresh. Send both keys on every call.
- Keys belong to one business profile. One key per integration (name it, revoke independently).

## Endpoints

| Method | Path | Use |
| --- | --- | --- |
| GET | `/ping` | Health check, no keys needed. Use first to verify network. |
| POST | `/create_order` | Book one parcel. |
| POST | `/create_order/bulk-order` | Book up to 500 parcels in one request. |
| POST | `/create_order/bulk-order/extended` | Same, with per-field validation messages. Prefer this for bulk. |
| GET | `/status_by_cid/{consignment_id}` | Status by consignment id. |
| GET | `/status_with_return_status_by_cid/{consignment_id}` | Status plus return progress. |
| GET | `/status_by_invoice/{invoice}` | Status by our order number. |
| GET | `/status_by_trackingcode/{tracking_code}` | Status by tracking code. |
| GET | `/trackings_by_invoice/{invoice}` | Full tracking history. |
| POST | `/create_pickup_request` | Ask a rider to collect. |
| POST | `/create_return_request` | Ask for a parcel to come back. |
| GET | `/get_return_requests` | Return requests, paginated. |
| GET | `/get_return_request/{id}` | One return request. |
| GET | `/get_balance` | Current balance. Harmless — use for "Test connection" with keys. |
| GET | `/payments` | Payouts, paginated. |
| GET | `/payments/{payment_id}` | One payout with parcels settled. |
| GET | `/police_stations` | All thanas with district. |
| GET | `/fraud_check/score/{phone}` | Customer delivery record across merchants (for Step 15 fraud check). |

Exact request/response bodies: expand each endpoint in the panel's API guide when implementing.
create_order sample body fields: `invoice`, `recipient_name`, `recipient_phone`, `recipient_address`, `cod_amount` (+ optional `note`).

## Rules that matter

- `invoice` = our order number. Duplicate invoices are refused, so retrying a failed booking with the same invoice cannot double-book. Always send our order number as invoice.
- Long values are truncated, not refused (invoice, recipient_name, recipient_phone, recipient_address, note have max lengths — check the panel). Validate lengths ourselves.
- Some characters are stripped from address/name/note before storing.
- Status answers are cached 60 seconds. Polling faster is useless. Prefer webhooks.
- Rate limits: 1,000 requests/minute, 6,000 for booking.
- 401 = wrong/revoked keys or parcel from another profile. After 10 failures in 5 minutes from one address+key, all requests get 429 for 60 minutes. NEVER retry a 401 in a loop.

## Response codes

| Code | Meaning | Action |
| --- | --- | --- |
| 200 | Done | Bulk endpoints may report per-item failures inside a 200 — always read the body. |
| 400 | Malformed request | Usually bad/missing `data` on bulk. |
| 401 | Not authenticated / not yours | Check keys. Do not retry. |
| 403 | Account inactive / KYC | Show admin a clear message. |
| 422 | Field rejected | Read `errors` for field names, show them in admin. |
| 429 | Too many requests | Back off. |
| 500 | Their error | Retry with the same invoice. |

## Delivery statuses → our order status

| SteadFast status | Meaning | Our action |
| --- | --- | --- |
| `in_review` | Created, awaiting their approval | Shipment created, order SHIPPED |
| `pending` | Booked, not yet attempted | SHIPPED |
| `hold` | Address or payment question | SHIPPED + flag "Needs attention" |
| `delivered_approval_pending` | Rider says delivered, not confirmed | Show as "Delivered (pending)", do NOT mark DELIVERED |
| `partial_delivered_approval_pending` | Rider says partial | Show pending, do not settle |
| `cancelled_approval_pending` | Rider says cancelled | Show pending, do not settle |
| `unknown_approval_pending` | Awaiting confirmation | Show pending |
| `delivered` | Confirmed, COD owed to us | DELIVERED |
| `partial_delivered` | Part delivered, confirmed | PARTIAL_DELIVERED |
| `cancelled` | Not delivered, coming back | RETURNED (return in progress) |
| `exceptional` | Lost/damaged | Flag "Needs attention", alert admin |
| `unknown` | Not recognised | Log, treat as "ask support" |

Rule: anything ending `_approval_pending` is the rider's word only. Only `delivered`, `partial_delivered`, `cancelled` change money/stock.

Return statuses (from `/status_with_return_status_by_cid`): `partial_delivered_return_processing`, `partial_delivered_return_rider_assigned`, `partial_delivered_return_received`, `cancelled_return_processing`, `cancelled_return_rider_assigned`, `cancelled_return_received`. Restock only on `*_return_received`.

## Webhook

- Configured in panel → Webhook: Callback URL (must be https) + optional Auth token.
- They POST JSON, wait up to 5 seconds for a 2xx.
- Headers:
  - `Authorization: Bearer <auth token>`
  - `X-Signature`: HMAC-SHA256 of the RAW body, hex, keyed with the auth token
  - `Idempotency-Key`: same value on retries of the same event
  - `User-Agent: Steadfast-Webhook/1.0`
- Retries: on 5xx or unreachable, after 30 s and 2 min (3 attempts total). 4xx is not retried.
- Verify: compute HMAC-SHA256 of the raw body with the token, compare with X-Signature using timingSafeEqual. Needs `express.raw()` on this route, not `express.json()`.
- Deduplicate by Idempotency-Key (store processed keys).
- Respond fast (200) and do the work in a BullMQ job.

Events (`notification_type`): `delivery_status`, `tracking_update`, `consignment_update`, `return_list_accepted`, `payment_request`, `cancel_request`, `return_request`, `pickup_request`, `user_update`.

`delivery_status` example payload:

```json
{
  "notification_type": "delivery_status",
  "consignment_id": 12345,
  "invoice": "INV-67890",
  "cod_amount": 1500.0,
  "status": "delivered",
  "delivery_charge": 100.0,
  "tracking_message": "Your package has been delivered successfully.",
  "updated_at": "2025-03-02 12:45:30"
}
```

Note: `cod_amount` and `delivery_charge` arrive as decimals — convert to Int taka.