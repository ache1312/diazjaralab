import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";

import { StudioError, assertStudio } from "./errors.mjs";
import { assertPublicFileSize, isEditorialPath, listEditorialFiles } from "./paths.mjs";
import { npmCommand, runProcess } from "./process.mjs";

const DEFAULT_BRANCH = "main";
const OPERATION_TTL_MS = 10 * 60 * 1_000;

function validateBranch(value) {
  const branch = value || DEFAULT_BRANCH;
  assertStudio(
    typeof branch === "string" && /^(?![.-])(?!.*(?:\.\.|\/\/|@\{|[~^:?*[\\]))[A-Za-z0-9._/-]{1,120}(?<![./])$/.test(branch),
    "INVALID_BRANCH",
    "El nombre de la rama no es válido.",
  );
  return branch;
}

function validateCommitMessage(value, fallback) {
  const message = String(value || fallback).trim();
  assertStudio(message.length >= 3 && message.length <= 120 && !/[\0\r\n]/.test(message), "INVALID_COMMIT_MESSAGE", "El mensaje debe tener entre 3 y 120 caracteres y una sola línea.");
  return message;
}

function validateIdentity(name, email) {
  const safeName = String(name || "").trim();
  const safeEmail = String(email || "").trim();
  assertStudio(safeName.length >= 2 && safeName.length <= 100 && !/[\0\r\n<>]/.test(safeName), "INVALID_GIT_IDENTITY", "El nombre para Git no es válido.");
  assertStudio(/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(safeEmail) && safeEmail.length <= 200, "INVALID_GIT_IDENTITY", "El correo para Git no es válido.");
  return { name: safeName, email: safeEmail };
}

function validateRemoteUrl(value, allowLocalRemotes) {
  const remoteUrl = String(value || "").trim();
  const githubHttps = /^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\.git)?$/;
  const githubSsh = /^git@github\.com:[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\.git$/;
  const githubSshUrl = /^ssh:\/\/git@github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\.git$/;
  let allowed = githubHttps.test(remoteUrl) || githubSsh.test(remoteUrl) || githubSshUrl.test(remoteUrl);
  if (allowLocalRemotes) allowed ||= path.isAbsolute(remoteUrl) || /^file:\/\//.test(remoteUrl);
  assertStudio(allowed, "INVALID_REMOTE", "Solo se acepta una URL válida de repositorio GitHub.");
  return remoteUrl;
}

function parsePorcelain(raw) {
  const values = raw.split("\0");
  const entries = [];
  for (let index = 0; index < values.length; index += 1) {
    const item = values[index];
    if (!item) continue;
    const status = item.slice(0, 2);
    const file = item.slice(3);
    const renamed = status.includes("R") || status.includes("C");
    const original = renamed ? values[++index] : undefined;
    entries.push({ status, path: file, ...(original ? { originalPath: original } : {}) });
  }
  return entries;
}

function operationId() {
  return randomBytes(18).toString("base64url");
}

function safeEqual(left, right) {
  const a = Buffer.from(left || "");
  const b = Buffer.from(right || "");
  return a.length === b.length && timingSafeEqual(a, b);
}

export class GitService {
  constructor({
    root,
    history,
    validationCommands = [{ command: npmCommand(), args: ["test"], label: "Validación del sitio" }],
    allowLocalRemotes = false,
    now = () => Date.now(),
    operationTtlMs = OPERATION_TTL_MS,
  } = {}) {
    assertStudio(root, "MISSING_ROOT", "Falta la carpeta raíz del proyecto.");
    this.root = path.resolve(root);
    this.history = history;
    this.validationCommands = validationCommands;
    this.allowLocalRemotes = allowLocalRemotes;
    this.now = now;
    this.operationTtlMs = operationTtlMs;
    this.pending = new Map();
  }

  async git(args, options = {}) {
    return runProcess("git", args, { cwd: this.root, timeoutMs: 120_000, ...options });
  }

  async ensureRepository() {
    try {
      await this.git(["rev-parse", "--git-dir"], { timeoutMs: 10_000 });
    } catch {
      throw new StudioError("NOT_A_GIT_REPOSITORY", "La carpeta del sitio todavía no es un repositorio Git.", { status: 409 });
    }
  }

  async hasHead() {
    try {
      await this.git(["rev-parse", "--verify", "HEAD"], { timeoutMs: 10_000 });
      return true;
    } catch {
      return false;
    }
  }

  async head() {
    if (!(await this.hasHead())) return null;
    return (await this.git(["rev-parse", "HEAD"], { timeoutMs: 10_000 })).stdout.trim();
  }

  async currentBranch() {
    const result = await this.git(["symbolic-ref", "--quiet", "--short", "HEAD"], {
      timeoutMs: 10_000,
      acceptedExitCodes: [0, 1],
    });
    return result.code === 0 ? result.stdout.trim() : null;
  }

  async remoteUrl(name = "origin") {
    const result = await this.git(["remote", "get-url", name], { timeoutMs: 10_000, acceptedExitCodes: [0, 2] });
    return result.code === 0 ? result.stdout.trim() : null;
  }

  async statusEntries() {
    const result = await this.git(["status", "--porcelain=v1", "-z", "--untracked-files=all"], { timeoutMs: 20_000 });
    return parsePorcelain(result.stdout);
  }

  async stagedPaths() {
    const result = await this.git(["diff", "--cached", "--name-only", "-z"], { timeoutMs: 20_000 });
    return result.stdout.split("\0").filter(Boolean);
  }

  async status() {
    await this.ensureRepository();
    const [head, branch, origin, entries, staged, history] = await Promise.all([
      this.head(),
      this.currentBranch(),
      this.remoteUrl(),
      this.statusEntries(),
      this.stagedPaths(),
      this.history?.stats?.() ?? null,
    ]);
    let synchronization = null;
    if (head && branch && origin) {
      const remoteRef = `refs/remotes/origin/${branch}`;
      const cached = await this.git(["rev-parse", "--verify", remoteRef], {
        timeoutMs: 10_000,
        acceptedExitCodes: [0, 128],
      });
      if (cached.code === 0) {
        const counts = await this.git(["rev-list", "--left-right", "--count", `${remoteRef}...HEAD`], { timeoutMs: 20_000 });
        const [behind, ahead] = counts.stdout.trim().split(/\s+/).map(Number);
        synchronization = { remoteHead: cached.stdout.trim(), ahead, behind, source: "cached" };
      }
    }
    return {
      repository: true,
      initialized: Boolean(head),
      head,
      branch,
      remote: origin,
      changes: entries.map((entry) => ({ ...entry, editorial: isEditorialPath(entry.path) })),
      staged,
      history,
      synchronization,
    };
  }

  async validate() {
    const checks = [];
    for (const definition of this.validationCommands) {
      const startedAt = Date.now();
      try {
        const result = await runProcess(definition.command, definition.args, {
          cwd: this.root,
          timeoutMs: definition.timeoutMs ?? 10 * 60 * 1_000,
          env: definition.env,
        });
        checks.push({
          label: definition.label,
          ok: true,
          durationMs: Date.now() - startedAt,
          output: `${result.stdout}\n${result.stderr}`.trim().slice(-12_000),
        });
      } catch (error) {
        checks.push({
          label: definition.label,
          ok: false,
          durationMs: Date.now() - startedAt,
          output: `${error.details?.stdout || ""}\n${error.details?.stderr || ""}`.trim().slice(-12_000),
        });
        throw new StudioError("VALIDATION_FAILED", "La publicación se detuvo porque el sitio no superó la validación.", {
          status: 422,
          details: { checks },
        });
      }
    }
    return { ok: true, checks };
  }

  prunePending() {
    const threshold = this.now() - this.operationTtlMs;
    for (const [id, operation] of this.pending) if (operation.createdAt < threshold) this.pending.delete(id);
  }

  createPending(type, data) {
    this.prunePending();
    const id = operationId();
    this.pending.set(id, { type, createdAt: this.now(), ...data });
    return id;
  }

  takePending(id, type) {
    this.prunePending();
    const operation = this.pending.get(String(id || ""));
    assertStudio(operation && operation.type === type, "CONFIRMATION_EXPIRED", "La confirmación caducó o no corresponde a esta operación.", {
      status: 409,
    });
    return operation;
  }

  async lsRemote(remote, branch) {
    const result = await this.git(["ls-remote", "--heads", remote, `refs/heads/${branch}`], { timeoutMs: 60_000 });
    return result.stdout.trim().split(/\s+/)[0] || null;
  }

  async allRepositoryFiles() {
    const result = await this.git(["ls-files", "--cached", "--others", "--exclude-standard", "-z"], { timeoutMs: 30_000 });
    return result.stdout.split("\0").filter(Boolean).sort();
  }

  async filesDigest(files, extra = "") {
    const hash = createHash("sha256").update(extra);
    for (const relative of [...files].sort()) {
      hash.update(`\0${relative}\0`);
      const absolute = path.join(this.root, ...relative.split("/"));
      try {
        const info = await stat(absolute);
        hash.update(`${info.mode}:${info.size}:`);
        hash.update(await readFile(absolute));
      } catch (error) {
        if (error?.code !== "ENOENT") throw error;
        hash.update("deleted");
      }
    }
    return hash.digest("hex");
  }

  async prepareSetup(input = {}) {
    await this.ensureRepository();
    const remoteUrl = validateRemoteUrl(input.remoteUrl, this.allowLocalRemotes);
    const branch = validateBranch(input.branch);
    const identity = validateIdentity(input.authorName, input.authorEmail);
    const message = validateCommitMessage(input.message, "Inicializar sitio del laboratorio");
    const initialized = await this.hasHead();
    const existingRemote = await this.remoteUrl();
    if (existingRemote && existingRemote !== remoteUrl && input.replaceRemote !== true) {
      throw new StudioError("REMOTE_ALREADY_CONFIGURED", "El repositorio ya tiene otro remoto. Debes confirmar explícitamente su reemplazo.", {
        status: 409,
        details: { existingRemote },
      });
    }
    const staged = await this.stagedPaths();
    assertStudio(!staged.length, "INDEX_NOT_CLEAN", "Hay cambios preparados manualmente en Git. Retíralos antes de configurar el editor.", {
      status: 409,
      details: { paths: staged },
    });

    const files = initialized ? [] : await this.allRepositoryFiles();
    assertStudio(initialized || files.length > 0, "EMPTY_REPOSITORY", "No hay archivos para crear la versión inicial.", { status: 409 });
    const remoteHead = await this.lsRemote(remoteUrl, branch);
    assertStudio(initialized || !remoteHead, "REMOTE_NOT_EMPTY", "El remoto ya contiene una rama y no puede unirse de forma segura a un repositorio local sin historial.", {
      status: 409,
    });
    const validation = await this.validate();
    const localHead = await this.head();
    const stateDigest = await this.filesDigest(initialized ? await listEditorialFiles(this.root) : files, `${localHead || "unborn"}:${remoteHead || "empty"}`);
    const confirmationId = this.createPending("setup", {
      remoteUrl,
      branch,
      identity,
      message,
      initialized,
      existingRemote,
      replaceRemote: input.replaceRemote === true,
      files,
      remoteHead,
      stateDigest,
    });
    return {
      confirmationId,
      expiresInMs: this.operationTtlMs,
      initialized,
      branch,
      remoteUrl,
      remoteEmpty: !remoteHead,
      files,
      validation,
    };
  }

  async confirmSetup(input = {}) {
    const operation = this.takePending(input.confirmationId, "setup");
    const currentRemoteHead = await this.lsRemote(operation.remoteUrl, operation.branch);
    assertStudio(safeEqual(currentRemoteHead || "empty", operation.remoteHead || "empty"), "REMOTE_CHANGED", "El remoto cambió después de la revisión. Repite la preparación.", { status: 409 });
    const currentFiles = operation.initialized ? await listEditorialFiles(this.root) : await this.allRepositoryFiles();
    if (!operation.initialized) {
      assertStudio(
        safeEqual(JSON.stringify(currentFiles), JSON.stringify(operation.files)),
        "CONTENT_CHANGED",
        "La lista de archivos cambió después de la revisión. Repite la preparación.",
        { status: 409 },
      );
    }
    const currentDigest = await this.filesDigest(currentFiles, `${(await this.head()) || "unborn"}:${currentRemoteHead || "empty"}`);
    assertStudio(safeEqual(currentDigest, operation.stateDigest), "CONTENT_CHANGED", "El contenido cambió después de la revisión. Repite la preparación.", { status: 409 });

    await this.git(["config", "user.name", operation.identity.name]);
    await this.git(["config", "user.email", operation.identity.email]);
    const currentRemote = await this.remoteUrl();
    assertStudio(
      safeEqual(currentRemote || "none", operation.existingRemote || "none"),
      "REMOTE_CHANGED",
      "La configuración del remoto cambió después de la revisión.",
      { status: 409 },
    );
    if (!currentRemote) await this.git(["remote", "add", "origin", operation.remoteUrl]);
    else if (currentRemote !== operation.remoteUrl) await this.git(["remote", "set-url", "origin", operation.remoteUrl]);

    let commit = await this.head();
    if (!operation.initialized) {
      await this.git(["symbolic-ref", "HEAD", `refs/heads/${operation.branch}`]);
      await this.git(["add", "-A"]);
      try {
        await this.git(["commit", "-m", operation.message], { timeoutMs: 120_000 });
      } catch (error) {
        await this.git(["reset"], { acceptedExitCodes: [0, 1] }).catch(() => {});
        throw error;
      }
      commit = await this.head();
    } else {
      const branch = await this.currentBranch();
      assertStudio(branch === operation.branch, "BRANCH_MISMATCH", `La rama activa debe ser ${operation.branch}.`, {
        status: 409,
        details: { branch },
      });
      if (currentRemoteHead) await this.ensureRemoteFastForward(operation.branch, currentRemoteHead);
    }

    try {
      await this.git(["push", "--set-upstream", "origin", `HEAD:refs/heads/${operation.branch}`], { timeoutMs: 180_000 });
    } catch (error) {
      this.pending.delete(input.confirmationId);
      throw new StudioError("PUSH_FAILED", "La versión local quedó guardada, pero GitHub rechazó la subida. No se reescribió ningún historial.", {
        status: 502,
        details: { commit, reason: error.details?.stderr || error.message },
      });
    }
    this.pending.delete(input.confirmationId);
    return { ok: true, commit, branch: operation.branch, remoteUrl: operation.remoteUrl };
  }

  async ensureRemoteFastForward(branch, knownRemoteHead) {
    const remoteHead = knownRemoteHead === undefined ? await this.lsRemote("origin", branch) : knownRemoteHead;
    assertStudio(remoteHead, "REMOTE_BRANCH_MISSING", "La rama remota todavía no existe. Completa primero la configuración de Git.", { status: 409 });
    await this.git(["fetch", "--no-tags", "origin", `refs/heads/${branch}:refs/remotes/origin/${branch}`], { timeoutMs: 120_000 });
    const relation = await this.git(["merge-base", "--is-ancestor", remoteHead, "HEAD"], {
      timeoutMs: 20_000,
      acceptedExitCodes: [0, 1],
    });
    assertStudio(relation.code === 0, "REMOTE_NOT_FAST_FORWARD", "GitHub contiene cambios que aún no están en este equipo. La publicación se bloqueó sin usar force-push.", {
      status: 409,
      details: { remoteHead },
    });
    return remoteHead;
  }

  async nonEditorialAheadPaths(remoteHead) {
    const result = await this.git(["diff", "--name-only", "-z", `${remoteHead}..HEAD`], { timeoutMs: 20_000 });
    return result.stdout.split("\0").filter(Boolean).filter((file) => !isEditorialPath(file));
  }

  async preparePublish(input = {}) {
    await this.ensureRepository();
    assertStudio(await this.hasHead(), "REPOSITORY_NOT_INITIALIZED", "Completa primero la configuración de Git.", { status: 409 });
    const branch = await this.currentBranch();
    assertStudio(branch, "DETACHED_HEAD", "Git debe estar en una rama para publicar.", { status: 409 });
    const remote = await this.remoteUrl();
    assertStudio(remote, "REMOTE_NOT_CONFIGURED", "Completa primero la configuración de GitHub.", { status: 409 });
    const staged = await this.stagedPaths();
    assertStudio(!staged.length, "INDEX_NOT_CLEAN", "Hay cambios preparados manualmente en Git. Retíralos antes de publicar.", {
      status: 409,
      details: { paths: staged },
    });

    const remoteHead = await this.lsRemote("origin", branch);
    await this.ensureRemoteFastForward(branch, remoteHead);
    const nonEditorialAhead = await this.nonEditorialAheadPaths(remoteHead);
    assertStudio(!nonEditorialAhead.length, "NON_EDITORIAL_COMMITS", "Hay commits locales de código que el editor no puede publicar automáticamente.", {
      status: 409,
      details: { paths: nonEditorialAhead },
    });

    const entries = await this.statusEntries();
    const editorialEntries = entries.filter((entry) => isEditorialPath(entry.path));
    const ignoredEntries = entries.filter((entry) => !isEditorialPath(entry.path));
    const editorialPaths = [...new Set(editorialEntries.flatMap((entry) => [entry.path, entry.originalPath].filter(Boolean)))].sort();
    for (const relative of editorialPaths) {
      try {
        await assertPublicFileSize(this.root, relative);
      } catch (error) {
        if (error?.code !== "ENOENT") throw error;
      }
    }

    const localHead = await this.head();
    const alreadyAhead = localHead !== remoteHead;
    assertStudio(editorialPaths.length || alreadyAhead, "NOTHING_TO_PUBLISH", "No hay cambios editoriales pendientes de publicación.", { status: 409 });
    const validation = await this.validate();
    const stateDigest = await this.filesDigest(editorialPaths, `${localHead}:${remoteHead}`);
    const message = validateCommitMessage(input.message, `Actualizar contenido del laboratorio ${new Date().toISOString().slice(0, 10)}`);
    const confirmationId = this.createPending("publish", {
      branch,
      remoteHead,
      localHead,
      editorialPaths,
      stateDigest,
      message,
    });
    return {
      confirmationId,
      expiresInMs: this.operationTtlMs,
      branch,
      changes: editorialEntries,
      ignoredChanges: ignoredEntries,
      alreadyAhead,
      validation,
    };
  }

  async confirmPublish(input = {}) {
    const operation = this.takePending(input.confirmationId, "publish");
    const branch = await this.currentBranch();
    assertStudio(branch === operation.branch, "BRANCH_CHANGED", "La rama cambió después de la revisión.", { status: 409 });
    const remoteHead = await this.lsRemote("origin", operation.branch);
    assertStudio(safeEqual(remoteHead, operation.remoteHead), "REMOTE_CHANGED", "GitHub cambió después de la revisión. Repite la preparación.", { status: 409 });
    await this.ensureRemoteFastForward(operation.branch, remoteHead);
    const currentHead = await this.head();
    assertStudio(safeEqual(currentHead, operation.localHead), "LOCAL_HISTORY_CHANGED", "El historial local cambió después de la revisión.", { status: 409 });
    const currentDigest = await this.filesDigest(operation.editorialPaths, `${currentHead}:${remoteHead}`);
    assertStudio(safeEqual(currentDigest, operation.stateDigest), "CONTENT_CHANGED", "El contenido cambió después de la revisión. Repite la preparación.", { status: 409 });

    let commit = currentHead;
    if (operation.editorialPaths.length) {
      await this.git(["add", "-A", "--", ...operation.editorialPaths]);
      const staged = await this.stagedPaths();
      const forbidden = staged.filter((relative) => !isEditorialPath(relative));
      if (forbidden.length) {
        await this.git(["reset"], { acceptedExitCodes: [0, 1] }).catch(() => {});
        throw new StudioError("STAGING_BOUNDARY_VIOLATION", "Git intentó preparar archivos fuera del contenido editorial.", {
          status: 500,
          details: { paths: forbidden },
        });
      }
      try {
        await this.git(["commit", "-m", operation.message], { timeoutMs: 120_000 });
        commit = await this.head();
      } catch (error) {
        await this.git(["reset"], { acceptedExitCodes: [0, 1] }).catch(() => {});
        throw error;
      }
      const committedPaths = (await this.git(["diff", "--name-only", "-z", currentHead, commit], { timeoutMs: 20_000 }))
        .stdout.split("\0").filter(Boolean);
      const committedOutsideBoundary = committedPaths.filter((relative) => !isEditorialPath(relative));
      assertStudio(
        !committedOutsideBoundary.length,
        "COMMIT_BOUNDARY_VIOLATION",
        "El commit local contiene archivos fuera del contenido editorial y no será enviado.",
        { status: 409, details: { commit, paths: committedOutsideBoundary } },
      );
    }

    try {
      await this.git(["push", "origin", `HEAD:refs/heads/${operation.branch}`], { timeoutMs: 180_000 });
    } catch (error) {
      this.pending.delete(input.confirmationId);
      throw new StudioError("PUSH_FAILED", "El commit quedó guardado localmente, pero GitHub rechazó la subida. No se usó force-push.", {
        status: 502,
        details: { commit, reason: error.details?.stderr || error.message },
      });
    }
    this.pending.delete(input.confirmationId);
    return { ok: true, commit, branch: operation.branch };
  }
}
