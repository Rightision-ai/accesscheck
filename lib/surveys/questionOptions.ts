/**
 * The answer options the validation screen offers for each question, in display order.
 *
 * These were the coefficient tables of the retired accessibility scorer that graded a property
 * A+/A-/B+/B-/C. Only the option labels were ever read from them, and the weights went with the
 * scorer: the Accessible Housing Rules band (`lib/accessibility/lahr`) is the only rating the
 * product produces.
 */
export const QUESTION_OPTIONS = {
  Q1: [
    "Use a one-handed aid",
    "Unable to leave bed",
    "Use a two-handed aid",
    "Personal assistance needed",
    "Independent wheelchair user",
    "Wheelchair with assistance",
  ],
  Q2: [
    "Straight stairs, one handrail",
    "Straight stairs, both handrails",
    "Staircase that turns",
    "All on one level",
  ],
  Q3: [
    "Few steps",
    "Steady slope",
    "Steep slope",
    "No steps, flat",
  ],
  Q4: [
    "Steps to garden",
    "Steep slope",
    "Steady slope",
    "No steps, flat",
  ],
  Q5: [
    "Less than 76 cm",
    "More than 76 cm",
  ],
  Q6: [
    "Bathe at sink, need help",
    "Need help at all times",
    "Need help to bathe",
    "Use device",
    "Sometimes need help",
    "Can bathe myself",
  ],
  Q7: [
    "Less than 73 cm",
    "73–90 cm",
    "Over 90 cm",
  ],
  Q8: [
    "Shower, no steps",
    "Shower cubicle with step",
    "Shower over bath",
    "Bath only, no shower",
  ],
  Q9: [
    "<900×900 mm",
    "900×900–1200×1200 mm",
    ">1200×1200 mm",
  ],
  Q10: [
    "Need help at all times",
    "Need help with hygiene",
    "Sometimes need help",
    "Use independently",
  ],
  Q11: [
    "No wash/dry toilet",
    "Have wash/dry toilet",
  ],
} satisfies Record<string, readonly string[]>;
