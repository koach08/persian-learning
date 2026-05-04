// All localStorage keys used by this app
const STORAGE_KEYS = [
  "guided-lesson-progress",
  "srs-cards",
  "custom-vocabulary",
  "persian-streak",
  "xp-data",
  "xp-goal-just-met",
  "cefr-progress",
  "mistake-history",
  "conversation-sessions",
  "adaptive-accuracy-log",
  "grammar-progress",
  "conversation-practice-results",
  "listening-history",
] as const;

export interface BackupData {
  version: 1;
  exportedAt: string;
  data: Record<string, string>;
}

export function exportAllData(): BackupData {
  const data: Record<string, string> = {};
  for (const key of STORAGE_KEYS) {
    const val = localStorage.getItem(key);
    if (val) data[key] = val;
  }
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    data,
  };
}

export function importAllData(backup: BackupData): { restored: number; keys: string[] } {
  const keys: string[] = [];
  for (const [key, value] of Object.entries(backup.data)) {
    localStorage.setItem(key, value);
    keys.push(key);
  }
  return { restored: keys.length, keys };
}

export function downloadBackup(): void {
  const backup = exportAllData();
  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `persian-backup-${new Date().toISOString().split("T")[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function restoreFromFile(file: File): Promise<{ restored: number; keys: string[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const backup = JSON.parse(reader.result as string) as BackupData;
        if (!backup.version || !backup.data) {
          reject(new Error("無効なバックアップファイルです"));
          return;
        }
        resolve(importAllData(backup));
      } catch {
        reject(new Error("ファイルの読み込みに失敗しました"));
      }
    };
    reader.onerror = () => reject(new Error("ファイルの読み込みに失敗しました"));
    reader.readAsText(file);
  });
}
