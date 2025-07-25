import { resolve } from "node:path";
import { loadConfig, setupDotenv } from "c12";
import { getLastGitTag, getCurrentGitRef } from "./git";
import { resolveRepoConfig, getRepoConfig } from "./repo";
import type { SemverBumpType } from "./semver";
import type { RepoConfig, RepoProvider } from "./repo";

export interface ChangelogConfig {
  cwd: string;
  types: Record<string, { title: string; semver?: SemverBumpType } | boolean>;
  scopeMap: Record<string, string>;
  repo?: RepoConfig | string;
  tokens: Partial<Record<RepoProvider, string>>;
  from: string;
  to: string;
  newVersion?: string;
  signTags?: boolean;
  output: string | false;
  publish: {
    args?: string[];
    tag?: string;
    private?: boolean;
  };
  templates: {
    commitMessage?: string;
    tagMessage?: string;
    tagBody?: string;
  };
  noAuthors: boolean;
  excludeAuthors: string[];
  hideAuthorEmail?: boolean;
  repoType?: RepoProvider | (string & {});
}

export type ResolvedChangelogConfig = Omit<ChangelogConfig, "repo"> & {
  repo: RepoConfig;
};

const defaultOutput = "CHANGELOG.md";
const getDefaultConfig = () =>
  <ChangelogConfig>{
    types: {
      feat: { title: "🚀 Enhancements", semver: "minor" },
      perf: { title: "🔥 Performance", semver: "patch" },
      fix: { title: "🩹 Fixes", semver: "patch" },
      refactor: { title: "💅 Refactors", semver: "patch" },
      docs: { title: "📖 Documentation", semver: "patch" },
      build: { title: "📦 Build", semver: "patch" },
      types: { title: "🌊 Types", semver: "patch" },
      chore: { title: "🏡 Chore" },
      examples: { title: "🏀 Examples" },
      test: { title: "✅ Tests" },
      style: { title: "🎨 Styles" },
      ci: { title: "🤖 CI" },
    },
    cwd: null,
    from: "",
    to: "",
    output: defaultOutput,
    scopeMap: {},
    tokens: {
      github:
        process.env.CHANGELOGEN_TOKENS_GITHUB ||
        process.env.GITHUB_TOKEN ||
        process.env.GH_TOKEN,
    },
    publish: {
      private: false,
      tag: "latest",
      args: [],
    },
    templates: {
      commitMessage: "chore(release): v{{newVersion}}",
      tagMessage: "v{{newVersion}}",
      tagBody: "v{{newVersion}}",
    },
    excludeAuthors: [],
    noAuthors: false,
    repoType: "github",
  };

export async function loadChangelogConfig(
  cwd: string,
  overrides?: Partial<ChangelogConfig>
): Promise<ResolvedChangelogConfig> {
  await setupDotenv({ cwd });
  const defaults = getDefaultConfig();
  const { config } = await loadConfig<ChangelogConfig>({
    cwd,
    name: "changelog",
    packageJson: true,
    defaults,
    overrides: {
      cwd,
      ...(overrides as ChangelogConfig),
    },
  });

  return await resolveChangelogConfig(config, cwd);
}

export async function resolveChangelogConfig(
  config: ChangelogConfig,
  cwd: string
) {
  if (!config.from) {
    config.from = await getLastGitTag(cwd);
  }

  if (!config.to) {
    config.to = await getCurrentGitRef(cwd);
  }

  if (config.output) {
    config.output = resolve(cwd, config.output);
  } else {
    config.output = false;
  }

  if (!config.repo) {
    config.repo = await resolveRepoConfig(cwd, config.repoType);
  }

  if (typeof config.repo === "string") {
    config.repo = getRepoConfig(config.repo, config.repoType);
  }

  return config as ResolvedChangelogConfig;
}
