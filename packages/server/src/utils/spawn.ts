import type { ChildProcess, SpawnOptions } from "node:child_process";
import { fileURLToPath } from "node:url";
import { spawnProcess as spawnCli, execCommand as execCli } from "@getpaseo/plugin/server";
import { createExternalCommandProcessEnv, type ProcessEnvRecord } from "../server/paseo-env.js";

interface ExternalEnvOptions {
  baseEnv?: ProcessEnvRecord;
  envMode?: "external" | "internal";
  env?: ProcessEnvRecord;
  envOverlay?: ProcessEnvRecord;
}

export type SpawnProcessOptions = Omit<SpawnOptions, "env"> & ExternalEnvOptions;

interface ExecCommandOptions extends ExternalEnvOptions {
  cwd?: string;
  encoding?: BufferEncoding;
  killSignal?: NodeJS.Signals;
  timeout?: number;
  maxBuffer?: number;
  shell?: boolean | string;
  signal?: AbortSignal;
}

interface ExecCommandResult {
  stdout: string;
  stderr: string;
}

function createWorkingDirectoryEnv(cwd: SpawnOptions["cwd"]): ProcessEnvRecord {
  if (process.platform === "win32" || cwd === undefined) return {};
  return { PWD: typeof cwd === "string" ? cwd : fileURLToPath(cwd) };
}

export function spawnProcess(
  command: string,
  args: string[],
  options?: SpawnProcessOptions,
): ChildProcess {
  const { baseEnv, env, envOverlay, ...spawnOptions } = options ?? {};
  const resolvedBaseEnv = env ?? baseEnv ?? process.env;
  const workingDirectoryEnv = createWorkingDirectoryEnv(spawnOptions.cwd);
  const childEnv =
    options?.envMode === "internal"
      ? ({ ...resolvedBaseEnv, ...envOverlay, ...workingDirectoryEnv } as NodeJS.ProcessEnv)
      : createExternalCommandProcessEnv(
          command,
          resolvedBaseEnv,
          ...(envOverlay ? [envOverlay] : []),
          workingDirectoryEnv,
        );

  return spawnCli(command, args, {
    ...spawnOptions,
    env: childEnv,
    signal: options?.signal,
  });
}

export async function execCommand(
  command: string,
  args: string[],
  options?: ExecCommandOptions,
): Promise<ExecCommandResult> {
  const { baseEnv, env, envOverlay } = options ?? {};
  const resolvedBaseEnv = env ?? baseEnv ?? process.env;
  const workingDirectoryEnv = createWorkingDirectoryEnv(options?.cwd);
  const childEnv =
    options?.envMode === "internal"
      ? ({ ...resolvedBaseEnv, ...envOverlay, ...workingDirectoryEnv } as NodeJS.ProcessEnv)
      : createExternalCommandProcessEnv(
          command,
          resolvedBaseEnv,
          ...(envOverlay ? [envOverlay] : []),
          workingDirectoryEnv,
        );

  return execCli(command, args, {
    cwd: options?.cwd,
    env: childEnv,
    shell: options?.shell,
    encoding: options?.encoding ?? "utf8",
    signal: options?.signal,
    killSignal: options?.killSignal,
    timeout: options?.timeout,
    maxBuffer: options?.maxBuffer,
  }) as Promise<ExecCommandResult>;
}
