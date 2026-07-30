import { SystemPack } from "./types";
import { DnD2024SystemPack } from "./dnd2024";

class Registry {
  private packs = new Map<string, SystemPack>();

  constructor() {
    this.register(new DnD2024SystemPack());
  }

  register(pack: SystemPack) {
    this.packs.set(pack.id, pack);
  }

  getPack(id: string): SystemPack | undefined {
    return this.packs.get(id);
  }

  getAllPacks(): SystemPack[] {
    return Array.from(this.packs.values());
  }
}

export const SystemPackRegistry = new Registry();
