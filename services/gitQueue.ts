
// Module 0: The Shell Core
// Simulates a FIFO queue to prevent index.lock errors and handle async Git processes.

type GitTask = {
    name: string;
    command: () => Promise<any>;
};

class GitProcessManager {
    private queue: GitTask[] = [];
    private isProcessing = false;
    private onStatusChange: ((isBusy: boolean, currentTask?: string) => void) | null = null;

    public setStatusListener(callback: (isBusy: boolean, currentTask?: string) => void) {
        this.onStatusChange = callback;
    }

    public async enqueue(name: string, command: () => Promise<any>): Promise<any> {
        return new Promise((resolve, reject) => {
            this.queue.push({
                name,
                command: async () => {
                    try {
                        const result = await command();
                        resolve(result);
                    } catch (e) {
                        reject(e);
                    }
                }
            });
            this.processQueue();
        });
    }

    private async processQueue() {
        if (this.isProcessing || this.queue.length === 0) return;

        this.isProcessing = true;
        const task = this.queue.shift();

        if (task && this.onStatusChange) {
            this.onStatusChange(true, task.name);
        }

        try {
            // Simulate process startup and env setup (GIT_TERMINAL_PROMPT=0)
            await new Promise(r => setTimeout(r, 400)); 
            if (task) await task.command();
        } catch (error) {
            console.error("Git Process Error:", error);
            alert(`Git Error: ${error}`);
        } finally {
            this.isProcessing = false;
            if (this.queue.length > 0) {
                this.processQueue();
            } else if (this.onStatusChange) {
                this.onStatusChange(false);
            }
        }
    }
}

export const gitQueue = new GitProcessManager();
