import { Box } from "@chakra-ui/react";
import type { ReactNode } from "react";

/**
 * Panel wrapper that gives a table rounded corners. A `<table>` cannot clip its
 * own corners (border-collapse ignores overflow), so the rounding + border live
 * on this container and the table inside should drop its own outer border
 * (variant="outline" borderWidth={0}).
 */
export function TableCard({ children }: { children: ReactNode }) {
  return (
    <Box
      borderWidth="1px"
      borderColor="border"
      rounded="lg"
      overflow="hidden"
      bg="bg.panel"
    >
      {children}
    </Box>
  );
}
