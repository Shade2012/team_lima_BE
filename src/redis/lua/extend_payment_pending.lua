-- KEYS[1] = Order Key ("order:customer:<id>:event:<id>" or "order:idempotent:<id>")
-- ARGV[1] = end_sales_timestamp (unix seconds)
-- ARGV[2] = extension_sec (e.g., 900 seconds = +15 mins)

local order_key        = KEYS[1]
local end_sales        = tonumber(ARGV[1])
local payment_hold_sec = tonumber(ARGV[2])

-- 1. Get current Redis time
local time_res = redis.call("TIME")
local now = tonumber(time_res[1])

if now >= end_sales then
    return {0, "SALES_ENDED"}
end

-- 2. Check current TTL
local current_ttl = redis.call("TTL", order_key)
if current_ttl <= 0 then
    return {0, "RESERVATION_EXPIRED"}
end

-- 3. Verify status inside Hash (HGET instead of GET)
local status = redis.call("HGET", order_key, "status")
if status ~= "HELD" then
    return {0, "INVALID_STATE"}
end

-- 4. Calculate new TTL capped by remaining sales time
local remaining_sales = end_sales - now
local new_ttl = math.min(payment_hold_sec, remaining_sales)

if new_ttl <= 0 then
    return {0, "SALES_ENDED"}
end

-- 5. Update Status in Hash & Extend Key TTL
redis.call("HSET", order_key, "status", "PAYMENT_PENDING")
redis.call("EXPIRE", order_key, new_ttl)

return {1, tostring(new_ttl)}