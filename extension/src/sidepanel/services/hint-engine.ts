/**
 * Progressive Hint Engine
 * 
 * Generates four levels of increasingly detailed hints for competitive
 * programming problems. Works entirely locally without an API key.
 * 
 * The engine uses keyword-based heuristics from the problem statement.
 * It clearly indicates that hints are heuristic-based, not AI-verified.
 * It never invents constraints, tags, or examples.
 */

import type { ProblemContext, Hint, HintLevel } from "@/types";

// ─── Pattern Definitions ────────────────────────────────────────────

interface PatternMatch {
  name: string;
  test: RegExp;
  direction: string;
  approach: string;
  implementation: string;
  complexity: string;
}

const PATTERNS: PatternMatch[] = [
  {
    name: "dynamic-programming",
    test: /\b(dp|dynamic programming|minimum cost|maximum profit|longest|shortest path|knapsack|memoiz|tabulation|optimal substructure|overlapping sub)/i,
    direction: "This problem may involve choosing an optimal sequence of decisions. Ask: 'Can I express the answer for a larger input in terms of answers for smaller inputs?'",
    approach: "Consider defining a DP state. What parameters change between subproblems? Common states include: position, remaining capacity, last element used, or bitmask of visited items. Start with a recursive solution, then memoize.",
    implementation: "Define your state clearly (e.g., dp[i] = ...). Write the base cases first. For each state, enumerate all valid transitions. Check if the DP table can be space-optimized (e.g., using only the previous row). Watch for 0-indexed vs 1-indexed off-by-one errors in your table.",
    complexity: "DP time = (number of states) × (transitions per state). Space = number of states. Check whether the product of state dimensions fits within the time limit. If O(n²) is too slow, consider monotonic stack/queue DP, divide & conquer optimization, or Knuth's optimization.",
  },
  {
    name: "bfs-matrix",
    test: /\b(matrix|grid|cell|neighbor|adjacent|4-directional|8-directional|flood|island|shortest distance|multi-source|01[- ]?matrix)\b/i,
    direction: "You're working with a grid. Identify what each cell represents and what you need to compute for each cell (e.g., minimum distance, reachability, connected component).",
    approach: "For shortest distances on an unweighted grid, BFS is the standard approach. For multi-source problems, initialize the BFS queue with all source cells at distance 0. Use a visited/distance array to avoid revisiting cells.",
    implementation: "Use a queue (or deque for 0-1 BFS). Process cells level by level. For each cell, check all 4 (or 8) neighbors. Only enqueue unvisited cells that satisfy the problem condition. Mark cells as visited when you enqueue them, not when you dequeue them (to avoid duplicates).",
    complexity: "BFS on a grid of size m×n runs in O(m·n) time and space. Each cell is processed at most once. Make sure your solution doesn't accidentally re-process cells (which would make it O((m·n)²)).",
  },
  {
    name: "two-pointers",
    test: /\b(two (sum|pointer)|pair|sorted array|three sum|container|water|trapping rain|window|subarray sum|target sum)\b/i,
    direction: "Look for a pair or range that satisfies a condition. If the array is sorted or can be sorted, two pointers moving from opposite ends or from the same direction may work.",
    approach: "Consider: can you use two pointers (one from each end of a sorted array), a hash map for complement lookups, or a sliding window for contiguous subarrays? The key question is how moving one pointer affects the other.",
    implementation: "Initialize pointers at appropriate positions. Define the loop invariant: what is always true about the elements between/outside the pointers? Handle the case when both pointers meet. Watch for duplicate handling if the problem asks for unique results.",
    complexity: "Two-pointer approaches typically run in O(n) after an optional O(n log n) sort. Space is O(1) if you don't need to store results. Hash map approaches are O(n) time and O(n) space.",
  },
  {
    name: "binary-search",
    test: /\b(binary search|sorted|median|kth smallest|kth largest|search.*rotated|peak element|first.*last position|lower.bound|upper.bound)\b/i,
    direction: "Check whether the answer space has a monotonic property (if X works, then all values ≥ X also work, or vice versa). This makes binary search applicable.",
    approach: "Binary search on the answer or on an array index. Define clearly: what does your predicate check? Ensure it's monotonic. Choose between (lo, hi) inclusive vs. exclusive boundaries and stick with one convention.",
    implementation: "Common pitfall: infinite loops from incorrect mid calculation or boundary updates. Use `mid = lo + (hi - lo) / 2` to avoid overflow. Check: does your loop terminate? Does the final answer need to be lo, hi, or mid? Test with arrays of length 1 and 2.",
    complexity: "Binary search runs in O(log n) iterations. If each predicate check is O(n), total is O(n log n). If the predicate involves another binary search, total is O(n log² n).",
  },
  {
    name: "graph-general",
    test: /\b(graph|vertex|vertices|edge|directed|undirected|connected|component|cycle|topological|shortest path|dijkstra|bellman|strongly connected|bipartite)\b/i,
    direction: "Model the problem as a graph: what are the nodes and edges? Is the graph directed or undirected? Weighted or unweighted? Look for the required property: path existence, shortest path, cycle detection, or component structure.",
    approach: "BFS for unweighted shortest paths. DFS for connectivity, cycle detection, or topological sort. Dijkstra for weighted non-negative shortest paths. Union-Find for dynamic connectivity. Topological sort for DAG ordering.",
    implementation: "Build an adjacency list. Track visited states. For DFS, consider both iterative (safer for deep graphs) and recursive implementations. For Dijkstra, use a priority queue and skip already-finalized nodes. For topological sort, verify the graph is a DAG.",
    complexity: "BFS/DFS: O(V + E). Dijkstra with a min-heap: O((V + E) log V). Bellman-Ford: O(V·E). Floyd-Warshall: O(V³). Choose based on graph density and whether you need single-source or all-pairs shortest paths.",
  },
  {
    name: "tree",
    test: /\b(tree|binary tree|bst|binary search tree|root|leaf|subtree|ancestor|height|depth|diameter|traversal|preorder|inorder|postorder|level order)\b/i,
    direction: "Understand the tree structure: is it binary, n-ary, or a general rooted tree? What property needs to be computed at each node? Often tree problems reduce to 'compute something for each subtree.'",
    approach: "Consider DFS (recursion) returning values up from subtrees. For level-order problems, use BFS. For LCA or ancestor queries, consider binary lifting or Euler tour. For BST problems, exploit the sorted property.",
    implementation: "Handle null/empty nodes as base cases. For recursive solutions, define clearly what each call returns. Watch for the distinction between node depth (from root) and height (from leaves). For BST validation, pass valid ranges down.",
    complexity: "Most tree DFS/BFS solutions are O(n) where n is the number of nodes. Space is O(h) for recursive DFS (where h is the height), O(n) for BFS, or O(n) for unbalanced trees.",
  },
  {
    name: "sliding-window",
    test: /\b(sliding window|subarray|substring|contiguous|at most k|exactly k|minimum window|maximum length|longest substring)\b/i,
    direction: "You're looking for a contiguous subarray or substring that optimizes something or satisfies a constraint. The sliding window technique maintains a valid window and adjusts its boundaries.",
    approach: "Use two pointers (left, right) representing the window. Expand right to include more elements. When the window violates the constraint, shrink from the left. Track the optimal window seen so far.",
    implementation: "Maintain a frequency map, running sum, or other aggregate as the window changes. Update it incrementally (O(1) per step) rather than recomputing. Handle the 'exactly k' pattern by computing 'at most k' minus 'at most k-1'.",
    complexity: "Sliding window is O(n) because each element is added and removed at most once. Space depends on the auxiliary data structure (often O(k) for a frequency map of k distinct elements).",
  },
  {
    name: "string",
    test: /\b(string|palindrome|anagram|subsequence|lexicographic|character frequency|pattern matching|regex|suffix|prefix|trie|kmp|rabin.karp)\b/i,
    direction: "Identify whether the problem cares about: character frequencies, ordering, contiguous substrings, or subsequences. Try small examples with repeated characters and all-distinct characters.",
    approach: "For frequency problems: use a hash map or array of size 26. For palindromes: consider expanding from center or DP. For pattern matching: KMP or hashing. For prefix queries: consider a Trie.",
    implementation: "Watch for case sensitivity, Unicode, and empty string edge cases. When using character arrays, ensure proper indexing (c - 'a' for lowercase). For palindrome checks, handle even-length and odd-length separately.",
    complexity: "String hashing is O(n). KMP is O(n + m). Naive palindrome check is O(n²) but Manacher's is O(n). Trie operations are O(L) per word where L is word length.",
  },
  {
    name: "greedy",
    test: /\b(greedy|interval|scheduling|activity selection|minimum number|maximum number|coins|change|huffman|fractional)\b/i,
    direction: "Check if making a locally optimal choice at each step leads to a globally optimal solution. Try to identify the greedy criterion: what should you prioritize at each step?",
    approach: "Sort by the greedy criterion (e.g., by end time for interval scheduling, by ratio for fractional knapsack). Process elements in order, making the locally best choice. Try to prove correctness by exchange argument or contradiction.",
    implementation: "After sorting, iterate through elements and apply the greedy rule. Track the current state (e.g., last end time, remaining capacity). Handle ties carefully — the tie-breaking rule can affect correctness.",
    complexity: "Greedy algorithms are typically O(n log n) due to sorting, with O(n) processing. If no sorting is needed, they can be O(n).",
  },
  {
    name: "stack-queue",
    test: /\b(stack|queue|monotonic|next greater|next smaller|parentheses|brackets|valid|balanced|histogram|largest rectangle)\b/i,
    direction: "Look for patterns where you process elements and need to remember 'pending' items. Stacks handle LIFO (last in, first out) patterns; queues handle FIFO patterns. Monotonic stacks/queues maintain sorted order.",
    approach: "For next-greater/smaller element: use a monotonic stack. For bracket matching: use a regular stack. For sliding window min/max: use a monotonic deque. Push candidates and pop when the invariant is violated.",
    implementation: "Define the stack invariant clearly (e.g., 'stack contains indices of elements in decreasing order'). Process the remaining stack elements after the main loop — they often represent unsatisfied conditions. Use indices instead of values when you need position information.",
    complexity: "Monotonic stack/queue solutions are O(n) amortized: each element is pushed and popped at most once. Space is O(n) in the worst case.",
  },
  {
    name: "bit-manipulation",
    test: /\b(bit|xor|and|or|bitmask|bitwise|subset|power set|single number|missing number|hamming)\b/i,
    direction: "Think about the binary representation of the numbers involved. XOR is particularly useful: a ⊕ a = 0, a ⊕ 0 = a. Bitmasks can represent subsets of small sets.",
    approach: "For finding unique elements: XOR all values. For subset enumeration with n ≤ 20: iterate over all 2^n bitmasks. For checking specific bits: use AND with a mask. For counting bits: use Brian Kernighan's algorithm.",
    implementation: "Watch for signed vs unsigned integer differences. In C++, shifting by the width of the type is undefined behavior. Use `1LL << k` for 64-bit shifts. Test with 0, powers of 2, and all-bits-set values.",
    complexity: "Bit operations are O(1). Subset enumeration over n elements is O(2^n), feasible for n ≤ 20-25. Bit counting is O(number of set bits) with Kernighan's method.",
  },
  {
    name: "array-general",
    test: /\b(array|subarray|subsequence|element|integer|sequence|vector|list|rotate|reverse|merge|partition|frequency|count|duplicate)\b/i,
    direction: "Focus on the sequence: do you need a contiguous range, a subsequence, a frequency count, or a pair? Write down what information you need to remember while scanning.",
    approach: "Consider: frequency map for counting, sorting for ordering, prefix sums for range queries, two pointers for pair finding, or a single scan with a running aggregate.",
    implementation: "Handle empty arrays, single-element arrays, and all-same-element arrays. Watch for 0-indexed vs 1-indexed boundaries. When modifying an array in-place, be careful about the iteration direction.",
    complexity: "Single scan: O(n). With hash map: O(n) average. Sorting-based: O(n log n). Prefix sums: O(n) precomputation, O(1) per query. Nested scans: O(n²) — check if this fits the constraints.",
  },
];

// ─── Hint Generation ────────────────────────────────────────────────

export function generateHints(context: ProblemContext): Hint[] {
  const text = `${context.title} ${context.statement} ${context.examples} ${context.constraints}`.toLowerCase();
  const title = context.title || "this problem";

  // Find matching patterns
  const matches = PATTERNS.filter((p) => p.test.test(text));

  // If no specific pattern matches, use generic advice
  if (matches.length === 0) {
    return generateGenericHints(title, context);
  }

  // Use the first (most specific) match as primary, others as supplements
  const primary = matches[0];
  const secondary = matches.length > 1 ? matches[1] : null;

  const hints: Hint[] = [
    {
      level: 1,
      title: "Direction",
      content: `For "${title}":\n\n${primary.direction}${secondary ? `\n\nAlso consider: ${secondary.direction.split(".")[0]}.` : ""}\n\nBefore jumping to code, restate the goal in one sentence and try a tiny example by hand.`,
      isHeuristic: true,
    },
    {
      level: 2,
      title: "Approach",
      content: `Candidate approach:\n\n${primary.approach}${secondary ? `\n\nAlternative angle:\n${secondary.approach.split(".")[0]}.` : ""}\n\n⚠️ These are candidate techniques inferred from keywords in the problem statement. The actual intended solution may differ.`,
      isHeuristic: true,
    },
    {
      level: 3,
      title: "Implementation",
      content: `Implementation guidance:\n\n${primary.implementation}\n\nGeneral checklist:\n• Handle empty/minimum input\n• Handle duplicate values and boundary cases\n• Verify loop boundaries match the problem's indexing\n• Write down your invariant: what is guaranteed to be true before and after each iteration?`,
      isHeuristic: true,
    },
    {
      level: 4,
      title: "Complexity & Validation",
      content: `Complexity analysis:\n\n${primary.complexity}\n\nValidation steps:\n• Test with the smallest valid input\n• Test with repeated values\n• Test with already sorted/reversed data (if relevant)\n• Test with the largest allowed values from the constraints\n• Compare your hand-traced output with the expected output\n• Check for integer overflow in intermediate calculations`,
      isHeuristic: true,
    },
  ];

  return hints;
}

function generateGenericHints(title: string, context: ProblemContext): Hint[] {
  const hasConstraints = context.constraints.length > 0;

  return [
    {
      level: 1,
      title: "Direction",
      content: `For "${title}":\n\nRestate the goal in one sentence. Identify exactly what must be returned. Try the simplest example by hand before choosing any data structure or algorithm.\n\nAsk yourself: what is the key observation that makes this problem solvable efficiently?`,
      isHeuristic: true,
    },
    {
      level: 2,
      title: "Approach",
      content: `Look for a simple baseline solution first. Then ask what repeated work it performs and whether that work can be cached, counted, or avoided.\n\nCommon techniques to consider:\n• Hash map for O(1) lookups\n• Sorting to impose order\n• Two pointers or sliding window for linear scans\n• DFS/BFS for graph or tree structures\n• Dynamic programming for optimization over subproblems\n• Binary search if the answer space is monotonic\n\n⚠️ No specific pattern was detected. Consider multiple approaches.`,
      isHeuristic: true,
    },
    {
      level: 3,
      title: "Implementation",
      content: `Implementation checklist:\n\n• Handle empty/minimum input\n• Handle duplicate values and boundary cases\n• Verify loop boundaries\n• Check integer overflow\n• Ensure correct input/output format\n• Write down your invariant\n\nTest with at least 3 examples: the smallest valid input, a typical case, and an edge case.`,
      isHeuristic: true,
    },
    {
      level: 4,
      title: "Complexity & Validation",
      content: `Use the constraints to estimate the maximum number of operations:\n• A nested scan is often O(n²)\n• Sorting is usually O(n log n)\n• A single pass is O(n)${hasConstraints ? "\n\nRe-read the constraints carefully: they usually rule out at least one tempting brute-force approach." : ""}\n\nValidate your approach with a hand-worked example and compare the result with the expected output.`,
      isHeuristic: true,
    },
  ];
}
