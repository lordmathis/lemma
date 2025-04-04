export enum InlineContainerType {
  Paragraph = 'paragraph',
  ListItem = 'listItem',
  TableCell = 'tableCell',
  Blockquote = 'blockquote',
  Heading = 'heading',
  Emphasis = 'emphasis',
  Strong = 'strong',
  Delete = 'delete',
}

export const INLINE_CONTAINER_TYPES = new Set<InlineContainerType>(
  Object.values(InlineContainerType)
);

export const MARKDOWN_REGEX = {
  WIKILINK: /(!?)\[\[(.*?)\]\]/g,
} as const;
