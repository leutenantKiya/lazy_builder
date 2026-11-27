import { strToU8, zipSync } from "fflate";
import type { ExportInput, ExportResult, FileMap } from "./ir.ts";
import { generateReactVite, slugify } from "./react-vite/generate.ts";
import type { ExportTargetId } from "./targets.ts";

const GENERATORS: Partial<Record<ExportTargetId, (input: ExportInput) => ExportResult>> = {
  "react-vite": generateReactVite,
};

export const generatorFor = (target: string) => GENERATORS[target as ExportTargetId];

// files go under one top-level folder so unzipping doesn't spill into cwd
export function zipProject(projectName: string, files: FileMap): { filename: string; bytes: Uint8Array<ArrayBuffer> } {
  const root = slugify(projectName);
  const entries = Object.fromEntries(Object.entries(files).map(([path, text]) => [`${root}/${path}`, strToU8(text)]));
  // fflate always allocates a plain ArrayBuffer
  return { filename: `${root}.zip`, bytes: zipSync(entries, { level: 6 }) as Uint8Array<ArrayBuffer> };
}
