export interface ParsedQuickAdd {
  title: string;
  hashtags: string[];
  groupName: string | null;
}

/**
 * Parses quick add input string to extract title, hashtags, and group.
 * Example: "Fix the bug #urgent #backend @frontend"
 * Returns: { title: "Fix the bug", hashtags: ["urgent", "backend"], groupName: "frontend" }
 */
export function parseQuickAddInput(input: string): ParsedQuickAdd {
  // Extract hashtags for keywords
  const hashtagRegex = /#(\w+)/g;
  const hashtags: string[] = [];
  let match;
  while ((match = hashtagRegex.exec(input)) !== null) {
    hashtags.push(match[1].toLowerCase());
  }

  // Extract @group (only first one is used)
  const groupRegex = /@(\w+)/;
  const groupMatch = input.match(groupRegex);
  const groupName = groupMatch ? groupMatch[1].toLowerCase() : null;

  // Remove hashtags and @group from title
  const title = input
    .replace(/#\w+/g, '')
    .replace(/@\w+/g, '')
    .trim();

  return { title, hashtags, groupName };
}
