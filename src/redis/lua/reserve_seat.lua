-- KEYS[1] = category held counter
-- KEYS[2] = reservation key
-- ARGV[1] = reservation_id
-- ARGV[2] = user_id
-- ARGV[3] = category_quota
-- ARGV[4] = quantity
-- ARGV[5] = end_sales_timestamp
-- ARGV[6] = hold_time

local reservation_id = ARGV[1]
local user_id = ARGV[2]
local quota = tonumber(ARGV[3])
local quantity = tonumber(ARGV[4])
local end_sales = tonumber(ARGV[5])
local hold_time = tonumber(ARGV[6])


-- 1. Validate arguments
if not reservation_id
    or not user_id
    or not quota
    or not quantity
    or not end_sales
    or not hold_time then

    return {0, "INVALID_ARGUMENTS"}
end


if quota <= 0 then
    return {0, "INVALID_QUOTA"}
end


if quantity <= 0 then
    return {0, "INVALID_QUANTITY"}
end


if hold_time <= 0 then
    return {0, "INVALID_HOLD_TIME"}
end


-- 2. Get Redis server time
local time_res = redis.call("TIME")
local now = tonumber(time_res[1])


-- 3. Check sales period
if now >= end_sales then
    return {0, "SALES_ENDED"}
end


-- 4. Check if reservation already exists
local existing_reservation = redis.call("EXISTS", KEYS[2])

if existing_reservation == 1 then
    return {0, "RESERVATION_ALREADY_EXISTS"}
end


-- 5. Get current category held quantity
local held = tonumber(redis.call("GET", KEYS[1]) or "0")


-- 6. Check category quota
if held + quantity > quota then
    return {0, "QUOTA_EXCEEDED"}
end


-- 7. Calculate reservation TTL
-- Don't allow the hold to survive past the sales period.
local remaining_sales_time = end_sales - now
local ttl = math.min(hold_time, remaining_sales_time)


if ttl <= 0 then
    return {0, "SALES_ENDED"}
end


-- 8. Atomically reserve the quota
redis.call("INCRBY", KEYS[1], quantity)


-- 9. Create reservation
redis.call(
    "HSET",
    KEYS[2],
    "reservation_id", reservation_id,
    "user_id", user_id,
    "quantity", quantity,
    "status", "HELD"
)


-- 10. Apply expiration to reservation
redis.call("EXPIRE", KEYS[2], ttl)


-- 11. Return success
return {
    1,
    tostring(ttl),
    tostring(quantity)
}