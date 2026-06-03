import type { AppProps } from 'next/app';
import ErrorBoundary from '@/components/ErrorBoundary';
import Head from 'next/head';
import { AuthProvider } from '@/context/AuthContext';
import { ProjectProvider } from '@/context/ProjectContext';
import { InvoiceProvider } from '@/context/InvoiceContext';
import { ExpenseProvider } from '@/context/ExpenseContext';
import { WorkDocProvider } from '@/context/WorkDocContext';
import { POItemProvider } from '@/context/POItemContext';
import { WorkProgressProvider } from '@/context/WorkProgressContext';
import { ActivityProvider } from '@/context/ActivityContext';
import { MaterialProvider } from '@/context/MaterialContext';
import '@/styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>Venus Energy PMS</title>
        <meta name="description" content="Venus Energy — Telecom Project Management System" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" />
      </Head>
      <AuthProvider>
        <ProjectProvider>
        <InvoiceProvider>
        <ExpenseProvider>
        <WorkDocProvider>
        <POItemProvider>
        <WorkProgressProvider>
        <ActivityProvider>
        <MaterialProvider>
        <ErrorBoundary>
        <Component {...pageProps} />
      </ErrorBoundary>
      </MaterialProvider>
        </ActivityProvider>
        </WorkProgressProvider>
        </POItemProvider>
        </WorkDocProvider>
        </ExpenseProvider>
        </InvoiceProvider>
        </ProjectProvider>
      </AuthProvider>
    </>
  );
}
