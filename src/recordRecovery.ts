type Entry = { id: string; updated?: number; kind?: string; fields?: Record<string,string>; [key:string]:unknown }
// Archived flags preserve record deletions. Keep IDs from both snapshots,
// selecting newer records and preserving tasks created while disconnected.
export function recoverRecords(remote: Entry[], local: Entry[]): Entry[] {
  const entries = new Map(remote.map(entry => [entry.id, structuredClone(entry)]))
  for (const entry of local) {
    const saved = entries.get(entry.id)
    if (!saved) { entries.set(entry.id, structuredClone(entry)); continue }
    if ((entry.updated || 0) <= (saved.updated || 0)) continue
    const next = structuredClone(entry)
    if (entry.kind === 'projeto' && saved.kind === 'projeto') {
      try {
        const remoteDetails = JSON.parse(saved.fields?.['wendler:project:v1'] || '{}')
        const localDetails = JSON.parse(entry.fields?.['wendler:project:v1'] || '{}')
        const tasks = new Map((remoteDetails.tasks || []).map((task: Entry) => [task.id, task]))
        for (const task of localDetails.tasks || []) tasks.set(task.id, task)
        localDetails.tasks = [...tasks.values()]
        next.fields = { ...next.fields, 'wendler:project:v1': JSON.stringify(localDetails) }
      } catch { /* Original snapshots remain in the recovery backup. */ }
    }
    entries.set(entry.id, next)
  }
  return [...entries.values()]
}
