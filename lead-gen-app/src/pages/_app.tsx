import type { AppProps } from "next/app";
import Head from "next/head";
import "@/styles/globals.css";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>GMB Lead Finder</title>
        <meta
          name="description"
          content="Uncover Google Business Profile listings ranked outside the top 5 or missing websites."
        />
      </Head>
      <Component {...pageProps} />
    </>
  );
}
