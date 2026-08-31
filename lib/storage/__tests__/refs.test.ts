import { describe, expect, it } from "vitest";
import {
  collectStorageRefs,
  mapStorageRefsDeep,
  normaliseStorageRefsDeep,
  parseStorageRef,
  toStoragePath,
  toStorageRef,
} from "@/lib/storage/refs";

const PROJECT = "https://abcdefgh.supabase.co";
const PUBLIC_URL = `${PROJECT}/storage/v1/object/public/evidences/wizard/1756-k3f9x.jpg`;
const SIGNED_URL = `${PROJECT}/storage/v1/object/sign/evidences/wizard/1756-k3f9x.jpg?token=eyJhbGc`;
const REF = "storage://evidences/wizard/1756-k3f9x.jpg";

describe("parseStorageRef", () => {
  it("accepts the canonical storage:// reference", () => {
    expect(parseStorageRef(REF)).toEqual({ bucket: "evidences", path: "wizard/1756-k3f9x.jpg" });
  });

  it("accepts a legacy public URL from when the bucket was public", () => {
    expect(parseStorageRef(PUBLIC_URL)).toEqual({ bucket: "evidences", path: "wizard/1756-k3f9x.jpg" });
  });

  it("accepts a signed URL, so one that leaked into state normalises back", () => {
    expect(parseStorageRef(SIGNED_URL)).toEqual({ bucket: "evidences", path: "wizard/1756-k3f9x.jpg" });
  });

  it("recognises every bucket a reference may point at", () => {
    expect(parseStorageRef(`${PROJECT}/storage/v1/object/public/floor-plan-detections/s/a.jpg`))
      .toEqual({ bucket: "floor-plan-detections", path: "s/a.jpg" });
    expect(parseStorageRef(`${PROJECT}/storage/v1/object/public/branding/avatars/u/1.jpg`))
      .toEqual({ bucket: "branding", path: "avatars/u/1.jpg" });
  });

  it("decodes percent-encoding, which storage does not want", () => {
    expect(parseStorageRef(`${PROJECT}/storage/v1/object/public/evidences/survey/a%20b.jpg`)?.path)
      .toBe("survey/a b.jpg");
  });

  it("ignores anything that is not one of our objects", () => {
    expect(parseStorageRef("data:image/jpeg;base64,/9j/4AAQ")).toBeNull();
    expect(parseStorageRef("https://publicaccess.council.gov.uk/doc/plan.pdf")).toBeNull();
    expect(parseStorageRef(`${PROJECT}/storage/v1/object/public/other-bucket/a.jpg`)).toBeNull();
    expect(parseStorageRef("")).toBeNull();
    expect(parseStorageRef(null)).toBeNull();
    expect(parseStorageRef(42)).toBeNull();
    expect(parseStorageRef("storage://evidences")).toBeNull();
    expect(parseStorageRef("storage://evidences/")).toBeNull();
  });
});

describe("toStoragePath", () => {
  it("only matches the bucket it is asked about", () => {
    expect(toStoragePath(PUBLIC_URL, "evidences")).toBe("wizard/1756-k3f9x.jpg");
    expect(toStoragePath(PUBLIC_URL, "branding")).toBeNull();
    expect(toStoragePath("not a url", "evidences")).toBeNull();
  });
});

describe("normaliseStorageRefsDeep", () => {
  const tree = {
    thumbnail: PUBLIC_URL,
    wizardData: {
      categoryPhotos: { entrance: [SIGNED_URL], kitchen: [] },
      floorPlan: `${PROJECT}/storage/v1/object/public/evidences/survey/12/plan.pdf`,
      streetViewUrl: "https://maps.googleapis.com/streetview?loc=1,2",
      note: "no url here",
    },
    floorPlanDetection: {
      annotated_image_url: `${PROJECT}/storage/v1/object/public/floor-plan-detections/survey/12/a.jpg`,
    },
    count: 3,
    missing: null,
  };

  it("rewrites every shape to a canonical ref, however deeply nested", () => {
    const out = normaliseStorageRefsDeep(tree);
    expect(out.thumbnail).toBe(REF);
    expect(out.wizardData.categoryPhotos.entrance[0]).toBe(REF);
    expect(out.wizardData.floorPlan).toBe("storage://evidences/survey/12/plan.pdf");
    expect(out.floorPlanDetection.annotated_image_url)
      .toBe("storage://floor-plan-detections/survey/12/a.jpg");
  });

  it("leaves third-party URLs, plain strings and non-strings alone", () => {
    const out = normaliseStorageRefsDeep(tree);
    expect(out.wizardData.streetViewUrl).toBe(tree.wizardData.streetViewUrl);
    expect(out.wizardData.note).toBe("no url here");
    expect(out.count).toBe(3);
    expect(out.missing).toBeNull();
    expect(out.wizardData.categoryPhotos.kitchen).toEqual([]);
  });

  it("is idempotent — re-saving an already-normalised row is a no-op", () => {
    const once = normaliseStorageRefsDeep(tree);
    expect(normaliseStorageRefsDeep(once)).toEqual(once);
  });

  it("does not mutate the input", () => {
    normaliseStorageRefsDeep(tree);
    expect(tree.thumbnail).toBe(PUBLIC_URL);
  });
});

describe("collectStorageRefs", () => {
  it("deduplicates, so one photo used twice is signed once", () => {
    expect(collectStorageRefs({ a: PUBLIC_URL, b: [PUBLIC_URL, REF] })).toEqual([PUBLIC_URL, REF]);
  });

  it("returns nothing for a tree with no storage references", () => {
    expect(collectStorageRefs({ a: "hello", b: [1, 2], c: null })).toEqual([]);
  });
});

describe("mapStorageRefsDeep", () => {
  it("keeps the original when the mapper returns undefined", () => {
    expect(mapStorageRefsDeep({ a: PUBLIC_URL }, () => undefined).a).toBe(PUBLIC_URL);
  });

  it("substitutes what the mapper returns, including an empty string", () => {
    expect(mapStorageRefsDeep({ a: PUBLIC_URL }, () => "").a).toBe("");
  });
});

describe("toStorageRef", () => {
  it("round-trips through parseStorageRef", () => {
    const ref = toStorageRef("evidences", "org/12/photo.jpg");
    expect(parseStorageRef(ref)).toEqual({ bucket: "evidences", path: "org/12/photo.jpg" });
  });
});
