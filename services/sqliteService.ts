
// Simula o banco de dados SQLite embutido do NexusVC (similar ao TortoiseGit)
// Responsável por: Cache de Ícones, Histórico de URLs e Configurações de UI.

interface DBTable_StatusCache {
    filepath: string;
    status: string;
    last_checked: number;
}

interface DBTable_RepoHistory {
    name: string;
    url: string;
    last_accessed: number;
}

interface DBTable_Settings {
    key: string;
    value: any;
}

const DB_PREFIX = 'nexus_sqlite_v1_';

export const NexusDB = {
    // "Conecta" ao banco (carrega do disco/localStorage)
    connect: () => {
        console.log('[NexusDB] SQLite Embedded Service Started.');
        if (!localStorage.getItem(`${DB_PREFIX}init`)) {
            NexusDB.reset();
        }
    },

    // Tabela: status_cache (Otimização de Overlay Icons)
    cache: {
        upsert: (filepath: string, status: string) => {
            const key = `${DB_PREFIX}cache_${filepath}`;
            const record: DBTable_StatusCache = {
                filepath,
                status,
                last_checked: Date.now()
            };
            localStorage.setItem(key, JSON.stringify(record));
        },
        get: (filepath: string): string | null => {
            const key = `${DB_PREFIX}cache_${filepath}`;
            const raw = localStorage.getItem(key);
            if (!raw) return null;
            return JSON.parse(raw).status;
        },
        clear: () => {
            Object.keys(localStorage).forEach(k => {
                if (k.startsWith(`${DB_PREFIX}cache_`)) localStorage.removeItem(k);
            });
        },
        count: (): number => {
            let c = 0;
            Object.keys(localStorage).forEach(k => {
                if (k.startsWith(`${DB_PREFIX}cache_`)) c++;
            });
            return c;
        }
    },

    // Tabela: repo_history (Remotes conhecidos)
    remotes: {
        getAll: (): DBTable_RepoHistory[] => {
            const raw = localStorage.getItem(`${DB_PREFIX}remotes`);
            return raw ? JSON.parse(raw) : [];
        },
        save: (remotes: DBTable_RepoHistory[]) => {
            localStorage.setItem(`${DB_PREFIX}remotes`, JSON.stringify(remotes));
        },
        add: (name: string, url: string) => {
            const current = NexusDB.remotes.getAll();
            const updated = [...current.filter(r => r.name !== name), { name, url, last_accessed: Date.now() }];
            NexusDB.remotes.save(updated);
        },
        remove: (name: string) => {
            const current = NexusDB.remotes.getAll();
            NexusDB.remotes.save(current.filter(r => r.name !== name));
        }
    },

    // Tabela: user_preferences (Configurações da UI)
    settings: {
        get: (key: string, defaultValue: any) => {
            const raw = localStorage.getItem(`${DB_PREFIX}setting_${key}`);
            return raw ? JSON.parse(raw) : defaultValue;
        },
        set: (key: string, value: any) => {
            localStorage.setItem(`${DB_PREFIX}setting_${key}`, JSON.stringify(value));
        }
    },

    reset: () => {
        localStorage.setItem(`${DB_PREFIX}init`, 'true');
        localStorage.setItem(`${DB_PREFIX}remotes`, '[]');
    },

    purgeAll: () => {
        Object.keys(localStorage).forEach(k => {
            if (k.startsWith(DB_PREFIX)) localStorage.removeItem(k);
        });
        NexusDB.reset();
    }
};
