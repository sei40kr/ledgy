"use client";

import {
  Box,
  Button,
  Flex,
  HStack,
  Link,
  NativeSelect,
  Spinner,
  Stack,
  Text,
} from "@chakra-ui/react";
import NextLink from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { usecases } from "@account-ledgers/infrastructure/container";
import { useAuth } from "@/hooks/useAuth";
import {
  fiscalYearLabel,
  FiscalYearProvider,
  useFiscalYears,
} from "@/hooks/useFiscalYears";

// Items with `sub` are scoped to a fiscal year and resolve to
// `/fiscal-years/<id><sub>`; items with `href` are tenant-wide.
type NavItem =
  | { sub: string; label: string }
  | { href: string; label: string };

interface NavGroup {
  heading?: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  { items: [{ href: "/", label: "ホーム" }] },
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

/**
 * Shared shell for pages that require authentication. Redirects to /login when signed out.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
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
      <AppShellInner>{children}</AppShellInner>
    </FiscalYearProvider>
  );
}

function AppShellInner({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { years, currentYear, selectYear } = useFiscalYears();

  async function handleSignOut() {
    await usecases.signOut();
    router.replace("/login");
  }

  // Resolve a nav item to its concrete href; year-scoped items fall back to the
  // fiscal-year management page until a year exists.
  function resolveHref(item: NavItem): string {
    if ("href" in item) return item.href;
    return currentYear
      ? `/fiscal-years/${currentYear.id}${item.sub}`
      : "/fiscal-years/";
  }

  const newTransactionHref = currentYear
    ? `/fiscal-years/${currentYear.id}${NEW_TRANSACTION_SUB}`
    : "/fiscal-years/";

  const scopedSubtitle = currentYear
    ? fiscalYearLabel(currentYear)
    : "会計年度が未設定です";
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
        {/* Brand */}
        <HStack gap="10px" px={5} pt="18px" pb={4}>
          <Flex
            w="26px"
            h="26px"
            rounded="sm"
            bg="fg"
            color="bg.panel"
            align="center"
            justify="center"
            fontSize="13px"
            fontWeight="bold"
            flexShrink={0}
          >
            帳
          </Flex>
          <Stack gap={0} lineHeight="1.2" minW={0}>
            <Text fontSize="14px" fontWeight="semibold" letterSpacing="-0.01em">
              kaicho
            </Text>
            <Text fontSize="10.5px" color="fg.subtle">
              open source bookkeeping
            </Text>
          </Stack>
        </HStack>

        {/* Primary action */}
        <Box px="14px" pb="6px">
          <Button asChild w="full" h="36px" size="sm" fontWeight="medium">
            <NextLink href={newTransactionHref}>＋ 仕訳を追加</NextLink>
          </Button>
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
                const href = resolveHref(item);
                const active = pathname === href;
                return (
                  <Link
                    key={item.label}
                    asChild
                    display="flex"
                    alignItems="center"
                    gap="9px"
                    w="full"
                    px="10px"
                    py="7px"
                    rounded="md"
                    fontSize="13.5px"
                    fontWeight={active ? "semibold" : "normal"}
                    color={active ? "fg" : "fg.muted"}
                    transition="background 150ms"
                    _hover={{ bg: "bg.muted", textDecor: "none" }}
                  >
                    <NextLink href={href}>
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
                        {item.label}
                      </Text>
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
          h="56px"
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
                    onChange={(e) => selectYear(e.target.value)}
                    fontSize="12.5px"
                    px={0}
                  >
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

        <Box flex={1} p={6} minW={0}>
          {children}
        </Box>
      </Flex>
    </Flex>
  );
}
