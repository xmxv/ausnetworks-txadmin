import React, { useEffect, useState } from "react";
import {
  Box,
  Chip,
  CircularProgress,
  DialogContent,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { usePlayerDetailsValue } from "../../../state/playerDetails.state";
import { useNuiEvent } from "../../../hooks/useNuiEvent";
import { fetchNui } from "../../../utils/fetchNui";
import { DialogLoadError } from "./DialogLoadError";

/*
 * AusNetworks: player intelligence tab.
 *
 * Renders whatever the ausnet-admin resource returns, via the bridge in
 * resource/menu/{server,client}/*_ausnet.lua. This component knows nothing
 * about Qbox, ox_inventory or our schema - if the shape of the data changes,
 * it changes in that resource, not in this fork.
 *
 * Sections are driven by what the server chose to send. An admin without
 * ausnet.player_inventory never receives the inventory at all, so hiding it
 * here is presentation, not the security boundary.
 */

type TrustLevel = "trusted" | "neutral" | "watch" | "suspect" | "unknown";

const TRUST_COLOURS: Record<TrustLevel, string> = {
  trusted: "#2ee08a",
  neutral: "#8b8b8b",
  watch: "#ffb020",
  suspect: "#ff4d4f",
  unknown: "#5c5c5c",
};

const ERROR_TEXT: Record<string, string> = {
  noperm: "You do not have permission to view this player's data.",
  unavailable:
    "The ausnet-admin resource is not running, so player data is unavailable.",
  notfound: "No character record found for this player.",
  error: "Something went wrong reading this player's data. Check the server console.",
};

const money = (n?: number) =>
  typeof n === "number" ? "$" + n.toLocaleString() : "-";

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Typography
    sx={{
      fontSize: 10.5,
      fontWeight: 600,
      letterSpacing: ".2em",
      textTransform: "uppercase",
      color: "#525252",
      mt: 2.5,
      mb: 0.75,
    }}
  >
    {children}
  </Typography>
);

const Stat: React.FC<{ label: string; value: React.ReactNode }> = ({
  label,
  value,
}) => (
  <Box sx={{ minWidth: 110 }}>
    <Typography sx={{ fontSize: 12, color: "#8b8b8b" }}>{label}</Typography>
    <Typography
      sx={{
        fontSize: 18,
        fontWeight: 600,
        color: "#fff",
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {value}
    </Typography>
  </Box>
);

const DialogAusnetView: React.FC = () => {
  const playerDetails = usePlayerDetailsValue();
  const [data, setData] = useState<any>(null);
  const [storage, setStorage] = useState<any>(null);

  const serverId =
    "player" in playerDetails ? playerDetails.player?.id : undefined;

  useNuiEvent<any>("setAusnetPlayerData", setData);
  useNuiEvent<any>("setAusnetVehicleStorage", setStorage);

  useEffect(() => {
    if (serverId === undefined) return;
    setData(null);
    setStorage(null);
    fetchNui("ausnetPlayerData", { id: serverId }).catch(() => {
      setData({ error: "error" });
    });
  }, [serverId]);

  if ("error" in playerDetails) return <DialogLoadError />;

  if (!data) {
    return (
      <DialogContent
        sx={{ display: "flex", justifyContent: "center", pt: 6 }}
      >
        <CircularProgress size={28} sx={{ color: "#00d2b4" }} />
      </DialogContent>
    );
  }

  if (data.error) {
    return (
      <DialogContent>
        <Typography sx={{ color: "#8b8b8b", pt: 2 }}>
          {ERROR_TEXT[data.error] ?? "Player data unavailable."}
        </Typography>
      </DialogContent>
    );
  }

  const eco = data.economy;
  const trust = data.trust;

  return (
    <DialogContent sx={{ pb: 3 }}>
      {trust && (
        <>
          <SectionTitle>Trust</SectionTitle>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Chip
              size="small"
              label={
                trust.available
                  ? `${trust.level.toUpperCase()}${
                      trust.score !== null && trust.score !== undefined
                        ? ` · ${trust.score}`
                        : ""
                    }`
                  : "NO PROVIDER"
              }
              sx={{
                color: TRUST_COLOURS[trust.level as TrustLevel] ?? "#8b8b8b",
                borderColor: TRUST_COLOURS[trust.level as TrustLevel] ?? "#2a2a2a",
                background: "rgba(255,255,255,.03)",
                border: "1px solid",
                fontWeight: 600,
                fontSize: 11.5,
              }}
            />
            <Typography sx={{ fontSize: 12.5, color: "#8b8b8b" }}>
              {trust.available
                ? trust.reasons?.join(" · ") || "No flags"
                : "The anticheat has not registered a trust provider."}
            </Typography>
          </Box>
        </>
      )}

      {eco && (
        <>
          <SectionTitle>Economy</SectionTitle>
          <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
            <Stat label="Cash" value={money(eco.cash)} />
            <Stat label="Bank" value={money(eco.bank)} />
            <Stat label="Net worth" value={money(eco.netWorth)} />
            {eco.crypto > 0 && <Stat label="Crypto" value={eco.crypto} />}
          </Box>
          <Typography sx={{ fontSize: 12.5, color: "#8b8b8b", mt: 1 }}>
            {eco.name} · {eco.job?.name ?? "Unemployed"}
            {eco.job?.grade ? ` (${eco.job.grade})` : ""}
            {eco.job?.onduty ? " · on duty" : ""}
            {eco.gang?.name && eco.gang.name !== "none"
              ? ` · gang: ${eco.gang.name}`
              : ""}
          </Typography>
        </>
      )}

      <SectionTitle>Vehicles ({data.vehicles?.length ?? 0})</SectionTitle>
      {data.vehicles?.length ? (
        <Table size="small">
          <TableHead>
            <TableRow>
              {["Plate", "Model", "Garage", "State", "Engine", "Body", "Storage"].map(
                (h) => (
                  <TableCell
                    key={h}
                    sx={{
                      fontSize: 10.5,
                      letterSpacing: ".18em",
                      textTransform: "uppercase",
                      color: "#6b6b6b",
                      borderBottom: "1px solid #1f1f1f",
                    }}
                  >
                    {h}
                  </TableCell>
                )
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {data.vehicles.map((v: any) => (
              <TableRow
                key={v.id}
                hover
                sx={{
                  cursor: data.perms?.inventory ? "pointer" : "default",
                }}
                onClick={() => {
                  if (!data.perms?.inventory || serverId === undefined) return;
                  setStorage({ loading: true, id: v.id });
                  fetchNui("ausnetVehicleStorage", {
                    id: serverId,
                    vehicleId: v.id,
                  }).catch(() => setStorage({ error: "error" }));
                }}
              >
                <TableCell sx={{ fontFamily: "monospace", fontSize: 12.5, color: "#d4d4d4" }}>
                  {v.plate}
                </TableCell>
                <TableCell sx={{ color: "#d4d4d4" }}>{v.model}</TableCell>
                <TableCell sx={{ color: "#d4d4d4" }}>{v.garage}</TableCell>
                <TableCell sx={{ color: "#d4d4d4" }}>{v.state}</TableCell>
                <TableCell sx={{ color: "#d4d4d4" }}>{v.enginePct}%</TableCell>
                <TableCell sx={{ color: "#d4d4d4" }}>{v.bodyPct}%</TableCell>
                <TableCell sx={{ color: "#8b8b8b" }}>
                  {v.gloveboxCount + v.trunkCount} items
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <Typography sx={{ fontSize: 13, color: "#8b8b8b" }}>
          This player owns no vehicles.
        </Typography>
      )}

      {storage && !storage.loading && !storage.error && (
        <>
          <SectionTitle>
            {storage.plate} contents
          </SectionTitle>
          {["trunk", "glovebox"].map((where) => (
            <Box key={where} sx={{ mb: 1 }}>
              <Typography sx={{ fontSize: 12, color: "#8b8b8b", mb: 0.5 }}>
                {where} ({storage[where]?.length ?? 0})
              </Typography>
              <Typography sx={{ fontSize: 13, color: "#d4d4d4" }}>
                {storage[where]?.length
                  ? storage[where]
                      .map((i: any) => `${i.label} x${i.count}`)
                      .join(", ")
                  : "empty"}
              </Typography>
            </Box>
          ))}
        </>
      )}

      {data.inventory && (
        <>
          <Divider sx={{ mt: 2, borderColor: "#1f1f1f" }} />
          <SectionTitle>
            Inventory ({data.inventory.items?.length ?? 0})
          </SectionTitle>
          <Typography sx={{ fontSize: 13, color: "#d4d4d4" }}>
            {data.inventory.items?.length
              ? data.inventory.items
                  .map((i: any) => `${i.label} x${i.count}`)
                  .join(", ")
              : "empty"}
          </Typography>
          <Typography sx={{ fontSize: 11.5, color: "#5c5c5c", mt: 0.5 }}>
            source: {data.inventory.source}
          </Typography>
        </>
      )}
    </DialogContent>
  );
};

export default DialogAusnetView;
