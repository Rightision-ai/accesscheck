const norm = (value: unknown): string =>
  String(value ?? "")
    .trim()
    .toLowerCase();

export const normalizePropertyType = (value: unknown): string | null => {
  const v = norm(value);
  if (!v) return null;
  if (v.includes("bungalow")) return "Bungalow";
  if (v.includes("maisonette")) return "Maisonette";
  if (v.includes("flat") || v.includes("apartment")) return "Flat";
  if (v.includes("house")) return "House";
  return null;
};

export const normalizeEntranceLevel = (value: unknown): string | null => {
  const v = norm(value);
  if (!v) return null;
  if (v === "ground" || v === "ground floor" || v === "gf") return "Ground Floor";
  if (v === "upper" || v === "upper floor" || v === "first floor")
    return "Upper Floor";
  if (v.includes("basement") || v === "lower ground") return "Basement";
  return null;
};

/**
 * Map an EPC `dwelling_type` string (e.g. "Ground-floor flat", "Top-floor flat",
 * "Detached house") to the wizard's exact entrance-level option labels. Houses /
 * bungalows enter at grade, so they map to "Ground Floor". Returns null when unknown.
 */
export const normalizeEntranceLevelFromDwelling = (
  value: unknown,
): string | null => {
  const v = norm(value);
  if (!v) return null;
  if (v.includes("basement") || v.includes("lower ground")) return "Basement";
  if (v.includes("ground")) return "Ground Floor";
  if (
    v.includes("mid-floor") ||
    v.includes("mid floor") ||
    v.includes("top-floor") ||
    v.includes("top floor") ||
    v.includes("upper") ||
    v.includes("first floor") ||
    /\b\d+(st|nd|rd|th)\b/.test(v)
  )
    return "Upper Floor";
  if (
    v.includes("house") ||
    v.includes("bungalow") ||
    v.includes("detached") ||
    v.includes("semi") ||
    v.includes("terrace")
  )
    return "Ground Floor";
  return null;
};

/**
 * Best-effort parse of a comma-joined address string (as returned by the EPC API),
 * e.g. "12, Baker Street, London" → { doorNo: "12", street: "Baker Street" }.
 * A leading part that is a building name (no leading number) is returned as buildingName.
 */
export const parseAddressString = (
  address: unknown,
): { doorNo?: string; street?: string; buildingName?: string } => {
  const raw = String(address ?? "").trim();
  if (!raw) return {};
  const parts = raw
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return {};

  const out: { doorNo?: string; street?: string; buildingName?: string } = {};
  const first = parts[0];
  // Leading "12" or "12A" → door number; the next part is the street.
  const doorMatch = first.match(/^(\d+[a-z]?)$/i);
  const inlineMatch = first.match(/^(\d+[a-z]?)\s+(.*)$/i);
  if (doorMatch) {
    out.doorNo = doorMatch[1];
    if (parts[1]) out.street = parts[1];
  } else if (inlineMatch) {
    // "12 Baker Street" all in the first part.
    out.doorNo = inlineMatch[1];
    out.street = inlineMatch[2];
  } else {
    // No leading number → treat the first part as a building/flat name, second as street.
    out.buildingName = first;
    if (parts[1]) out.street = parts[1];
  }
  return out;
};

export const normalizeStairGeometry = (value: unknown): string | null => {
  const v = norm(value);
  if (!v) return null;
  if (v.includes("quarter")) return "Quarter Turn";
  if (v.includes("half")) return "Half Turn";
  if (v.includes("spiral")) return "Spiral";
  if (v.includes("winding")) return "Winding";
  if (v.includes("straight")) return "Straight";
  return null;
};

export const normalizeHandrailSide = (value: unknown): string | null => {
  const v = norm(value);
  if (!v) return null;
  if (v.includes("both")) return "Both Sides";
  if (v.includes("left")) return "Left Side";
  if (v.includes("right")) return "Right Side";
  if (v.includes("none") || v.includes("no")) return "None";
  return null;
};

export const normalizeBathingType = (value: unknown): string | null => {
  const v = norm(value);
  if (!v) return null;
  if (v.includes("level access")) return "Level Access Shower";
  if (v.includes("cubicle")) return "Shower Cubicle";
  if (v.includes("over-bath") || v.includes("over bath")) return "Over-Bath Shower";
  if (v.includes("bath only")) return "Bath Only";
  if (v.includes("bath") && !v.includes("shower")) return "Bath Only";
  return null;
};

export const normalizeToiletType = (value: unknown): string | null => {
  const v = norm(value);
  if (!v) return null;
  if (v.includes("wash") && v.includes("dry")) return "Wash/Dry (Smart)";
  if (v.includes("raised")) return "Raised Height";
  if (v.includes("standard")) return "Standard";
  return null;
};

export const normalizeSecondExitLocation = (value: unknown): string | null => {
  if (value === true || value === "Y" || value === "Yes") return "Public Way / Street";
  if (value === false || value === "N" || value === "No") return "Enclosed Garden";
  const v = norm(value);
  if (!v) return null;
  if (v.includes("street") || v.includes("public")) return "Public Way / Street";
  if (v.includes("garden") || v.includes("enclosed")) return "Enclosed Garden";
  return null;
};

export const normalizeCommunalLiftOption = (
  hasLift: unknown,
  liftType?: unknown,
): string | null => {
  const source = norm(hasLift);
  if (source.includes("yes") && source.includes("platform")) return "Yes - Platform";
  if (
    (source.includes("yes") && source.includes("passenger")) ||
    (source.includes("yes") && source.includes("passanger"))
  ) {
    return "Yes - Passenger";
  }
  if (source.includes("platform")) return "Yes - Platform";
  if (source.includes("passenger") || source.includes("passanger"))
    return "Yes - Passenger";
  if (source === "no" || source === "n" || source === "false") return "No";
  if (hasLift === false || hasLift === "N" || hasLift === "No") return "No";
  const t = norm(liftType);
  if (t.includes("platform")) return "Yes - Platform";
  if (t.includes("none")) return "No";
  if (hasLift === true || hasLift === "Y" || hasLift === "Yes") {
    return "Yes - Passenger";
  }
  return null;
};

export const normalizeInternalLiftOption = (input: {
  throughFloorLift?: unknown;
  stairLift?: unknown;
  internalLiftRaw?: unknown;
}): string => {
  const fromRaw = norm(input.internalLiftRaw);
  if (fromRaw.includes("through")) return "Through-Floor Lift";
  if (fromRaw.includes("stairlift") || fromRaw.includes("stair lift")) {
    return "Stairlift";
  }
  if (input.throughFloorLift === true) return "Through-Floor Lift";
  if (input.stairLift === true) return "Stairlift";
  return "None";
};

export const deriveBathroomLocation = (params: {
  accessFacilities?: string[];
  aboveFacilities?: string[];
  belowFacilities?: string[];
  floorLevelNumber?: unknown;
}): string | null => {
  const hasBathToken = (arr: string[] = []) =>
    arr.some((x) => {
      const v = norm(x);
      return v.includes("bathroom") || v.includes("bath");
    });

  const accessHas = hasBathToken(params.accessFacilities);
  const aboveHas = hasBathToken(params.aboveFacilities);
  const belowHas = hasBathToken(params.belowFacilities);
  const floor = Number(params.floorLevelNumber ?? 1);

  if (accessHas && (aboveHas || belowHas)) return "Split Level";
  if (accessHas) return "Ground Floor";
  if (aboveHas) return floor >= 2 ? "Second Floor+" : "First Floor";
  if (belowHas) return "Split Level";
  return null;
};

export const normalizeBathroomLocation = (value: unknown): string | null => {
  const v = norm(value);
  if (!v) return null;
  if (v.includes("split")) return "Split Level";
  if (v.includes("second")) return "Second Floor+";
  if (v.includes("first") || v.includes("upper")) return "First Floor";
  if (v.includes("ground")) return "Ground Floor";
  return null;
};

