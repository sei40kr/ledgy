"use client";

import {
  Box,
  Combobox,
  Portal,
  Span,
  useListCollection,
  Wrap,
} from "@chakra-ui/react";
import { useEffect, useMemo, useState } from "react";

export interface EntityItem {
  id: string;
  name: string;
  /** Extra terms matched alongside the name. */
  searchWords: string[];
}

/**
 * Searchable multi-select over named entities (partners, tags, …). Selected items
 * show as removable chips; typing filters the list by name or search words, and
 * entering a name that does not exist creates it on the spot via onCreate.
 * Controlled: `value` is the selected ids, `onChange` fires with the next list.
 */
export function EntityMultiSelect({
  items,
  value,
  onChange,
  onCreate,
  placeholder,
  disabled,
}: {
  items: EntityItem[];
  value: string[];
  onChange: (ids: string[]) => void;
  onCreate: (name: string) => Promise<EntityItem>;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [inputValue, setInputValue] = useState("");
  const nameOf = (id: string) => items.find((i) => i.id === id)?.name ?? id;

  // The picker only offers items not already selected.
  const available = useMemo(
    () => items.filter((i) => !value.includes(i.id)),
    [items, value],
  );

  const { collection, filter, set } = useListCollection<EntityItem>({
    initialItems: available,
    itemToString: (i) => i.name,
    itemToValue: (i) => i.id,
    filter: (itemText, filterText, item) => {
      const q = filterText.trim().toLowerCase();
      if (!q) return true;
      return (
        itemText.toLowerCase().includes(q) ||
        item.searchWords.some((word) => word.toLowerCase().includes(q))
      );
    },
  });

  // Keep the collection in sync as items are selected or created.
  useEffect(() => {
    set(available);
  }, [available, set]);

  async function add(raw: string) {
    const existingById = items.find((i) => i.id === raw);
    if (existingById) {
      if (!value.includes(existingById.id)) onChange([...value, existingById.id]);
      return;
    }
    const name = raw.trim();
    if (!name) return;
    // Reuse an item with the same name rather than creating a duplicate.
    const existingByName = items.find((i) => i.name === name);
    if (existingByName) {
      if (!value.includes(existingByName.id)) onChange([...value, existingByName.id]);
      return;
    }
    const created = await onCreate(name);
    onChange([...value, created.id]);
  }

  return (
    <Box>
      {value.length > 0 && (
        <Wrap gap={1.5} mb={2}>
          {value.map((id) => (
            <Span
              key={id}
              display="inline-flex"
              alignItems="center"
              gap={1}
              px={2}
              py={0.5}
              rounded="sm"
              bg="bg.subtle"
              fontSize="sm"
            >
              {nameOf(id)}
              {!disabled && (
                <Span
                  role="button"
                  tabIndex={0}
                  cursor="pointer"
                  color="fg.muted"
                  lineHeight={1}
                  aria-label={`${nameOf(id)} を削除`}
                  onClick={() => onChange(value.filter((v) => v !== id))}
                >
                  ×
                </Span>
              )}
            </Span>
          ))}
        </Wrap>
      )}
      <Combobox.Root
        collection={collection}
        value={[]}
        inputValue={inputValue}
        onInputValueChange={(e) => {
          setInputValue(e.inputValue);
          filter(e.inputValue);
        }}
        onValueChange={(e) => {
          const picked = e.value[0];
          if (picked) {
            void add(picked);
            setInputValue("");
          }
        }}
        allowCustomValue
        openOnClick
        disabled={disabled}
        size="sm"
        width="full"
        maxW="24rem"
      >
        <Combobox.Control>
          <Combobox.Input placeholder={placeholder} />
          <Combobox.IndicatorGroup>
            <Combobox.Trigger />
          </Combobox.IndicatorGroup>
        </Combobox.Control>
        <Portal>
          <Combobox.Positioner>
            <Combobox.Content>
              <Combobox.Empty>
                {inputValue.trim()
                  ? `「${inputValue.trim()}」を Enter で新規作成`
                  : "候補がありません"}
              </Combobox.Empty>
              {collection.items.map((item) => (
                <Combobox.Item key={item.id} item={item}>
                  <Combobox.ItemText>{item.name}</Combobox.ItemText>
                  <Combobox.ItemIndicator />
                </Combobox.Item>
              ))}
            </Combobox.Content>
          </Combobox.Positioner>
        </Portal>
      </Combobox.Root>
    </Box>
  );
}
