import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { BRAND_GRADIENT } from "@/brand";
import { MapleLogo } from "@/client/components/MapleLogo";
import { auth, devLoginEnabled, oauthProviders, signIn } from "@/server/auth/config";

const ERRORS: Record<string, string> = {
  CredentialsSignin: "Enter a valid email address.",
  OAuthAccountNotLinked: "That email is already linked to another sign-in method.",
};

async function signInWith(provider: string, options: Record<string, unknown> = {}) {
  "use server";
  try {
    await signIn(provider, { ...options, redirectTo: "/boards" });
  } catch (err) {
    // signIn signals success by throwing a redirect; only handle real auth failures here.
    if (err instanceof AuthError) redirect(`/signin?error=${err.type}`);
    throw err;
  }
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if ((await auth())?.user?.id) redirect("/boards");
  const { error } = await searchParams;
  const nothingConfigured = oauthProviders.length === 0 && !devLoginEnabled;

  return (
    <Box sx={{ minHeight: "100dvh", display: "grid", placeItems: "center", p: 2 }}>
      <Paper
        elevation={3}
        sx={{
          p: 4,
          width: "100%",
          maxWidth: 400,
          position: "relative",
          overflow: "hidden",
          // Brand strip along the top, clipped to the card's rounded corners.
          "&::before": {
            content: '""',
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 6,
            background: BRAND_GRADIENT,
          },
        }}
      >
        <Stack spacing={3}>
          <Box sx={{ textAlign: "center" }}>
            <MapleLogo
              gradient
              aria-hidden
              sx={{ fontSize: 96, display: "block", mx: "auto", mb: 2 }}
            />
            <Typography variant="h4" component="h1" color="primary" sx={{ fontWeight: 700 }}>
              Maple Flow
            </Typography>
            <Typography color="text.secondary">Sign in to see your boards.</Typography>
          </Box>

          {error && <Alert severity="error">{ERRORS[error] ?? "Sign-in failed. Try again."}</Alert>}
          {nothingConfigured && (
            <Alert severity="warning">
              No sign-in method is configured. Set GitHub or Google credentials in .env.local, or
              set AUTH_DEV_LOGIN=&quot;true&quot; for local development.
            </Alert>
          )}

          {oauthProviders.map((p) => (
            <form key={p.id} action={signInWith.bind(null, p.id, {})}>
              <Button type="submit" variant="outlined" fullWidth size="large">
                Continue with {p.name}
              </Button>
            </form>
          ))}

          {devLoginEnabled && (
            <>
              {oauthProviders.length > 0 && <Divider>or</Divider>}
              <form
                action={async (formData: FormData) => {
                  "use server";
                  await signInWith("dev", { email: formData.get("email") });
                }}
              >
                <Stack spacing={1.5}>
                  <TextField
                    name="email"
                    type="email"
                    label="Email"
                    required
                    fullWidth
                    helperText="Development only: signs in with just an email."
                  />
                  <Button type="submit" variant="contained" size="large">
                    Sign In (Dev)
                  </Button>
                </Stack>
              </form>
            </>
          )}
        </Stack>
      </Paper>
    </Box>
  );
}
