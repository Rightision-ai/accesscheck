export type AccessibilityGrade = "A+" | "A-" | "B+" | "B-" | "C";

export type StepBucket = "step_free" | "le_three" | "gt_four";

export interface AccessibilityInput {
  isApartment: boolean;
  isGroundLevel: boolean;
  hasElevator: boolean;
  entranceSteps: StepBucket;
  interiorSteps: StepBucket;
  hasOnlyBathtub: boolean;
  bathtubSuitsWheelchair: boolean;
  stepFreeShower: boolean;
  slipperyFloor: boolean;
}

export interface AccessibilityResult {
  grade: AccessibilityGrade;
  label: string;
  description: string;
  color: string;
  reasons: string[];
}

export const LEGEND: Record<
  AccessibilityGrade,
  { label: string; description: string; color: string }
> = {
  "A+": {
    label: "Wheelchair Accessible",
    description: "Home suitable for wheelchair",
    color: "#059669",
  },
  "A-": {
    label: "Wheel/Walker Adaptable",
    description: "Not suitable for wheelchair",
    color: "#10b981",
  },
  "B+": {
    label: "Cane/Walker Accessible",
    description: "Suitable for people with a cane or walker",
    color: "#f59e0b",
  },
  "B-": {
    label: "Cane/Walker Adaptable",
    description: "Requiring simple modifications (like adding ramps)",
    color: "#ea580c",
  },
  C: {
    label: "Not Accessible",
    description: "Homes unsuitable for any mobility-challenged individual",
    color: "#dc2626",
  },
};

function result(
  grade: AccessibilityGrade,
  reasons: string[],
): AccessibilityResult {
  return { grade, ...LEGEND[grade], reasons };
}

export function bucketSteps(count: number | null | undefined): StepBucket {
  if (count === null || count === undefined || count <= 0) return "step_free";
  if (count <= 3) return "le_three";
  return "gt_four";
}

export function classifyAccessibility(
  i: AccessibilityInput,
): AccessibilityResult {
  if (i.isApartment && !i.isGroundLevel && !i.hasElevator) {
    return result("C", ["Upper-floor apartment with no elevator"]);
  }

  if (i.entranceSteps === "gt_four") {
    return result("C", ["More than four steps at the entrance"]);
  }

  if (i.interiorSteps === "gt_four") {
    return result("C", ["More than four interior steps"]);
  }

  if (i.entranceSteps === "le_three" || i.interiorSteps === "le_three") {
    const reasons: string[] = [];
    if (i.entranceSteps === "le_three") reasons.push("1–3 entrance steps");
    if (i.interiorSteps === "le_three") reasons.push("1–3 interior steps");
    return result("B-", reasons);
  }

  // Entrance + interior are step-free — evaluate bathroom.
  if (i.hasOnlyBathtub) {
    if (i.bathtubSuitsWheelchair) {
      return i.slipperyFloor
        ? result("A-", ["Wheelchair-suitable bathtub with slippery floor"])
        : result("A+", [
            "Step-free entrance and interior",
            "Wheelchair-suitable bathtub",
          ]);
    }
    return i.slipperyFloor
      ? result("B-", ["Bathtub not wheelchair-suitable and slippery floor"])
      : result("A-", ["Bathtub not suitable for wheelchair"]);
  }

  if (i.stepFreeShower) {
    return i.slipperyFloor
      ? result("A-", ["Step-free shower with slippery floor"])
      : result("A+", [
          "Step-free entrance and interior",
          "Step-free shower",
        ]);
  }

  return result("B-", ["Shower has a step"]);
}

export function gradeToScore(grade: AccessibilityGrade): number {
  switch (grade) {
    case "A+":
      return 97;
    case "A-":
      return 90;
    case "B+":
      return 80;
    case "B-":
      return 67;
    case "C":
      return 30;
  }
}
