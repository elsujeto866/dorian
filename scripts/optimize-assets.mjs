#!/usr/bin/env node
/**
 * optimize-assets.mjs
 *
 * Asset pipeline for the 3D portfolio city.
 *
 * PURPOSE:
 *   Processes source GLTF models (placed in public/models/src/) and outputs
 *   optimized, compressed versions to public/models/.
 *
 *   This project uses PROCEDURAL geometry (R3F primitives + instancing) for
 *   all buildings — NO GLTF models are required for the core city scene.
 *   This script is provided for OPTIONAL custom model replacement per the
 *   design spec (section 4: "swapping a model is a JSON/file change, no scene
 *   code change") and future asset upgrades.
 *
 * PIPELINE (when source GLTFs exist):
 *   1. dedup    — deduplicate accessors
 *   2. weld     — merge duplicate vertices
 *   3. prune    — remove unused nodes/materials
 *   4. draco    — Draco geometry compression (lossy, ~10x smaller geometry)
 *   5. ktx2     — KTX2 + BasisU texture compression (WebP fallback via sharp)
 *   6. resize   — clamp textures to 1024px (mobile GPU budget)
 *
 * OUTPUT BUDGETS (per design spec):
 *   - Total scene assets < 5 MB post-compression
 *   - Per-building draw calls minimized via InstancedMesh
 *   - Texture max 1024px on mobile tier
 *
 * USAGE:
 *   pnpm exec node scripts/optimize-assets.mjs [--src <dir>] [--out <dir>]
 *
 *   Default: --src public/models/src  --out public/models
 *
 * INSTALL DEPS (run once):
 *   pnpm add -D @gltf-transform/cli @gltf-transform/extensions
 *
 * NOTE: This is a manual/pre-build step. Commit the optimized output.
 *       Never ship raw GLTF to production — keeps Vercel builds fast.
 */

import { resolve, basename } from "node:path";
import { existsSync, readdirSync, mkdirSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";

// ─── Config ───────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const getArg = (flag) => {
  const idx = args.indexOf(flag);
  return idx !== -1 ? args[idx + 1] : null;
};

const SRC_DIR = resolve(getArg("--src") ?? "public/models/src");
const OUT_DIR = resolve(getArg("--out") ?? "public/models");
const DRY_RUN = args.includes("--dry-run");

// ─── Budget check ─────────────────────────────────────────────────────────────

const BUDGET_BYTES = 5 * 1024 * 1024; // 5 MB

function totalDirSize(dir) {
  if (!existsSync(dir)) return 0;
  return readdirSync(dir).reduce((acc, file) => {
    const full = resolve(dir, file);
    if (statSync(full).isFile()) return acc + statSync(full).size;
    return acc;
  }, 0);
}

function formatBytes(bytes) {
  return (bytes / 1024 / 1024).toFixed(2) + " MB";
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function main() {
  console.log("=== Asset Pipeline: optimize-assets.mjs ===\n");

  // Check source dir.
  if (!existsSync(SRC_DIR)) {
    console.log(`Source directory not found: ${SRC_DIR}`);
    console.log("Nothing to optimize. Place source GLTF files in public/models/src/ to use this pipeline.");
    console.log("\nNote: The 3D city uses PROCEDURAL geometry and does NOT require GLTF assets.");
    console.log("This pipeline is for optional custom model replacement only.");
    process.exit(0);
  }

  const glbFiles = readdirSync(SRC_DIR).filter((f) => f.endsWith(".glb") || f.endsWith(".gltf"));

  if (glbFiles.length === 0) {
    console.log(`No GLTF/GLB files found in ${SRC_DIR}`);
    process.exit(0);
  }

  console.log(`Found ${glbFiles.length} model(s) to process.\n`);

  // Check for gltf-transform CLI.
  const hasGltfTransform = spawnSync("npx", ["gltf-transform", "--version"], { encoding: "utf8" }).status === 0;

  if (!hasGltfTransform) {
    console.error("gltf-transform CLI not found.");
    console.error("Install it: pnpm add -D @gltf-transform/cli @gltf-transform/extensions");
    process.exit(1);
  }

  if (!existsSync(OUT_DIR)) {
    mkdirSync(OUT_DIR, { recursive: true });
  }

  let successCount = 0;
  let failCount = 0;

  for (const file of glbFiles) {
    const src = resolve(SRC_DIR, file);
    const out = resolve(OUT_DIR, file);
    console.log(`Processing: ${file}`);

    if (DRY_RUN) {
      console.log(`  [dry-run] Would output to ${out}`);
      successCount++;
      continue;
    }

    // Run gltf-transform pipeline.
    // dedup + weld + prune + draco compression.
    const result = spawnSync(
      "npx",
      [
        "gltf-transform",
        "optimize",
        src,
        out,
        "--compress", "draco",
        "--texture-compress", "webp",
        "--texture-size", "1024",
      ],
      { encoding: "utf8", stdio: "inherit" }
    );

    if (result.status === 0) {
      const srcSize = statSync(src).size;
      const outSize = statSync(out).size;
      const ratio = ((1 - outSize / srcSize) * 100).toFixed(1);
      console.log(`  Compressed: ${formatBytes(srcSize)} → ${formatBytes(outSize)} (${ratio}% reduction)\n`);
      successCount++;
    } else {
      console.error(`  ERROR: Failed to optimize ${file}\n`);
      failCount++;
    }
  }

  // Budget check.
  const totalOut = totalDirSize(OUT_DIR);
  const budgetOk = totalOut <= BUDGET_BYTES;

  console.log("─────────────────────────────────────────");
  console.log(`Processed: ${successCount} success, ${failCount} failed`);
  console.log(`Output dir total: ${formatBytes(totalOut)} / ${formatBytes(BUDGET_BYTES)} budget`);
  console.log(`Budget: ${budgetOk ? "OK" : "EXCEEDED — reduce models or textures"}`);

  if (!budgetOk) {
    console.error("\nBudget exceeded! Options:");
    console.error("  - Reduce texture size: --texture-size 512");
    console.error("  - Remove unused models");
    console.error("  - Use more aggressive Draco quantization");
    process.exit(1);
  }

  process.exit(failCount > 0 ? 1 : 0);
}

main();
