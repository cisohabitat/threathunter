// Emergency read path: no engine/content imports, validation, upgrades or writes.
export function readStoredRow(
  databaseName: string,
  storeName: string,
  key: string,
): Promise<unknown | null> {
  if (
    ![
      "threat-hunter-v1",
      "threat-hunter-campaign-v1",
      "threat-hunter-expansion-v1",
    ].includes(databaseName) ||
    !["runs", "rows"].includes(storeName)
  )
    return Promise.reject(Error("Unsupported recovery namespace"));
  return new Promise((resolve, reject) => {
    let absent = false;
    const request = indexedDB.open(databaseName);
    request.onupgradeneeded = () => {
      absent = true;
      request.transaction?.abort();
    };
    request.onerror = () =>
      absent
        ? resolve(null)
        : reject(Error("Stored recovery data could not be opened"));
    request.onsuccess = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.close();
        reject(Error("The selected store is unavailable"));
        return;
      }
      const tx = db.transaction(storeName, "readonly"),
        read = tx.objectStore(storeName).get(key);
      let result: unknown | null = null;
      read.onsuccess = () => {
        result = read.result ?? null;
      };
      tx.oncomplete = () => {
        db.close();
        resolve(result);
      };
      tx.onabort = tx.onerror = () => {
        db.close();
        reject(Error("The selected recovery read did not complete"));
      };
    };
  });
}
