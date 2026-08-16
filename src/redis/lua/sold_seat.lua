-- KEYS[1]       = Order Reservation Key
-- KEYS[2..N]    = Category Held Keys
-- KEYS[N+1..2N] = Category Sold Keys

local order_key = KEYS[1]

local categories_json =
    redis.call("HGET", order_key, "categories")

if not categories_json then
    return {0, "ORDER_NOT_FOUND"}
end

local categories = cjson.decode(categories_json)

if not categories or #categories == 0 then
    return {0, "INVALID_CATEGORIES"}
end

local category_count = #categories

for i, item in ipairs(categories) do

    local qty = tonumber(item.qty)

    local held_key_index = i + 1
    local sold_key_index = category_count + i + 1

    local held =
        tonumber(
            redis.call(
                "GET",
                KEYS[held_key_index]
            ) or "0"
        )

    if held < qty then
        return {
            0,
            "INSUFFICIENT_HELD",
            item.id
        }
    end
end


-- Move HELD -> SOLD
for i, item in ipairs(categories) do

    local qty = tonumber(item.qty)

    local held_key_index = i + 1
    local sold_key_index = category_count + i + 1

    redis.call(
        "DECRBY",
        KEYS[held_key_index],
        qty
    )

    redis.call(
        "INCRBY",
        KEYS[sold_key_index],
        qty
    )
end


redis.call(
    "DEL",
    order_key
)

return {
    1,
    "SOLD_SUCCESSFULLY"
}