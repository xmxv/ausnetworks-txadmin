--[[
    AusNetworks bridge.

    This is the ONLY place the txAdmin fork knows about our game data, and it
    deliberately knows almost nothing: it authorises the calling admin, asks
    the ausnet-admin resource for a blob, and forwards it to the NUI.

    Keeping it this thin is what makes the fork cheap to rebase - our schema,
    framework and anticheat can all change without touching txAdmin.

    Permissions (registered in core/modules/AdminStore/index.js):
      ausnet.player_data       economy + owned vehicles
      ausnet.player_inventory  inventory contents, player and vehicle
      ausnet.anticheat         trust scores
]]

local RESOURCE = 'ausnet-admin'

--- Guard so a missing or crashed ausnet-admin degrades to a clear message in
--- the panel instead of a Lua error in the server console.
local function resourceReady()
    return GetResourceState(RESOURCE) == 'started'
end

local function failTo(src, reason)
    TriggerClientEvent('txcl:ausnet:playerData', src, { error = reason })
end

---Resolve the target's identifiers on the server. The client sends only a
---server id; it never gets to nominate a licence or citizenid, so it cannot
---ask about an arbitrary character.
local function refFor(targetId)
    return { serverId = tonumber(targetId) }
end

RegisterNetEvent('txsv:req:ausnet:playerData', function(targetId, citizenid)
    local src = source
    targetId = tonumber(targetId)
    if not targetId then return end
    -- The client may pin which character to expand. It is validated against
    -- the account's own characters server-side, so a forged value cannot read
    -- someone else's data.
    if type(citizenid) ~= 'string' then citizenid = nil end

    if not PlayerHasTxPermission(src, 'ausnet.player_data') then
        return failTo(src, 'noperm')
    end
    if not resourceReady() then
        return failTo(src, 'unavailable')
    end

    -- Inventory is a separate permission, so it is only requested when the
    -- caller actually holds it. An admin without it never has the data sent to
    -- their client at all, rather than being hidden in the UI.
    local wantsInventory = PlayerHasTxPermission(src, 'ausnet.player_inventory')

    local ok, overview = pcall(function()
        return exports[RESOURCE]:GetPlayerOverview(refFor(targetId), {
            inventory = wantsInventory,
            citizenid = citizenid,
        })
    end)
    if not ok then
        print(('[txAdmin:ausnet] GetPlayerOverview failed for %s: %s'):format(targetId, overview))
        return failTo(src, 'error')
    end
    if not overview then
        return failTo(src, 'notfound')
    end

    -- Trust is its own permission; strip it rather than refusing the request,
    -- so an admin with player_data but not anticheat still sees economy.
    if not PlayerHasTxPermission(src, 'ausnet.anticheat') then
        overview.trust = nil
    end

    overview.perms = {
        inventory = wantsInventory,
        inventoryManage = PlayerHasTxPermission(src, 'ausnet.inventory_manage'),
        anticheat = PlayerHasTxPermission(src, 'ausnet.anticheat'),
    }

    TriggerClientEvent('txcl:ausnet:playerData', src, overview)
end)

RegisterNetEvent('txsv:req:ausnet:vehicleStorage', function(targetId, vehicleId, citizenid)
    local src = source
    targetId, vehicleId = tonumber(targetId), tonumber(vehicleId)
    if not targetId or not vehicleId then return end
    if type(citizenid) ~= 'string' or citizenid == '' then return end

    -- Vehicle contents are inventory data, so they need the inventory
    -- permission, not merely player_data.
    if not PlayerHasTxPermission(src, 'ausnet.player_inventory') then
        return TriggerClientEvent('txcl:ausnet:vehicleStorage', src, { error = 'noperm' })
    end
    if not resourceReady() then
        return TriggerClientEvent('txcl:ausnet:vehicleStorage', src, { error = 'unavailable' })
    end

    local ok, storage = pcall(function()
        return exports[RESOURCE]:GetVehicleStorage(vehicleId, citizenid)
    end)
    if not ok then
        print(('[txAdmin:ausnet] GetVehicleStorage failed for %s/%s: %s'):format(targetId, vehicleId, storage))
        return TriggerClientEvent('txcl:ausnet:vehicleStorage', src, { error = 'error' })
    end

    TriggerClientEvent('txcl:ausnet:vehicleStorage', src, storage or { error = 'notfound' })
end)

--[[
    Inventory actions.

    Viewing is read-only and rides on ausnet.player_inventory. Opening
    interactively and wiping are destructive - an admin can take items or
    destroy them outright - so they need ausnet.inventory_manage, which is
    deliberately a separate grant.

    Every attempt is written to txAdmin's admin log via txsv:logger:menuEvent,
    allowed or not, so there is a record of who looked in whose pockets.
]]
RegisterNetEvent('txsv:req:ausnet:inventoryAction', function(action, params)
    local src = source
    if type(action) ~= 'string' or type(params) ~= 'table' then return end

    local DESTRUCTIVE = { openPlayer = true, wipePlayer = true, wipeVehicle = true }
    local perm = DESTRUCTIVE[action] and 'ausnet.inventory_manage' or 'ausnet.player_inventory'
    local allow = PlayerHasTxPermission(src, perm)

    TriggerEvent('txsv:logger:menuEvent', src, 'ausnetInventory:' .. action, allow, {
        target = params.targetId,
        plate = params.plate,
        kind = params.kind,
    })

    local function reply(ok, err)
        TriggerClientEvent('txcl:ausnet:actionResult', src, {
            action = action,
            ok = ok and true or false,
            error = err,
        })
    end

    if not allow then return reply(false, 'You do not have permission for that.') end
    if not resourceReady() then return reply(false, 'ausnet-admin is not running.') end

    local targetSrc = tonumber(params.targetId)
    local ok, res, err = pcall(function()
        return exports[RESOURCE]:InventoryAction(action, {
            adminSrc = src,
            targetSrc = targetSrc,
            citizenid = params.citizenid,
            plate = params.plate,
            kind = params.kind,
        })
    end)
    if not ok then
        print(('[txAdmin:ausnet] %s failed: %s'):format(action, res))
        return reply(false, 'The action errored. Check the server console.')
    end
    reply(res, err)
end)
