"use client";

import {
  Alert,
  Button,
  Card,
  Field,
  Flex,
  HStack,
  Heading,
  Input,
  Stack,
  Text,
} from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { usecases } from "@account-ledgers/infrastructure/container";
import { DEMO_ACCOUNT, isEmulatorMode } from "@account-ledgers/infrastructure/firebase/devAccount";
import { toDisplayMessage } from "@/components/errorMessages";

interface LoginFormValues {
  email: string;
  password: string;
}

export default function LoginPage() {
  const router = useRouter();
  const { register, handleSubmit } = useForm<LoginFormValues>({
    defaultValues: { email: "", password: "" },
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<"form" | "demo" | null>(null);

  async function signIn(
    credentials: { email: string; password: string },
    source: "form" | "demo",
  ) {
    setError(null);
    setSubmitting(source);
    try {
      await usecases.signIn(credentials);
      router.push("/");
    } catch (e) {
      setError(toDisplayMessage(e, "ログインに失敗しました"));
      setSubmitting(null);
    }
  }

  const onSubmit = handleSubmit((data) => signIn(data, "form"));

  return (
    <Flex minH="100vh" align="center" justify="center" bg="bg.subtle" p={6}>
      <Stack gap={6} w="full" maxW="380px">
        <HStack gap="10px" justify="center">
          <Flex
            w="30px"
            h="30px"
            rounded="sm"
            bg="fg"
            color="bg.panel"
            align="center"
            justify="center"
            fontSize="15px"
            fontWeight="bold"
            flexShrink={0}
          >
            帳
          </Flex>
          <Stack gap={0} lineHeight="1.2">
            <Text fontSize="16px" fontWeight="semibold" letterSpacing="-0.01em">
              kaicho
            </Text>
            <Text fontSize="11px" color="fg.subtle">
              open source bookkeeping
            </Text>
          </Stack>
        </HStack>
        <Card.Root rounded="lg">
          <Card.Header>
            <Heading size="md">ログイン</Heading>
          </Card.Header>
          <Card.Body>
            <form onSubmit={onSubmit}>
              <Stack gap={4}>
              {error && (
                <Alert.Root status="error">
                  <Alert.Indicator />
                  <Alert.Title>{error}</Alert.Title>
                </Alert.Root>
              )}
              <Field.Root required>
                <Field.Label>メールアドレス</Field.Label>
                <Input
                  type="email"
                  autoComplete="email"
                  autoFocus
                  {...register("email", { required: true })}
                />
              </Field.Root>
              <Field.Root required>
                <Field.Label>パスワード</Field.Label>
                <Input
                  type="password"
                  autoComplete="current-password"
                  {...register("password", { required: true })}
                />
              </Field.Root>
              <Button
                type="submit"
                loading={submitting === "form"}
                disabled={submitting === "demo"}
              >
                ログイン
              </Button>
              {isEmulatorMode && (
                <Stack gap={1}>
                  <Button
                    type="button"
                    variant="outline"
                    loading={submitting === "demo"}
                    disabled={submitting === "form"}
                    onClick={() => signIn(DEMO_ACCOUNT, "demo")}
                  >
                    テストユーザーでログイン
                  </Button>
                  <Text fontSize="xs" color="fg.muted">
                    開発環境専用。seed が投入した {DEMO_ACCOUNT.email}{" "}
                    のデモデータにログインします
                  </Text>
                </Stack>
              )}
              </Stack>
            </form>
          </Card.Body>
        </Card.Root>
      </Stack>
    </Flex>
  );
}
