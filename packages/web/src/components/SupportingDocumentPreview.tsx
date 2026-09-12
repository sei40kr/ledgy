"use client";

import type { SupportingDocument, TenantId } from "@account-ledgers/domain";
import { Box, Button, Center, HStack, Spinner, Text } from "@chakra-ui/react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { usecases } from "@account-ledgers/infrastructure/container";
import { isImageSupportingDocument } from "@/components/supportingDocumentFiles";

// A supporting document's file never changes, so its URL can be kept for the session.
const urlCache = new Map<string, Promise<string>>();

function fileUrl(tenantId: TenantId, supportingDocument: SupportingDocument): Promise<string> {
  const cached = urlCache.get(supportingDocument.id);
  if (cached) return cached;
  const promise = usecases.supportingDocuments
    .getFileUrl({ tenantId, supportingDocumentId: supportingDocument.id })
    .catch((error: unknown) => {
      urlCache.delete(supportingDocument.id);
      throw error;
    });
  urlCache.set(supportingDocument.id, promise);
  return promise;
}

/** Zoom levels in percent; 100 fits the width of the preview. */
const ZOOM_LEVELS = [50, 75, 100, 125, 150, 200, 300];
const DEFAULT_ZOOM = 100;

/**
 * Shows a supporting document's file at an adjustable zoom, scrolling inside
 * its box: an image as-is, a PDF through the browser's viewer (which takes the
 * zoom as an open parameter on the URL). Fills the parent, so the parent
 * decides the size.
 */
export function SupportingDocumentPreview({
  tenantId,
  supportingDocument,
}: {
  tenantId: TenantId;
  supportingDocument: SupportingDocument;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  // The image's scroll box, so zooming can keep the point at its centre in place.
  const scrollRef = useRef<HTMLDivElement>(null);
  const previousZoom = useRef(zoom);

  useEffect(() => {
    let active = true;
    setUrl(null);
    setFailed(false);
    setZoom(DEFAULT_ZOOM);
    fileUrl(tenantId, supportingDocument)
      .then((resolved) => {
        if (active) setUrl(resolved);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [tenantId, supportingDocument]);

  // After the image is re-laid out at the new zoom, scroll so that whatever
  // was at the centre of the box stays there, instead of zooming into the
  // top-left corner.
  useLayoutEffect(() => {
    const ratio = zoom / previousZoom.current;
    previousZoom.current = zoom;
    const box = scrollRef.current;
    if (!box || ratio === 1) return;
    const centreX = box.scrollLeft + box.clientWidth / 2;
    const centreY = box.scrollTop + box.clientHeight / 2;
    box.scrollLeft = centreX * ratio - box.clientWidth / 2;
    box.scrollTop = centreY * ratio - box.clientHeight / 2;
  }, [zoom]);

  const zoomIndex = ZOOM_LEVELS.indexOf(zoom);
  const zoomOut = () => setZoom(ZOOM_LEVELS[Math.max(zoomIndex - 1, 0)] ?? DEFAULT_ZOOM);
  const zoomIn = () =>
    setZoom(ZOOM_LEVELS[Math.min(zoomIndex + 1, ZOOM_LEVELS.length - 1)] ?? DEFAULT_ZOOM);

  let body: React.ReactNode;
  if (failed) {
    body = (
      <Center h="full" color="fg.muted" fontSize="sm">
        証憑を表示できませんでした
      </Center>
    );
  } else if (!url) {
    body = (
      <Center h="full">
        <Spinner size="sm" />
      </Center>
    );
  } else if (isImageSupportingDocument(supportingDocument)) {
    // `margin: auto` centres an image smaller than the box without making the
    // edges of a larger one unreachable, as flex centring would.
    body = (
      <Box ref={scrollRef} h="full" overflow="auto" bg="bg.muted" display="flex">
        <Box asChild display="block" flexShrink={0} w={`${zoom}%`} maxW="none" m="auto">
          <img src={url} alt={supportingDocument.fileName} />
        </Box>
      </Box>
    );
  } else {
    // Keyed by zoom so the frame is recreated: changing only the fragment of
    // an existing frame's src would not make the viewer re-read it.
    body = (
      <Box key={zoom} asChild w="full" h="full" border={0} bg="bg.muted">
        <iframe src={`${url}#zoom=${zoom}`} title={supportingDocument.fileName} />
      </Box>
    );
  }

  return (
    <Box h="full" display="flex" flexDirection="column">
      <HStack
        gap={1}
        px={2}
        py={1}
        borderBottomWidth="1px"
        borderColor="border"
        bg="bg.panel"
        flexShrink={0}
      >
        <Button
          size="2xs"
          variant="ghost"
          aria-label="縮小"
          disabled={!url || zoomIndex <= 0}
          onClick={zoomOut}
        >
          −
        </Button>
        <Text fontSize="xs" fontFamily="mono" w="3.5rem" textAlign="center">
          {zoom}%
        </Text>
        <Button
          size="2xs"
          variant="ghost"
          aria-label="拡大"
          disabled={!url || zoomIndex >= ZOOM_LEVELS.length - 1}
          onClick={zoomIn}
        >
          ＋
        </Button>
        <Button
          size="2xs"
          variant="ghost"
          color="fg.muted"
          disabled={!url || zoom === DEFAULT_ZOOM}
          onClick={() => setZoom(DEFAULT_ZOOM)}
        >
          リセット
        </Button>
      </HStack>
      <Box flex={1} minH={0}>
        {body}
      </Box>
    </Box>
  );
}
