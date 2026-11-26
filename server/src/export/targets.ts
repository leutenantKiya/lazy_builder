// Stacks a workspace can export its canvas to. The user picks one per workspace
// (workspaces.export_target). `ready` targets have a generator in ./index.ts;
// the rest are listed so the picker shows what's coming.

export type ExportTarget = {
  id: string;
  label: string;
  framework: "react" | "vue" | "svelte" | "astro" | "html";
  styling: "tailwind" | "css";
  ready: boolean;
};

export const EXPORT_TARGETS = [
  { id: "react-vite", label: "React + Vite", framework: "react", styling: "tailwind", ready: true },
  { id: "nextjs", label: "Next.js (App Router)", framework: "react", styling: "tailwind", ready: false },
  { id: "tanstack-start", label: "TanStack Start", framework: "react", styling: "tailwind", ready: false },
  { id: "vue-vite", label: "Vue 3 + Vite", framework: "vue", styling: "tailwind", ready: false },
  { id: "sveltekit", label: "SvelteKit", framework: "svelte", styling: "tailwind", ready: false },
  { id: "astro", label: "Astro", framework: "astro", styling: "tailwind", ready: false },
  { id: "html-tailwind", label: "Plain HTML + Tailwind", framework: "html", styling: "tailwind", ready: false },
] as const satisfies readonly ExportTarget[];

export type ExportTargetId = (typeof EXPORT_TARGETS)[number]["id"];

export const EXPORT_TARGET_IDS = EXPORT_TARGETS.map((t) => t.id) as [ExportTargetId, ...ExportTargetId[]];

export const findTarget = (id: string) => EXPORT_TARGETS.find((t) => t.id === id);
