import { describe, expect, it } from "vitest";
import { buildInvitationEmail } from "@/lib/email/invitation-template";

const build = (overrides: Partial<Parameters<typeof buildInvitationEmail>[0]> = {}) =>
  buildInvitationEmail({
    organisationName: "Camden Council",
    inviteUrl: "https://accesscheck.co.uk/invite/abc123",
    origin: "https://accesscheck.co.uk",
    ...overrides,
  });

describe("invitation email", () => {
  it("names the organisation in the subject and both bodies", () => {
    const message = build();
    expect(message.subject).toBe("Join Camden Council on AccessCheck");
    expect(message.html).toContain("Camden Council");
    expect(message.text).toContain("Camden Council");
  });

  it("carries the invitation link in the button and the fallback, and in the plain text", () => {
    const message = build();
    // Twice in the HTML — the button and the "Click here" fallback.
    expect(message.html.match(/href="https:\/\/accesscheck\.co\.uk\/invite\/abc123"/g)).toHaveLength(2);
    // The fallback reads as a link rather than a pasted URL.
    expect(message.html).toContain(">Click here</a>");
    expect(message.html).not.toContain(">https://accesscheck.co.uk/invite/abc123<");
    expect(message.text).toContain("https://accesscheck.co.uk/invite/abc123");
  });

  it("escapes an organisation name that contains markup", () => {
    const message = build({ organisationName: '<script>alert("x")</script> Homes' });
    expect(message.html).not.toContain("<script>");
    expect(message.html).toContain("&lt;script&gt;");
    // The plain-text part is not markup, so it stays readable.
    expect(message.text).toContain('<script>alert("x")</script> Homes');
  });

  it("points the logo at the deployment it was sent from", () => {
    expect(build({ origin: "https://staging.accesscheck.co.uk/" }).html).toContain(
      'src="https://staging.accesscheck.co.uk/assets/logo/PNG/AcessCheck%20-10.png"',
    );
  });

  it("serves the logo from the public site when sent from a local origin", () => {
    // No mail client can fetch localhost, so the header would arrive empty.
    const message = build({ origin: "http://localhost:3000", inviteUrl: "http://localhost:3000/invite/abc" });
    expect(message.html).toContain('src="https://accesscheck.co.uk/assets/logo/PNG/AcessCheck%20-10.png"');
    // The invitation itself still points at the deployment that sent it.
    expect(message.html).toContain('href="http://localhost:3000/invite/abc"');
  });

  it("states how long the link lasts", () => {
    expect(build().html).toContain("expires in 7 days");
    expect(build({ expiresIn: "48 hours" }).text).toContain("expires in 48 hours");
  });
});
