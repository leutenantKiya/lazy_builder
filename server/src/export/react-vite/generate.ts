import type { CanvasNode, ExportInput, FileMap, NodeType } from "../ir.ts";

// IR -> runnable React + Vite + Tailwind project.
// Layout is absolute (same as the canvas); groups become their own components
// and every primitive type used gets a small component in src/components/ui.

const PADDING = 32;

// ── helpers ──────────────────────────────

const str = (v: unknown, fallback: string) => (v === undefined || v === null || v === "" ? fallback : String(v));
// JSON string literal is valid inside JSX braces and escapes everything for us
const lit = (s: string) => JSON.stringify(s);
const num = (n: number) => Math.round(n * 100) / 100;
const indent = (s: string, n: number) => s.replace(/^(?=.)/gm, " ".repeat(n));
const comment = (s: string) => s.replaceAll("*/", "*\\/");

export function slugify(name: string) {
  return (
    name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "lazy-builder-export"
  );
}

function pascal(name: string, fallback: string) {
  const p = name
    .normalize("NFKD")
    .replace(/[^A-Za-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0]!.toUpperCase() + w.slice(1))
    .join("");
  return /^[A-Za-z]/.test(p) ? p.slice(0, 40) : fallback;
}

const docsOf = (node: CanvasNode) => (typeof node.props.docs === "string" ? node.props.docs.trim() : "");

// ── ui primitives (only emitted when used) ─

const UI_NAME: Record<Exclude<NodeType, "group">, string> = {
  frame: "Frame",
  card: "Card",
  box: "Box",
  text: "Text",
  button: "Button",
  input: "Input",
  image: "ImagePlaceholder",
  divider: "Divider",
  badge: "Badge",
  toggle: "Toggle",
};

const UI_SOURCE: Record<Exclude<NodeType, "group">, string> = {
  frame: `export default function Frame({ label }: { label: string }) {
  return (
    <div className="flex h-full w-full items-start justify-start rounded-md border-2 border-dashed border-neutral-400 p-1 text-xs text-neutral-400">
      {label}
    </div>
  );
}
`,
  card: `export default function Card({ label }: { label: string }) {
  return (
    <div className="flex h-full w-full items-start justify-start rounded-lg border border-neutral-200 bg-white p-2 text-xs text-neutral-600 shadow-sm">
      {label}
    </div>
  );
}
`,
  box: `export default function Box() {
  return <div className="h-full w-full rounded-md bg-neutral-300" />;
}
`,
  text: `export default function Text({ children }: { children: string }) {
  return <p className="flex h-full w-full items-center text-sm text-neutral-800">{children}</p>;
}
`,
  button: `import type { ButtonHTMLAttributes } from 'react';

export default function Button({ label, ...rest }: { label: string } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className="h-full w-full rounded-md bg-neutral-900 text-sm font-medium text-white shadow hover:bg-neutral-800"
      {...rest}
    >
      {label}
    </button>
  );
}
`,
  input: `import type { InputHTMLAttributes } from 'react';

export default function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className="h-full w-full rounded-md border border-neutral-300 bg-white px-2 text-sm text-neutral-800 outline-none placeholder:text-neutral-400 focus:border-neutral-900"
      {...props}
    />
  );
}
`,
  image: `// placeholder until real assets are supported; swap for <img src=... alt=... />
export default function ImagePlaceholder({ alt }: { alt: string }) {
  return (
    <div
      role="img"
      aria-label={alt}
      className="flex h-full w-full flex-col items-center justify-center rounded-md border border-neutral-200 bg-neutral-100 text-neutral-400"
    >
      <span className="text-[10px]">{alt}</span>
    </div>
  );
}
`,
  divider: `export default function Divider() {
  return <hr className="h-0.5 w-full rounded-full border-0 bg-neutral-300" />;
}
`,
  badge: `export default function Badge({ children }: { children: string }) {
  return (
    <span className="flex h-full w-full items-center justify-center rounded-full bg-neutral-200 px-2 text-xs font-medium text-neutral-700">
      {children}
    </span>
  );
}
`,
  toggle: `import { useState } from 'react';

export default function Toggle({ defaultOn = false, label = 'Toggle' }: { defaultOn?: boolean; label?: string }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => setOn((v) => !v)}
      className={\`flex h-full w-full items-center rounded-full px-0.5 transition-colors \${on ? 'justify-end bg-neutral-900' : 'justify-start bg-neutral-300'}\`}
    >
      <span className="h-[18px] w-[18px] rounded-full bg-white shadow-sm" />
    </button>
  );
}
`,
};

// JSX for one primitive (no positioning)
function primitiveJsx(node: CanvasNode): string {
  const p = node.props;
  switch (node.type) {
    case "frame":
      return `<Frame label={${lit(str(p.label, "Frame"))}} />`;
    case "card":
      return `<Card label={${lit(str(p.label, "Card"))}} />`;
    case "button":
      return `<Button label={${lit(str(p.label, "Button"))}} />`;
    case "text":
      return `<Text>{${lit(str(p.text, "Text"))}}</Text>`;
    case "input":
      return `<Input placeholder={${lit(str(p.placeholder, "Enter text…"))}} />`;
    case "image":
      return `<ImagePlaceholder alt={${lit(str(p.alt, "Image"))}} />`;
    case "divider":
      return `<Divider />`;
    case "badge":
      return `<Badge>{${lit(str(p.text, "Badge"))}}</Badge>`;
    case "toggle":
      return `<Toggle defaultOn={${Boolean(p.on)}} />`;
    case "box":
    default:
      return `<Box />`;
  }
}

function positioned(node: CanvasNode, inner: string, dx = 0, dy = 0) {
  const style = `{{ left: ${num(node.x - dx)}, top: ${num(node.y - dy)}, width: ${num(node.width)}, height: ${num(node.height)} }}`;
  const doc = docsOf(node);
  const note = doc ? `{/* ${comment(doc.replace(/\s+/g, " "))} */}\n` : "";
  return `${note}<div className="absolute" style=${style}>\n${indent(inner, 2)}\n</div>`;
}

// ── generate ─────────────────────────────

export function generateReactVite({ projectName, nodes }: ExportInput): FileMap {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const roots = nodes.filter((n) => !n.props.parentId);

  const usedUi = new Set<Exclude<NodeType, "group">>();
  const groupFiles: { name: string; source: string }[] = [];
  const takenNames = new Set<string>(["App", ...Object.values(UI_NAME)]);

  const uniqueName = (base: string) => {
    let name = base;
    for (let i = 2; takenNames.has(name); i++) name = `${base}${i}`;
    takenNames.add(name);
    return name;
  };

  // returns JSX for a node, emitting a component file for groups
  const render = (node: CanvasNode, dx: number, dy: number): string => {
    if (node.type !== "group") {
      usedUi.add(node.type);
      return positioned(node, primitiveJsx(node), dx, dy);
    }

    const children = ((node.props.childIds as string[] | undefined) ?? [])
      .map((id) => byId.get(id))
      .filter((n): n is CanvasNode => !!n);
    const label = typeof node.props.label === "string" ? node.props.label : "";
    const name = uniqueName(pascal(label, `Group${groupFiles.length + 1}`));

    // children are already stored relative to their group
    const body = children.map((c) => render(c, 0, 0)).join("\n");
    const imports = [...new Set(children.filter((c) => c.type !== "group").map((c) => UI_NAME[c.type as Exclude<NodeType, "group">]))]
      .sort()
      .map((n) => `import ${n} from './ui/${n}';`);
    const nested = groupFiles.filter((g) => body.includes(`<${g.name} />`)).map((g) => `import ${g.name} from './${g.name}';`);
    const doc = docsOf(node);

    groupFiles.push({
      name,
      source: `${[...imports, ...nested].join("\n")}

${doc ? `/** ${comment(doc)} */\n` : ""}export default function ${name}() {
  return (
    <div className="relative h-full w-full">
${indent(body, 6)}
    </div>
  );
}
`,
    });
    return positioned(node, `<${name} />`, dx, dy);
  };

  // normalize so the top-left node sits at PADDING
  const offX = (roots.length ? Math.min(...roots.map((n) => n.x)) : 0) - PADDING;
  const offY = (roots.length ? Math.min(...roots.map((n) => n.y)) : 0) - PADDING;
  const width = roots.length ? Math.max(...roots.map((n) => n.x + n.width)) - offX + PADDING : 640;
  const height = roots.length ? Math.max(...roots.map((n) => n.y + n.height)) - offY + PADDING : 480;

  const appBody = roots.map((n) => render(n, offX, offY)).join("\n");
  const rootUi = [...new Set(roots.filter((n) => n.type !== "group").map((n) => UI_NAME[n.type as Exclude<NodeType, "group">]))].sort();
  const rootGroups = groupFiles.filter((g) => appBody.includes(`<${g.name} />`)).map((g) => g.name);

  const app = `${[
    ...rootUi.map((n) => `import ${n} from './components/ui/${n}';`),
    ...rootGroups.map((n) => `import ${n} from './components/${n}';`),
  ].join("\n")}

// generated by Lazy Builder; layout mirrors the canvas (absolute positioning)
export default function App() {
  return (
    <main className="relative mx-auto" style={{ width: ${num(width)}, height: ${num(height)} }}>
${indent(appBody || "{/* the canvas was empty */}", 6)}
    </main>
  );
}
`;

  const slug = slugify(projectName);
  const files: FileMap = {
    "package.json": `${JSON.stringify(
      {
        name: slug,
        private: true,
        version: "0.0.0",
        type: "module",
        scripts: { dev: "vite", build: "tsc -b && vite build", preview: "vite preview" },
        dependencies: { react: "^19.2.6", "react-dom": "^19.2.6" },
        devDependencies: {
          "@tailwindcss/vite": "^4.3.1",
          "@types/react": "^19.2.14",
          "@types/react-dom": "^19.2.3",
          "@vitejs/plugin-react": "^6.0.1",
          tailwindcss: "^4.3.1",
          typescript: "~6.0.2",
          vite: "^8.0.12",
        },
      },
      null,
      2,
    )}\n`,
    "vite.config.ts": `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
});
`,
    "tsconfig.json": `${JSON.stringify(
      {
        compilerOptions: {
          target: "ES2022",
          lib: ["ES2022", "DOM", "DOM.Iterable"],
          module: "ESNext",
          moduleResolution: "bundler",
          jsx: "react-jsx",
          strict: true,
          noEmit: true,
          skipLibCheck: true,
          types: ["vite/client"],
        },
        include: ["src"],
      },
      null,
      2,
    )}\n`,
    "index.html": `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${projectName.replace(/[<>&"]/g, "")}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`,
    "src/main.tsx": `import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
`,
    "src/index.css": `@import "tailwindcss";

body {
  @apply bg-neutral-50 py-8;
}
`,
    "src/App.tsx": app,
    "README.md": `# ${projectName}

Exported from [Lazy Builder](https://github.com/leutenantKiya/lazy_builder).

\`\`\`bash
npm install
npm run dev
\`\`\`

- \`src/App.tsx\`: the canvas layout (absolute positioning, same as the canvas)
- \`src/components/\`: one component per canvas group
- \`src/components/ui/\`: the primitives used on the canvas
`,
  };

  for (const type of usedUi) files[`src/components/ui/${UI_NAME[type]}.tsx`] = UI_SOURCE[type];
  for (const g of groupFiles) files[`src/components/${g.name}.tsx`] = g.source;
  return files;
}
