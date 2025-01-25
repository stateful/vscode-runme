export class RingBuffer<T> {
  private buffer: T[]
  private head: number
  private tail: number
  private size: number

  constructor(capacity: number) {
    this.buffer = new Array<T>(capacity)
    this.head = 0
    this.tail = 0
    this.size = 0
  }

  push(line: T): void {
    this.buffer[this.tail] = line
    this.tail = (this.tail + 1) % this.buffer.length
    if (this.size < this.buffer.length) {
      this.size++
    } else {
      this.head = (this.head + 1) % this.buffer.length
    }
  }

  get length(): number {
    return this.size
  }

  getAll(): T[] {
    const items: T[] = []
    for (let i = 0; i < this.size; i++) {
      const index = (this.head + i) % this.buffer.length
      items.push(this.buffer[index])
    }
    return items
  }
}
