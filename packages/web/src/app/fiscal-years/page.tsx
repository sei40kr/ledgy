"use client";

import type { FiscalYearId } from "@account-ledgers/domain";
import {
  Alert,
  Badge,
  Button,
  Field,
  HStack,
  Stack,
  Table,
} from "@chakra-ui/react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { AppShell } from "@/components/AppShell";
import { DateField } from "@/components/DateField";
import { TableCard } from "@/components/TableCard";
import { formatDate, parseDateInput } from "@/components/dates";
import { useAuth } from "@/hooks/useAuth";
import { useFiscalYears } from "@/hooks/useFiscalYears";
import { usecases } from "@account-ledgers/infrastructure/container";
import { toDisplayMessage } from "@/components/errorMessages";

export default function FiscalYearsPage() {
  return (
    <AppShell>
      <FiscalYearsContent />
    </AppShell>
  );
}

interface FiscalYearFormValues {
  startDate: string;
  endDate: string;
}

function FiscalYearsContent() {
  const { tenantId } = useAuth();
  const { years, reload } = useFiscalYears();
  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<FiscalYearFormValues>({
    defaultValues: { startDate: "", endDate: "" },
  });
  const [error, setError] = useState<string | null>(null);

  const onCreate = handleSubmit(async (data) => {
    if (!tenantId) return;
    setError(null);
    try {
      await usecases.fiscalYears.create({
        tenantId,
        startDate: parseDateInput(data.startDate),
        endDate: parseDateInput(data.endDate),
      });
      reset();
      await reload();
    } catch (e) {
      setError(toDisplayMessage(e, "作成に失敗しました"));
    }
  });

  async function handleToggleStatus(yearId: FiscalYearId, current: string) {
    if (!tenantId) return;
    setError(null);
    try {
      await usecases.fiscalYears.setStatus({
        tenantId,
        yearId,
        status: current === "open" ? "closed" : "open",
      });
      await reload();
    } catch (e) {
      setError(toDisplayMessage(e, "更新に失敗しました"));
    }
  }

  return (
    <Stack gap={4} maxW="900px">
      {error && (
        <Alert.Root status="error">
          <Alert.Indicator />
          <Alert.Title>{error}</Alert.Title>
        </Alert.Root>
      )}
      {years.length > 0 && (
        <TableCard>
          <Table.Root size="sm" variant="outline" borderWidth={0}>
            <Table.Header>
              <Table.Row bg="bg.subtle">
                <Table.ColumnHeader>期間</Table.ColumnHeader>
                <Table.ColumnHeader w="6rem">状態</Table.ColumnHeader>
                <Table.ColumnHeader w="8rem">操作</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {years.map((year) => (
                <Table.Row key={year.id}>
                  <Table.Cell fontFamily="mono">
                    {formatDate(year.startDate)} 〜 {formatDate(year.endDate)}
                  </Table.Cell>
                  <Table.Cell>
                    <Badge
                      colorPalette={year.status === "open" ? "green" : "gray"}
                    >
                      {year.status === "open" ? "オープン" : "締切済"}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell>
                    <Button
                      size="2xs"
                      variant="outline"
                      onClick={() => handleToggleStatus(year.id, year.status)}
                    >
                      {year.status === "open" ? "締め切る" : "再オープン"}
                    </Button>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </TableCard>
      )}
      <form onSubmit={onCreate}>
        <HStack align="flex-end" gap={4}>
          <Field.Root required maxW="14rem">
            <Field.Label>開始日</Field.Label>
            <Controller
              control={control}
              name="startDate"
              rules={{ required: true }}
              render={({ field }) => (
                <DateField value={field.value} onChange={field.onChange} />
              )}
            />
          </Field.Root>
          <Field.Root required maxW="14rem">
            <Field.Label>終了日</Field.Label>
            <Controller
              control={control}
              name="endDate"
              rules={{ required: true }}
              render={({ field }) => (
                <DateField value={field.value} onChange={field.onChange} />
              )}
            />
          </Field.Root>
          <Button type="submit" size="sm" loading={isSubmitting}>
            年度を作成
          </Button>
        </HStack>
      </form>
    </Stack>
  );
}
