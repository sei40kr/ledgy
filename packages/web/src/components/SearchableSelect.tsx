"use client";

import {
  Combobox,
  Portal,
  useListCollection,
} from "@chakra-ui/react";

export interface SearchableSelectItem {
  id: string;
  name: string;
  /** Extra terms matched alongside the name. */
  searchWords: string[];
}

/**
 * A single-select combobox (a listbox in a popover) whose options are filtered as
 * you type, matching both the name and the item's search words. Shared by the
 * account title and sub account title inputs. Controlled: `value` is the selected
 * id ("" when none), `onChange` fires with the next id.
 */
export function SearchableSelect({
  items,
  value,
  onChange,
  disabled,
  placeholder,
  size = "sm",
}: {
  items: SearchableSelectItem[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
  placeholder?: string;
  size?: "sm" | "md";
}) {
  const { collection, filter } = useListCollection<SearchableSelectItem>({
    initialItems: items,
    itemToString: (item) => item.name,
    itemToValue: (item) => item.id,
    filter: (itemText, filterText, item) => {
      const q = filterText.trim().toLowerCase();
      if (!q) return true;
      return (
        itemText.toLowerCase().includes(q) ||
        item.searchWords.some((word) => word.toLowerCase().includes(q))
      );
    },
  });

  return (
    <Combobox.Root
      collection={collection}
      value={value ? [value] : []}
      onValueChange={(e) => onChange(e.value[0] ?? "")}
      onInputValueChange={(e) => filter(e.inputValue)}
      disabled={disabled}
      size={size}
      openOnClick
      selectionBehavior="replace"
      width="full"
    >
      <Combobox.Control>
        <Combobox.Input placeholder={placeholder} />
        <Combobox.IndicatorGroup>
          <Combobox.ClearTrigger />
          <Combobox.Trigger />
        </Combobox.IndicatorGroup>
      </Combobox.Control>
      <Portal>
        <Combobox.Positioner>
          <Combobox.Content>
            <Combobox.Empty>該当する科目がありません</Combobox.Empty>
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
  );
}
