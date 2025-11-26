// src/controllers/rathausController.ts
import { Request, Response } from "express";
import fetch from "node-fetch";
import { parseStringPromise } from "xml2js";

const EFA_RATHAUS_URL =
    "https://bsvg.efa.de/bsvagstd/XML_DM_REQUEST?locationServerActive=1&type_dm=stop&name_dm=Rathaus&place_dm=Braunschweig&mode=direct&useRealtime=1&ptOptionsActive=1";

type Departure = {
    line: string;
    mode: "tram" | "bus" | "other";
    direction: string;
    plannedTime: string | null;
    countdownMinutes: number | null;
    platform: string | null;
};

export const getRathausDepartures = async (_req: Request, res: Response) => {
    try {
        const response = await fetch(EFA_RATHAUS_URL);
        if (!response.ok) {
            return res
                .status(502)
                .json({ error: `EFA responded with HTTP ${response.status}` });
        }

        const xmlText = await response.text();

        // On parse l’XML en gardant :
        // - les attributs dans .$
        // - tous les nœuds sous forme de tableaux
        const parsed = await parseStringPromise(xmlText, {
            explicitArray: true,
            attrkey: "$",
        });

        const monitorRequest =
            parsed?.itdRequest?.itdDepartureMonitorRequest?.[0] ?? null;

        if (!monitorRequest) {
            return res.status(502).json({
                error: "Unexpected EFA response structure (no itdDepartureMonitorRequest).",
            });
        }

        // 1) Essayer d'abord les vrais départs (itdDepartureList/itdDeparture)
        const departureNodes: any[] =
            monitorRequest?.itdDepartureList?.[0]?.itdDeparture ?? [];

        let departures: Departure[] = [];

        if (departureNodes.length > 0) {
            // Cas où EFA renvoie des départs avec horaires (comme pour Hamburg Rathaus)
            departures = departureNodes.map((dep: any) => {
                const attrs = dep.$ ?? {};
                const dt = dep.itdDateTime?.[0];
                const dDate = dt?.itdDate?.[0]?.$ ?? {};
                const dTime = dt?.itdTime?.[0]?.$ ?? {};

                const year = dDate.year;
                const month = dDate.month;
                const day = dDate.day;
                const hour = dTime.hour;
                const minute = dTime.minute;

                const plannedTime =
                    year && month && day && hour && minute
                        ? `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(
                            2,
                            "0"
                        )}T${String(hour).padStart(2, "0")}:${String(minute).padStart(
                            2,
                            "0"
                        )}:00`
                        : null;

                const lineNode = dep.itdServingLine?.[0]?.$ ?? {};
                const line: string = lineNode.number ?? "?";
                const direction: string = lineNode.direction ?? "";

                const motType: string | undefined = lineNode.motType;
                let mode: Departure["mode"] = "other";
                if (motType === "4") mode = "tram";
                else if (motType === "5") mode = "bus";

                const countdownRaw = attrs.countdown;
                const countdownMinutes =
                    typeof countdownRaw === "string" && countdownRaw.trim() !== ""
                        ? Number(countdownRaw)
                        : null;

                const platform: string | null = attrs.platform ?? null;

                return {
                    line,
                    mode,
                    direction,
                    plannedTime,
                    countdownMinutes: Number.isNaN(countdownMinutes)
                        ? null
                        : countdownMinutes,
                    platform,
                };
            });
        } else {
            // 2) Fallback pour Rathaus Braunschweig :
            //    EFA renvoie uniquement <itdServingLines><itdServingLine ... />
            const servingLines: any[] =
                monitorRequest?.itdServingLines?.[0]?.itdServingLine ?? [];

            departures = servingLines.map((sl: any) => {
                const attrs = sl.$ ?? {};
                const line: string = attrs.number ?? "?";
                const direction: string = attrs.direction ?? "";

                const motType: string | undefined = attrs.motType;
                let mode: Departure["mode"] = "other";
                if (motType === "4") mode = "tram";
                else if (motType === "5") mode = "bus";

                return {
                    line,
                    mode,
                    direction,
                    plannedTime: null,
                    countdownMinutes: null,
                    platform: null,
                };
            });
        }

        const stopName: string | undefined =
            monitorRequest?.itdOdv?.[0]?.itdOdvName?.[0]?.odvNameElem?.[0]?._;

        return res.json({
            stopName: stopName ?? "Rathaus",
            city: "Braunschweig",
            departures,
        });
    } catch (error: any) {
        console.error("Error fetching Rathaus departures:", error);
        return res.status(500).json({
            error: "Failed to fetch departures for Rathaus.",
            details: error?.message,
        });
    }
};
