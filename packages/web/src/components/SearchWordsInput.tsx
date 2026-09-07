"use client";

import { TagsInput } from "@chakra-ui/react";

/**
 * A tag-style input for a list of search words. Each word is entered by typing
 * and pressing Enter, and removed with its delete button — the user never types
 * a separator by hand. Controlled: `value` is the current words, `onChange`
 * fires with the next list.
 */
export function SearchWordsInput({
  value,
  onChange,
  placeholder,
}: {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
}) {
  return (
    <TagsInput.Root
      value={value}
      onValueChange={(e) => onChange(e.value)}
      width="full"
    >
      <TagsInput.Control
        display="flex"
        flexWrap="wrap"
        alignItems="center"
        gap={1.5}
        px={2}
        py={1.5}
        minH={10}
        borderWidth="1px"
        borderColor="border"
        rounded="md"
        bg="bg.panel"
        _focusWithin={{ borderColor: "border.emphasized" }}
      >
        {value.map((word, index) => (
          <TagsInput.Item key={`${word}-${index}`} index={index} value={word}>
            <TagsInput.ItemPreview
              display="inline-flex"
              alignItems="center"
              gap={1}
              px={2}
              py={0.5}
              rounded="sm"
              bg="bg.subtle"
              fontSize="sm"
            >
              <TagsInput.ItemText>{word}</TagsInput.ItemText>
              <TagsInput.ItemDeleteTrigger
                cursor="pointer"
                color="fg.muted"
                lineHeight={1}
                aria-label={`${word} を削除`}
              >
                ×
              </TagsInput.ItemDeleteTrigger>
            </TagsInput.ItemPreview>
            <TagsInput.ItemInput />
          </TagsInput.Item>
        ))}
        <TagsInput.Input
          flex={1}
          minW="8ch"
          bg="transparent"
          outline="none"
          placeholder={value.length === 0 ? placeholder : undefined}
        />
      </TagsInput.Control>
      <TagsInput.HiddenInput />
    </TagsInput.Root>
  );
}
