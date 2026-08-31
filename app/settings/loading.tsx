import { SkeletonCard } from "@/app/components/property-check/ui";

/**
 * The settings layout (heading + tab bar) stays mounted while this renders, so
 * the tab you clicked is already highlighted as its page loads.
 */
export default function SettingsLoading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading settings">
      <SkeletonCard lines={6} />
      <SkeletonCard lines={3} />
    </div>
  );
}
