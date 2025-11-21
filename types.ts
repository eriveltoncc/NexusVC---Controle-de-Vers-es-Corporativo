
export enum FileStatus {
  Unmodified = 'unmodified',
  Modified = 'M', // Porcelain: M
  Staged = 'A',   // Porcelain: A
  Untracked = '??', // Porcelain: ??
  Ignored = '!!', // Internal representation
  Conflicted = 'UU', // Porcelain: UU (Both modified)
  ModifiedStaged = 'MM' // Porcelain: MM (Staged but modified again)
}

export interface IFile {
  name: string;
  content: string;
  status: FileStatus;
  lastModified: number;
}

export interface ICommit {
  id: string;
  message: string;
  author: string;
  timestamp: number;
  changes: Record<string, string>;
  parent: string | null; // Primary parent
  secondaryParent?: string | null; // For merges
  tags?: string[];
  lane?: number; // For graph visualization (0 = master, 1 = feature, etc)
}

export interface IBranch {
  name: string;
  headCommitId: string | null;
  remoteHeadCommitId?: string | null;
}

export interface IRemote {
  name: string;
  url: string;
}

export interface IGithubConfig {
  connected: boolean;
  repoUrl: string;
  username: string;
  token: string;
}

export interface IRepoState {
  currentBranch: string;
  files: Record<string, string>; // Working directory content
  originalFiles: Record<string, string>; // HEAD content (for diffing)
  fileStatuses: Record<string, FileStatus>; // Cached statuses from watcher
  commits: ICommit[];
  remoteCommits: ICommit[];
  branches: IBranch[];
  remotes: IRemote[];
  github: IGithubConfig;
  gitIgnore: string[]; // List of ignored patterns
  mergeState: {
    isMerging: boolean;
    sourceBranch?: string;
    conflicts: string[]; // List of filenames with conflicts
    theirs: Record<string, string>; // Content from the incoming branch (for 3-way merge)
  };
}

export interface IContextMenu {
  visible: boolean;
  x: number;
  y: number;
  targetFile?: string;
}

export type TaskType = 'feature' | 'bugfix' | 'hotfix' | 'release';
