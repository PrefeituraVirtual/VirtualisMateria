import Document, { Html, Head, Main, NextScript } from 'next/document'

class MyDocument extends Document {
  render() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL
    const preconnectUrl = apiUrl ? apiUrl.replace(/\/+$/, '') : null

    return (
      <Html lang="pt-BR" data-scroll-behavior="smooth">
        <Head>
          <meta charSet="utf-8" />
          <meta name="description" content="Sistema de Assistente Legislativo com IA - Materia Virtualis" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <meta name="robots" content="index, follow" />
          <meta name="googlebot" content="index, follow" />
          <meta property="og:type" content="website" />
          <meta property="og:site_name" content="Materia Virtualis" />
          <meta property="og:locale" content="pt_BR" />
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:site" content="@materiavirtualis" />
          <meta name="theme-color" content="#1669B6" />
          <link rel="icon" href="/favicon.ico" />
          <link rel="icon" type="image/png" href="/favicon.png" />
          <link rel="apple-touch-icon" href="/favicon.png" />
          {preconnectUrl ? <link rel="preconnect" href={preconnectUrl} /> : null}
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    )
  }
}

export default MyDocument
