import { describe, expect, it } from "vitest";
import { isValidEmail, isValidPhone, normalisePhone, sanitisePhoneInput } from "@/lib/utils/phone";

describe("normalisePhone", () => {
  it("strips the formatting a user is invited to type", () => {
    expect(normalisePhone("+44 (0) 20-7946.0958")).toBe("+4402079460958");
    expect(normalisePhone("07123 456789")).toBe("07123456789");
  });
});

describe("sanitisePhoneInput", () => {
  it("drops letters and stray symbols", () => {
    expect(sanitisePhoneInput("07123abc456789!")).toBe("07123456789");
  });

  it("keeps a leading plus but no others", () => {
    expect(sanitisePhoneInput("+44 7123 456789")).toBe("+44 7123 456789");
    expect(sanitisePhoneInput("+44+7123")).toBe("+447123");
    expect(sanitisePhoneInput("07123+456")).toBe("07123456");
  });
});

describe("isValidPhone", () => {
  it("treats an empty value as valid — phone is optional", () => {
    expect(isValidPhone("")).toBe(true);
    expect(isValidPhone("   ")).toBe(true);
    expect(isValidPhone(null)).toBe(true);
    expect(isValidPhone(undefined)).toBe(true);
  });

  it("accepts UK numbers in the formats we suggest", () => {
    expect(isValidPhone("07123 456789")).toBe(true);
    expect(isValidPhone("020 7946 0958")).toBe(true);
    expect(isValidPhone("+44 7123 456789")).toBe(true);
    expect(isValidPhone("+44 (0) 20 7946 0958")).toBe(true);
  });

  it("rejects numbers that are too short, too long or malformed", () => {
    expect(isValidPhone("12345")).toBe(false);
    expect(isValidPhone("071234567890123")).toBe(false);
    expect(isValidPhone("+0123456789")).toBe(false);
    expect(isValidPhone("7123 456789")).toBe(false); // no leading 0 or +
    expect(isValidPhone("not a number")).toBe(false);
  });
});

describe("isValidEmail", () => {
  it("treats an empty value as valid — contact email is optional", () => {
    expect(isValidEmail("")).toBe(true);
    expect(isValidEmail(null)).toBe(true);
  });

  it("accepts an ordinary address and rejects obvious rubbish", () => {
    expect(isValidEmail("info@council.gov.uk")).toBe(true);
    expect(isValidEmail("info@council")).toBe(false);
    expect(isValidEmail("council.gov.uk")).toBe(false);
    expect(isValidEmail("a b@council.gov.uk")).toBe(false);
  });
});
