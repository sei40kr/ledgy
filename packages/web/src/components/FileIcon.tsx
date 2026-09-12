import { Box, type BoxProps } from "@chakra-ui/react";

/** The supporting document (証憑) glyph: a file, sized by `boxSize`. */
export function FileIcon(props: BoxProps) {
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
        <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
        <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      </svg>
    </Box>
  );
}
