/** Generic registry for extensible collections */
export class Registry<T> {
  private items = new Map<string, T>()

  register(key: string, value: T): void {
    this.items.set(key, value)
  }

  get(key: string): T | undefined {
    return this.items.get(key)
  }

  has(key: string): boolean {
    return this.items.has(key)
  }

  keys(): string[] {
    return [...this.items.keys()]
  }

  values(): T[] {
    return [...this.items.values()]
  }

  entries(): [string, T][] {
    return [...this.items.entries()]
  }

  unregister(key: string): boolean {
    return this.items.delete(key)
  }

  get size(): number {
    return this.items.size
  }
}
