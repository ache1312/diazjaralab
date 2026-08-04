import { createHash, randomBytes } from "node:crypto";
import { copyFile, mkdir, mkdtemp, readFile, rename, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";

import { StudioError, assertStudio } from "./errors.mjs";
import { runProcess } from "./process.mjs";

const CATALOGUE_PATH = "src/content-data/publications.generated.json";
const NETWORK_PATH = "src/content-data/publication-network.generated.json";
const REFRESH_SCRIPT = "scripts/refresh-publications.mjs";
const NETWORK_SCRIPT = "scripts/build-publication-network.mjs";
const OPERATION_TTL_MS = 10 * 60 * 1_000;

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function fileState(root, relative) {
  const data = await readFile(path.join(root, ...relative.split("/")));
  return { data, hash: sha256(data) };
}

function identifier() {
  return randomBytes(18).toString("base64url");
}

function summarize(catalogue, network) {
  return {
    catalogue: {
      works: catalogue.works?.length ?? 0,
      openAlexIndexed: catalogue.counts?.openalex_indexed ?? null,
      scholarOnly: catalogue.counts?.scholar_only ?? null,
      generatedAt: catalogue.generated_at ?? null,
    },
    network: {
      papers: network.stats?.papers ?? 0,
      topics: network.stats?.themes ?? 0,
      similarityEdges: network.stats?.similarityEdges ?? 0,
      topicEdges: network.stats?.themeEdges ?? 0,
      generatedAt: network.generatedAt ?? null,
    },
  };
}

export class PublicationsService {
  constructor({
    root,
    history,
    refreshScript = REFRESH_SCRIPT,
    networkScript = NETWORK_SCRIPT,
    now = () => Date.now(),
    operationTtlMs = OPERATION_TTL_MS,
  } = {}) {
    this.root = path.resolve(root);
    this.history = history;
    this.refreshScript = refreshScript;
    this.networkScript = networkScript;
    this.now = now;
    this.operationTtlMs = operationTtlMs;
    this.pending = new Map();
  }

  prune() {
    const threshold = this.now() - this.operationTtlMs;
    for (const [id, operation] of this.pending) {
      if (operation.createdAt >= threshold) continue;
      this.pending.delete(id);
      rm(operation.temporaryRoot, { recursive: true, force: true }).catch(() => {});
    }
  }

  async prepare() {
    this.prune();
    const beforeCatalogue = await fileState(this.root, CATALOGUE_PATH);
    const beforeNetwork = await fileState(this.root, NETWORK_PATH);
    const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "diaz-lab-publications-"));
    try {
      await mkdir(path.join(temporaryRoot, "src", "content-data"), { recursive: true });
      await mkdir(path.join(temporaryRoot, "scripts"), { recursive: true });
      await Promise.all([
        copyFile(path.join(this.root, CATALOGUE_PATH), path.join(temporaryRoot, CATALOGUE_PATH)),
        copyFile(path.join(this.root, NETWORK_PATH), path.join(temporaryRoot, NETWORK_PATH)),
        copyFile(path.join(this.root, this.refreshScript), path.join(temporaryRoot, REFRESH_SCRIPT)),
        copyFile(path.join(this.root, this.networkScript), path.join(temporaryRoot, NETWORK_SCRIPT)),
      ]);

      const refresh = await runProcess(process.execPath, [REFRESH_SCRIPT, "--write"], {
        cwd: temporaryRoot,
        timeoutMs: 180_000,
      });
      const graph = await runProcess(process.execPath, [NETWORK_SCRIPT], {
        cwd: temporaryRoot,
        timeoutMs: 180_000,
        env: { PUBLICATION_GRAPH_OFFLINE: "1" },
      });
      const candidateCatalogue = await fileState(temporaryRoot, CATALOGUE_PATH);
      const candidateNetwork = await fileState(temporaryRoot, NETWORK_PATH);
      const catalogueJson = JSON.parse(candidateCatalogue.data.toString("utf8"));
      const networkJson = JSON.parse(candidateNetwork.data.toString("utf8"));
      assertStudio(networkJson.stats?.themes === 4, "INVALID_PUBLICATION_TOPICS", "La regeneración no produjo exactamente cuatro tópicos.", {
        status: 422,
        details: { topics: networkJson.stats?.themes },
      });
      const confirmationId = identifier();
      this.pending.set(confirmationId, {
        createdAt: this.now(),
        temporaryRoot,
        originals: {
          [CATALOGUE_PATH]: beforeCatalogue.hash,
          [NETWORK_PATH]: beforeNetwork.hash,
        },
      });
      return {
        confirmationId,
        expiresInMs: this.operationTtlMs,
        changed: {
          catalogue: beforeCatalogue.hash !== candidateCatalogue.hash,
          network: beforeNetwork.hash !== candidateNetwork.hash,
        },
        summary: summarize(catalogueJson, networkJson),
        log: `${refresh.stdout}\n${refresh.stderr}\n${graph.stdout}\n${graph.stderr}`.trim().slice(-20_000),
      };
    } catch (error) {
      await rm(temporaryRoot, { recursive: true, force: true });
      throw error;
    }
  }

  async confirm(confirmationId) {
    this.prune();
    const operation = this.pending.get(String(confirmationId || ""));
    assertStudio(operation, "CONFIRMATION_EXPIRED", "La confirmación de publicaciones caducó.", { status: 409 });

    for (const relative of [CATALOGUE_PATH, NETWORK_PATH]) {
      const current = await fileState(this.root, relative);
      assertStudio(current.hash === operation.originals[relative], "CONTENT_CHANGED", "Los datos bibliográficos cambiaron después de la revisión.", {
        status: 409,
        details: { path: relative },
      });
    }

    const backups = new Map();
    const temporaryTargets = new Map();
    try {
      for (const relative of [CATALOGUE_PATH, NETWORK_PATH]) {
        await this.history?.snapshot?.(relative, { reason: "before-publications-refresh", skipIfDuplicate: false });
        const target = path.join(this.root, relative);
        const backup = `${target}.${process.pid}.${randomBytes(5).toString("hex")}.backup`;
        const temporary = `${target}.${process.pid}.${randomBytes(5).toString("hex")}.refresh`;
        await copyFile(target, backup);
        await copyFile(path.join(operation.temporaryRoot, relative), temporary);
        backups.set(relative, backup);
        temporaryTargets.set(relative, temporary);
      }
      for (const relative of [CATALOGUE_PATH, NETWORK_PATH]) {
        await rename(temporaryTargets.get(relative), path.join(this.root, relative));
      }
    } catch (error) {
      for (const [relative, backup] of backups) {
        await copyFile(backup, path.join(this.root, relative)).catch(() => {});
      }
      throw new StudioError("PUBLICATION_APPLY_FAILED", "No se pudo aplicar la actualización; se restauraron los archivos anteriores.", {
        status: 500,
        details: { reason: error.message },
      });
    } finally {
      for (const value of [...backups.values(), ...temporaryTargets.values()]) await rm(value, { force: true }).catch(() => {});
    }

    const result = {
      ok: true,
      files: [CATALOGUE_PATH, NETWORK_PATH],
      hashes: {
        [CATALOGUE_PATH]: (await fileState(this.root, CATALOGUE_PATH)).hash,
        [NETWORK_PATH]: (await fileState(this.root, NETWORK_PATH)).hash,
      },
    };
    this.pending.delete(confirmationId);
    await rm(operation.temporaryRoot, { recursive: true, force: true });
    return result;
  }
}

export const publicationPaths = Object.freeze({
  catalogue: CATALOGUE_PATH,
  network: NETWORK_PATH,
});
