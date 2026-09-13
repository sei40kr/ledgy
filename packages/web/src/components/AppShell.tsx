"use client";

import {
  Box,
  Button,
  Flex,
  HStack,
  Link,
  NativeSelect,
  Portal,
  Spinner,
  Stack,
  Text,
  Tooltip,
} from "@chakra-ui/react";
import NextLink from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { usecases } from "@account-ledgers/infrastructure/container";
import { FISCAL_YEAR_REQUIRED_HINT } from "@/components/FiscalYearRequired";
import { useAuth } from "@/hooks/useAuth";
import {
  fiscalYearLabel,
  FiscalYearProvider,
  useFiscalYears,
} from "@/hooks/useFiscalYears";

// Items with `sub` are scoped to a fiscal year and resolve to
// `/fiscal-years/<id><sub>`; items with `href` are tenant-wide, and
// `requiresYear` marks the ones that still have nothing to show without a
// selected year. Everything that needs a year is disabled while none is.
type NavItem =
  | { sub: string; label: string }
  | { href: string; label: string; requiresYear?: boolean };

function requiresFiscalYear(item: NavItem): boolean {
  return "sub" in item || item.requiresYear === true;
}

interface NavGroup {
  heading?: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  { items: [{ href: "/", label: "ホーム", requiresYear: true }] },
  {
    heading: "記録する",
    items: [{ sub: "/transactions/", label: "仕訳帳" }],
  },
  {
    heading: "見る・出力する",
    items: [
      { sub: "/general-ledger/", label: "総勘定元帳" },
      { sub: "/trial-balance/", label: "試算表" },
    ],
  },
  {
    heading: "設定・データ",
    items: [
      { href: "/account-titles/", label: "勘定科目" },
      { href: "/partners/", label: "取引先" },
      { href: "/tags/", label: "タグ" },
      { href: "/fiscal-years/", label: "会計年度" },
      { sub: "/opening-balance/", label: "期首残高" },
    ],
  },
];

const NEW_TRANSACTION_SUB = "/transactions/new/";

/** Page title + one-line subtitle shown in the sticky header, keyed off the route. */
function pageMeta(pathname: string, subtitleForScoped: string): {
  title: string;
  subtitle: string;
} {
  if (pathname.includes("/transactions/new"))
    return { title: "仕訳入力", subtitle: subtitleForScoped };
  if (/\/transactions\/[^/]+\/edit/.test(pathname))
    return { title: "仕訳編集", subtitle: subtitleForScoped };
  if (pathname.includes("/transactions"))
    return { title: "仕訳帳", subtitle: subtitleForScoped };
  if (pathname.includes("/general-ledger"))
    return { title: "総勘定元帳", subtitle: subtitleForScoped };
  if (pathname.includes("/trial-balance"))
    return { title: "合計残高試算表", subtitle: subtitleForScoped };
  if (pathname.includes("/opening-balance"))
    return { title: "期首残高", subtitle: subtitleForScoped };
  if (pathname.startsWith("/account-titles"))
    return { title: "勘定科目", subtitle: "科目・補助科目の管理" };
  if (pathname.startsWith("/partners"))
    return { title: "取引先", subtitle: "取引先の管理" };
  if (pathname.startsWith("/tags"))
    return { title: "タグ", subtitle: "タグの管理" };
  if (pathname.startsWith("/fiscal-years"))
    return { title: "会計年度", subtitle: "年度の作成・締め切り" };
  return { title: "ホーム", subtitle: "オープンソースの帳簿管理" };
}

/** Height of the sticky page header; content that sticks below it starts at this offset. */
export const APP_SHELL_HEADER_HEIGHT = "56px";

export interface AppShellProps {
  children: React.ReactNode;
  /**
   * Lay the content out edge to edge, without the usual padding, for a page
   * whose table should stretch across the whole content column.
   */
  flush?: boolean;
}

/**
 * Shared shell for pages that require authentication. Redirects to /login when signed out.
 */
export function AppShell({ children, flush = false }: AppShellProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <Flex minH="100vh" align="center" justify="center" bg="bg.subtle">
        <Spinner size="lg" />
      </Flex>
    );
  }

  return (
    <FiscalYearProvider>
      <AppShellInner flush={flush}>{children}</AppShellInner>
    </FiscalYearProvider>
  );
}

/** Layout shared by an enabled and a disabled sidebar entry. */
const NAV_ENTRY_STYLES = {
  display: "flex",
  alignItems: "center",
  gap: "9px",
  w: "full",
  px: "10px",
  py: "7px",
  rounded: "md",
  fontSize: "13.5px",
} as const;

function NavEntryBody({ label, active }: { label: string; active: boolean }) {
  return (
    <>
      <Box
        as="span"
        w="3px"
        h="14px"
        rounded="2px"
        bg={active ? "fg" : "transparent"}
        flexShrink={0}
      />
      <Text
        as="span"
        flex={1}
        overflow="hidden"
        textOverflow="ellipsis"
        whiteSpace="nowrap"
      >
        {label}
      </Text>
    </>
  );
}

/** Explains on hover why the control it wraps is out of reach. */
function FiscalYearRequiredTooltip({
  children,
}: {
  children: React.ReactElement;
}) {
  return (
    <Tooltip.Root
      openDelay={200}
      closeDelay={80}
      // The trigger ends inside the sidebar, so clear its border before the
      // arrow, which is what ties the bubble back to the row it explains.
      positioning={{ placement: "right", offset: { mainAxis: 20 } }}
    >
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Portal>
        <Tooltip.Positioner>
          <Tooltip.Content fontSize="12px">
            <Tooltip.Arrow>
              <Tooltip.ArrowTip />
            </Tooltip.Arrow>
            {FISCAL_YEAR_REQUIRED_HINT}
          </Tooltip.Content>
        </Tooltip.Positioner>
      </Portal>
    </Tooltip.Root>
  );
}

function AppShellInner({ children, flush }: Required<AppShellProps>) {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { years, currentYear, selectYear } = useFiscalYears();

  async function handleSignOut() {
    await usecases.signOut();
    router.replace("/login");
  }

  // Resolve a nav item to its concrete href. Only ever called for an item that
  // is enabled, so a year-scoped one always has a year to scope to.
  function resolveHref(item: NavItem): string {
    return "href" in item
      ? item.href
      : `/fiscal-years/${currentYear?.id}${item.sub}`;
  }

  const scopedSubtitle = currentYear
    ? fiscalYearLabel(currentYear)
    : "会計年度が未選択です";
  const { title, subtitle } = pageMeta(pathname, scopedSubtitle);

  const avatarChar = (user?.email ?? "?").charAt(0).toUpperCase();

  return (
    <Flex minH="100vh" bg="bg.subtle" color="fg">
      <Box
        as="aside"
        w="232px"
        flexShrink={0}
        display="flex"
        flexDirection="column"
        bg="bg.panel"
        borderRightWidth="1px"
        borderColor="border"
        position="sticky"
        top={0}
        h="100vh"
        overflowY="auto"
      >
        {/* Primary action */}
        <Box px="14px" pt="18px" pb="6px">
          {currentYear ? (
            <Button asChild w="full" h="36px" size="sm" fontWeight="medium">
              <NextLink
                href={`/fiscal-years/${currentYear.id}${NEW_TRANSACTION_SUB}`}
              >
                ＋ 仕訳を追加
              </NextLink>
            </Button>
          ) : (
            <FiscalYearRequiredTooltip>
              {/* A disabled button swallows hover, so the wrapper carries it. */}
              <Box w="full">
                <Button w="full" h="36px" size="sm" fontWeight="medium" disabled>
                  ＋ 仕訳を追加
                </Button>
              </Box>
            </FiscalYearRequiredTooltip>
          )}
        </Box>

        {/* Grouped navigation */}
        <Stack gap="1px" px="10px" pb={2}>
          {NAV_GROUPS.map((group, gi) => (
            <Box key={group.heading ?? `group-${gi}`}>
              {group.heading && (
                <Text
                  px="10px"
                  pt={4}
                  pb="6px"
                  fontSize="10.5px"
                  fontWeight="semibold"
                  letterSpacing="0.06em"
                  color="fg.subtle"
                >
                  {group.heading}
                </Text>
              )}
              {group.items.map((item) => {
                if (!currentYear && requiresFiscalYear(item)) {
                  return (
                    <FiscalYearRequiredTooltip key={item.label}>
                      <Flex
                        {...NAV_ENTRY_STYLES}
                        color="fg.subtle"
                        opacity={0.6}
                        cursor="not-allowed"
                        aria-disabled="true"
                      >
                        <NavEntryBody label={item.label} active={false} />
                      </Flex>
                    </FiscalYearRequiredTooltip>
                  );
                }
                const href = resolveHref(item);
                const active = pathname === href;
                return (
                  <Link
                    key={item.label}
                    asChild
                    {...NAV_ENTRY_STYLES}
                    fontWeight={active ? "semibold" : "normal"}
                    color={active ? "fg" : "fg.muted"}
                    transition="background 150ms"
                    _hover={{ bg: "bg.muted", textDecor: "none" }}
                  >
                    <NextLink href={href}>
                      <NavEntryBody label={item.label} active={active} />
                    </NextLink>
                  </Link>
                );
              })}
            </Box>
          ))}
        </Stack>

      </Box>

      {/* Main column */}
      <Flex direction="column" flex={1} minW={0}>
        <Flex
          as="header"
          position="sticky"
          top={0}
          zIndex={20}
          align="center"
          gap={4}
          px={6}
          h={APP_SHELL_HEADER_HEIGHT}
          flexShrink={0}
          bg="bg.panel"
          borderBottomWidth="1px"
          borderColor="border"
        >
          <Stack gap={0} lineHeight="1.25" minW={0}>
            <Text
              fontSize="15px"
              fontWeight="semibold"
              letterSpacing="-0.01em"
              whiteSpace="nowrap"
            >
              {title}
            </Text>
            <Text fontSize="11.5px" color="fg.muted" whiteSpace="nowrap">
              {subtitle}
            </Text>
          </Stack>
          <HStack ml="auto" gap={2}>
            {years.length > 0 && (
              <HStack
                gap={2}
                h="32px"
                pl="10px"
                borderWidth="1px"
                borderColor="border"
                rounded="md"
              >
                <Box asChild color="fg.muted" flexShrink={0}>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    aria-hidden="true"
                  >
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <path d="M3 10h18M8 2v4M16 2v4" />
                  </svg>
                </Box>
                <NativeSelect.Root size="sm" w="14rem" variant="plain">
                  <NativeSelect.Field
                    aria-label="会計年度"
                    value={currentYear?.id ?? ""}
                    onChange={(e) => selectYear(e.target.value || null)}
                    px={0}
                  >
                    <option value="">未選択</option>
                    {years.map((year) => (
                      <option key={year.id} value={year.id}>
                        {fiscalYearLabel(year)}
                      </option>
                    ))}
                  </NativeSelect.Field>
                  <NativeSelect.Indicator />
                </NativeSelect.Root>
              </HStack>
            )}
            <Flex
              w="30px"
              h="30px"
              rounded="full"
              bg="bg.muted"
              borderWidth="1px"
              borderColor="border"
              align="center"
              justify="center"
              fontSize="11.5px"
              fontWeight="semibold"
              color="fg.muted"
              title={user?.email ?? undefined}
              flexShrink={0}
            >
              {avatarChar}
            </Flex>
            <Button size="sm" variant="outline" onClick={handleSignOut}>
              ログアウト
            </Button>
          </HStack>
        </Flex>

        <Box flex={1} p={flush ? 0 : 6} minW={0}>
          {children}
        </Box>
      </Flex>
    </Flex>
  );
}
