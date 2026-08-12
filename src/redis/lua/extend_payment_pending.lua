-- KEYS[1]: seat_key ("event:101:seat:A1")
-- KEYS[2]: hold_key ("hold:event:101:seat:A1")
-- ARGV[1]: end_sales_timestamp
-- ARGV[2]: extension_sec (900 seconds = 15 min)

local time_res = redis.call("TIME")
local now = tonumber(time_res[1])
local end_sales = tonumber(ARGV[1])
local add_sec = tonumber(ARGV[2])

if now >= end_sales then
    return {0, "SALES_ENDED"}
end

local current_ttl = redis.call("TTL", KEYS[1])
if current_ttl <= 0 then
    return {0, "RESERVATION_EXPIRED"}
end

local seat_status = redis.call("GET", KEYS[1])
if seat_status ~= "HELD" then
    return {0, "INVALID_STATE"}
end

local remaining_sales_time = end_sales - now
local extended_ttl = current_ttl + add_sec
local new_ttl = math.min(extended_ttl, remaining_sales_time)

if new_ttl <= 0 then
    return {0, "SALES_ENDED"}
end

redis.call("SET", KEYS[1], "PAYMENT_PENDING", "EX", new_ttl)
redis.call("HSET", KEYS[2], "status", "PAYMENT_PENDING")
redis.call("EXPIRE", KEYS[2], new_ttl)

return {1, tostring(new_ttl)}