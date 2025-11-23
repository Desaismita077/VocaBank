import { ClerkProvider } from '@clerk/nextjs';

export default function MyApp({ Component, pageProps }) {
  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
      {...pageProps}
    >
      <Component {...pageProps} />
    </ClerkProvider>
  );
}
