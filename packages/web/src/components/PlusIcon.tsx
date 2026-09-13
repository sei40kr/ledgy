import { Box, type BoxProps } from "@chakra-ui/react";

/** The add glyph: a plus sign, sized by `boxSize`. */
export function PlusIcon(props: BoxProps) {
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
        <path d="M12 5v14M5 12h14" />
      </svg>
    </Box>
  );
}
