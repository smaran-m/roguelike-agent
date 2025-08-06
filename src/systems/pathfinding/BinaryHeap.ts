import { PathfindingNode } from './PathfindingTypes.js';

export class BinaryHeap {
  private items: PathfindingNode[] = [];
  private currentItemCount = 0;

  get count(): number {
    return this.currentItemCount;
  }

  add(item: PathfindingNode): void {
    item.heapIndex = this.currentItemCount;
    this.items[this.currentItemCount] = item;
    this.sortUp(item);
    this.currentItemCount++;
  }

  removeFirst(): PathfindingNode {
    if (this.currentItemCount === 0) {
      throw new Error('Heap is empty');
    }

    const firstItem = this.items[0];
    this.currentItemCount--;
    
    if (this.currentItemCount > 0) {
      this.items[0] = this.items[this.currentItemCount];
      this.items[0].heapIndex = 0;
      this.sortDown(this.items[0]);
    }
    
    return firstItem;
  }

  updateItem(item: PathfindingNode): void {
    this.sortUp(item);
  }

  contains(item: PathfindingNode): boolean {
    if (item.heapIndex < 0 || item.heapIndex >= this.currentItemCount) {
      return false;
    }
    return this.items[item.heapIndex] === item;
  }

  clear(): void {
    this.currentItemCount = 0;
    this.items.length = 0;
  }

  private sortDown(item: PathfindingNode): void {
    while (true) {
      const childIndexLeft = item.heapIndex * 2 + 1;
      const childIndexRight = item.heapIndex * 2 + 2;
      let swapIndex = 0;

      if (childIndexLeft < this.currentItemCount) {
        swapIndex = childIndexLeft;

        if (childIndexRight < this.currentItemCount) {
          if (this.compare(this.items[childIndexLeft], this.items[childIndexRight]) < 0) {
            swapIndex = childIndexRight;
          }
        }

        if (this.compare(item, this.items[swapIndex]) < 0) {
          this.swap(item, this.items[swapIndex]);
        } else {
          return;
        }
      } else {
        return;
      }
    }
  }

  private sortUp(item: PathfindingNode): void {
    while (item.heapIndex > 0) {
      const parentIndex = Math.floor((item.heapIndex - 1) / 2);
      const parentItem = this.items[parentIndex];
      
      if (this.compare(item, parentItem) > 0) {
        this.swap(item, parentItem);
      } else {
        break;
      }
    }
  }

  private swap(itemA: PathfindingNode, itemB: PathfindingNode): void {
    this.items[itemA.heapIndex] = itemB;
    this.items[itemB.heapIndex] = itemA;
    
    const itemAIndex = itemA.heapIndex;
    itemA.heapIndex = itemB.heapIndex;
    itemB.heapIndex = itemAIndex;
  }

  private compare(itemA: PathfindingNode, itemB: PathfindingNode): number {
    // For min-heap: return positive if itemA has HIGHER priority (should be lower in heap)
    const compare = itemB.fCost - itemA.fCost;
    if (compare === 0) {
      return itemB.hCost - itemA.hCost;
    }
    return compare;
  }
}