-- KEYS[1] = Order Idempotency Key ("order:customer:<customerId>:event:<eventId>")
-- KEYS[2...] = Category Held Keys ("category:<categoryId>:held")

-- ARGV[1] = order_id
-- ARGV[2] = customer_id
-- ARGV[3] = end_sales_timestamp (unix seconds)
-- ARGV[4] = hold_time (in seconds)
-- ARGV[5] = JSON payload: [{"id":"cat_uuid", "qty":2, "quota":10}]

local order_key       = KEYS[1]
local order_id        = ARGV[1]
local customer_id     = ARGV[2]
local end_sales       = tonumber(ARGV[3]) -- Fixed
local hold_time       = tonumber(ARGV[4]) -- Fixed
local categories_json = ARGV[5]           -- Fixed

-- 1. Check if reservation already exists in Redis
if redis.call("EXISTS", order_key) == 1 then
    local existing_order_id = redis.call("HGET", order_key, "order_id")
    local existing_ttl = redis.call("TTL", order_key)
    return {2, existing_order_id, tostring(existing_ttl)}
end

-- 2. Check Sales Expiration
local time_res = redis.call("TIME")
local now = tonumber(time_res[1])

if now >= end_sales then
    return {0, "SALES_ENDED"}
end

local remaining_sales = end_sales - now
local ttl = math.min(hold_time, remaining_sales)

if ttl <= 0 then
    return {0, "SALES_ENDED"}
end

-- 3. Check Quotas
local categories = cjson.decode(categories_json)
if not categories or #categories == 0 then
    return {0, "INVALID_CATEGORIES"}
end

for i, item in ipairs(categories) do
    local qty       = tonumber(item.qty)
    local max_quota = tonumber(item.quota)
    local key_index = i + 1

    local current_held = tonumber(redis.call("GET", KEYS[key_index]) or "0")

    if (current_held + qty) > max_quota then
        return {0, "QUOTA_EXCEEDED", item.id}
    end
end

-- 4. Increment Category Quotas
for i, item in ipairs(categories) do
    local qty       = tonumber(item.qty)
    local key_index = i + 1
    redis.call("INCRBY", KEYS[key_index], qty)

    local current_key_ttl = redis.call("TTL", KEYS[key_index])
    if current_key_ttl < remaining_sales then
        redis.call("EXPIRE", KEYS[key_index], remaining_sales)
    end
end

-- 5. Store Metadata & Set Key Expiration
redis.call(
    "HSET",
    order_key,
    "order_id", order_id,
    "customer_id", customer_id,
    "categories", categories_json
)
redis.call("EXPIRE", order_key, ttl)

return {1, tostring(ttl)}