"use client";

import { type Transaction, type UserId } from "@account-ledgers/domain";
import { Box, Flex, Link, Spinner, Text } from "@chakra-ui/react";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { FiscalYearRequired } from "@/components/FiscalYearRequired";
import { JournalSupportingDocumentsDialog } from "@/components/JournalSupportingDocumentsDialog";
import { JournalTable } from "@/components/JournalTable";
import { useAccountTitles } from "@/hooks/useAccountTitles";
import { useAuth } from "@/hooks/useAuth";
import { useFiscalYears } from "@/hooks/useFiscalYears";
import { usePartners } from "@/hooks/usePartners";
import { useTags } from "@/hooks/useTags";
import { usecases } from "@account-ledgers/infrastructure/container";

const RECENT_LIMIT = 8;

export default function HomePage() {
  return (
    <AppShell>
      <RecentTransactions />
    </AppShell>
  );
}

/** The newest journal rows, shown exactly as the journal shows them. */
function RecentTransactions() {
  const { tenantId, user } = useAuth();
  const { currentYear } = useFiscalYears();
  const { accountTitles } = useAccountTitles();
  const { partners } = usePartners();
  const { tags } = useTags();
  const router = useRouter();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  // The transaction whose supporting documents are open in the dialog.
  const [supportingDocumentsOf, setSupportingDocumentsOf] = useState<Transaction | null>(null);

  const accountTitleById = useMemo(
    () => new Map(accountTitles.map((a) => [a.id, a])),
    [accountTitles],
  );
  const partnerNameById = useMemo(
    () => new Map(partners.map((p) => [p.id, p.name])),
    [partners],
  );
  const tagNameById = useMemo(
    () => new Map(tags.map((t) => [t.id, t.name])),
    [tags],
  );

  const load = useCallback(async () => {
    if (!tenantId || !currentYear) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const page = await usecases.transactions.search({
        tenantId,
        yearId: currentYear.id,
        limit: RECENT_LIMIT,
      });
      setTransactions(page.transactions);
    } finally {
      setLoading(false);
    }
  }, [tenantId, currentYear]);

  useEffect(() => {
    void load();
  }, [load]);

  // After the dialog attaches or detaches, refresh the header the indicator reads.
  const refreshTransaction = useCallback(async () => {
    if (!tenantId || !currentYear || !supportingDocumentsOf) return;
    const fresh = await usecases.transactions.get({
      tenantId,
      yearId: currentYear.id,
      transactionId: supportingDocumentsOf.id,
    });
    if (!fresh) return;
    setTransactions((prev) => prev.map((t) => (t.id === fresh.id ? fresh : t)));
  }, [tenantId, currentYear, supportingDocumentsOf]);

  if (!currentYear) {
    return <FiscalYearRequired />;
  }

  return (
    <Box
      bg="bg.panel"
      borderWidth="1px"
      borderColor="border"
      rounded="lg"
      overflow="hidden"
    >
      <Flex align="center" px={5} py="14px" borderBottomWidth="1px" borderColor="border">
        <Text fontSize="13.5px" fontWeight="semibold">
          最近の取引
        </Text>
        <Link asChild ml="auto" fontSize="12.5px" color="fg.info">
          <NextLink href={`/fiscal-years/${currentYear.id}/transactions/`}>
            仕訳帳をすべて見る
          </NextLink>
        </Link>
      </Flex>

      {loading ? (
        <Box p={5}>
          <Spinner size="sm" />
        </Box>
      ) : transactions.length === 0 ? (
        <Box p={5}>
          <Text fontSize="sm" color="fg.muted">
            仕訳がまだありません
          </Text>
        </Box>
      ) : (
        <JournalTable
          transactions={transactions}
          fiscalYear={currentYear}
          accountTitleById={accountTitleById}
          partnerNameById={partnerNameById}
          tagNameById={tagNameById}
          onOpen={(transaction) =>
            router.push(
              `/fiscal-years/${currentYear.id}/transactions/${transaction.id}/edit/`,
            )
          }
          onOpenSupportingDocuments={setSupportingDocumentsOf}
        />
      )}

      {supportingDocumentsOf && tenantId && user && (
        <JournalSupportingDocumentsDialog
          tenantId={tenantId}
          yearId={currentYear.id}
          userId={user.uid as UserId}
          transaction={supportingDocumentsOf}
          disabled={currentYear.status !== "open" || supportingDocumentsOf.deleted}
          onChanged={() => void refreshTransaction()}
          onClose={() => setSupportingDocumentsOf(null)}
        />
      )}
    </Box>
  );
}
