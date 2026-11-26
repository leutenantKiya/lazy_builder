import { describe, expect, test } from "bun:test";
import { strFromU8, unzipSync } from "fflate";
import { zipProject } from "../index.ts";
import { generateReactVite, slugify } from "./generate.ts";
import { KITCHEN_SINK } from "./fixtures.ts";

describe("generateReactVite", () => {
  const files = generateReactVite({ projectName: "My Landing!", nodes: KITCHEN_SINK });

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
    const sparse = generateReactVite({ projectName: "x", nodes: [KITCHEN_SINK[3]!] });
    expect(Object.keys(sparse).filter((f) => f.includes("/ui/"))).toEqual(["src/components/ui/Button.tsx"]);
  });

  test("groups become components, named from their label, nested ones imported by the parent", () => {
    expect(files["src/components/HeroSection.tsx"]).toContain("import Group1 from './Group1';");
    expect(files["src/components/HeroSection.tsx"]).toContain("/** Landing hero */");
    expect(files["src/components/Group1.tsx"]).toContain("<Toggle defaultOn={true} />");
    expect(files["src/App.tsx"]).toContain("import HeroSection from './components/HeroSection';");
    expect(files["src/App.tsx"]).not.toContain("Group1");
  });

  test("normalizes layout to a padded origin", () => {
    // left-most root is x=40 -> 32px padding
    expect(files["src/App.tsx"]).toContain("left: 32, top: 32, width: 360, height: 220");
  });

  test("text is emitted as string literals, comments can't be closed early", () => {
    const app = files["src/App.tsx"]!;
    expect(app).toContain(`{${JSON.stringify('Say "hi" </script> {braces} */')}}`);
    expect(app).toContain("{/* Primary CTA *\\/ ends here */}");
  });

  test("empty canvas still produces a valid app", () => {
    const empty = generateReactVite({ projectName: "Empty", nodes: [] });
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
