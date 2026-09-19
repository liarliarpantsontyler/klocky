export interface EntitlementService {
  canUse(item: { premium: boolean }): boolean;
  tier: "preview" | "free" | "pro";
}
// Replace this service when a paid release is introduced. No purchase flow in V1.
export const entitlements: EntitlementService = {
  tier: "preview",
  canUse: () => true,
};
