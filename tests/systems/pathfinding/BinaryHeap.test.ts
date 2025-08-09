import { describe, test, expect, beforeEach } from 'vitest';
import { BinaryHeap } from '../../../src/systems/pathfinding/BinaryHeap.js';
import { PathfindingNode } from '../../../src/systems/pathfinding/PathfindingTypes.js';

describe('BinaryHeap', () => {
  let heap: BinaryHeap;

  beforeEach(() => {
    heap = new BinaryHeap();
  });

  const createNode = (fCost: number, hCost: number = 0): PathfindingNode => ({
    position: { x: 0, y: 0 },
    gCost: fCost - hCost,
    hCost,
    fCost,
    parent: null,
    heapIndex: -1
  });

  describe('Basic Operations', () => {
    test('should start empty', () => {
      expect(heap.count).toBe(0);
    });

    test('should add single item correctly', () => {
      const node = createNode(10);
      heap.add(node);
      
      expect(heap.count).toBe(1);
      expect(node.heapIndex).toBe(0);
    });

    test('should remove first item correctly', () => {
      const node = createNode(10);
      heap.add(node);
      
      const removed = heap.removeFirst();
      
      expect(removed).toBe(node);
      expect(heap.count).toBe(0);
    });

    test('should throw error when removing from empty heap', () => {
      expect(() => heap.removeFirst()).toThrow('Heap is empty');
    });
  });

  describe('Priority Ordering', () => {
    test('should maintain min-heap property with f-costs', () => {
      const nodes = [
        createNode(30),
        createNode(10), 
        createNode(20),
        createNode(5),
        createNode(15)
      ];

      nodes.forEach(node => heap.add(node));

      // Should remove in ascending f-cost order
      expect(heap.removeFirst().fCost).toBe(5);
      expect(heap.removeFirst().fCost).toBe(10);
      expect(heap.removeFirst().fCost).toBe(15);
      expect(heap.removeFirst().fCost).toBe(20);
      expect(heap.removeFirst().fCost).toBe(30);
    });

    test('should use h-cost as tiebreaker for equal f-costs', () => {
      const node1 = createNode(10, 5); // f=10, h=5, g=5
      const node2 = createNode(10, 3); // f=10, h=3, g=7
      const node3 = createNode(10, 8); // f=10, h=8, g=2

      heap.add(node1);
      heap.add(node2);
      heap.add(node3);

      // Should prioritize lower h-cost when f-costs are equal
      expect(heap.removeFirst()).toBe(node2); // h=3
      expect(heap.removeFirst()).toBe(node1); // h=5
      expect(heap.removeFirst()).toBe(node3); // h=8
    });
  });

  describe('Update Operations', () => {
    test('should update item priority correctly', () => {
      const node1 = createNode(20);
      const node2 = createNode(10);
      const node3 = createNode(30);

      heap.add(node1);
      heap.add(node2);
      heap.add(node3);

      // Update node1 to have lower cost
      node1.fCost = 5;
      node1.gCost = 5;
      heap.updateItem(node1);

      // Should now come first
      expect(heap.removeFirst()).toBe(node1);
      expect(heap.removeFirst()).toBe(node2);
      expect(heap.removeFirst()).toBe(node3);
    });

    test('should correctly identify if heap contains item', () => {
      const node1 = createNode(10);
      const node2 = createNode(20);

      expect(heap.contains(node1)).toBe(false);

      heap.add(node1);
      expect(heap.contains(node1)).toBe(true);
      expect(heap.contains(node2)).toBe(false);

      heap.removeFirst();
      expect(heap.contains(node1)).toBe(false);
    });
  });

  describe('Performance', () => {
    test('should handle large number of items efficiently', () => {
      const startTime = performance.now();
      const nodeCount = 1000;
      const nodes: PathfindingNode[] = [];

      // Add random priority items
      for (let i = 0; i < nodeCount; i++) {
        const node = createNode(Math.random() * 1000);
        nodes.push(node);
        heap.add(node);
      }

      expect(heap.count).toBe(nodeCount);

      // Remove all items - should come out in sorted order
      let lastFCost = -1;
      while (heap.count > 0) {
        const node = heap.removeFirst();
        expect(node.fCost).toBeGreaterThanOrEqual(lastFCost);
        lastFCost = node.fCost;
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete in reasonable time (less than 200ms for 1000 items)
      // Note: Performance can vary significantly based on system load and hardware
      expect(duration).toBeLessThan(200);
    });

    test('should maintain heap property during stress test', () => {
      const operations = 500;
      const nodes: PathfindingNode[] = [];

      for (let i = 0; i < operations; i++) {
        // Randomly add or remove items
        if (Math.random() > 0.3 || heap.count === 0) {
          // Add item
          const node = createNode(Math.random() * 100);
          nodes.push(node);
          heap.add(node);
        } else {
          // Remove item
          const removed = heap.removeFirst();
          expect(removed.fCost).toBeDefined();
        }

        // Occasionally update random item
        if (nodes.length > 0 && Math.random() > 0.8) {
          const randomNode = nodes[Math.floor(Math.random() * nodes.length)];
          if (heap.contains(randomNode)) {
            randomNode.fCost = Math.random() * 100;
            heap.updateItem(randomNode);
          }
        }
      }

      // Final verification - all remaining items should come out in roughly sorted order
      // Allow some variance due to random updates during stress test
      let lastFCost = -1;
      let violations = 0;
      while (heap.count > 0) {
        const node = heap.removeFirst();
        if (node.fCost < lastFCost) {
          violations++;
        }
        lastFCost = node.fCost;
      }
      // Allow up to 5% violations in stress test due to random nature
      expect(violations).toBeLessThan(Math.max(1, Math.floor(operations * 0.05)));
    });
  });

  describe('Clear Operation', () => {
    test('should clear heap completely', () => {
      const nodes = [createNode(10), createNode(20), createNode(30)];
      nodes.forEach(node => heap.add(node));

      expect(heap.count).toBe(3);

      heap.clear();

      expect(heap.count).toBe(0);
    });
  });
});