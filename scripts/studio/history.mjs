import { createHash, randomBytes } from "node:crypto";
import {
  access,
  chmod,
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  unlink,
  writeFile,
} from "node:fs/promises";
import path from "node:path";

import { assertStudio } from "./errors.mjs";
import { listEditorialFiles, resolveEditorialPath } from "./paths.mjs";
import { runProcess } from "./process.mjs";

const MANIFEST_VERSION = 1;
const MAX_SNAPSHOT_BYTES = 256 * 1024 * 1024;

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function pathExists(value) {
  try {
    await access(value);
    return true;
  } catch {
    return false;
  }
}

async function atomicWrite(file, data, mode) {
  const temporary = `${file}.${process.pid}.${randomBytes(6).toString("hex")}.tmp`;
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(temporary, data, mode === undefined ? undefined : { mode });
  await rename(temporary, file);
}

function snapshotId(now) {
  return `${now.toISOString().replace(/[:.]/g, "-")}-${randomBytes(5).toString("hex")}`;
}

export class HistoryStore {
  constructor({ root, maximumPerDocument = 100, pollIntervalMs = 1_500, now = () => new Date(), storeDirectory } = {}) {
    assertStudio(root, "MISSING_ROOT", "Falta la carpeta raíz del proyecto.");
    this.root = path.resolve(root);
    this.maximumPerDocument = maximumPerDocument;
    this.pollIntervalMs = pollIntervalMs;
    this.now = now;
    this.explicitStoreDirectory = storeDirectory;
    this.storeDirectory = null;
    this.objectsDirectory = null;
    this.manifestsDirectory = null;
    this.fingerprints = new Map();
    this.timer = null;
    this.scanning = false;
  }

  async initialize({ startWatcher = true, captureBaseline = true } = {}) {
    if (!this.storeDirectory) {
      if (this.explicitStoreDirectory) {
        this.storeDirectory = path.resolve(this.explicitStoreDirectory);
      } else {
        const result = await runProcess("git", ["rev-parse", "--absolute-git-dir"], { cwd: this.root, timeoutMs: 10_000 });
        this.storeDirectory = path.join(result.stdout.trim(), "studio-history");
      }
      this.objectsDirectory = path.join(this.storeDirectory, "objects");
      this.manifestsDirectory = path.join(this.storeDirectory, "manifests");
      await mkdir(this.objectsDirectory, { recursive: true });
      await mkdir(this.manifestsDirectory, { recursive: true });
      await chmod(this.storeDirectory, 0o700).catch(() => {});
    }

    const files = await listEditorialFiles(this.root);
    for (const relative of files) {
      this.fingerprints.set(relative, await this.fingerprint(relative));
      if (captureBaseline) await this.snapshot(relative, { reason: "baseline", skipIfDuplicate: true });
    }
    if (startWatcher) this.start();
    return { files: files.length, storeDirectory: this.storeDirectory };
  }

  start() {
    if (this.timer) return;
    this.timer = setInterval(() => this.scan().catch((error) => {
      console.error(`[studio] No se pudo registrar una instantánea: ${error.message}`);
    }), this.pollIntervalMs);
    this.timer.unref();
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  documentKey(relative) {
    return sha256(relative);
  }

  async fingerprint(relative) {
    const { absolute } = await resolveEditorialPath(this.root, relative, { allowMissing: true });
    try {
      const info = await stat(absolute);
      return `${info.size}:${info.mtimeMs}:${info.ctimeMs}`;
    } catch (error) {
      if (error?.code === "ENOENT") return "deleted";
      throw error;
    }
  }

  async scan() {
    if (this.scanning) return;
    this.scanning = true;
    try {
      const currentFiles = new Set(await listEditorialFiles(this.root));
      const candidates = new Set([...currentFiles, ...this.fingerprints.keys()]);
      for (const relative of candidates) {
        const current = await this.fingerprint(relative);
        const previous = this.fingerprints.get(relative);
        if (previous !== undefined && current !== previous) {
          await this.snapshot(relative, { reason: current === "deleted" ? "deleted" : "autosave", skipIfDuplicate: true });
        } else if (previous === undefined) {
          await this.snapshot(relative, { reason: "created", skipIfDuplicate: true });
        }
        this.fingerprints.set(relative, current);
      }
    } finally {
      this.scanning = false;
    }
  }

  async snapshot(relative, { reason = "manual", skipIfDuplicate = true } = {}) {
    assertStudio(this.storeDirectory, "HISTORY_NOT_READY", "El historial todavía no está disponible.", { status: 503 });
    const { absolute } = await resolveEditorialPath(this.root, relative, { allowMissing: true });
    let content = null;
    let info = null;
    try {
      info = await stat(absolute);
      assertStudio(info.isFile(), "NOT_A_FILE", "Solo se pueden versionar archivos.");
      assertStudio(info.size <= MAX_SNAPSHOT_BYTES, "SNAPSHOT_TOO_LARGE", "El archivo supera el máximo local de historial.", {
        status: 422,
        details: { path: relative, bytes: info.size, maximumBytes: MAX_SNAPSHOT_BYTES },
      });
      content = await readFile(absolute);
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }

    const deleted = content === null;
    const objectHash = deleted ? null : sha256(content);
    const existing = await this.list(relative, { limit: 1 });
    if (skipIfDuplicate && existing.entries[0]?.objectHash === objectHash && existing.entries[0]?.deleted === deleted) {
      return existing.entries[0];
    }

    if (content) {
      const objectPath = path.join(this.objectsDirectory, objectHash);
      if (!(await pathExists(objectPath))) {
        const temporary = `${objectPath}.${process.pid}.${randomBytes(5).toString("hex")}.tmp`;
        await writeFile(temporary, content, { flag: "wx", mode: 0o600 });
        try {
          await rename(temporary, objectPath);
        } catch (error) {
          await rm(temporary, { force: true });
          if (error?.code !== "EEXIST") throw error;
        }
      }
    }

    const timestamp = this.now();
    const id = snapshotId(timestamp);
    const manifest = {
      version: MANIFEST_VERSION,
      id,
      at: timestamp.toISOString(),
      path: relative,
      reason,
      deleted,
      objectHash,
      bytes: info?.size ?? 0,
    };
    const documentDirectory = path.join(this.manifestsDirectory, this.documentKey(relative));
    await mkdir(documentDirectory, { recursive: true });
    await atomicWrite(path.join(documentDirectory, `${id}.json`), `${JSON.stringify(manifest)}\n`, 0o600);
    await this.prune(relative);
    this.fingerprints.set(relative, await this.fingerprint(relative));
    return manifest;
  }

  async manifests(relative) {
    const directory = path.join(this.manifestsDirectory, this.documentKey(relative));
    let files;
    try {
      files = (await readdir(directory)).filter((file) => file.endsWith(".json")).sort().reverse();
    } catch (error) {
      if (error?.code === "ENOENT") return [];
      throw error;
    }
    const entries = [];
    for (const file of files) {
      try {
        const manifest = JSON.parse(await readFile(path.join(directory, file), "utf8"));
        if (manifest.version === MANIFEST_VERSION && manifest.path === relative) entries.push(manifest);
      } catch {
        // A partial/corrupt local entry is ignored; valid entries remain usable.
      }
    }
    return entries;
  }

  async list(relative, { limit = 100 } = {}) {
    const { relative: safeRelative } = await resolveEditorialPath(this.root, relative, { allowMissing: true });
    const safeLimit = Math.max(1, Math.min(Number(limit) || 100, 100));
    const entries = (await this.manifests(safeRelative)).slice(0, safeLimit);
    return { path: safeRelative, entries };
  }

  async restore(relative, id) {
    const { relative: safeRelative, absolute } = await resolveEditorialPath(this.root, relative, { allowMissing: true });
    assertStudio(typeof id === "string" && /^[0-9TZ-]+-[a-f0-9]{10}$/.test(id), "INVALID_SNAPSHOT", "La versión solicitada no es válida.");
    const entries = await this.manifests(safeRelative);
    const selected = entries.find((entry) => entry.id === id);
    assertStudio(selected, "SNAPSHOT_NOT_FOUND", "La versión solicitada ya no está disponible.", { status: 404 });

    // Load and verify the selected object before the safety snapshot. Creating that
    // snapshot may prune the oldest manifest when the document already has 100.
    let selectedContent = null;
    if (!selected.deleted) {
      const objectPath = path.join(this.objectsDirectory, selected.objectHash);
      selectedContent = await readFile(objectPath);
      assertStudio(sha256(selectedContent) === selected.objectHash, "SNAPSHOT_CORRUPT", "La versión guardada no superó la verificación de integridad.", {
        status: 500,
      });
    }

    const safety = await this.snapshot(safeRelative, { reason: "before-restore", skipIfDuplicate: false });
    if (selected.deleted) {
      await unlink(absolute).catch((error) => {
        if (error?.code !== "ENOENT") throw error;
      });
    } else {
      await mkdir(path.dirname(absolute), { recursive: true });
      const temporary = `${absolute}.${process.pid}.${randomBytes(5).toString("hex")}.restore`;
      await writeFile(temporary, selectedContent, { mode: 0o600 });
      await rename(temporary, absolute);
    }
    this.fingerprints.set(safeRelative, await this.fingerprint(safeRelative));
    const restored = await this.snapshot(safeRelative, { reason: "restored", skipIfDuplicate: false });
    return { path: safeRelative, restoredFrom: selected, safetySnapshot: safety, restoredSnapshot: restored };
  }

  async prune(relative) {
    const entries = await this.manifests(relative);
    const removed = entries.slice(this.maximumPerDocument);
    if (!removed.length) return;
    const directory = path.join(this.manifestsDirectory, this.documentKey(relative));
    for (const entry of removed) await rm(path.join(directory, `${entry.id}.json`), { force: true });
    await this.collectObjects();
  }

  async collectObjects() {
    const referenced = new Set();
    let documentDirectories = [];
    try {
      documentDirectories = await readdir(this.manifestsDirectory, { withFileTypes: true });
    } catch {}
    for (const directory of documentDirectories) {
      if (!directory.isDirectory()) continue;
      const files = await readdir(path.join(this.manifestsDirectory, directory.name));
      for (const file of files.filter((value) => value.endsWith(".json"))) {
        try {
          const manifest = JSON.parse(await readFile(path.join(this.manifestsDirectory, directory.name, file), "utf8"));
          if (manifest.objectHash) referenced.add(manifest.objectHash);
        } catch {}
      }
    }
    for (const file of await readdir(this.objectsDirectory)) {
      if (/^[a-f0-9]{64}$/.test(file) && !referenced.has(file)) await rm(path.join(this.objectsDirectory, file), { force: true });
    }
  }

  async stats() {
    let documents = 0;
    let snapshots = 0;
    try {
      const directories = await readdir(this.manifestsDirectory, { withFileTypes: true });
      for (const directory of directories) {
        if (!directory.isDirectory()) continue;
        documents += 1;
        snapshots += (await readdir(path.join(this.manifestsDirectory, directory.name))).filter((file) => file.endsWith(".json")).length;
      }
    } catch {}
    return { documents, snapshots, maximumPerDocument: this.maximumPerDocument };
  }
}
