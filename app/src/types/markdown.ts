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

export const MARKDOWN_REGEX = {
  WIKILINK: /(!?)\[\[(.*?)\]\]/g,
} as const;
