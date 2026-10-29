import type { QueryRequest, QueryResponse } from "../schemas/query-schema.js";

export function handleLocalMockQuery(req: QueryRequest): QueryResponse {
  const { type, problemTitle, problemStatement, constraints, userCode, hintLevel } = req;
  const lower = (problemTitle + " " + problemStatement).toLowerCase();

  if (type === "hint") {
    const level = hintLevel || 1;
    let hintText = "";
    if (level === 1) {
      hintText = `🧭 Level 1 (Direction): Focus on the core invariant for "${problemTitle}". Can you simplify the problem by sorting the input, maintaining a running prefix, or checking if the answer space is monotonic?`;
    } else if (level === 2) {
      hintText = `🔧 Level 2 (Approach): Notice how the constraints (${constraints || "standard"}) eliminate O(N²) brute force. If you maintain state across iterations using a hash map, monotonic stack, or two pointers, each element can be processed in O(1) amortized time.`;
    } else if (level === 3) {
      hintText = `⚙️ Level 3 (Implementation Details): Define your state transition or boundary condition clearly. Watch out for off-by-one indexing on bounds, and remember to update your accumulator or state before moving the window pointer.`;
    } else {
      hintText = `📊 Level 4 (Complexity & Proof): Target Time: O(N) or O(N log N). Space: O(N) auxiliary. Prove why this local choice is globally optimal: each element enters and leaves your active structure at most once.`;
    }

    return {
      ok: true,
      content: hintText,
      model: "codemate-local-engine",
    };
  }

  if (type === "explain") {
    let breakdown = `### Conceptual Breakdown: ${problemTitle}\n\n`;
    breakdown += `#### 1. What is really being asked?\n`;
    breakdown += `The problem asks us to find an optimal configuration or value while adhering to the specified conditions.\n\n`;

    breakdown += `#### 2. Key Pattern Recognition\n`;
    if (lower.includes("subarray") || lower.includes("substring")) {
      breakdown += `• **Contiguous Subarrays**: Often reducible via Prefix Sums + Hash Map, or Two Pointers / Sliding Window if monotonic.\n`;
    } else if (lower.includes("tree") || lower.includes("graph")) {
      breakdown += `• **Graph/Tree Topology**: Consider Depth-First Search (DFS) for subtree queries or Breadth-First Search (BFS) for unweighted shortest paths.\n`;
    } else if (lower.includes("maximum") || lower.includes("minimum")) {
      breakdown += `• **Optimization Objective**: Check if the problem exhibits optimal substructure (DP) or if a greedy strategy works by sorting.\n`;
    } else {
      breakdown += `• **State Reduction**: Identify the smallest tuple of parameters that uniquely identify your system state.\n`;
    }

    breakdown += `\n#### 3. Complexity Expectations\n`;
    if (constraints && (constraints.includes("10^5") || constraints.includes("2*10^5") || constraints.includes("100000"))) {
      breakdown += `• With N ≈ 10⁵, an O(N log N) or O(N) solution is mandatory to stay under the 1.0–2.0 second time limit.\n`;
    } else {
      breakdown += `• Design your algorithm to execute fewer than 10⁸ operations under worst-case inputs.\n`;
    }

    breakdown += `\n#### 4. Socratic Reflection\n`;
    breakdown += `Before writing code, ask yourself: *If I had already solved the problem for the first i elements, how would adding the (i+1)-th element change the answer?*`;

    return {
      ok: true,
      content: breakdown,
      model: "codemate-local-engine",
    };
  }

  if (type === "debug") {
    let debugText = `### Code Analysis & Pitfall Diagnosis\n\n`;

    if (!userCode || userCode.trim().length === 0) {
      debugText += `No user code provided. Paste your code in the Debug tab to diagnose logic errors.`;
    } else {
      const code = userCode;
      debugText += `#### Potential Pitfalls Detected in Submitted Code:\n`;

      if (code.includes("int ") && (/1e\d+/i.test(code) || code.includes("*") || code.includes("pow"))) {
        debugText += `• **Integer Overflow Warning**: Intermediate multiplications or large constants (e.g. 1e18) can easily exceed 2³¹ - 1 (approx 2.14 × 10⁹). Ensure variables and intermediate products use \`long long\` or 64-bit integers.\n`;
      }
      if (code.includes("<=") && (code.includes(".size()") || code.includes(".length"))) {
        debugText += `• **Unsigned Comparison**: Comparing \`i <= container.size()\` allows an out-of-bounds index access at \`i = size\`. Use \`<\` or check empty containers.\n`;
      }
      if (code.includes("vector") || code.includes("new int")) {
        debugText += `• **Reallocation Overhead**: If your solution runs on multiple test cases ($T$ cases), avoid reallocating dynamic containers inside inner loops. Clear or reuse pre-allocated vectors.\n`;
      }

      debugText += `\n#### Suggested Verification Test Cases:\n`;
      debugText += `1. **Single Element Test**: Does your code work when N = 1?\n`;
      debugText += `2. **All Identical Elements**: e.g., \`[0, 0, 0, 0]\` or \`[10^9, 10^9]\`.\n`;
      debugText += `3. **Degenerate Edge Inputs**: Negative numbers, zeros, or empty inputs.\n`;
      debugText += `4. **Modulo Verification**: Are modulo operations applied after EVERY addition/multiplication?`;
    }

    return {
      ok: true,
      content: debugText,
      model: "codemate-local-engine",
    };
  }

  if (type === "approaches") {
    let text = `### Multi-Approach Solution Guide: ${problemTitle}\n\n`;

    // Approach 1
    text += `### Approach 1: Brute Force Baseline (Exhaustive Pair Search)\n\n`;
    text += `#### 1. Intuition & High-Level Idea\n`;
    text += `Check every possible candidate pair or state combination using nested loops. This establishes a baseline for correctness without premature optimization.\n\n`;
    text += `#### 2. Complexity Analysis\n`;
    text += `• **Time Complexity**: $O(N^2)$ due to nested iterations.\n`;
    text += `• **Space Complexity**: $O(1)$ auxiliary memory.\n`;
    text += `• **Verdict**: Correct logic, but exceeds the ~1.0s limit (TLE) when $N \\ge 10^5$.\n\n`;
    text += `#### 3. Step-by-Step Logic Explanation\n`;
    text += `• **Step 1 (Outer Loop)**: Fix the first element index \`i\` from \`0\` to \`n - 1\`.\n`;
    text += `• **Step 2 (Inner Loop)**: Iterate \`j\` from \`i + 1\` to \`n - 1\` to avoid duplicate checks.\n`;
    text += `• **Step 3 (Condition & Return)**: Check if the pair satisfies the target condition; return indices immediately.\n\n`;
    text += `#### 4. Full Complete Code to Copy\n\n`;
    text += `\`\`\`cpp\n#include <vector>\nusing namespace std;\n\nclass Solution {\npublic:\n    vector<int> solve(vector<int>& nums, int target) {\n        int n = nums.size();\n        for (int i = 0; i < n; ++i) {\n            for (int j = i + 1; j < n; ++j) {\n                if (nums[i] + nums[j] == target) {\n                    return {i, j};\n                }\n            }\n        }\n        return {};\n    }\n};\n\`\`\`\n\n`;
    text += `\`\`\`java\nimport java.util.*;\n\nclass Solution {\n    public int[] solve(int[] nums, int target) {\n        int n = nums.length;\n        for (int i = 0; i < n; i++) {\n            for (int j = i + 1; j < n; j++) {\n                if (nums[i] + nums[j] == target) {\n                    return new int[]{i, j};\n                }\n            }\n        }\n        return new int[]{};\n    }\n}\n\`\`\`\n\n`;
    text += `\`\`\`python\nfrom typing import List\n\nclass Solution:\n    def solve(self, nums: List[int], target: int) -> List[int]:\n        n = len(nums)\n        for i in range(n):\n            for j in range(i + 1, n):\n                if nums[i] + nums[j] == target:\n                    return [i, j]\n        return []\n\`\`\`\n\n---\n\n`;

    // Approach 2
    text += `### Approach 2: Intermediate Optimization (Sorting & Two Pointers)\n\n`;
    text += `#### 1. Intuition & High-Level Idea\n`;
    text += `Sort the elements (or paired values with original indices) and converge from both ends with two pointers. If sum is too small, advance left; if too large, decrement right.\n\n`;
    text += `#### 2. Complexity Analysis\n`;
    text += `• **Time Complexity**: $O(N \\log N)$ dominated by sorting.\n`;
    text += `• **Space Complexity**: $O(N)$ auxiliary to store original index pairs.\n`;
    text += `• **Verdict**: Passes standard limits within ~0.15s; very cache-friendly.\n\n`;
    text += `#### 3. Step-by-Step Logic Explanation\n`;
    text += `• **Step 1 (Pair & Sort)**: Store \`(value, originalIndex)\` and sort ascendingly.\n`;
    text += `• **Step 2 (Two Pointers)**: Set \`left = 0\`, \`right = n - 1\`.\n`;
    text += `• **Step 3 (Shrink Window)**: While \`left < right\`, test \`sum\`. Advance \`left++\` if sum < target, else \`right--\`.\n\n`;
    text += `#### 4. Full Complete Code to Copy\n\n`;
    text += `\`\`\`cpp\n#include <vector>\n#include <algorithm>\nusing namespace std;\n\nclass Solution {\npublic:\n    vector<int> solve(vector<int>& nums, int target) {\n        int n = nums.size();\n        vector<pair<int, int>> indexed(n);\n        for (int i = 0; i < n; ++i) indexed[i] = {nums[i], i};\n        sort(indexed.begin(), indexed.end());\n        \n        int left = 0, right = n - 1;\n        while (left < right) {\n            int sum = indexed[left].first + indexed[right].first;\n            if (sum == target) return {indexed[left].second, indexed[right].second};\n            if (sum < target) left++;\n            else right--;\n        }\n        return {};\n    }\n};\n\`\`\`\n\n`;
    text += `\`\`\`java\nimport java.util.*;\n\nclass Solution {\n    public int[] solve(int[] nums, int target) {\n        int n = nums.length;\n        int[][] indexed = new int[n][2];\n        for (int i = 0; i < n; i++) indexed[i] = new int[]{nums[i], i};\n        Arrays.sort(indexed, (a, b) -> Integer.compare(a[0], b[0]));\n        \n        int left = 0, right = n - 1;\n        while (left < right) {\n            int sum = indexed[left][0] + indexed[right][0];\n            if (sum == target) return new int[]{indexed[left][1], indexed[right][1]};\n            if (sum < target) left++;\n            else right--;\n        }\n        return new int[]{};\n    }\n}\n\`\`\`\n\n`;
    text += `\`\`\`python\nfrom typing import List\n\nclass Solution:\n    def solve(self, nums: List[int], target: int) -> List[int]:\n        indexed = sorted([(val, idx) for idx, val in enumerate(nums)])\n        left, right = 0, len(nums) - 1\n        while left < right:\n            curr_sum = indexed[left][0] + indexed[right][0]\n            if curr_sum == target:\n                return [indexed[left][1], indexed[right][1]]\n            elif curr_sum < target:\n                left += 1\n            else:\n                right -= 1\n        return []\n\`\`\`\n\n---\n\n`;

    // Approach 3
    text += `### Approach 3: Peak Optimal State-of-the-Art (One-Pass Hash Map)\n\n`;
    text += `#### 1. Intuition & High-Level Idea\n`;
    text += `As we traverse the array once, for each element we calculate its required complement: \`complement = target - nums[i]\`. If the complement exists in our hash map, we found our pair in $O(1)$ amortized time.\n\n`;
    text += `#### 2. Complexity Analysis\n`;
    text += `• **Time Complexity**: $O(N)$ strict linear time — single pass over $N$ elements.\n`;
    text += `• **Space Complexity**: $O(N)$ auxiliary memory for hash table.\n`;
    text += `• **Verdict**: Globally optimal; finishes in < 20ms for $N = 10^5$.\n\n`;
    text += `#### 3. Step-by-Step Logic Explanation\n`;
    text += `• **Step 1 (Map Initialization)**: Create a hash map storing \`value -> index\`.\n`;
    text += `• **Step 2 (Complement Probe)**: For each \`nums[i]\`, query \`map.contains(target - nums[i])\`.\n`;
    text += `• **Step 3 (Update State)**: If found, return indices immediately; otherwise record \`map[nums[i]] = i\`.\n\n`;
    text += `#### 4. Full Complete Code to Copy\n\n`;
    text += `\`\`\`cpp\n#include <vector>\n#include <unordered_map>\nusing namespace std;\n\nclass Solution {\npublic:\n    vector<int> solve(vector<int>& nums, int target) {\n        unordered_map<int, int> seen;\n        seen.reserve(nums.size());\n        \n        for (int i = 0; i < (int)nums.size(); ++i) {\n            int complement = target - nums[i];\n            auto it = seen.find(complement);\n            if (it != seen.end()) {\n                return {it->second, i};\n            }\n            seen[nums[i]] = i;\n        }\n        return {};\n    }\n};\n\`\`\`\n\n`;
    text += `\`\`\`java\nimport java.util.*;\n\nclass Solution {\n    public int[] solve(int[] nums, int target) {\n        Map<Integer, Integer> seen = new HashMap<>();\n        for (int i = 0; i < nums.length; i++) {\n            int complement = target - nums[i];\n            if (seen.containsKey(complement)) {\n                return new int[]{seen.get(complement), i};\n            }\n            seen.put(nums[i], i);\n        }\n        return new int[]{};\n    }\n}\n\`\`\`\n\n`;
    text += `\`\`\`python\nfrom typing import List, Dict\n\nclass Solution:\n    def solve(self, nums: List[int], target: int) -> List[int]:\n        seen: Dict[int, int] = {}\n        for i, val in enumerate(nums):\n            complement = target - val\n            if complement in seen:\n                return [seen[complement], i]\n            seen[val] = i\n        return []\n\`\`\`\n\n---\n\n`;

    // Summary Table
    text += `### Summary Trade-Off Comparison\n\n`;
    text += `| Approach | Time Complexity | Space Complexity | Implementation Difficulty | Verdict |\n`;
    text += `| :--- | :--- | :--- | :--- | :--- |\n`;
    text += `| **1. Brute Force** | $O(N^2)$ | $O(1)$ | Very Low | TLE ($N > 10^4$) |\n`;
    text += `| **2. Two Pointers / Sort** | $O(N \\log N)$ | $O(N)$ | Medium | Accepted (~100ms) |\n`;
    text += `| **3. One-Pass Hash Map** | $O(N)$ | $O(N)$ | Low-Medium | Peak Optimal (<20ms) |\n`;

    return {
      ok: true,
      content: text,
      model: "codemate-local-engine",
    };
  }

  return {
    ok: true,
    content: `Processed ${type} request for "${problemTitle}". Focus on constraints and invariants.`,
    model: "codemate-local-engine",
  };
}
