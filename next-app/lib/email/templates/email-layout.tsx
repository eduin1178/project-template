import "server-only";

import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

const BASE_URL = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
const LOGO_URL = `${BASE_URL}/images/logo-horizontal.png`;

const styles = {
  body: {
    backgroundColor: "#f6f7f9",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    margin: 0,
    padding: "32px 0",
  },
  container: {
    backgroundColor: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    margin: "0 auto",
    maxWidth: "560px",
    padding: "0",
  },
  header: {
    borderBottom: "1px solid #f1f5f9",
    padding: "24px 32px",
    textAlign: "center" as const,
  },
  logo: {
    display: "inline-block",
    height: "auto",
    width: "160px",
  },
  content: {
    padding: "32px",
  },
  footer: {
    color: "#94a3b8",
    fontSize: "12px",
    lineHeight: "18px",
    padding: "16px 32px 24px",
    textAlign: "center" as const,
  },
  footerLink: {
    color: "#64748b",
    textDecoration: "underline",
  },
};

export function EmailLayout({
  preview,
  children,
}: {
  preview: string;
  children: React.ReactNode;
}) {
  return (
    <Html lang="es">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Section style={styles.header}>
            <Img
              src={LOGO_URL}
              alt="Docentix"
              width="160"
              style={styles.logo}
            />
          </Section>
          <Section style={styles.content}>{children}</Section>
          <Hr style={{ borderColor: "#f1f5f9", margin: 0 }} />
          <Section style={styles.footer}>
            <Text style={{ margin: 0 }}>
              Este es un mensaje automático de Docentix.{" "}
              <Link href={BASE_URL} style={styles.footerLink}>
                Ir a Docentix
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export const emailStyles = {
  heading: {
    color: "#0f172a",
    fontSize: "22px",
    fontWeight: 600,
    lineHeight: "30px",
    margin: "0 0 16px",
  },
  paragraph: {
    color: "#334155",
    fontSize: "15px",
    lineHeight: "24px",
    margin: "0 0 16px",
  },
  list: {
    color: "#334155",
    fontSize: "15px",
    lineHeight: "24px",
    margin: "0 0 16px",
    paddingLeft: "20px",
  },
  button: {
    backgroundColor: "#0f172a",
    borderRadius: "8px",
    color: "#ffffff",
    display: "inline-block",
    fontSize: "15px",
    fontWeight: 600,
    padding: "12px 24px",
    textDecoration: "none",
  },
  buttonWrapper: {
    margin: "24px 0",
    textAlign: "center" as const,
  },
  disclaimer: {
    color: "#94a3b8",
    fontSize: "13px",
    lineHeight: "20px",
    margin: "16px 0 0",
  },
  ttl: {
    color: "#64748b",
    fontSize: "13px",
    lineHeight: "20px",
    margin: "16px 0 0",
  },
};

export const emailBaseUrl = BASE_URL;
