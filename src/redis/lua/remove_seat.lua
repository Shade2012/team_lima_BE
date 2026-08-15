-- KEYS[1] = Order Idempotency Key ("order:customer:<customerId>:event:<eventId>")
-- KEYS[2...] = Category Held Keys ("category:<categoryId>:held")

-- ARGV[1] = (Optional) categories_json payload: [{"id":"cat_uuid", "qty":2}]

local order_key       = KEYS[1]
local categories_json = ARGV[1]

-- 1. Fetch categories JSON from order_key if not passed in ARGV[1]
if not categories_json or categories_json == "" then
    categories_json = redis.call("HGET", order_key, "categories")
end

-- If key doesn't exist or is already cleared, exit gracefully
if not categories_json then
    return {0, "ORDER_NOT_FOUND_OR_ALREADY_RELEASED"}
end

local categories = cjson.decode(categories_json)
if not categories or #categories == 0 then
    return {0, "INVALID_CATEGORIES"}
end

-- 2. Decrement Category Held Quotas safely
for i, item in ipairs(categories) do
    local qty       = tonumber(item.qty)
    local key_index = i + 1
    local cat_key   = KEYS[key_index]

    if cat_key then
        local current_held = tonumber(redis.call("GET", cat_key) or "0")
        -- Prevent negative counts
        local new_held = math.max(0, current_held - qty)
        redis.call("SET", cat_key, new_held)
    end
end

-- 3. Delete the order idempotency key
redis.call("DEL", order_key)

return {1, "RELEASED_SUCCESSFULLY"}