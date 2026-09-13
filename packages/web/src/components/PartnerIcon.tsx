import { Box, type BoxProps } from "@chakra-ui/react";

/** The partner (取引先) glyph: a shop front, sized by `boxSize`. */
export function PartnerIcon(props: BoxProps) {
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
        <path d="M2.5 9h19l-2-5.5h-15z" />
        <path d="M4.5 9v11.5h15V9" />
        <path d="M9.5 20.5V14h5v6.5" />
      </svg>
    </Box>
  );
}
