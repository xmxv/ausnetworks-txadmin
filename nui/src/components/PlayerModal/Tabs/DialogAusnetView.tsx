import React, { useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  DialogContent,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  ContentCopy,
  Inventory2,
  Refresh,
  DirectionsCar,
  AccountBalanceWallet,
} from "@mui/icons-material";
import { useSnackbar } from "notistack";
import { useAssociatedPlayerValue } from "../../../state/playerDetails.state";
import { useNuiEvent } from "../../../hooks/useNuiEvent";
import { fetchNui } from "../../../utils/fetchNui";

/*
 * AusNetworks: player profile tab.
 *
 * Renders whatever the ausnet-admin resource returns, via the bridge in
 * resource/menu/{server,client}/*_ausnet.lua. This component knows nothing
 * about Qbox, ox_inventory or our schema - if the data shape changes, it
 * changes in that resource, not in this fork.
 *
 * The target player id comes from useAssociatedPlayerValue, NOT from
 * playerDetails. playerDetails is the fetched detail response and has no
 * server id on it; reading from it silently yielded undefined and left the
 * tab spinning forever.
 *
 * Sections are driven by what the server chose to send. An admin without
 * ausnet.player_inventory never receives inventory data at all, so hiding it
 * here is presentation - the permission boundary is server-side.
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
  notfound:
    "No character record found for this player. They may not have loaded a character yet.",
  error:
    "Something went wrong reading this player's data. Check the server console.",
  timeout:
    "The server did not respond. ausnet-admin may be stopped, or the player may have disconnected.",
};

const money = (n?: number) =>
  typeof n === "number" ? "$" + n.toLocaleString() : "-";

const SectionTitle: React.FC<{
  children: React.ReactNode;
  icon?: React.ReactNode;
}> = ({ children, icon }) => (
  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mt: 2.5, mb: 1 }}>
    {icon}
    <Typography
      sx={{
        fontSize: 10.5,
        fontWeight: 600,
        letterSpacing: ".2em",
        textTransform: "uppercase",
        color: "#525252",
      }}
    >
      {children}
    </Typography>
  </Box>
);

const Stat: React.FC<{ label: string; value: React.ReactNode }> = ({
  label,
  value,
}) => (
  <Box
    sx={{
      flex: "1 1 120px",
      minWidth: 120,
      p: 1.5,
      borderRadius: "12px",
      border: "1px solid #1f1f1f",
      background:
        "linear-gradient(180deg, rgba(255,255,255,.035), rgba(255,255,255,.012))",
    }}
  >
    <Typography sx={{ fontSize: 12, color: "#8b8b8b" }}>{label}</Typography>
    <Typography
      sx={{
        fontSize: 20,
        fontWeight: 600,
        color: "#fff",
        fontVariantNumeric: "tabular-nums",
        lineHeight: 1.3,
      }}
    >
      {value}
    </Typography>
  </Box>
);

const TH: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <TableCell
    sx={{
      fontSize: 10.5,
      letterSpacing: ".18em",
      textTransform: "uppercase",
      color: "#6b6b6b",
      fontWeight: 600,
      borderBottom: "1px solid #1f1f1f",
      py: 1,
    }}
  >
    {children}
  </TableCell>
);

const DialogAusnetView: React.FC = () => {
  const assocPlayer = useAssociatedPlayerValue();
  const { enqueueSnackbar } = useSnackbar();
  const [data, setData] = useState<any>(null);
  const [storage, setStorage] = useState<any>(null);
  const [pinnedChar, setPinnedChar] = useState<string | undefined>(undefined);
  const timeoutRef = useRef<number | null>(null);

  const serverId = assocPlayer?.id;

  useNuiEvent<any>("setAusnetPlayerData", (payload) => {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    setData(payload);
  });
  useNuiEvent<any>("setAusnetVehicleStorage", setStorage);

  const load = React.useCallback(() => {
    if (serverId === undefined) return;
    setData(null);
    setStorage(null);
    // The bridge is fire-and-forget over a net event, so nothing guarantees a
    // reply. Without this the tab spins forever when the resource is stopped
    // or the player disconnects mid-request.
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(
      () => setData({ error: "timeout" }),
      8000
    );
    fetchNui("ausnetPlayerData", { id: serverId, citizenid: pinnedChar }).catch(() =>
      setData({ error: "error" })
    );
  }, [serverId, pinnedChar]);

  useEffect(() => {
    load();
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, [load]);

  const copy = (label: string, value?: string) => {
    if (!value) return;
    navigator.clipboard?.writeText(value);
    enqueueSnackbar(`${label} copied`, { variant: "success" });
  };

  if (serverId === undefined) {
    return (
      <DialogContent>
        <Typography sx={{ color: "#8b8b8b", pt: 2 }}>
          No player selected.
        </Typography>
      </DialogContent>
    );
  }

  if (!data) {
    return (
      <DialogContent sx={{ display: "flex", justifyContent: "center", pt: 6 }}>
        <CircularProgress size={28} sx={{ color: "#00d2b4" }} />
      </DialogContent>
    );
  }

  if (data.error) {
    return (
      <DialogContent>
        <Typography sx={{ color: "#8b8b8b", pt: 2, mb: 2 }}>
          {ERROR_TEXT[data.error] ?? "Player data unavailable."}
        </Typography>
        <Button
          size="small"
          variant="outlined"
          startIcon={<Refresh />}
          onClick={load}
        >
          Retry
        </Button>
      </DialogContent>
    );
  }

  const eco = data.economy;
  const trust = data.trust;
  const vehicles = data.vehicles ?? [];

  return (
    <DialogContent sx={{ pb: 2 }}>
      {data.failed?.length > 0 && (
        <Box
          sx={{
            mb: 2, p: 1.25, borderRadius: "10px",
            border: "1px solid rgba(255,176,32,.35)",
            background: "rgba(255,176,32,.08)",
          }}
        >
          <Typography sx={{ fontSize: 12.5, color: "#ffb020" }}>
            Could not load: {data.failed.join(", ")}. The rest of this profile
            is still accurate - check the server console for the reason.
          </Typography>
        </Box>
      )}

      {/* Account header. Trust belongs to the account, not one character. */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: 20, fontWeight: 600, color: "#fff", lineHeight: 1.2 }}>
            {data.account?.username ?? assocPlayer.displayName}
          </Typography>
          <Typography sx={{ fontSize: 12, color: "#8b8b8b", fontFamily: "monospace" }}>
            discord:{data.account?.discord || "unknown"}
          </Typography>
        </Box>
        {trust && (
          <Tooltip
            title={
              trust.available
                ? trust.reasons?.join(" · ") || "No flags"
                : "The anticheat has not registered a trust provider"
            }
          >
            <Chip
              size="small"
              label={
                trust.available
                  ? `${trust.level.toUpperCase()}${
                      trust.score != null ? ` · ${trust.score}` : ""
                    }`
                  : "TRUST N/A"
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
          </Tooltip>
        )}
      </Box>

      {/* Character switcher. An account can own several characters; trust and
          identity above are per-account, everything below is per-character. */}
      {data.characters?.length > 0 && (
        <>
          <SectionTitle>
            Characters ({data.characters.length})
          </SectionTitle>
          <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
            {data.characters.map((c: any) => {
              const isSel = c.citizenid === data.selectedCitizenId;
              return (
                <Box
                  key={c.citizenid}
                  onClick={() => setPinnedChar(c.citizenid)}
                  sx={{
                    cursor: "pointer",
                    px: 1.25,
                    py: 0.75,
                    borderRadius: "10px",
                    border: "1px solid",
                    borderColor: isSel ? "rgba(0,210,180,.55)" : "#1f1f1f",
                    background: isSel
                      ? "rgba(0,210,180,.10)"
                      : "rgba(255,255,255,.02)",
                    "&:hover": { borderColor: "#2a2a2a" },
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: 13,
                      color: isSel ? "#fff" : "#d4d4d4",
                      fontWeight: isSel ? 600 : 400,
                      lineHeight: 1.2,
                    }}
                  >
                    {c.name}
                  </Typography>
                  <Typography
                    sx={{ fontSize: 11, color: "#8b8b8b", fontFamily: "monospace" }}
                  >
                    {c.citizenid}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        </>
      )}

      {/* Headline numbers */}
      {eco && (
        <Box sx={{ display: "flex", gap: 1.25, flexWrap: "wrap", mt: 2 }}>
          <Stat label="Cash" value={money(eco.cash)} />
          <Stat label="Bank" value={money(eco.bank)} />
          <Stat label="Net worth" value={money(eco.netWorth)} />
          <Stat label="Vehicles" value={vehicles.length} />
        </Box>
      )}

      {eco && (
        <Typography sx={{ fontSize: 13, color: "#8b8b8b", mt: 1.5 }}>
          {eco.job?.name ?? "Unemployed"}
          {eco.job?.grade ? ` (${eco.job.grade})` : ""}
          {eco.job?.onduty ? " · on duty" : ""}
          {eco.gang?.name && eco.gang.name !== "none" ? ` · gang: ${eco.gang.name}` : ""}
          {eco.flags?.isDead ? " · DEAD" : ""}
          {eco.flags?.jailTime > 0 ? ` · jailed (${eco.flags.jailTime})` : ""}
        </Typography>
      )}

      {/* Vehicles */}
      <SectionTitle icon={<DirectionsCar sx={{ fontSize: 15, color: "#00d2b4" }} />}>
        Vehicles ({vehicles.length})
      </SectionTitle>
      {vehicles.length ? (
        <Table size="small">
          <TableHead>
            <TableRow>
              {["Plate", "Model", "Garage", "State", "Eng", "Body", "Stored"].map((h) => (
                <TH key={h}>{h}</TH>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {vehicles.map((v: any) => (
              <TableRow
                key={v.id}
                hover
                sx={{ cursor: data.perms?.inventory ? "pointer" : "default" }}
                onClick={() => {
                  if (!data.perms?.inventory) return;
                  setStorage(null);
                  fetchNui("ausnetVehicleStorage", {
                    id: serverId,
                    vehicleId: v.id,
                    citizenid: data.selectedCitizenId,
                  }).catch(() => setStorage({ error: "error" }));
                }}
              >
                <TableCell sx={{ fontFamily: "monospace", fontSize: 12.5, color: "#d4d4d4" }}>
                  {v.plate}
                </TableCell>
                <TableCell sx={{ color: "#d4d4d4" }}>{v.model}</TableCell>
                <TableCell sx={{ color: "#d4d4d4" }}>{v.garage}</TableCell>
                <TableCell sx={{ color: "#d4d4d4" }}>{v.state}</TableCell>
                <TableCell sx={{ color: v.enginePct < 40 ? "#ffb020" : "#d4d4d4" }}>
                  {v.enginePct}%
                </TableCell>
                <TableCell sx={{ color: v.bodyPct < 40 ? "#ffb020" : "#d4d4d4" }}>
                  {v.bodyPct}%
                </TableCell>
                <TableCell sx={{ color: "#8b8b8b" }}>
                  {v.gloveboxCount + v.trunkCount}
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
      {vehicles.length > 0 && data.perms?.inventory && !storage && (
        <Typography sx={{ fontSize: 11.5, color: "#5c5c5c", mt: 0.5 }}>
          Select a vehicle to view its glovebox and trunk.
        </Typography>
      )}

      {/* Vehicle storage, on demand */}
      {storage && !storage.error && (
        <>
          <SectionTitle icon={<Inventory2 sx={{ fontSize: 15, color: "#00d2b4" }} />}>
            {storage.plate} · {storage.model}
          </SectionTitle>
          {(["trunk", "glovebox"] as const).map((where) => (
            <Box key={where} sx={{ mb: 1 }}>
              <Typography sx={{ fontSize: 12, color: "#8b8b8b", mb: 0.25, textTransform: "capitalize" }}>
                {where} ({storage[where]?.length ?? 0})
              </Typography>
              <Typography sx={{ fontSize: 13, color: "#d4d4d4" }}>
                {storage[where]?.length
                  ? storage[where].map((i: any) => `${i.label} x${i.count}`).join(", ")
                  : "empty"}
              </Typography>
            </Box>
          ))}
        </>
      )}

      {/* Player inventory */}
      {data.inventory && (
        <>
          <SectionTitle icon={<Inventory2 sx={{ fontSize: 15, color: "#00d2b4" }} />}>
            Inventory ({data.inventory.items?.length ?? 0})
          </SectionTitle>
          <Typography sx={{ fontSize: 13, color: "#d4d4d4" }}>
            {data.inventory.items?.length
              ? data.inventory.items.map((i: any) => `${i.label} x${i.count}`).join(", ")
              : "empty"}
          </Typography>
        </>
      )}

      {/* Bank accounts and recent flow */}
      {eco?.sharedAccounts?.length > 0 && (
        <>
          <SectionTitle icon={<AccountBalanceWallet sx={{ fontSize: 15, color: "#00d2b4" }} />}>
            Shared accounts ({eco.sharedAccounts.length})
          </SectionTitle>
          <Typography sx={{ fontSize: 13, color: "#d4d4d4" }}>
            {eco.sharedAccounts
              .map(
                (a: any) =>
                  `${a.name}: ${money(a.balance)}${a.isOwner ? " (owner)" : ""}${
                    a.isFrozen ? " [frozen]" : ""
                  }`
              )
              .join(" · ")}
          </Typography>
          <Typography sx={{ fontSize: 11.5, color: "#5c5c5c", mt: 0.5 }}>
            Job and business accounts this character can draw from.
          </Typography>
        </>
      )}

      {eco?.recentTransactions?.length > 0 && (
        <>
          <SectionTitle>Recent transactions</SectionTitle>
          <Table size="small">
            <TableBody>
              {eco.recentTransactions.slice(0, 8).map((tx: any, i: number) => (
                <TableRow key={i}>
                  <TableCell sx={{ color: "#8b8b8b", fontSize: 12.5, border: 0, py: 0.4 }}>
                    {tx.description || tx.type}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      border: 0,
                      py: 0.4,
                      fontVariantNumeric: "tabular-nums",
                      color: (tx.amount ?? 0) < 0 ? "#ff4d4f" : "#2ee08a",
                    }}
                  >
                    {money(tx.amount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      )}

      {/* Actions */}
      <Divider sx={{ mt: 2.5, mb: 1.5, borderColor: "#1f1f1f" }} />
      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
        <Button size="small" variant="outlined" startIcon={<Refresh />} onClick={load}>
          Refresh
        </Button>
        <Button
          size="small"
          variant="outlined"
          startIcon={<ContentCopy />}
          onClick={() => copy("CitizenID", data.selectedCitizenId)}
        >
          Copy CitizenID
        </Button>
        <Button
          size="small"
          variant="outlined"
          startIcon={<ContentCopy />}
          onClick={() =>
            copy(
              "Summary",
              [
                `${eco?.name ?? assocPlayer.displayName} (${data.selectedCitizenId})`,
                `Cash ${money(eco?.cash)} · Bank ${money(eco?.bank)}`,
                `Job: ${eco?.job?.name ?? "none"}`,
                `Discord: ${data.account?.discord ?? "unknown"}`,
                `Vehicles: ${vehicles.length}`,
                trust?.available ? `Trust: ${trust.level} ${trust.score ?? ""}` : null,
              ]
                .filter(Boolean)
                .join("\n")
            )
          }
        >
          Copy summary
        </Button>
      </Box>
    </DialogContent>
  );
};

export default DialogAusnetView;
