"use client";
import type { AnalysisRun, Claim, ExtractionRecord, RetrievalRun, Material, Project, SavedEvidence } from "./types";
import { importNotebook, type Capture } from './notebook';
export interface ResearchRepository {
  list(): Promise<Project[]>;
  get(id: string): Promise<Project | undefined>;
  create(title: string, question: string): Promise<Project>;
  update(project: Project): Promise<void>;
  remove(id: string): Promise<void>;
  materials(id: string): Promise<Material[]>;
  evidence(id: string): Promise<SavedEvidence[]>;
  saveMaterial(material: Material): Promise<void>;
  saveEvidence(evidence: SavedEvidence): Promise<void>;
  claims(id: string): Promise<Claim[]>;
  retrievals(id: string): Promise<RetrievalRun[]>;
  analyses(id: string): Promise<AnalysisRun[]>;
  saveClaims(claims: Claim[]): Promise<void>;
  removeClaim(id: string): Promise<void>;
  saveRetrieval(run: RetrievalRun): Promise<void>;
  saveAnalysis(run: AnalysisRun): Promise<void>;
  saveAnalysisNote(id: string, note: string): Promise<void>;
  extraction(projectId: string, materialId: string): Promise<ExtractionRecord | undefined>;
  saveExtraction(claims: Claim[], record: ExtractionRecord): Promise<void>;
}
let connection: Promise<IDBDatabase> | undefined;
function db() {
  if (!connection)
    connection = new Promise((resolve, reject) => {
      const request = indexedDB.open("tabayyun-research", 4);
      request.onupgradeneeded = () => {
        for (const name of ["projects", "materials", "evidence", "claims", "retrievals", "analyses", "extractions", "imports"])
          if (!request.result.objectStoreNames.contains(name)) request.result.createObjectStore(name, { keyPath: "id" });
      };
      request.onsuccess = () => {
        request.result.onversionchange = () => {
          request.result.close();
          connection = undefined;
        };
        resolve(request.result);
      };
      request.onerror = () => {
        connection = undefined;
        reject(
          new Error(
            "Device storage is unavailable. Check browser storage permissions.",
          ),
        );
      };
      request.onblocked = () => {
        connection = undefined;
        reject(new Error("Close other TABAYYUN tabs and retry."));
      };
    });
  return connection;
}
async function all<T>(store: string): Promise<T[]> {
  const database = await db();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(store, "readonly");
    const r = tx.objectStore(store).getAll();
    tx.oncomplete = () => resolve(r.result);
    tx.onerror = () => reject(new Error("Could not read device storage."));
  });
}
async function mutate(action: (tx: IDBTransaction) => void) {
  const database = await db();
  return new Promise<void>((resolve, reject) => {
    const tx = database.transaction(
      ["projects", "materials", "evidence", "claims", "retrievals", "analyses", "extractions", "imports"],
      "readwrite",
    );
    tx.oncomplete = () => resolve();
    tx.onerror = tx.onabort = () =>
      reject(
        new Error("Could not save. Device storage may be full or unavailable."),
      );
    try {
      action(tx);
    } catch (error) {
      tx.abort();
      reject(error);
    }
  });
}
function touch(tx: IDBTransaction, id: string) {
  const store = tx.objectStore("projects");
  const r = store.get(id);
  r.onsuccess = () => {
    if (!r.result) {
      tx.abort();
      return;
    }
    store.put({ ...r.result, updatedAt: new Date().toISOString() });
  };
}
export const repository: ResearchRepository = {
  list: async () =>
    (await all<Project>("projects")).sort((a, b) =>
      b.updatedAt.localeCompare(a.updatedAt),
    ),
  get: async (id) => (await all<Project>("projects")).find((p) => p.id === id),
  create: async (title, researchQuestion) => {
    const now = new Date().toISOString();
    const p = {
      id: crypto.randomUUID(),
      title,
      researchQuestion,
      createdAt: now,
      updatedAt: now,
    };
    await mutate((tx) => tx.objectStore("projects").add(p));
    return p;
  },
  update: async (p) => {
    await mutate((tx) => {
      const s = tx.objectStore("projects");
      const r = s.get(p.id);
      r.onsuccess = () => {
        if (!r.result) {
          tx.abort();
          return;
        }
        s.put({ ...p, updatedAt: new Date().toISOString() });
      };
    });
  },
  remove: async (id) => {
    await mutate((tx) => {
      tx.objectStore("projects").delete(id);
      for (const name of ["materials", "evidence", "claims", "retrievals", "analyses", "extractions", "imports"]) {
        const s = tx.objectStore(name);
        const r = s.openCursor();
        r.onsuccess = () => {
          const cursor = r.result;
          if (cursor) {
            if (cursor.value.projectId === id) cursor.delete();
            cursor.continue();
          }
        };
      }
    });
  },
  materials: async (id) =>
    (await all<Material>("materials")).filter((m) => m.projectId === id),
  evidence: async (id) =>
    (await all<SavedEvidence>("evidence")).filter((e) => e.projectId === id),
  saveMaterial: async (m) => {
    await mutate((tx) => {
      touch(tx, m.projectId);
      const store = tx.objectStore("materials");
      const request = store.get(m.id);
      request.onsuccess = () => {
        const previous = request.result as Material | undefined;
        store.put({ ...m, revision: previous ? (previous.revision ?? 1) + (previous.editedText !== m.editedText ? 1 : 0) : 1 });
      };
    });
  },
  saveEvidence: async (e) => {
    await mutate((tx) => {
      touch(tx, e.projectId);
      tx.objectStore("evidence").put({
        ...e,
        id: `${e.projectId}:${e.passageId}`,
      });
    });
  },
  claims: async id => (await all<Claim>("claims")).filter(c => c.projectId === id),
  retrievals: async id => (await all<RetrievalRun>("retrievals")).filter(r => r.projectId === id),
  analyses: async id => (await all<AnalysisRun>("analyses")).filter(r => r.projectId === id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  extraction: async (projectId, materialId) => (await all<ExtractionRecord>("extractions")).find(r => r.projectId === projectId && r.materialId === materialId),
  saveExtraction: async (claims, record) => {
    await mutate(tx => {
      touch(tx, record.projectId);
      const request = tx.objectStore("materials").get(record.materialId);
      request.onsuccess = () => {
        if (!request.result || request.result.projectId !== record.projectId || (request.result.revision ?? 1) !== record.materialRevision || claims.some(c => c.projectId !== record.projectId || c.materialId !== record.materialId || c.materialRevision !== record.materialRevision)) { tx.abort(); return; }
        for (const claim of claims) tx.objectStore("claims").add(claim);
        tx.objectStore("extractions").put({ ...record, id: JSON.stringify([record.projectId, record.materialId]) });
      };
    });
  },
  saveClaims: async claims => {
    await mutate(tx => {
      for (const c of claims) {
        touch(tx, c.projectId);
        const material = tx.objectStore("materials").get(c.materialId);
        material.onsuccess = () => {
          if (!material.result || material.result.projectId !== c.projectId || (material.result.revision ?? 1) !== c.materialRevision) { tx.abort(); return; }
          const store = tx.objectStore("claims"), old = store.get(c.id);
          old.onsuccess = () => {
            if (old.result && old.result.revision >= c.revision) { tx.abort(); return; }
            store.put(c);
          };
        };
      }
    });
  },
  removeClaim: async id => { await mutate(tx => tx.objectStore("claims").delete(id)); },
  saveRetrieval: async run => {
    await mutate(tx => {
      touch(tx, run.projectId);
      const request = tx.objectStore("claims").get(run.claimId);
      request.onsuccess = () => {
        if (!request.result || request.result.revision !== run.claimRevision) { tx.abort(); return; }
        tx.objectStore("retrievals").add(run);
      };
    });
  },
  saveAnalysis: async run => {
    await mutate(tx => {
      touch(tx, run.projectId);
      const claim = tx.objectStore("claims").get(run.claimId), material = tx.objectStore("materials").get(run.materialId);
      material.onsuccess = () => {
        if (!claim.result || claim.result.revision !== run.claimRevision || !material.result || (material.result.revision ?? 1) !== run.materialRevision) { tx.abort(); return; }
        tx.objectStore("analyses").add(run);
      };
    });
  },
  saveAnalysisNote: async (id, note) => {
    await mutate(tx => {
      const store = tx.objectStore("analyses"), request = store.get(id);
      request.onsuccess = () => {
        if (!request.result) { tx.abort(); return; }
        touch(tx, request.result.projectId);
        store.put({ ...request.result, personalNote: note });
      };
    });
  },
};
export type ImportedCapture = Capture & { projectId: string; importedAt: string; provenance: 'user-provided' };
export async function importedCaptures(projectId: string) { return (await all<ImportedCapture>('imports')).filter(c => c.projectId === projectId); }
export async function saveNotebookImport(projectId: string, input: unknown) {
  const captures = importNotebook(input);
  await mutate(tx => {
    touch(tx,projectId);
    for (const capture of captures) {
      const id = JSON.stringify([projectId,capture.id]);
      const store = tx.objectStore('imports'); const existing = store.get(id);
      existing.onsuccess = () => {
        // Same export is idempotent; newer capture revisions update the single record.
        if (!existing.result || existing.result.revision <= capture.revision) store.put({ ...capture,id,projectId,importedAt:new Date().toISOString(),provenance:'user-provided' });
      };
    }
  });
  return captures.length;
}
