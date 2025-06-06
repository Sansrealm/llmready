import { Metadata } from 'next';
import { guideMetadata, guideSchema } from './metadata';

export const metadata: Metadata = {
  title: guideMetadata.title,
  description: guideMetadata.description,
  keywords: guideMetadata.keywords,
  authors: guideMetadata.authors,
  openGraph: {
    title: guideMetadata.title,
    description: guideMetadata.description,
    type: 'article',
    publishedTime: guideMetadata.publishedDate,
    modifiedTime: guideMetadata.modifiedDate,
    authors: guideMetadata.authors.map(author => author.name),
    url: 'https://llmcheck.app/guide',
    siteName: 'LLM Check',
  },
  twitter: {
    card: 'summary_large_image',
    title: guideMetadata.title,
    description: guideMetadata.description,
    site: '@llmcheck',
    creator: '@llmcheck',
  }
};

export default function GuideLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(guideSchema) }}
      />
      {children}
    </>
  );
} 