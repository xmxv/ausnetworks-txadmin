--[[
    AusNetworks bridge, client half.

    Pure relay. The NUI asks for data, this forwards the request to the server,
    and the server's reply is pushed back into the NUI. No data is held or
    decided here - the client is not trusted to know who may see what, so every
    permission check happens server-side in sv_ausnet.lua.
]]

RegisterNUICallback('ausnetPlayerData', function(data, cb)
    TriggerServerEvent('txsv:req:ausnet:playerData', data.id, data.citizenid)
    cb({})
end)

RegisterNUICallback('ausnetVehicleStorage', function(data, cb)
    TriggerServerEvent('txsv:req:ausnet:vehicleStorage', data.id, data.vehicleId, data.citizenid)
    cb({})
end)

RegisterNetEvent('txcl:ausnet:playerData', function(payload)
    sendMenuMessage('setAusnetPlayerData', payload)
end)

RegisterNetEvent('txcl:ausnet:vehicleStorage', function(payload)
    sendMenuMessage('setAusnetVehicleStorage', payload)
end)

RegisterNUICallback('ausnetInventoryAction', function(data, cb)
    TriggerServerEvent('txsv:req:ausnet:inventoryAction', data.action, data)
    cb({})
end)

RegisterNetEvent('txcl:ausnet:actionResult', function(payload)
    sendMenuMessage('setAusnetActionResult', payload)
end)
