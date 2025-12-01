import { ipcMain } from "electron";

let queue: string[] = [];
let index: number = 0;

export function setQueueLocal(newQueue: string[]) {
  queue = newQueue;
}

export function setIndexLocal(newIndex: number) {
  index = newIndex;
}

export function getQueueLocal() {
  return queue;
}

export function getIndexLocal() {
  return index;
}

ipcMain.handle("music:setQueue", (_event, newQueue: string[]) => {
  queue = newQueue;
  return true;
});

ipcMain.handle("music:getQueue", () => queue);

ipcMain.handle("music:setIndex", (_event, newIndex: number) => {
  index = newIndex;
  return true;
});

ipcMain.handle("music:getCurrentIndex", () => index);
