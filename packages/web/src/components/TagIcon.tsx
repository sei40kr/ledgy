import { Box, type BoxProps } from "@chakra-ui/react";

/** The tag (タグ) glyph: a luggage tag, sized by `boxSize`. */
export function TagIcon(props: BoxProps) {
  return (
    <Box asChild boxSize="14px" flexShrink={0} {...props}>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12.6 3H4a1 1 0 0 0-1 1v8.6a2 2 0 0 0 .6 1.4l7.4 7.4a2 2 0 0 0 2.8 0l6.6-6.6a2 2 0 0 0 0-2.8L14 3.6a2 2 0 0 0-1.4-.6Z" />
        <path d="M7.5 7.5h.01" />
      </svg>
    </Box>
  );
}
