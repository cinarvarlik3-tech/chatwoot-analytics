/**
 * Shared horizontal layout classes for dashboard views inside AppShell.
 * Uses full available width (viewport minus sidebar) with responsive padding.
 */

export const dashboardSectionClass =
  "w-full px-4 sm:px-5 lg:px-6 xl:px-8";

export const dashboardHeaderClass = `${dashboardSectionClass} flex items-center justify-between gap-4 py-4`;

export const dashboardFilterChipsClass = `${dashboardSectionClass} flex flex-wrap items-center gap-2 py-3`;

export const dashboardMainClass = `${dashboardSectionClass} space-y-6 py-5 sm:space-y-8 sm:py-6`;
