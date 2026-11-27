import { describe, expect, test } from "bun:test";
import { strFromU8, unzipSync } from "fflate";
import { zipProject } from "../index.ts";
import { generateReactVite, slugify } from "./generate.ts";
import type { CanvasNode } from "../ir.ts";
import { KITCHEN_SINK } from "./fixtures.ts";

describe("generateReactVite", () => {
  const { files, skipped } = generateReactVite({ projectName: "My Landing!", nodes: KITCHEN_SINK });

  test("emits the project scaffold", () => {
    for (const f of ["package.json", "vite.config.ts", "tsconfig.json", "index.html", "src/main.tsx", "src/App.tsx", "src/index.css"]) {
      expect(files[f]).toBeDefined();
    }
    expect(JSON.parse(files["package.json"]!).name).toBe("my-landing");
  });

  test("emits a ui component only for primitives that are used", () => {
    const ui = Object.keys(files).filter((f) => f.startsWith("src/components/ui/")).sort();
    expect(ui).toEqual(
      ["Badge", "Box", "Button", "Card", "Divider", "Frame", "ImagePlaceholder", "Input", "Text", "Toggle"].map(
        (n) => `src/components/ui/${n}.tsx`,
      ),
    );
    const sparse = generateReactVite({ projectName: "x", nodes: [KITCHEN_SINK[3]!] }).files;
    expect(Object.keys(sparse).filter((f) => f.includes("/ui/"))).toEqual(["src/components/ui/Button.tsx"]);
  });

  test("groups become components, named from their label, nested ones imported by the parent", () => {
    expect(files["src/components/HeroSection.tsx"]).toContain("import Group1 from './Group1';");
    expect(files["src/components/HeroSection.tsx"]).toContain("/** Landing hero */");
    expect(files["src/components/Group1.tsx"]).toContain("<Toggle defaultOn={true} />");
    expect(files["src/App.tsx"]).toContain("import HeroSection from './components/HeroSection';");
    expect(files["src/App.tsx"]).not.toContain("Group1");
  });

  test("uses the page frame as the origin, no normalisation", () => {
    expect(skipped).toBe(0);
    expect(files["src/App.tsx"]).toContain("left: 40, top: 40, width: 360, height: 220");
    expect(files["src/App.tsx"]).toContain('className="relative mx-auto overflow-hidden" style={{ width: 1440, minHeight: 810 }}');
  });

  const at = (id: string, x: number, y: number, w = 100, h = 50): CanvasNode => ({ id, type: "box", x, y, width: w, height: h, props: {} });

  test("fully outside top-level nodes are skipped and counted", () => {
    const r = generateReactVite({
      projectName: "x",
      nodes: [at("in", 10, 10), at("left", -200, 10), at("right", 1440, 10), at("above", 10, -60), at("edge", -100, 10)],
    });
    expect(r.skipped).toBe(4);
    expect((r.files["src/App.tsx"]!.match(/<Box \/>/g) ?? []).length).toBe(1);
  });

  test("partly outside nodes are kept (clipped by the frame)", () => {
    const r = generateReactVite({ projectName: "x", nodes: [at("l", -50, 10), at("r", 1400, 10), at("t", 10, -20)] });
    expect(r.skipped).toBe(0);
    expect(r.files["src/App.tsx"]).toContain("left: -50, top: 10");
  });

  test("nodes below the fold are kept and the page grows", () => {
    const r = generateReactVite({ projectName: "x", nodes: [at("far", 10, 2000, 100, 100)] });
    expect(r.skipped).toBe(0);
    expect(r.files["src/App.tsx"]).toContain("minHeight: 2180");
  });

  test("uses a custom page width and fold; defaults when no page is given", () => {
    const m = generateReactVite({ projectName: "x", nodes: [at("a", 10, 10)], page: { width: 390, foldHeight: 844 } });
    expect(m.files["src/App.tsx"]).toContain("width: 390, minHeight: 844");
    expect(generateReactVite({ projectName: "x", nodes: [] }).files["src/App.tsx"]).toContain("width: 1440, minHeight: 810");
  });

  test("text is emitted as string literals, comments can't be closed early", () => {
    const app = files["src/App.tsx"]!;
    expect(app).toContain(`{${JSON.stringify('Say "hi" </script> {braces} */')}}`);
    expect(app).toContain("{/* Primary CTA *\\/ ends here */}");
  });

  test("empty canvas still produces a valid app", () => {
    const empty = generateReactVite({ projectName: "Empty", nodes: [] }).files;
    expect(empty["src/App.tsx"]).toContain("the canvas was empty");
  });

  test("zip puts everything under one folder", () => {
    const { filename, bytes } = zipProject("My Landing!", files);
    expect(filename).toBe("my-landing.zip");
    const entries = unzipSync(bytes);
    expect(Object.keys(entries).every((k) => k.startsWith("my-landing/"))).toBe(true);
    expect(strFromU8(entries["my-landing/src/App.tsx"]!)).toBe(files["src/App.tsx"]!);
  });

  test("slugify falls back for names with no usable characters", () => {
    expect(slugify("🚀🚀")).toBe("lazy-builder-export");
  });
});
